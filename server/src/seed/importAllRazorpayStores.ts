import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Cart } from '../models/Cart';
import { logger } from '../utils/logger';

// The 6 Razorpay Merchant Storefront URLs requested by user
export const RAZORPAY_STORE_URLS = [
  'https://pages.razorpay.com/stores/st_QRHvTkmJWvZpk1',
  'https://pages.razorpay.com/stores/st_T3sfS2hBZLvzTr',
  'https://pages.razorpay.com/stores/st_RlZti5YC1a8eEQ',
  'https://pages.razorpay.com/stores/st_T3sczFakza6aRu',
  'https://pages.razorpay.com/stores/st_TYnRD3iI21IWyp',
  'https://pages.razorpay.com/stores/st_TYqPp9LKgSUv42'
];

export interface StoreMetadata {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  cuisines: string[];
  rating: number;
  reviewsCount: number;
  deliveryTime: string;
  distance: string;
  deliveryFee: number;
  minOrder: number;
  bannerImage: string;
  logoImage: string;
  isPureVeg: boolean;
  badge: string;
  discountOffer: string;
  discountCode: string;
  ownerName: string;
  contactPhone: string;
  contactEmail: string;
  merchantType: 'restaurant';
  status: 'active';
  commissionRate: number;
  categories?: string[];
  address: {
    campus: string;
    building: string;
    street: string;
    city: string;
    pincode: string;
  };
}

