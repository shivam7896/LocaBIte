import { z } from 'zod';

export const addCartItemSchema = z.object({
  type: z.enum(['food', 'grocery']),
  productId: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  price: z.number().optional(),
  restaurantName: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  customizations: z
    .object({
      size: z.object({ id: z.string(), name: z.string(), price: z.number() }).optional(),
      addons: z.array(z.object({ id: z.string(), name: z.string(), price: z.number() })).optional(),
      spiceLevel: z.string().optional()
    })
    .optional()
});

export const updateCartItemQtySchema = z.object({
  cartItemId: z.string().min(1, 'Cart Item ID is required'),
  delta: z.number().int()
});

export const applyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required')
});

export const updateDeliveryInstructionSchema = z.object({
  instruction: z.string().max(200)
});

export const updateTipSchema = z.object({
  tip: z.number().min(0)
});
