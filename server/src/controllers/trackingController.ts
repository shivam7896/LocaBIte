import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Order } from '../models/Order';
import { emitOrderStatusUpdate, emitDriverLocationUpdate } from '../sockets/orderSocket';
import { sendResponse, sendError } from '../utils/apiResponse';

export class TrackingController {
  /**
   * Get Live Order Tracking Info
   */
  static async getOrderTracking(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) {
        return sendError(res, 'Order not found', 404);
      }

      return sendResponse({
        res,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          statusTimeline: order.statusTimeline,
          placedAt: order.placedAt,
          estimatedArrival: order.estimatedArrival,
          remainingMinutes: order.remainingMinutes,
          deliveryAddress: order.deliveryAddress,
          deliveryInstructions: order.deliveryInstructions,
          driver: order.driver,
          otpOnArrival: order.otpOnArrival,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          itemTotal: order.itemTotal,
          deliveryFee: order.deliveryFee,
          taxesAndHandling: order.taxesAndHandling,
          discount: order.discount,
          totalToPay: order.totalToPay,
          appliedPromo: order.appliedPromo,
          items: order.items
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Advance/Update Order Status (Merchant / Driver / Admin)
   */
  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    const { status, note } = req.body;

    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) {
        return sendError(res, 'Order not found', 404);
      }

      order.status = status;
      order.statusTimeline.push({
        status,
        timestamp: new Date(),
        note: note || `Order updated to ${status}`
      });

      if (status === 'delivered') {
        order.remainingMinutes = 0;
        order.estimatedArrival = 'Delivered';
      } else if (status === 'out_for_delivery') {
        order.remainingMinutes = 8;
        order.estimatedArrival = 'In 8 mins';
      } else if (status === 'picked_up') {
        order.remainingMinutes = 12;
        order.estimatedArrival = 'In 12 mins';
      }

      await order.save();

      // Emit live status update to Socket.IO room
      emitOrderStatusUpdate(order.id, order);

      return sendResponse({
        res,
        message: `Order status updated to ${status}`,
        data: order
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Update Driver Geolocation
   */
  static async updateDriverLocation(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    const { lat, lng } = req.body;

    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) {
        return sendError(res, 'Order not found', 404);
      }

      if (order.driver) {
        order.driver.currentLocation = { lat, lng };
        await order.save();
      }

      emitDriverLocationUpdate(order.id, { lat, lng });

      return sendResponse({
        res,
        message: 'Location broadcasted',
        data: { lat, lng }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
