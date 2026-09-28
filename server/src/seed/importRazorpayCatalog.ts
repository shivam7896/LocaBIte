import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { logger } from '../utils/logger';

// Real store metadata extracted from Razorpay Webstore: https://pages.razorpay.com/stores/st_TYnRD3iI21IWyp
export const RAZORPAY_STORE = {
  id: 'st_TYnRD3iI21IWyp',
  name: 'Pure South Indian Chutmalpur',
  slug: 'pure-south-indian-chutmalpur',
  tagline: 'Authentic South Indian dosas, idlis & breakfast snacks',
  cuisines: ['South Indian', 'Dosas', 'Breakfast', 'Fast Food'],
  rating: 4.8,
  reviewsCount: 140,
  deliveryTime: '20-25 min',
  distance: '1.1 km away',
  deliveryFee: 15,
  minOrder: 70,
  bannerImage: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=1200&auto=format&fit=crop&q=80',
  logoImage: 'https://cdn.razorpay.com/logos/T3tQKJTdeCf7dk_large.jpg',
  isPureVeg: true,
  badge: 'Authentic Dosa',
  discountOffer: 'Flat 20% OFF on Combos',
  discountCode: 'SOUTH20',
  fssaiLicense: '10019022008472',
  categories: ['Dosa Specials', 'Breakfast & Snacks', 'Sandwiches', 'Others'],
  isOpen: true,
  ownerName: 'POONAM BAJPAI',
  contactPhone: '8707046586',
  contactEmail: 'thebachelorspot@gmail.com',
  merchantType: 'restaurant' as const,
  status: 'active' as const,
  commissionRate: 15,
  address: {
    campus: 'Quantum University, Roorkee',
    building: 'Chutmalpur Road Market',
    street: 'Main Highway Point',
    city: 'Chutmalpur / Roorkee',
    pincode: '247667'
  }
};

// Real products extracted from Razorpay Webstore
export const RAZORPAY_PRODUCTS = [
  {
    sku: 'li_TYnRD6hqhBToIj',
    id: 'li_TYnRD6hqhBToIj',
    name: 'Butter Masala Dosa',
    description: 'Butter Masala Dosa From Pure South Indian Chutmalpur',
    price: 95,
    originalPrice: 115,
    mrp: 115,
    discount: 20,
    category: 'Dosa Specials',
    subCategory: 'Dosas',
    dietary: 'veg' as const,
    stockQuantity: 100,
    lowStockThreshold: 10,
    unit: '1 Plate (with Sambar & Chutneys)',
    tags: ['dosa', 'south indian', 'butter', 'crispy', 'popular'],
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    status: 'active' as const,
    productType: 'food' as const
  },
  {
    sku: 'li_TYnRD6HTnBVwzy',
    id: 'li_TYnRD6HTnBVwzy',
    name: 'Masala Dosa',
    description: 'Masala Dosa from Pure South Indian Chutmalpur',
    price: 75,
    originalPrice: 100,
    mrp: 100,
    discount: 25,
    category: 'Dosa Specials',
    subCategory: 'Dosas',
    dietary: 'veg' as const,
    stockQuantity: 100,
    lowStockThreshold: 10,
    unit: '1 Plate (with Sambar & Chutneys)',
    tags: ['dosa', 'south indian', 'masala dosa', 'classic'],
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    status: 'active' as const,
    productType: 'food' as const
  },
  {
    sku: 'li_TYnRD6yFygbhbp',
    id: 'li_TYnRD6yFygbhbp',
    name: 'Paneer Masala Dosa',
    description: 'Paneer Masala Dosa From Pure South Indian Chutmalpur',
    price: 115,
    originalPrice: 130,
    mrp: 130,
    discount: 15,
    category: 'Dosa Specials',
    subCategory: 'Dosas',
    dietary: 'veg' as const,
    stockQuantity: 100,
    lowStockThreshold: 10,
    unit: '1 Plate (with Sambar & Chutneys)',
    tags: ['paneer', 'dosa', 'south indian', 'special'],
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    status: 'active' as const,
    productType: 'food' as const
  },
  {
    sku: 'li_TYnRD7F2J3IFaq',
    id: 'li_TYnRD7F2J3IFaq',
    name: 'Idli (2 PC)',
    description: 'Idli from Pure South Indian Chutmalpur',
    price: 70,
    originalPrice: 100,
    mrp: 100,
    discount: 30,
    category: 'Breakfast & Snacks',
    subCategory: 'Steamed',
    dietary: 'veg' as const,
    stockQuantity: 100,
    lowStockThreshold: 10,
    unit: '2 Pieces (Steamed rice cakes with gun powder & sambar)',
    tags: ['idli', 'south indian', 'steamed', 'healthy', 'breakfast'],
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    status: 'active' as const,
    productType: 'food' as const
  },
  {
    sku: 'li_TYnRD7VSqNIKtm',
    id: 'li_TYnRD7VSqNIKtm',
    name: 'Special Sandwich',
    description: 'Special Sandwich By Pure South Indian Chutmalpur',
    price: 89,
    originalPrice: 120,
    mrp: 120,
    discount: 31,
    category: 'Sandwiches',
    subCategory: 'Grilled',
    dietary: 'veg' as const,
    stockQuantity: 100,
    lowStockThreshold: 10,
    unit: '1 Sandwich (Grilled & served with mint dip)',
    tags: ['sandwich', 'quick bite', 'grilled', 'cheese'],
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    status: 'active' as const,
    productType: 'food' as const
  }
];

export { importAllRazorpayStores as importRazorpayCatalog } from './importAllRazorpayStores';
export * from './importAllRazorpayStores';

if (require.main === module) {
  const { importAllRazorpayStores } = require('./importAllRazorpayStores');
  importAllRazorpayStores(true)
    .then(() => {
      console.log('Razorpay multi-merchant catalog import finished.');
      process.exit(0);
    })
    .catch((err: any) => {
      console.error('Catalog import error:', err);
      process.exit(1);
    });
}

