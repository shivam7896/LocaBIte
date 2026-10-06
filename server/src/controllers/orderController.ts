import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../types';
import { Order, IOrder } from '../models/Order';
import { Cart } from '../models/Cart';
import { MenuItem } from '../models/MenuItem';
import { GroceryItem } from '../models/GroceryItem';
import { Product } from '../models/Product';
import { PaymentService } from '../services/paymentService';
import { emitOrderStatusUpdate, emitNewOrderBroadcast, emitLiveNotification } from '../sockets/orderSocket';
import { sendResponse, sendError } from '../utils/apiResponse';
import { EmailService } from '../services/emailService';
import { logger } from '../utils/logger';

export class OrderController {
  /**
   * Create New Order
   */
  static async createOrder(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId;
    if (!userId || userId === 'guest-session') {
      return sendError(res, 'Authentication required: You must be logged in to place an order.', 401);
    }
    const { deliveryAddress, deliveryInstructions, paymentMethod, appliedPromo, directItems } = req.body;

    try {
      // Fetch cart or use direct items if passed
      let cart = await Cart.findOne({ userId });
      let incomingItems = cart?.items || [];

      if ((!incomingItems || incomingItems.length === 0) && directItems && directItems.length > 0) {
        incomingItems = directItems;
      }

      if (!incomingItems || incomingItems.length === 0) {
        return sendError(res, 'Cannot create an order with an empty cart.', 400);
      }

      // Requirement 10 & 11: NEVER trust price values sent by the frontend.
      // Retrieve current product price from MongoDB and validate stock & availability.
      const verifiedOrderItems: any[] = [];
      let calculatedItemTotal = 0;

      for (const item of incomingItems) {
        const targetId = (item as any).id || (item as any).cartItemId || (item as any).productId;
        const candidates: any[] = [
          { id: targetId },
          { sku: targetId }
        ];
        if (typeof targetId === 'string' && /^[0-9a-fA-F]{24}$/.test(targetId)) {
          candidates.push({ _id: targetId });
        }

        // 1. Search in MenuItem (Food)
        let dbFood: any = await MenuItem.findOne({ $or: candidates });
        let dbGroc: any = null;
        let dbProduct: any = null;

        if (!dbFood) {
          // 2. Search in GroceryItem
          dbGroc = await GroceryItem.findOne({ $or: candidates });
        }

        if (!dbFood && !dbGroc) {
          // 3. Search in unified Product
          dbProduct = await Product.findOne({ $or: candidates });
        }

        const dbRecord = dbFood || dbGroc || dbProduct;
        if (!dbRecord) {
          return sendError(res, `Product "${item.name || targetId}" is not found in our catalog.`, 400);
        }

        // Validate availability and status
        const isAvail = dbFood ? dbFood.isAvailable : dbGroc ? dbGroc.inStock : dbProduct.isAvailable;
        if (!isAvail || dbRecord.status === 'disabled' || dbRecord.status === 'rejected') {
          return sendError(res, `Product "${dbRecord.name}" is currently unavailable or out of stock.`, 400);
        }

        // Validate stock quantity
        const quantityRequested = Math.max(1, Number(item.quantity) || 1);
        if (dbRecord.stockQuantity !== undefined && dbRecord.stockQuantity !== -1 && dbRecord.stockQuantity < quantityRequested) {
          return sendError(res, `Not enough stock for "${dbRecord.name}". Only ${dbRecord.stockQuantity} remaining.`, 400);
        }

        // Server-side Price Verification (never trust incoming item.price)
        let verifiedUnitPrice = Number(dbRecord.price);
        if (item.customizations?.size?.price) {
          verifiedUnitPrice += Number(item.customizations.size.price);
        }
        if (item.customizations?.addons && Array.isArray(item.customizations.addons)) {
          item.customizations.addons.forEach((a: any) => {
            if (a.price) verifiedUnitPrice += Number(a.price);
          });
        }

        calculatedItemTotal += verifiedUnitPrice * quantityRequested;

        // Decrement stock in database if finite stock
        if (dbRecord.stockQuantity !== undefined && dbRecord.stockQuantity > 0) {
          dbRecord.stockQuantity = Math.max(0, dbRecord.stockQuantity - quantityRequested);
          await dbRecord.save();
        }

        verifiedOrderItems.push({
          cartItemId: item.cartItemId || `cart-${dbRecord.id}`,
          id: dbRecord.id,
          sku: dbRecord.sku || dbRecord.id,
          name: dbRecord.name,
          price: verifiedUnitPrice,
          originalPrice: dbRecord.originalPrice || dbRecord.mrp || verifiedUnitPrice,
          quantity: quantityRequested,
          image: dbRecord.image || item.image || '',
          dietary: dbRecord.dietary || 'veg',
          restaurantId: dbRecord.restaurantId || dbRecord.merchantId || 'st_TYnRD3iI21IWyp',
          customizations: item.customizations
        });
      }

      // Compute server-calculated totals
      const itemTotal = calculatedItemTotal;
      const isFreeDelivery = true; // Always free delivery as requested
      const deliveryFee = 0;
      const taxesAndHandling = 0;
      const discount = cart?.discount || (appliedPromo === 'WELCOME50' ? Math.min(100, Math.floor(itemTotal * 0.5)) : 0);
      const totalToPay = Math.max(0, itemTotal + deliveryFee + taxesAndHandling + (cart?.driverTip || 0) - discount);

      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const orderNumber = `LB-${randomDigits}`;
      const orderId = `ord-${randomDigits}`;
      const otpOnArrival = Math.floor(1000 + Math.random() * 9000).toString();

      // Driver will be assigned later when order is accepted/out for delivery

      // Create Order in DB
      const order = new Order({
        id: orderId,
        orderNumber,
        userId,
        items: verifiedOrderItems,
        itemTotal,
        deliveryFee,
        taxesAndHandling,
        discount,
        totalToPay,
        appliedPromo,
        status: 'placed',
        statusTimeline: [
          {
            status: 'placed',
            timestamp: new Date(),
            note: 'Order placed successfully and received by kitchen.'
          }
        ],
        placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        estimatedArrival: 'In 15–20 mins',
        remainingMinutes: 15,
        deliveryAddress,
        deliveryInstructions: deliveryInstructions || 'Leave at door',
        otpOnArrival,
        paymentMethod: paymentMethod || 'UPI (Google Pay)',
        paymentStatus: paymentMethod === 'Cash on Delivery' ? 'pending' : 'pending'
      });

      // If Razorpay payment is requested
      let razorpayOrderData = null;
      if (paymentMethod && paymentMethod.toLowerCase().includes('razorpay')) {
        razorpayOrderData = await PaymentService.createRazorpayOrder(totalToPay, 'INR', orderNumber);
        order.razorpayOrderId = razorpayOrderData.id;
      }

      await order.save();

      // We DO NOT clear the cart here. The frontend will call api.cart.clear() 
      // ONLY after the payment is successfully verified or COD is placed.
      // This ensures the cart is not lost if the user cancels the Razorpay payment modal.

      // Broadcast order placed to real-time sockets
      emitOrderStatusUpdate(orderId, order);
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
        statusCode: 201,
        message: 'Order placed successfully',
        data: {
          order,
          razorpayOrder: razorpayOrderData
        }
      });
    } catch (err: any) {
      return sendError(res, `Failed to place order: ${err.message}`, 500);
    }
  }

  /**
   * Get Order by ID or Order Number
   */
  static async getOrderById(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }]
      });

      if (!order) {
        return sendError(res, 'Order not found', 404);
      }

      return sendResponse({
        res,
        data: order
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * List Current User's Orders
   */
  static async getUserOrders(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId;
    if (!userId || userId === 'guest-session') {
      return sendError(res, 'Authentication required: You must be logged in to view your orders.', 401);
    }
    try {
      const orders = await Order.find({ userId }).sort({ createdAt: -1 });

      const activeOrders = orders.filter(
        o => !['delivered', 'cancelled', 'failed'].includes(o.status)
      );
      const pastOrders = orders.filter(o =>
        ['delivered', 'cancelled', 'failed'].includes(o.status)
      );

      return sendResponse({
        res,
        data: {
          activeOrder: activeOrders[0] || null,
          activeOrders,
          pastOrders,
          total: orders.length
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Cancel Order
   */
  static async cancelOrder(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    const { reason } = req.body;

    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) {
        return sendError(res, 'Order not found', 404);
      }

      if (!['placed', 'confirmed'].includes(order.status)) {
        return sendError(
          res,
          `Order cannot be cancelled in '${order.status}' stage as meal preparation has begun.`,
          400
        );
      }

      order.status = 'cancelled';
      order.cancellationReason = reason || 'Cancelled by customer';
      order.statusTimeline.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: reason || 'Cancelled by customer'
      });

      await order.save();

      emitOrderStatusUpdate(order.id, order);

      // Dispatch cancellation email
      EmailService.sendOrderNotification({
        order,
        event: 'status_update',
        statusNote: reason || 'Cancelled by customer'
      }).catch(err => {
        logger.error(`[ORDER] Failed to dispatch cancellation email for #${order.orderNumber}: ${err.message}`);
      });

      return sendResponse({
        res,
        message: 'Order cancelled successfully',
        data: order
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Re-order items into cart
   */
  static async reorder(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId;
    if (!userId || userId === 'guest-session') {
      return sendError(res, 'Authentication required: You must be logged in to reorder.', 401);
    }
    const { orderId } = req.params;

    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) {
        return sendError(res, 'Order not found', 404);
      }

      let cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }

      // Merge items into cart
      order.items.forEach(pastItem => {
        const existing = cart!.items.find(i => i.cartItemId === pastItem.cartItemId);
        if (existing) {
          existing.quantity += pastItem.quantity;
        } else {
          cart!.items.push(pastItem);
        }
      });

      cart.calculateTotals();
      await cart.save();

      return sendResponse({
        res,
        message: 'Items added to cart',
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
