import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let isConnected = false;

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (isConnected) {
    return mongoose;
  }

  try {
    logger.info(`Connecting to MongoDB at: ${env.MONGODB_URI.replace(/:\/\/.*@/, '://<credentials>@')}`);
    
    // Set connection timeout to 15000ms for stable cloud Atlas handshake
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000
    });
    
    isConnected = true;
    logger.info('Connected to MongoDB successfully.');
    return mongoose;
  } catch (error: any) {
    logger.warn(`Failed to connect to primary MongoDB URI (${error.message}).`);
    
    // In development or test, fallback to MongoMemoryServer for instant zero-config experience
    if (env.NODE_ENV !== 'production') {
      try {
        logger.info('Starting local in-memory MongoDB server as fallback for development/testing...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        logger.info(`In-memory MongoDB started at: ${uri}`);
        
        await mongoose.connect(uri);
        isConnected = true;
        logger.info('Connected to in-memory MongoDB.');
        return mongoose;
      } catch (memError: any) {
        logger.error(`Failed to start in-memory MongoDB: ${memError.message}`);
        throw error;
      }
    } else {
      logger.error('Fatal: Cannot connect to MongoDB in production mode.');
      throw error;
    }
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Disconnected from MongoDB.');
  }
};
