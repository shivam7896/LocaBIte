import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { verifyAccessToken } from '../utils/jwt';
import { Order } from '../models/Order';
import { AuthUserPayload } from '../types';

let io: SocketIOServer | null = null;

// Extend Socket interface to attach authenticated user payload
export interface AuthenticatedSocket extends Socket {
  user?: AuthUserPayload;
}

export const initSocket = (server: HttpServer): SocketIOServer => {
  const allowedOrigins = [
    env.CLIENT_URL,
    'https://loca-bite.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://localhost:3000'
  ];

  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token missing'));
    }
    try {
      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`[Socket.IO] Client connected: ${socket.id} (User: ${socket.user?.userId}, Role: ${socket.user?.role})`);

    // Private User Notification Room
    if (socket.user?.userId) {
      socket.join(`user:${socket.user.userId}`);
    }

    // Order tracking room subscription
    socket.on('join_order_room', async (data: { orderId: string }) => {
      if (!data?.orderId || !socket.user) return;
      try {
        const order = await Order.findById(data.orderId);
        if (!order) return;

        // Authorize: Only order owner or admin/rider/restaurant_owner can join
        const isOwner = order.userId.toString() === socket.user.userId;
        const isAdminOrStaff = ['admin', 'rider', 'restaurant_owner'].includes(socket.user.role);
        
        if (isOwner || isAdminOrStaff) {
          socket.join(`order:${data.orderId}`);
          logger.info(`[Socket.IO] Client ${socket.id} joined room: order:${data.orderId}`);
        } else {
          logger.warn(`[Socket.IO] Client ${socket.id} unauthorized join attempt for order:${data.orderId}`);
        }
      } catch (err) {
        logger.error(`[Socket.IO] Error verifying order room join: ${err}`);
      }
    });

    socket.on('leave_order_room', (data: { orderId: string }) => {
      if (data?.orderId) {
        socket.leave(`order:${data.orderId}`);
      }
    });

    // Fleet / Rider dispatch subscription (Admin/Rider only)
    socket.on('join_fleet_room', () => {
      if (socket.user && ['admin', 'rider'].includes(socket.user.role)) {
        if (socket.user.role === 'admin') socket.join('admin_fleet');
        socket.join('rider_dispatch');
        logger.info(`[Socket.IO] Authorized client ${socket.id} joined fleet/dispatch rooms`);
      } else {
        logger.warn(`[Socket.IO] Unauthorized join_fleet_room by client ${socket.id}`);
      }
    });

    // Real-time Driver GPS Location Broadcast (Rider only)
    socket.on('driver_location_broadcast', (data: {
      orderId?: string;
      lat: number;
      lng: number;
      speed?: number;
      heading?: number;
    }) => {
      if (!socket.user || socket.user.role !== 'rider') {
        logger.warn(`[Socket.IO] Unauthorized driver location broadcast by ${socket.user?.userId}`);
        return;
      }
      
      if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;

      const payload = {
        orderId: data.orderId,
        driverId: socket.user.userId,
        driverName: socket.user.email,
        lat: data.lat,
        lng: data.lng,
        speed: data.speed ?? 24,
        heading: data.heading ?? 0,
        timestamp: new Date().toISOString()
      };

      // Broadcast to specific order room (Customers track here safely)
      if (data.orderId) {
        io?.to(`order:${data.orderId}`).emit('driver_location_updated', {
          lat: data.lat,
          lng: data.lng,
          speed: payload.speed
        });
      }

      // Broadcast only to admin fleet room, NOT global
      io?.to('admin_fleet').emit('fleet_location_updated', payload);
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized.');
  }
  return io;
};

export const emitOrderStatusUpdate = (orderId: string, orderData: any): void => {
  if (io) {
    // Only emit to authorized rooms, NOT globally
    io.to(`order:${orderId}`).emit('order_status_updated', orderData);
    io.to('admin_fleet').emit('order_status_updated', orderData);
    logger.info(`[Socket.IO] Emitted order_status_updated for order: ${orderId}`);
  }
};

export const emitDriverLocationUpdate = (
  orderId: string,
  location: { lat: number; lng: number; driverId?: string; speed?: number }
): void => {
  if (io) {
    io.to(`order:${orderId}`).emit('driver_location_updated', location);
    io.to('admin_fleet').emit('fleet_location_updated', {
      orderId,
      driverId: location.driverId || 'driver-1',
      lat: location.lat,
      lng: location.lng,
      speed: location.speed ?? 24,
      timestamp: new Date().toISOString()
    });
  }
};

export const emitNewOrderBroadcast = (order: any): void => {
  if (io) {
    // NEVER emit a full order object globally. Only to admins and riders dispatch room.
    io.to('admin_fleet').emit('new_order_available', order);
    io.to('rider_dispatch').emit('new_order_available', order);
    logger.info(`[Socket.IO] Broadcasted new_order_available for order: ${order.id || order.orderNumber}`);
  }
};

export interface LiveNotificationPayload {
  id?: string;
  role: 'customer' | 'admin' | 'rider' | 'all';
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  totalToPay?: number;
  customerName?: string;
  driverName?: string;
  address?: string;
  type: 'order_confirmed' | 'new_order' | 'rider_assigned' | 'out_for_delivery' | 'delivered';
  timestamp?: string;
}

export const emitLiveNotification = (notification: LiveNotificationPayload, userId?: string): void => {
  if (!io) return;
  const payload = {
    ...notification,
    id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: notification.timestamp || new Date().toISOString()
  };

  if (userId && (payload.role === 'customer' || payload.role === 'all')) {
    io.to(`user:${userId}`).emit('customer_order_notification', payload);
  } else if (payload.role === 'customer' || payload.role === 'all') {
     if (payload.orderId) io.to(`order:${payload.orderId}`).emit('customer_order_notification', payload);
  }

  if (payload.role === 'admin' || payload.role === 'all') {
    io.to('admin_fleet').emit('admin_new_order_notification', payload);
  }

  if (payload.role === 'rider' || payload.role === 'all') {
    io.to('rider_dispatch').emit('rider_dispatch_notification', payload);
  }

  logger.info(`[Socket.IO Notification] ${payload.type} -> ${payload.role}: "${payload.title}"`);
};

