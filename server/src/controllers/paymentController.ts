import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { PaymentService } from '../services/paymentService';
import { emitOrderStatusUpdate, emitNewOrderBroadcast, emitLiveNotification } from '../sockets/orderSocket';
import { sendResponse, sendError } from '../utils/apiResponse';
import { EmailService } from '../services/emailService';
import { logger } from '../utils/logger';
import { ENV } from '../config/env';

export class PaymentController {
  /**
   * Initiate Razorpay Order for Checkout
   */
  static async createOrder(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.body;
    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) {
        return sendError(res, 'Order not found', 404);
      }

      const razorpayOrder = await PaymentService.createRazorpayOrder(
        order.totalToPay,
        'INR',
        order.orderNumber
      );

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();

      return sendResponse({
        res,
        data: {
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          orderId: order.id,
          orderNumber: order.orderNumber,
          keyId: ENV.RAZORPAY_KEY_ID
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Verify Payment Signature from Razorpay Checkout
   */
  static async verifyPayment(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) {
        return sendError(res, 'Order not found', 404);
      }

      // Verify HMAC SHA256 Signature
      const isValid = PaymentService.verifySignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        order.paymentStatus = 'failed';
        await order.save();
        return sendError(res, 'Payment signature verification failed. Possible tampering.', 400);
      }

      // Prevent duplicate processing
      const existingPayment = await Payment.findOne({ razorpayPaymentId });
      if (existingPayment) {
        return sendResponse({
          res,
          message: 'Payment already processed',
          data: order
        });
      }

      // Record successful payment
      await Payment.create({
        orderId: order.id,
        userId: order.userId,
        amount: order.totalToPay,
        currency: 'INR',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        status: 'captured'
      });

      order.paymentStatus = 'paid';
      order.razorpayPaymentId = razorpayPaymentId;
      order.status = 'confirmed';
      order.statusTimeline.push({
        status: 'confirmed',
        timestamp: new Date(),
        note: `Payment verified via Razorpay (${razorpayPaymentId}). Restaurant confirmed order.`
      });

      await order.save();

      // Emit real-time update
      emitOrderStatusUpdate(order.id, order);

      // Now that payment is successful, broadcast the new order
      emitNewOrderBroadcast(order);

      // Dispatch Order Confirmation Email via Resend
      EmailService.sendOrderNotification({
        order,
        event: 'confirmed'
      }).catch(err => {
        logger.error(`[ORDER] Failed to dispatch confirmation email for #${order.orderNumber}: ${err.message}`);
      });

      // 1. Notification for Customer: Order Confirmed
      emitLiveNotification({
        role: 'customer',
        type: 'order_confirmed',
        title: 'Your Order is Confirmed! 🎉',
        message: `Order #${order.orderNumber} (₹${order.totalToPay}) has been confirmed and received by the kitchen. Preparing your fresh items!`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalToPay: order.totalToPay,
        address: order.deliveryAddress?.building
      });

      // 2. Notification for Admin / Merchant: New Order Received
      emitLiveNotification({
        role: 'admin',
        type: 'new_order',
        title: '🔔 New Order Received!',
        message: `Order #${order.orderNumber} for ₹${order.totalToPay} received from ${order.deliveryAddress?.building || 'Campus'}.`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalToPay: order.totalToPay,
        customerName: order.deliveryAddress?.title || 'Campus Member',
        address: `${order.deliveryAddress?.building}, ${order.deliveryAddress?.room}`
      });

      // 3. Notification for Rider: New Delivery Available
      emitLiveNotification({
        role: 'rider',
        type: 'new_order',
        title: '⚡ New Delivery Available!',
        message: `Order #${order.orderNumber} • ₹${order.totalToPay} to ${order.deliveryAddress?.building}. Tap to accept delivery mission.`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalToPay: order.totalToPay,
        address: order.deliveryAddress?.building
      });

      return sendResponse({
        res,
        message: 'Payment verified and order confirmed successfully',
        data: order
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Handle Razorpay Webhooks
   */
  static async handleWebhook(req: Request, res: Response): Promise<any> {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!signature || !PaymentService.verifyWebhookSignature(rawBody, signature)) {
      logger.warn('[Webhook] Invalid Razorpay webhook signature');
      return res.status(400).json({ status: 'invalid_signature' });
    }

    const event = req.body.event;
    logger.info(`[Webhook] Received Razorpay event: ${event}`);

    try {
      if (event === 'payment.captured' || event === 'order.paid') {
        const paymentEntity = req.body.payload?.payment?.entity;
        const orderEntity = req.body.payload?.order?.entity;
        const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

        if (razorpayOrderId) {
          const order = await Order.findOne({ razorpayOrderId });
          if (order && order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
            if (order.status === 'placed') {
              order.status = 'confirmed';
            }
            await order.save();
            emitOrderStatusUpdate(order.id, order);
            logger.info(`[Webhook] Order ${order.id} marked as paid via webhook (${event})`);
          }
        }
      } else if (event === 'payment.failed') {
        const paymentEntity = req.body.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        if (razorpayOrderId) {
          const order = await Order.findOne({ razorpayOrderId });
          if (order && order.paymentStatus !== 'paid') {
            order.paymentStatus = 'failed';
            await order.save();
            emitOrderStatusUpdate(order.id, order);
            logger.info(`[Webhook] Order ${order.id} marked as failed via webhook`);
          }
        }
      }

      return res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      logger.error('[Webhook] Error processing webhook:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
}
