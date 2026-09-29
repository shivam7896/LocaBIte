import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

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


  io.on('connection', (socket: Socket) => {
    logger.info(`[Socket.IO] Client connected: ${socket.id}`);

    // Order tracking room subscription
    socket.on('join_order_room', (data: { orderId: string }) => {
      if (data?.orderId) {
        socket.join(`order:${data.orderId}`);
        logger.info(`[Socket.IO] Client ${socket.id} joined room: order:${data.orderId}`);
      }
    });

    socket.on('leave_order_room', (data: { orderId: string }) => {
      if (data?.orderId) {
        socket.leave(`order:${data.orderId}`);
        logger.info(`[Socket.IO] Client ${socket.id} left room: order:${data.orderId}`);
      }
    });

    // User room subscription for notifications
    socket.on('join_user_room', (data: { userId: string }) => {
      if (data?.userId) {
        socket.join(`user:${data.userId}`);
        logger.info(`[Socket.IO] Client ${socket.id} joined room: user:${data.userId}`);
      }
    });

    // Fleet / Rider room subscription
    socket.on('join_fleet_room', () => {
      socket.join('admin_fleet');
      socket.join('rider_dispatch');
      logger.info(`[Socket.IO] Client ${socket.id} joined fleet & dispatch rooms`);
    });

    // Real-time Driver GPS Location Broadcast from Rider Terminal
    socket.on(
      'driver_location_broadcast',
      (data: {
        orderId?: string;
        driverId?: string;
        driverName?: string;
        lat: number;
        lng: number;
        speed?: number;
        heading?: number;
      }) => {
        if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;

        const payload = {
          orderId: data.orderId,
          driverId: data.driverId || 'driver-1',
          driverName: data.driverName || 'Rider',
          lat: data.lat,
          lng: data.lng,
          speed: data.speed ?? 24,
          heading: data.heading ?? 0,
          timestamp: new Date().toISOString()
        };

        // Broadcast to customer tracking room if on active order
        if (data.orderId) {
          io?.to(`order:${data.orderId}`).emit('driver_location_updated', {
            lat: data.lat,
            lng: data.lng,
            speed: payload.speed
          });
        }

        // Global broadcast for admin fleet map and real-time listeners
        io?.emit('driver_location_updated', {
          orderId: data.orderId,
          lat: data.lat,
          lng: data.lng,
          speed: payload.speed
        });

        io?.emit('fleet_location_updated', payload);
      }
    );

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
    io.to(`order:${orderId}`).emit('order_status_updated', orderData);
    io.emit('order_status_updated', orderData);
    logger.info(`[Socket.IO] Emitted order_status_updated for order: ${orderId}`);
  }
};

export const emitDriverLocationUpdate = (
  orderId: string,
  location: { lat: number; lng: number; driverId?: string; speed?: number }
): void => {
  if (io) {
    io.to(`order:${orderId}`).emit('driver_location_updated', location);
    io.emit('driver_location_updated', { orderId, ...location });
    io.emit('fleet_location_updated', {
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
    io.emit('new_order_available', order);
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

export const emitLiveNotification = (notification: LiveNotificationPayload): void => {
  if (!io) return;
  const payload = {
    ...notification,
    id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: notification.timestamp || new Date().toISOString()
  };

  // Broadcast to global notification channel
  io.emit('order_notification', payload);

  // Broadcast to role-specific channels
  if (payload.role === 'customer' || payload.role === 'all') {
    if (payload.orderId) {
      io.to(`order:${payload.orderId}`).emit('customer_order_notification', payload);
    }
    io.emit('customer_order_notification', payload);
  }

  if (payload.role === 'admin' || payload.role === 'all') {
    io.to('admin_fleet').emit('admin_new_order_notification', payload);
    io.emit('admin_new_order_notification', payload);
  }

  if (payload.role === 'rider' || payload.role === 'all') {
    io.to('rider_dispatch').emit('rider_dispatch_notification', payload);
    io.emit('rider_dispatch_notification', payload);
  }

  logger.info(`[Socket.IO Notification] ${payload.type} -> ${payload.role}: "${payload.title}"`);
};

