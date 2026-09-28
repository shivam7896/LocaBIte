import { z } from 'zod';

export const createCouponAdminSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  title: z.string().min(3),
  description: z.string().min(5),
  minAmount: z.number().min(0),
  discount: z.number().min(1),
  discountType: z.enum(['flat', 'percentage']).default('flat'),
  maxDiscount: z.number().optional(),
  validTill: z.string().optional()
});

export const updateRoleSchema = z.object({
  role: z.enum(['customer', 'restaurant_owner', 'grocery_owner', 'delivery_partner', 'admin'])
});

export const createRestaurantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  tagline: z.string().default(''),
  cuisines: z.array(z.string()).default([]),
  deliveryTime: z.string().default('20–25 min'),
  distance: z.string().default('1.0 km away'),
  deliveryFee: z.number().default(20),
  minOrder: z.number().default(99),
  bannerImage: z.string().url(),
  logoImage: z.string().url(),
  isPureVeg: z.boolean().default(false),
  badge: z.string().optional(),
  discountOffer: z.string().optional(),
  discountCode: z.string().optional(),
  fssaiLicense: z.string().optional(),
  categories: z.array(z.string()).default([])
});

export const createMenuItemSchema = z.object({
  restaurantId: z.string(),
  name: z.string().min(2),
  description: z.string().default(''),
  price: z.number().min(0),
  originalPrice: z.number().optional(),
  image: z.string().url(),
  dietary: z.enum(['veg', 'non-veg', 'egg', 'vegan']).default('veg'),
  category: z.string(),
  isPopular: z.boolean().default(false),
  isCustomizable: z.boolean().default(false),
  customizationGroups: z.array(z.any()).default([])
});

export const createGroceryItemSchema = z.object({
  name: z.string().min(2),
  category: z.string(),
  subCategory: z.string().optional(),
  weight: z.string(),
  price: z.number().min(0),
  originalPrice: z.number().min(0),
  discountPercent: z.number().default(0),
  eta: z.string().default('10 Mins ETA'),
  image: z.string().url(),
  inStock: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  stockQuantity: z.number().default(100)
});
