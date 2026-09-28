import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/locabite'),
  JWT_SECRET: z.string().default('locabite_super_secure_jwt_access_secret_2026_xyz'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().default('locabite_super_secure_jwt_refresh_secret_2026_abc'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_locabite_demo'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_secret_locabite_demo_secret'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('rzp_webhook_secret_locabite'),
  CLOUDINARY_CLOUD_NAME: z.string().default('locabite-cloud'),
  CLOUDINARY_API_KEY: z.string().default('123456789012345'),
  CLOUDINARY_API_SECRET: z.string().default('sample_cloudinary_api_secret_key'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('"LocaBite Campus" <no-reply@locabite.com>'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('LocaBite <onboarding@resend.dev>')
});

export const env = envSchema.parse(process.env);
export const ENV = env;