export const MERCHANTS_CONFIG: Record<string, Partial<StoreMetadata>> = {
  st_QRHvTkmJWvZpk1: {
    name: 'Shree Shyam Shudh Vaishno Dhaba',
    slug: 'shree-shyam-shudh-vaishno-dhaba',
    tagline: 'Pure vegetarian North Indian dhaba specialties, hot parathas, wholesome thalis & curries',
    cuisines: ['North Indian', 'Dhaba', 'Thali', 'Paratha', 'Pure Veg'],
    rating: 4.8,
    reviewsCount: 285,
    deliveryTime: '20–25 min',
    distance: '1.2 km away',
    deliveryFee: 15,
    minOrder: 80,
    bannerImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://cdn.razorpay.com/logos/QRQMwJnBWUXmzL_large.png',
    isPureVeg: true,
    badge: 'Pure Vaishno',
    discountOffer: 'Flat 15% OFF',
    discountCode: 'SHYAM15',
    ownerName: 'ASHISH KUMAR SAINI',
    contactPhone: '8707046586',
    contactEmail: 'thebachelorspot@gmail.com',
    merchantType: 'restaurant',
    status: 'active',
    commissionRate: 15,
    address: {
      campus: 'Quantum University, Roorkee',
      building: 'Shyam Complex',
      street: 'Chutmalpur Highway Road',
      city: 'Chutmalpur / Roorkee',
      pincode: '247667'
    }
  },
  st_T3sfS2hBZLvzTr: {
    name: 'Ali Baik Chutmalpur',
    slug: 'ali-baik-chutmalpur',
    tagline: 'Crispy fried chicken, loaded burgers, juicy chicken pizza & aromatic biryani',
    cuisines: ['Fast Food', 'Burgers', 'Fried Chicken', 'Pizza', 'Biryani'],
    rating: 4.7,
    reviewsCount: 320,
    deliveryTime: '25–30 min',
    distance: '1.8 km away',
    deliveryFee: 20,
    minOrder: 99,
    bannerImage: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://cdn.razorpay.com/logos/T3tQKJTdeCf7dk_large.jpg',
    isPureVeg: false,
    badge: 'Crispy & Spicy',
    discountOffer: '20% OFF on Combos',
    discountCode: 'ALIBAIK20',
    ownerName: 'POONAM BAJPAI',
    contactPhone: '8707046586',
    contactEmail: 'thebachelorspot@gmail.com',
    merchantType: 'restaurant',
    status: 'active',
    commissionRate: 15,
    address: {
      campus: 'Quantum University, Roorkee',
      building: 'Ali Baik Square',
      street: 'Main Chutmalpur Chowk',
      city: 'Chutmalpur / Roorkee',
      pincode: '247667'
    }
  },
  st_RlZti5YC1a8eEQ: {
    name: "Brother's Pizza",
    slug: 'brothers-pizza',
    tagline: 'Handcrafted cheesy pizzas, sizzling momos, thick shakes & crispy loaded burgers',
    cuisines: ['Pizza', 'Italian', 'Burgers', 'Momos', 'Shakes', 'Fast Food'],
    rating: 4.6,
    reviewsCount: 410,
    deliveryTime: '20–25 min',
    distance: '1.5 km away',
    deliveryFee: 20,
    minOrder: 99,
    bannerImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
    isPureVeg: true,
    badge: 'Cheese Burst',
    discountOffer: 'Flat ₹50 OFF over ₹249',
    discountCode: 'BROTHERS50',
    ownerName: 'VIKAS CHAUHAN',
    contactPhone: '8707046586',
    contactEmail: 'thebachelorspot@gmail.com',
    merchantType: 'restaurant',
    status: 'active',
    commissionRate: 15,
    address: {
      campus: 'Quantum University, Roorkee',
      building: 'Student Market Hub',
      street: 'Main University Road',
      city: 'Chutmalpur / Roorkee',
      pincode: '247667'
    }
  },
  st_T3sczFakza6aRu: {
    name: 'Shree Radhe Vaishno Dhaba',
    slug: 'shree-radhe-vaishno-dhaba',
    tagline: 'Homestyle pure desi ghee sabzis, tandoori rotis, rich dal fry & paneer thalis',
    cuisines: ['North Indian', 'Dhaba', 'Pure Veg', 'Thali', 'Paratha'],
    rating: 4.7,
    reviewsCount: 215,
    deliveryTime: '20–25 min',
    distance: '1.3 km away',
    deliveryFee: 15,
    minOrder: 70,
    bannerImage: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://cdn.razorpay.com/logos/T3tQKJTdeCf7dk_large.jpg',
    isPureVeg: true,
    badge: 'Desi Swad',
    discountOffer: '10% OFF on Thalis',
    discountCode: 'RADHE10',
    ownerName: 'POONAM BAJPAI',
    contactPhone: '8707046586',
    contactEmail: 'thebachelorspot@gmail.com',
    merchantType: 'restaurant',
    status: 'active',
    commissionRate: 15,
    address: {
      campus: 'Quantum University, Roorkee',
      building: 'Radhe Complex',
      street: 'Highway Crossing Point',
      city: 'Chutmalpur / Roorkee',
      pincode: '247667'
    }
  },
  st_TYnRD3iI21IWyp: {
    name: 'Pure South Indian Chutmalpur',
    slug: 'pure-south-indian-chutmalpur',
    tagline: 'Crispy golden dosas, fluffy steamed idlis, fresh coconut chutney & filter coffee',
    cuisines: ['South Indian', 'Dosas', 'Breakfast', 'Fast Food', 'Pure Veg'],
    rating: 4.9,
    reviewsCount: 195,
    deliveryTime: '15–20 min',
    distance: '1.1 km away',
    deliveryFee: 15,
    minOrder: 70,
    bannerImage: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://cdn.razorpay.com/logos/T3tQKJTdeCf7dk_large.jpg',
    isPureVeg: true,
    badge: 'Authentic Dosa',
    discountOffer: 'Flat 20% OFF on Combos',
    discountCode: 'SOUTH20',
    ownerName: 'POONAM BAJPAI',
    contactPhone: '8707046586',
    contactEmail: 'thebachelorspot@gmail.com',
    merchantType: 'restaurant',
    status: 'active',
    commissionRate: 15,
    address: {
      campus: 'Quantum University, Roorkee',
      building: 'Campus Gate 2 Arcade',
      street: 'Chutmalpur Main Road',
      city: 'Chutmalpur / Roorkee',
      pincode: '247667'
    }
  },
  st_TYqPp9LKgSUv42: {
    name: 'Singh Sahab Da Punjabi Dhaba',
    slug: 'singh-sahab-da-punjabi-dhaba',
    tagline: 'Authentic Punjabi curries, buttery dal makhani, stuffed parathas & soft tandoori naans',
    cuisines: ['Punjabi', 'North Indian', 'Dhaba', 'Tandoor', 'Dal Makhani', 'Pure Veg'],
    rating: 4.8,
    reviewsCount: 260,
    deliveryTime: '20–25 min',
    distance: '1.4 km away',
    deliveryFee: 15,
    minOrder: 80,
    bannerImage: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://cdn.razorpay.com/logos/T3tQKJTdeCf7dk_large.jpg',
    isPureVeg: true,
    badge: 'Punjabi Tadka',
    discountOffer: 'Flat ₹40 OFF above ₹199',
    discountCode: 'SINGH40',
    ownerName: 'POONAM BAJPAI',
    contactPhone: '8707046586',
    contactEmail: 'thebachelorspot@gmail.com',
    merchantType: 'restaurant',
    status: 'active',
    commissionRate: 15,
    address: {
      campus: 'Quantum University, Roorkee',
      building: 'Singh Sahab Dhaba',
      street: 'Quantum Highway Point',
      city: 'Chutmalpur / Roorkee',
      pincode: '247667'
    }
  }
};

function decodeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Assigns high quality, mouth-watering dish images for items without an uploaded merchant image.
 */
function resolveDishImage(name: string, category: string, existingImages?: string[]): string {
  if (existingImages && existingImages.length > 0 && existingImages[0].startsWith('http')) {
    return existingImages[0];
  }

  const n = name.toLowerCase();
  const c = (category || '').toLowerCase();

  // Dosa & South Indian
  if (n.includes('dosa')) return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80';
  if (n.includes('idli')) return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80';
  if (n.includes('vada') || n.includes('sambar')) return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80';

  // Pizzas
  if (n.includes('margherita')) return 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop&q=80';
  if (n.includes('tex mex') || n.includes('barbeque') || (c.includes('pizza') && n.includes('chicken'))) return 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&auto=format&fit=crop&q=80';
  if (n.includes('paneer pizza')) return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80';
  if (n.includes('mushroom') || n.includes('corn pizza')) return 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800&auto=format&fit=crop&q=80';
  if (c.includes('pizza') || n.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80';

  // Burgers
  if (n.includes('chicken burger') || (c.includes('burger') && n.includes('chicken'))) return 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80';
  if (c.includes('burger') || n.includes('burger')) return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80';

  // Momos & Rolls
  if (c.includes('momos') || n.includes('momo')) return 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop&q=80';
  if (n.includes('roll') || n.includes('wrap')) return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80';

  // Sandwiches
  if (c.includes('sandwich') || n.includes('sandwich')) return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80';

  // Shakes & Beverages
  if (n.includes('chocolate') && (c.includes('shake') || n.includes('shake'))) return 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&auto=format&fit=crop&q=80';
  if (c.includes('shake') || n.includes('shake')) return 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=80';
  if (n.includes('coffee')) return 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=80';
  if (n.includes('lassi') || c.includes('lassi') || c.includes('curd')) return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80';

  // Fried Chicken & Starters
  if (n.includes('wings') || n.includes('popcorn') || n.includes('strip') || n.includes('starter') || n.includes('crispy chicken')) {
    return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80';
  }
  if (n.includes('biryani')) return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80';

  // Dals
  if (n.includes('dal makhani') || n.includes('dal fry') || n.includes('dal tadka') || c.includes('dal')) {
    return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80';
  }

  // Paneer
  if (n.includes('shahi paneer') || n.includes('kadhai paneer') || n.includes('butter masala') || n.includes('matar paneer') || n.includes('palak paneer') || c.includes('paneer')) {
    return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80';
  }

  // Parathas & Breads
  if (n.includes('paratha')) return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80';
  if (n.includes('naan') || n.includes('roti') || c.includes('roti') || c.includes('naan') || c.includes('bread')) {
    return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80';
  }

  // Rice / Pulao
  if (n.includes('pulao') || n.includes('rice') || c.includes('rice')) return 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&auto=format&fit=crop&q=80';

  // Thalis & Combos
  if (n.includes('thali') || c.includes('thali')) return 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800&auto=format&fit=crop&q=80';

  // Snacks & Pakoras
  if (n.includes('pakora') || n.includes('snack') || c.includes('snack')) return 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=800&auto=format&fit=crop&q=80';
  if (n.includes('maggi') || n.includes('noodle')) return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80';
  if (n.includes('pasta')) return 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=800&auto=format&fit=crop&q=80';
  if (n.includes('salad') || n.includes('raita') || c.includes('salad') || c.includes('raita')) return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80';
  if (n.includes('fries') || n.includes('finger')) return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&auto=format&fit=crop&q=80';

  // Homestyle Sabzis
  if (n.includes('bhindi') || n.includes('aloo') || n.includes('baingan') || n.includes('gobhi') || n.includes('chana') || n.includes('kofta') || n.includes('sev bhaji') || n.includes('mix veg')) {
    return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80';
  }

  // Default fallback appetizing dish photo
  return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80';
}

/**
 * Builds an engaging and accurate description if the merchant left it empty.
 */
function resolveDescription(name: string, description: string, merchantName: string, category: string): string {
  const cleanDesc = decodeHtml(description).trim();
  if (cleanDesc && cleanDesc.length > 5 && !cleanDesc.toLowerCase().startsWith('from ') && cleanDesc.toLowerCase() !== 'none') {
    return cleanDesc;
  }

  const n = name.toLowerCase();
  const m = decodeHtml(merchantName);

  if (n.includes('dosa')) return `Crispy golden crepe freshly prepared and served with hot spiced sambar and traditional coconut chutney from ${m}.`;
  if (n.includes('idli')) return `Fluffy, steamed savory rice and lentil cakes served hot with fragrant sambar and freshly ground chutney from ${m}.`;
  if (n.includes('pizza')) return `Oven-baked crust topped with rich herb tomato marinara, melted mozzarella cheese, and premium toppings from ${m}.`;
  if (n.includes('burger')) return `Soft toasted sesame bun loaded with a crispy savory patty, fresh lettuce, onions, and signature house sauce from ${m}.`;
  if (n.includes('momos') || n.includes('momo')) return `Steamed dumplings stuffed with seasoned fresh fillings, served with fiery red chili dipping sauce from ${m}.`;
  if (n.includes('sandwich')) return `Golden toasted bread with savory fillings, melted cheese, and green mint chutney from ${m}.`;
  if (n.includes('shake')) return `Thick creamy shake blended with chilled fresh milk, premium ice cream, and decadent syrups from ${m}.`;
  if (n.includes('biryani')) return `Aromatic basmati rice slow-cooked with saffron, caramelized brown onions, whole spices, and rich gravy from ${m}.`;
  if (n.includes('dal makhani')) return `Black lentils slow-simmered overnight on charcoal with butter, fresh dairy cream, and aromatic heirloom spices from ${m}.`;
  if (n.includes('dal')) return `Freshly tempered lentils cooked with pure desi ghee, cumin, garlic, and fresh coriander from ${m}.`;
  if (n.includes('paneer')) return `Soft cottage cheese cubes cooked in a rich, buttery, spiced aromatic gravy from ${m}.`;
  if (n.includes('paratha')) return `Crispy golden whole wheat flatbread roasted with pure ghee, served hot with butter or pickle from ${m}.`;
  if (n.includes('naan') || n.includes('roti')) return `Freshly baked clay-oven tandoori flatbread, brushed with butter and served piping hot from ${m}.`;
  if (n.includes('thali')) return `Wholesome traditional meal platter featuring signature dal, paneer/sabzi, hot rotis, steamed rice, and salad from ${m}.`;
  if (n.includes('pakora')) return `Crisp golden-fried fritters seasoned with carom seeds and Indian spices, served with tangy chutney from ${m}.`;
  if (n.includes('maggi') || n.includes('noodle')) return `Classic comfort noodles tossed with secret spices and fresh diced vegetables from ${m}.`;
  if (n.includes('lassi')) return `Traditional thick churned yogurt drink sweetened to perfection and topped with cream from ${m}.`;
  if (n.includes('rice') || n.includes('pulao')) return `Fragrant long-grain basmati rice delicately flavored with cumin seeds and whole spices from ${m}.`;

  return `Authentic, freshly prepared ${name} cooked to order with premium ingredients from ${m}.`;
}

/**
 * Determines dietary type ('veg' | 'non-veg' | 'egg').
 */
function resolveDietary(name: string, category: string, merchantId: string): 'veg' | 'non-veg' {
  if (merchantId === 'st_T3sfS2hBZLvzTr') {
    // Ali Baik has both non-veg and veg
    if (/\b(chicken|eggs?|non-?veg|meat|fish|mutton|wings|strips)\b/i.test(name) ||
        /\b(chicken|eggs?|non-?veg|meat|fish|mutton)\b/i.test(category)) {
      return 'non-veg';
    }
  }
  // All other stores are 100% pure veg
  return 'veg';
}

/**
 * Generates descriptive tags.
 */
function generateTags(name: string, category: string, merchantName: string): string[] {
  const tags = new Set<string>();
  const n = name.toLowerCase();
  const c = category.toLowerCase();

  tags.add('fresh');
  if (n.includes('special') || n.includes('sp.') || n.includes('spe.')) tags.add('bestseller');
  if (n.includes('butter') || n.includes('cheese')) tags.add('rich');
  if (n.includes('chilli') || n.includes('spicy') || n.includes('masala')) tags.add('spicy');
  if (c.includes('pizza') || n.includes('pizza')) { tags.add('pizza'); tags.add('italian'); }
  if (c.includes('burger') || n.includes('burger')) { tags.add('burger'); tags.add('fast food'); }
  if (c.includes('sandwich') || n.includes('sandwich')) { tags.add('sandwich'); tags.add('fast food'); }
  if (c.includes('dosa') || n.includes('dosa') || n.includes('idli')) { tags.add('dosa'); tags.add('south indian'); }
  if (c.includes('dal') || n.includes('dal')) { tags.add('dal'); tags.add('north indian'); }
  if (c.includes('paneer') || n.includes('paneer')) { tags.add('paneer'); tags.add('gravy'); }
  if (c.includes('paratha') || n.includes('paratha')) { tags.add('paratha'); tags.add('breakfast'); }
  if (c.includes('roti') || c.includes('naan') || n.includes('roti') || n.includes('naan')) { tags.add('tandoor'); tags.add('bread'); }
  if (c.includes('shake') || n.includes('shake') || n.includes('lassi') || n.includes('coffee')) { tags.add('shake'); tags.add('cold'); }
  if (c.includes('momos') || n.includes('momo') || n.includes('pakora')) { tags.add('momos'); tags.add('quick bite'); }
  if (c.includes('chicken') || n.includes('chicken') || n.includes('wings') || n.includes('popcorn')) { tags.add('chicken'); tags.add('crispy'); }
  if (c.includes('rice') || c.includes('biryani') || n.includes('rice') || n.includes('biryani')) { tags.add('rice'); }
  if (c.includes('thali') || n.includes('thali')) { tags.add('thali'); tags.add('combo'); }

  return Array.from(tags).slice(0, 5);
}

/**
 * Main importer function
 */
export const importAllRazorpayStores = async (disconnectAfter = true) => {
  try {
    await connectDatabase();
    logger.info('🚀 Starting Razorpay Stores import for all 6 merchant storefronts...');

    // 1. Load or fetch scraped data
    let storesData: Array<{ url: string; store: any; merchant: any }> = [];

    const localCachePath = path.resolve(__dirname, '../../scraped_razorpay_stores.json');
    if (fs.existsSync(localCachePath)) {
      logger.info(`📂 Loading cached scraped data from ${localCachePath}...`);
      storesData = JSON.parse(fs.readFileSync(localCachePath, 'utf-8'));
    }

    // If cache is empty or incomplete, fetch dynamically
    if (storesData.length < RAZORPAY_STORE_URLS.length) {
      logger.info('🌐 Fetching live store data directly from Razorpay storefront URLs...');
      storesData = [];
      for (const url of RAZORPAY_STORE_URLS) {
        try {
          const res = await fetch(url);
          const html = await res.text();
          const match = html.match(/window\.__REACT_QUERY_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
          if (match) {
            const parsed = JSON.parse(match[1]);
            const storeQuery = parsed.queries.find((q: any) => q.state?.data?.store);
            if (storeQuery?.state?.data?.store) {
              storesData.push({
                url,
                store: storeQuery.state.data.store,
                merchant: storeQuery.state.data.merchant
              });
            }
          }
        } catch (fetchErr: any) {
          logger.warn(`Failed live fetch for ${url}: ${fetchErr.message}`);
        }
      }
    }

    logger.info(`📦 Ready to process ${storesData.length} merchant stores.`);

    const targetStoreIds = Object.keys(MERCHANTS_CONFIG);

    // 2. Clear out all dummy products and menu items from MongoDB
    logger.info('🧹 Cleaning up dummy products and menu items from database...');
    const deletedProducts = await Product.deleteMany({});
    const deletedMenuItems = await MenuItem.deleteMany({});
    logger.info(`   Deleted ${deletedProducts.deletedCount} old products and ${deletedMenuItems.deletedCount} old menu items.`);

    // 3. Clear out dummy restaurants (keep only the 6 real merchant storefronts)
    const deletedOldRestaurants = await Restaurant.deleteMany({ id: { $nin: targetStoreIds } });
    logger.info(`   Removed ${deletedOldOldRestaurantsCount(deletedOldRestaurants)} dummy / test restaurant entities.`);

    let totalProductsImported = 0;
    const allCategoriesSet = new Set<string>();

    // 4. Import each merchant and their real products
    for (const item of storesData) {
      const storeId = item.store.id;
      const config = MERCHANTS_CONFIG[storeId];
      if (!config) {
        logger.warn(`Skipping unknown store ID: ${storeId}`);
        continue;
      }

      const storeTitle = decodeHtml(config.name || item.store.title);
      const merchantOwner = decodeHtml(config.ownerName || item.merchant?.name || 'Authorized Merchant');
      const storeCategories: string[] = item.store.categories?.map((c: any) => decodeHtml(c.categoryName)) || [];

      logger.info(`\n🏬 Importing Merchant: "${storeTitle}" [ID: ${storeId}]...`);

      // Refined Category Resolver ensuring accurate product taxonomy across all stores
      const resolveCategory = (rawCat: string, prodName: string): string => {
        const decoded = decodeHtml(rawCat || 'Specials').trim();
        const n = prodName.toLowerCase();

        // Priority check for Thalis
        if (n.includes('thali') || decoded.includes('Thali')) {
          return 'Thalis';
        }

        // Priority check for Parathas
        if (n.includes('paratha') || decoded.includes('Paratha')) {
          return 'Parathas';
        }

        if (storeId === 'st_TYqPp9LKgSUv42') { // Singh Sahab Da Punjabi Dhaba
          if (n.includes('dal')) return 'Dals & Lentils';
          if (n.includes('paneer') || n.includes('kofta')) return 'Paneer Specials';
          if (n.includes('naan') || n.includes('roti')) return 'Tandoori Roti & Naan';
          return 'Main Course Sabzis';
        }

        if (storeId === 'st_RlZti5YC1a8eEQ') { // Brother's Pizza
          if (decoded === 'Extras') {
            if (n.includes('burger')) return 'Burgers';
            if (n.includes('garlic bread')) return 'Garlic Bread & Sides';
            if (n.includes('roll')) return 'Rolls & Wraps';
            if (n.includes('pasta')) return 'Pastas';
            if (n.includes('fries') || n.includes('tostee')) return 'Snacks';
            return 'Garlic Bread & Sides';
          }
          if (decoded === 'Sandwich') return 'Sandwiches';
          if (decoded === 'Shake') return 'Shakes & Cold Coffee';
          if (decoded === 'Momos') return 'Momos';
          if (decoded.includes('Pizza')) return decoded;
        }

        if (storeId === 'st_T3sfS2hBZLvzTr') { // Ali Baik Chutmalpur
          if (decoded === 'Non-Veg Starters') return 'Crispy Chicken & Starters';
          if (decoded.includes('Burger') || decoded.includes('Sandwich') || n.includes('burger') || n.includes('sandwich')) return 'Burgers & Sandwiches';
          if (decoded.includes('Biryani') || n.includes('biryani')) return 'Biryani Specials';
          if (decoded.includes('Beverages') || decoded === 'Others') {
            if (n.includes('shake') || n.includes('coffee') || n.includes('lassi') || n.includes('kheer')) return 'Beverages & Shakes';
          }
          if (decoded.includes('Regular Pizza') || (decoded === 'Others' && n.includes('pizza'))) return 'Regular Pizzas';
          if (decoded.includes('Medium Pizza')) return 'Medium Pizzas';
          if (decoded === 'Combo') return 'Combos';
        }

        if (storeId === 'st_TYnRD3iI21IWyp') { // Pure South Indian
          if (n.includes('dosa')) return 'Dosa Specials';
          if (n.includes('idli')) return 'South Indian Snacks';
          if (n.includes('sandwich')) return 'Sandwiches';
        }

        if (storeId === 'st_T3sczFakza6aRu') { // Shree Radhe Vaishno Dhaba
          if (decoded === 'Dal') return 'Dals';
          if (decoded === 'Paneer') return 'Paneer Specials';
          if (decoded.includes('Vegetable') || decoded === 'Others') return 'Main Course Sabzis';
          if (decoded === 'Rice Combo') return 'Rice Combos';
          if (decoded === 'Rice') return 'Rice & Pulao';
          if (decoded === 'Naan' || decoded === 'Roti') return 'Tandoori Roti & Naan';
          if (decoded === 'Snacks') return 'Snacks & Pakoras';
        }

        if (storeId === 'st_QRHvTkmJWvZpk1') { // Shree Shyam Shudh Vaishno Dhaba
          if (decoded === 'Dal') return 'Dals';
          if (decoded === 'Paneer') return 'Paneer Specials';
          if (decoded.includes('Vegetable')) return 'Main Course Sabzis';
          if (decoded.includes('Rice') || decoded.includes('Combo')) return 'Rice & Combos';
          if (decoded.includes('Breads')) return 'Tandoori Roti & Naan';
          if (decoded === 'Snacks') return 'Snacks & Pakoras';
          if (decoded === 'Lassi' || decoded === 'Raita' || decoded === 'Curd' || decoded === 'Salads') return 'Lassi & Accompaniments';
        }

        if (decoded !== 'Others') return decoded;
        return 'Main Course Sabzis';
      };


      // Process real products
      const rawProducts = item.store.products || [];
      logger.info(`   Processing ${rawProducts.length} real products...`);

      // Determine clean dynamic categories for this merchant
      const dynamicStoreCategories = Array.from(new Set(rawProducts.map((p: any) => resolveCategory(p.categories?.[0]?.name, p.name))));

      // Upsert Restaurant
      const restaurantDoc = await Restaurant.findOneAndUpdate(
        { id: storeId },
        {
          $set: {
            ...config,
            id: storeId,
            name: storeTitle,
            ownerName: merchantOwner,
            contactPhone: config.contactPhone || item.merchant?.support_details?.support_mobile || '8707046586',
            contactEmail: config.contactEmail || item.merchant?.support_details?.support_email || 'thebachelorspot@gmail.com',
            categories: dynamicStoreCategories.length > 0 ? dynamicStoreCategories : config.categories || ['Dishes'],
            isOpen: true
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      logger.info(`   ✅ Merchant "${restaurantDoc.name}" upserted.`);

      const menuItemsToInsert = [];
      const productsToInsert = [];

      for (const p of rawProducts) {
        const prodId = p.id;
        const prodName = decodeHtml(p.name);
        const categoryName = resolveCategory(p.categories?.[0]?.name, prodName);
        allCategoriesSet.add(categoryName);

        // Price in paise -> convert to rupees
        // In Razorpay: selling_price is MRP / originalPrice, discounted_price is the active selling price
        const sellingPricePaise = p.selling_price || 0;
        const discountedPricePaise = p.discounted_price || 0;

        let price = discountedPricePaise > 0 ? discountedPricePaise / 100 : sellingPricePaise / 100;
        let originalPrice = sellingPricePaise > 0 ? sellingPricePaise / 100 : price;
        if (price > originalPrice) {
          originalPrice = price;
        }
        const discount = Math.max(0, originalPrice - price);

        const description = resolveDescription(prodName, p.description || '', storeTitle, categoryName);
        const image = resolveDishImage(prodName, categoryName, p.images);
        const dietary = resolveDietary(prodName, categoryName, storeId);
        const tags = generateTags(prodName, categoryName, storeTitle);

        // MenuItem doc
        const menuItemDoc = {
          id: prodId,
          sku: prodId,
          restaurantId: storeId,
          name: prodName,
          description,
          price,
          originalPrice,
          mrp: originalPrice,
          discount,
          tax: 5,
          image,
          dietary,
          category: categoryName,
          subCategory: p.categories?.[1]?.name ? decodeHtml(p.categories[1].name) : '',
          brand: storeTitle,
          stockQuantity: 50,
          lowStockThreshold: 10,
          rating: Number((4.5 + (prodId.charCodeAt(prodId.length - 1) % 5) * 0.1).toFixed(1)),
          reviewsCount: 15 + (prodId.charCodeAt(prodId.length - 2) % 40),
          isPopular: discount > 0 || price < 150,
          isCustomizable: false,
          customizationGroups: [],
          isAvailable: true,
          status: 'active' as const,
          featured: totalProductsImported % 15 === 0,
          tags
        };
        menuItemsToInsert.push(menuItemDoc);

        // Product doc (Unified catalog)
        const productDoc = {
          id: prodId,
          sku: prodId,
          name: prodName,
          description,
          price,
          originalPrice,
          mrp: originalPrice,
          discount,
          category: categoryName,
          subCategory: p.categories?.[1]?.name ? decodeHtml(p.categories[1].name) : '',
          merchantId: storeId,
          merchantName: storeTitle,
          image,
          isAvailable: true,
          stockQuantity: 50,
          lowStockThreshold: 10,
          productType: 'food' as const,
          unit: '1 Plate / Serving',
          tags,
          dietary,
          rating: menuItemDoc.rating,
          reviewsCount: menuItemDoc.reviewsCount,
          status: 'active' as const,
          featured: menuItemDoc.featured
        };
        productsToInsert.push(productDoc);
      }

      // Bulk insert for high performance
      if (menuItemsToInsert.length > 0) {
        await MenuItem.insertMany(menuItemsToInsert);
      }
      if (productsToInsert.length > 0) {
        await Product.insertMany(productsToInsert);
      }

      totalProductsImported += rawProducts.length;
      logger.info(`   ✅ Inserted ${rawProducts.length} items for "${storeTitle}".`);
    }

    // 5. Upsert Categories
    logger.info('\n📑 Updating Category collection for storefront navigation...');
    const mainCategories = [
      { id: 'all', name: 'All Dishes', type: 'food', icon: 'restaurant', color: 'bg-on-surface text-surface', order: 1 },
      { id: 'pizzas', name: 'Pizzas & Garlic Breads', type: 'food', icon: 'local_pizza', order: 2 },
      { id: 'burgers', name: 'Burgers & Sandwiches', type: 'food', icon: 'lunch_dining', order: 3 },
      { id: 'south-indian', name: 'Dosa & South Indian', type: 'food', icon: 'ramen_dining', order: 4 },
      { id: 'fried-chicken', name: 'Crispy Fried Chicken', type: 'food', icon: 'kebab_dining', order: 5 },
      { id: 'biryani-rice', name: 'Biryani & Rice Bowls', type: 'food', icon: 'dinner_dining', order: 6 },
      { id: 'paneer', name: 'Paneer Specials', type: 'food', icon: 'set_meal', order: 7 },
      { id: 'dals-sabzis', name: 'Dals & Homestyle Sabzis', type: 'food', icon: 'soup_kitchen', order: 8 },
      { id: 'parathas-breads', name: 'Parathas & Tandoori Breads', type: 'food', icon: 'bakery_dining', order: 9 },
      { id: 'thalis', name: 'Thalis & Combos', type: 'food', icon: 'bento', order: 10 },
      { id: 'snacks', name: 'Momos & Quick Snacks', type: 'food', icon: 'cookie', order: 11 },
      { id: 'beverages', name: 'Shakes, Lassi & Drinks', type: 'food', icon: 'local_cafe', order: 12 },
      { id: 'groceries', name: 'Fresh Groceries', type: 'grocery', icon: 'nutrition', badge: '10m', order: 13 },
      { id: 'dairy', name: 'Dairy & Milk', type: 'grocery', icon: 'water_drop', order: 14 }
    ];

    const activeCatIds = mainCategories.map(c => c.id);
    await Category.deleteMany({ id: { $nin: activeCatIds } });

    for (const cat of mainCategories) {
      await Category.findOneAndUpdate(
        { id: cat.id },
        { $set: { ...cat, isVisible: true } },
        { upsert: true }
      );
    }

    // 6. Fix Aarav's cart and any cart that had old dummy items
    const sampleRealProduct = await Product.findOne({ merchantId: 'st_TYnRD3iI21IWyp' }).lean();
    if (sampleRealProduct) {
      await Cart.updateMany(
        { 'items.id': { $nin: targetStoreIds } },
        {
          $set: {
            items: [
              {
                cartItemId: 'cart-init-real',
                type: 'food',
                id: sampleRealProduct.id,
                restaurantId: sampleRealProduct.merchantId,
                restaurantName: sampleRealProduct.merchantName,
                name: sampleRealProduct.name,
                image: sampleRealProduct.image,
                dietary: sampleRealProduct.dietary,
                price: sampleRealProduct.price,
                quantity: 1
              }
            ],
            appliedPromo: 'WELCOME50',
            itemTotal: sampleRealProduct.price,
            totalToPay: Math.max(0, sampleRealProduct.price - 50 + 20)
          }
        }
      );
      logger.info('🛒 Reset active carts to use real merchant product.');
    }

    logger.info(`\n🎉 DONE! Successfully imported ${totalProductsImported} real merchant products across 6 stores into MongoDB!`);
    return {
      success: true,
      totalProducts: totalProductsImported,
      storesCount: storesData.length
    };
  } catch (error: any) {
    logger.error('❌ Error during Razorpay stores import:', error);
    throw error;
  } finally {
    if (disconnectAfter) {
      await disconnectDatabase();
    }
  }
};

function deletedOldOldRestaurantsCount(res: any): number {
  return res?.deletedCount || 0;
}

if (require.main === module) {
  importAllRazorpayStores(true)
    .then(result => {
      console.log('Result:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
