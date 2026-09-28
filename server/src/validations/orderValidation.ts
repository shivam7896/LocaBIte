import { z } from 'zod';
import { addressSchema } from './authValidation';

export const createOrderSchema = z.object({
  deliveryAddress: addressSchema,
  deliveryInstructions: z.string().optional(),
  paymentMethod: z.string().default('UPI (Google Pay)'),
  appliedPromo: z.string().optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'placed',
    'confirmed',
    'prepared',
    'picked_up',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'failed'
  ]),
  note: z.string().optional()
});

export const verifyPaymentSignatureSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required')
});
