import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { initSocket } from './sockets/orderSocket';
import { logger } from './utils/logger';
import { Restaurant } from './models/Restaurant';
import { seedInitialData } from './seed/seedData';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // Auto-seed if database is empty
    const restaurantCount = await Restaurant.countDocuments();
    if (restaurantCount === 0) {
      logger.info('Database empty on startup. Auto-seeding initial LocaBite marketplace data...');
      await seedInitialData(false);
    }

    // 2. Initialize Express & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.IO
    initSocket(server);

    // 4. Start Listening
    const port = Number(env.PORT) || 5000;
    server.listen(port, '0.0.0.0', () => {
      logger.info(`====================================================`);
      logger.info(`🚀 LocaBite Backend Server is running!`);
      logger.info(`📡 Port: ${port}`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API Health: http://localhost:${port}/api/health`);
      logger.info(`⚡ Socket.IO initialized for real-time tracking`);
      logger.info(`====================================================`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Closed out remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error: any) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
