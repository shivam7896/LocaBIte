import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';
import { apiRateLimiter } from './middleware/rateLimitMiddleware';

export const createApp = (): Application => {
  const app: Application = express();

  // Security Headers
  app.use(helmet());

  // Cross-Origin Resource Sharing
  const allowedOrigins = [
    env.CLIENT_URL,
    'https://loca-bite.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://localhost:3000'
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive for ease of deployment
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-razorpay-signature']
    })
  );

  // Request Parsers
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      }
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP Request Logger
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Rate Limiter
  app.use('/api', apiRateLimiter);
  app.use('/api/v1', apiRateLimiter);

  // Mount API Root (both /api and /api/v1 supported)
  app.use('/api', apiRouter);
  app.use('/api/v1', apiRouter);

  // Root Service Welcome
  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'online',
      message: 'LocaBite Production API is running',
      version: '1.0.0',
      client: 'https://loca-bite.vercel.app',
      health: '/api/health'
    });
  });

  // Fallback 404 and Global Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
