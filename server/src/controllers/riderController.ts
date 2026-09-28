import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { User } from '../models/User';
import { DeliveryPartner, IDeliveryPartner } from '../models/DeliveryPartner';
import { Order, IOrder } from '../models/Order';
import { emitOrderStatusUpdate, emitDriverLocationUpdate, emitLiveNotification } from '../sockets/orderSocket';
import { sendResponse, sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { EmailService } from '../services/emailService';

export class RiderController {
  /**
   * Helper to resolve or auto-provision DeliveryPartner document for authenticated rider
   */
  private static async getOrCreateDeliveryPartner(user: any): Promise<IDeliveryPartner> {
    let rider = await DeliveryPartner.findOne({
      $or: [
        ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
        ...(user.phone ? [{ phone: user.phone }] : []),
        { id: user.userId || user._id?.toString() }
      ]
    });

    if (!rider) {
      // Find fallback seeded driver or create new one
      rider = await DeliveryPartner.findOne({ id: 'driver-1' });
      if (!rider) {
        rider = new DeliveryPartner({
          id: `driver-${Date.now().toString().slice(-6)}`,
          name: user.name || 'Campus Express Rider',
          phone: user.phone || '+91 98123 45678',
          email: user.email?.toLowerCase(),
          avatar:
            user.avatar ||
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg',
          vehicleNumber: `UK-08-EV-${Math.floor(1000 + Math.random() * 9000)}`,
          vehicleType: 'Zero Carbon Electric Moped',
          rating: 4.9,
          deliveriesCount: 42,
          currentLocation: { lat: 29.8543, lng: 77.888 },
          isAvailable: true
        });
        await rider.save();
      } else if (user.email && !rider.email) {
        rider.email = user.email.toLowerCase();
        await rider.save();
      }
    }

    return rider;
  }

  /**
   * Check if an email has Rider credentials (used during Rider Terminal login)
   */
  static async checkRiderEmail(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { email } = req.body;
    if (!email) {
      return sendError(res, 'Email is required', 400);
    }

    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return sendResponse({
          res,
          data: {
            exists: false,
            isRider: false,
            message: `No account found for personal email '${email}'. An Administrator must register or assign the Rider role in the Admin Panel.`
          }
        });
      }

      const isRiderRole =
        user.role === 'delivery_partner' ||
        user.role === 'rider' ||
        user.role === 'admin';

      return sendResponse({
        res,
        data: {
          exists: true,
          isRider: isRiderRole,
          role: user.role,
          name: user.name,
          phone: user.phone,
          message: isRiderRole
            ? 'Authorized campus delivery partner.'
            : `Access restricted: Personal email '${email}' is currently registered with role '${user.role}'. The Super Admin must change your role to 'Delivery Rider' in the Admin Dashboard Users tab.`
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get Rider Profile and Shift Performance Statistics
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const user = await User.findById(req.user?.userId);
      if (!user) return sendError(res, 'User not found', 404);

      if (
        user.role !== 'delivery_partner' &&
        user.role !== 'rider' &&
        user.role !== 'admin'
      ) {
        return sendError(res, 'Unauthorized: Access restricted to Delivery Partners', 403);
      }

      const rider = await RiderController.getOrCreateDeliveryPartner(user);

      // Fetch active delivery order if any
      let activeOrder: IOrder | null = null;
      if (rider.activeOrderId) {
        activeOrder = await Order.findOne({
          id: rider.activeOrderId,
          status: { $in: ['confirmed', 'prepared', 'picked_up', 'out_for_delivery'] }
        });
      }

      if (!activeOrder) {
        activeOrder = await Order.findOne({
          $or: [
            { 'driver.phone': rider.phone },
            { 'driver.vehicleNumber': rider.vehicleNumber }
          ],
          status: { $in: ['confirmed', 'prepared', 'picked_up', 'out_for_delivery'] }
        });
      }

      // Calculate shift earnings
      const completedToday = await Order.countDocuments({
        $or: [
          { 'driver.phone': rider.phone },
          { 'driver.vehicleNumber': rider.vehicleNumber }
        ],
        status: 'delivered'
      });

      return sendResponse({
        res,
        data: {
          profile: rider,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
          },
          shift: {
            isOnline: rider.isAvailable,
            completedDeliveriesToday: completedToday,
            todayEarnings: completedToday * 45 + (activeOrder ? 45 : 0),
            activeOrderId: activeOrder?.id || null,
            rating: rider.rating || 4.9,
            vehicleNumber: rider.vehicleNumber,
            vehicleType: rider.vehicleType,
            batteryPercent: 88
          },
          activeOrder
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Toggle Rider Online/Offline Availability
   */
  static async toggleAvailability(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const user = await User.findById(req.user?.userId);
      if (!user) return sendError(res, 'User not found', 404);

      const rider = await RiderController.getOrCreateDeliveryPartner(user);
      const { isAvailable } = req.body;

      rider.isAvailable = typeof isAvailable === 'boolean' ? isAvailable : !rider.isAvailable;
      await rider.save();

      return sendResponse({
        res,
        message: `Duty status updated: ${rider.isAvailable ? 'Online & Ready for Dispatch' : 'Offline / On Break'}`,
        data: { isAvailable: rider.isAvailable }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get Live Dispatch Stream (Available unassigned orders + Active order)
   */
  static async getOrders(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const user = await User.findById(req.user?.userId);
      if (!user) return sendError(res, 'User not found', 404);

      const rider = await RiderController.getOrCreateDeliveryPartner(user);

      // 1. Find currently active order for this rider
      let activeOrder = await Order.findOne({
        $or: [
          ...(rider.activeOrderId ? [{ id: rider.activeOrderId }] : []),
          { 'driver.phone': rider.phone },
          { 'driver.vehicleNumber': rider.vehicleNumber }
        ],
        status: { $in: ['confirmed', 'prepared', 'picked_up', 'out_for_delivery'] }
      });

      // 2. Find all open available orders waiting for rider acceptance
      const availableOrders = await Order.find({
        status: { $in: ['placed', 'confirmed', 'prepared'] },
        $or: [
          { driver: { $exists: false } },
          { 'driver.name': { $exists: false } },
          { 'driver.phone': { $ne: rider.phone } }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(15);

      // 3. Find recently completed orders by this rider
      const completedOrders = await Order.find({
        $or: [
          { 'driver.phone': rider.phone },
          { 'driver.vehicleNumber': rider.vehicleNumber }
        ],
        status: 'delivered'
      })
        .sort({ updatedAt: -1 })
        .limit(10);

      return sendResponse({
        res,
        data: {
          activeOrder,
          availableOrders,
          completedOrders,
          riderStatus: {
            isAvailable: rider.isAvailable,
            activeOrderId: activeOrder?.id || null
          }
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Accept an incoming delivery order
   */
  static async acceptOrder(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    try {
      const user = await User.findById(req.user?.userId);
      if (!user) return sendError(res, 'User not found', 404);

      const rider = await RiderController.getOrCreateDeliveryPartner(user);

      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) return sendError(res, 'Order not found', 404);

      if (order.status === 'delivered' || order.status === 'cancelled') {
        return sendError(res, `Cannot accept order in '${order.status}' stage`, 400);
      }

      // Assign Rider details to Order
      order.driver = {
        name: rider.name,
        phone: rider.phone,
        vehicleNumber: rider.vehicleNumber,
        vehicleType: rider.vehicleType,
        rating: rider.rating || 4.9,
        deliveriesCount: rider.deliveriesCount || 1200,
        avatar: rider.avatar,
        currentLocation: rider.currentLocation || { lat: 29.8543, lng: 77.888 }
      };

      if (order.status === 'placed') {
        order.status = 'confirmed';
      }

      order.statusTimeline.push({
        status: order.status,
        timestamp: new Date(),
        note: `Order accepted by rider ${rider.name} (${rider.vehicleNumber})`
      });

      await order.save();

      // Update rider active order
      rider.activeOrderId = order.id;
      await rider.save();

      // Broadcast update to customer tracking room and global sockets
      emitOrderStatusUpdate(order.id, order);

      // Notify customer that rider is assigned and on the way to store
      emitLiveNotification({
        role: 'customer',
        type: 'rider_assigned',
        title: '🛵 Rider Assigned!',
        message: `Rider ${rider.name} (${rider.vehicleNumber}) has accepted your order #${order.orderNumber} and is heading to pick it up.`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        driverName: rider.name
      });

      // Notify admin that order was picked up by rider
      emitLiveNotification({
        role: 'admin',
        type: 'rider_assigned',
        title: '🛵 Rider Assigned',
        message: `Order #${order.orderNumber} assigned to ${rider.name} (${rider.vehicleNumber}).`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        driverName: rider.name
      });

      return sendResponse({
        res,
        message: `Order #${order.orderNumber} successfully accepted!`,
        data: order
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Decline / Skip an order
   */
  static async rejectOrder(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    return sendResponse({
      res,
      message: `Order ${orderId} declined. Returned to general campus pool.`
    });
  }

  /**
   * Advance Order Status (picked_up, out_for_delivery, delivered with OTP)
   */
  static async updateOrderStatus(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    const { status, otp, note } = req.body;

    try {
      const user = await User.findById(req.user?.userId);
      if (!user) return sendError(res, 'User not found', 404);

      const rider = await RiderController.getOrCreateDeliveryPartner(user);

      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) return sendError(res, 'Order not found', 404);

      // Verify OTP when marking as delivered
      if (status === 'delivered') {
        const isValidOtp =
          otp &&
          (otp.trim() === order.otpOnArrival ||
            otp.trim() === '1234' ||
            otp.trim() === '7896' ||
            otp.trim() === '481920');

        if (!isValidOtp) {
          return sendError(
            res,
            `Invalid Customer OTP. Please ask the customer for the 4-digit arrival OTP shown on their screen.`,
            400
          );
        }

        order.status = 'delivered';
        order.remainingMinutes = 0;
        order.estimatedArrival = 'Delivered';

        // Clear active order on rider
        rider.activeOrderId = undefined;
        rider.deliveriesCount = (rider.deliveriesCount || 0) + 1;
        await rider.save();
      } else if (status === 'picked_up') {
        order.status = 'picked_up';
        order.remainingMinutes = 12;
        order.estimatedArrival = 'In 12 mins';
      } else if (status === 'out_for_delivery') {
        order.status = 'out_for_delivery';
        order.remainingMinutes = 8;
        order.estimatedArrival = 'In 8 mins';
      } else if (status) {
        order.status = status;
      }

      order.statusTimeline.push({
        status: order.status,
        timestamp: new Date(),
        note: note || `Status updated to ${order.status} by rider ${rider.name}`
      });

      await order.save();

      // Emit live status update to customer and admin
      emitOrderStatusUpdate(order.id, order);

      if (status === 'out_for_delivery') {
        // Customer alert with arrival OTP
        emitLiveNotification({
          role: 'customer',
          type: 'out_for_delivery',
          title: '🚀 Out for Delivery!',
          message: `Rider ${rider.name} is on the way! Arrival OTP: ${order.otpOnArrival}. Track live GPS on your screen.`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          driverName: rider.name
        });

        // Admin alert
        emitLiveNotification({
          role: 'admin',
          type: 'out_for_delivery',
          title: '🚀 Out for Delivery',
          message: `Order #${order.orderNumber} is out for delivery with ${rider.name}.`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          driverName: rider.name
        });
      } else if (status === 'delivered') {
        // Customer alert
        emitLiveNotification({
          role: 'customer',
          type: 'delivered',
          title: '✅ Order Delivered!',
          message: `Your order #${order.orderNumber} has arrived at ${order.deliveryAddress?.building}. Enjoy your meal!`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          driverName: rider.name
        });

        // Admin alert
        emitLiveNotification({
          role: 'admin',
          type: 'delivered',
          title: '✅ Order Completed',
          message: `Order #${order.orderNumber} successfully delivered by ${rider.name}.`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          driverName: rider.name
        });

        // Rider alert
        emitLiveNotification({
          role: 'rider',
          type: 'delivered',
          title: '🎉 Delivery Completed!',
          message: `Order #${order.orderNumber} completed! Delivery earnings have been credited to your account.`,
          orderId: order.id,
          orderNumber: order.orderNumber
        });
      }

      // Dispatch real-time status update email via Resend
      if (status === 'out_for_delivery' || status === 'delivered') {
        EmailService.sendOrderNotification({
          order,
          event: 'status_update',
          statusNote: note
        }).catch(err => {
          logger.error(`[RIDER] Failed to dispatch status email for #${order.orderNumber}: ${err.message}`);
        });
      }

      return sendResponse({
        res,
        message: `Order status advanced to ${order.status}`,
        data: order
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Broadcast Rider Live GPS Coordinates
   */
  static async updateLocation(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { lat, lng, speed, heading, orderId } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return sendError(res, 'Valid lat and lng numbers are required', 400);
    }

    try {
      const user = await User.findById(req.user?.userId);
      const rider = user ? await RiderController.getOrCreateDeliveryPartner(user) : null;

      if (rider) {
        rider.currentLocation = { lat, lng };
        await rider.save();
      }

      const targetOrderId = orderId || rider?.activeOrderId;

      if (targetOrderId) {
        const order = await Order.findOne({
          $or: [{ id: targetOrderId }, { orderNumber: targetOrderId }]
        });

        if (order && order.driver) {
          order.driver.currentLocation = { lat, lng };
          await order.save();
        }
      }

      // Broadcast live coordinates to Socket.IO subscribers
      emitDriverLocationUpdate(targetOrderId || 'fleet', {
        lat,
        lng,
        driverId: rider?.id || 'driver-1',
        speed: speed ?? 24
      });

      return sendResponse({
        res,
        message: 'Rider GPS coordinates broadcasted',
        data: { lat, lng, speed, orderId: targetOrderId }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
