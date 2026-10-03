import { z } from 'zod';

export const sendOtpSchema = z.object({
  identifier: z.string().min(3, 'Phone or email is required')
});

export const verifyOtpSchema = z
  .object({
    identifier: z.string().min(3).optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    code: z.string().length(6).optional(),
    otp: z.string().length(6).optional()
  })
  .refine(data => Boolean(data.identifier || data.email || data.phone), {
    message: 'Phone or email is required'
  })
  .refine(data => Boolean(data.code || data.otp), {
    message: 'OTP must be 6 digits'
  });

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z
    .enum(['customer', 'restaurant_owner', 'grocery_owner', 'delivery_partner', 'admin'])
    .default('customer')
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Phone or email is required'),
  password: z.string().min(1, 'Password is required')
});

export const testLoginSchema = z.object({
  email: z.string().email('Valid test email is required'),
  password: z.string().min(1, 'Test password is required')
});

export const updatePreferencesSchema = z.object({
  dietary: z.array(z.enum(['veg', 'non-veg', 'egg', 'vegan'])).default([]),
  orderStyle: z.array(z.enum(['food', 'mart'])).default([])
});

export const addressSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['hostel', 'department', 'home', 'apartment', 'other', 'office']).default('home'),
  campus: z.string().optional(),
  building: z.string().min(1, 'Building/Address is required'),
  room: z.string().optional(),
  landmark: z.string().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false)
});
