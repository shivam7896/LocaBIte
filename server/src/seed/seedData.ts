import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { GroceryItem } from '../models/GroceryItem';
import { Category } from '../models/Category';
import { Coupon } from '../models/Coupon';
import { DeliveryPartner } from '../models/DeliveryPartner';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { logger } from '../utils/logger';
import { importAllRazorpayStores } from './importAllRazorpayStores';

const seed = async (disconnectAfter = true) => {
  try {
    await connectDatabase();
    logger.info('Starting LocaBite database seeding...');

    // 1. Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Restaurant.deleteMany({}),
      MenuItem.deleteMany({}),
      GroceryItem.deleteMany({}),
      Category.deleteMany({}),
      Coupon.deleteMany({}),
      DeliveryPartner.deleteMany({}),
      Order.deleteMany({}),
      Cart.deleteMany({})
    ]);
    logger.info('Cleaned existing collections.');

    // 2. Seed Users
    const defaultPassword = 'Password@123';
    const adminPassword = 'AdminPassword@123';

    const users = await User.create([
      {
        name: 'Aarav Sharma',
        phone: '+91 98765 43210',
        email: 'aarav.sharma@quantum.edu.in',
        password: defaultPassword,
        role: 'customer',
        membershipLevel: 'Gold Member',
        loyaltyCoins: 420,
        selectedAddress: {
          title: 'Boys Hostel Block C',
          type: 'hostel',
          campus: 'Quantum University, Roorkee',
          building: 'Block C, Room 204',
          room: 'Room 204',
          landmark: 'Near Quadrangle Lawn',
          phone: '+91 98765 43210',
          isPrimary: true
        },
        addresses: [
          {
            title: 'Boys Hostel Block C',
            type: 'hostel',
            campus: 'Quantum University, Roorkee',
            building: 'Block C, Room 204',
            room: 'Room 204',
            landmark: 'Near Quadrangle Lawn',
            phone: '+91 98765 43210',
            isPrimary: true
          },
          {
            title: 'Central Library Ground Floor',
            type: 'department',
            campus: 'Quantum University, Roorkee',
            building: 'Academic Block A',
            room: 'Study Desk 14',
            landmark: 'Library Reception Desk',
            phone: '+91 98765 43210',
            isPrimary: false
          },
          {
            title: 'Faculty Quarters B-12',
            type: 'home',
            campus: 'Quantum University, Roorkee',
            building: 'Staff Housing Enclave',
            room: 'B-12',
            landmark: 'Opposite Main Sports Complex',
            phone: '+91 98765 43210',
            isPrimary: false
          }
        ],
        preferences: {
          dietary: ['non-veg'],
          categories: ['Burgers', 'North Indian', 'Groceries'],
          orderStyle: ['food', 'mart']
        }
      },
      {
        name: 'LocaBite Admin',
        phone: '+91 99999 88888',
        email: 'admin@locabite.com',
        password: adminPassword,
        role: 'admin',
        membershipLevel: 'Super Administrator',
        loyaltyCoins: 9999,
        addresses: []
      },
      {
        name: 'Vikram Singh (Rider)',
        phone: '+91 98123 45678',
        email: 'vikram.rider@gmail.com',
        password: defaultPassword,
        role: 'delivery_partner',
        membershipLevel: 'Premier Rider',
        loyaltyCoins: 850,
        addresses: []
      }
    ]);
    logger.info(`Seeded ${users.length} users.`);

    // 3. Seed Delivery Partner
    await DeliveryPartner.create({
      id: 'driver-1',
      name: 'Vikram Singh',
      phone: '+91 98123 45678',
      email: 'vikram.rider@gmail.com',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg',
      vehicleNumber: 'UK-08-EV-4421',
      vehicleType: 'Zero Carbon Electric Moped',
      rating: 4.9,
      deliveriesCount: 1240,
      currentLocation: {
        lat: 29.8543,
        lng: 77.888
      },
      isAvailable: true
    });
    logger.info('Seeded delivery partner.');

    // 4. Seed Quick Categories
    const categories = await Category.create([
      { id: 'all', name: 'All Dishes', type: 'food', icon: 'restaurant', color: 'bg-on-surface text-surface', order: 1 },
      { id: 'burgers', name: 'Burgers & Wraps', type: 'food', icon: 'lunch_dining', iconColor: 'text-primary', order: 2 },
      { id: 'pizza', name: 'Pizza & Italian', type: 'food', icon: 'local_pizza', iconColor: 'text-primary', order: 3 },
      { id: 'groceries', name: 'Fresh Groceries', type: 'grocery', icon: 'nutrition', iconColor: 'text-secondary', badge: '10m', order: 4 },
      { id: 'dairy', name: 'Dairy & Milk', type: 'grocery', icon: 'water_drop', iconColor: 'text-tertiary', order: 5 },
      { id: 'beverages', name: 'Beverages', type: 'food', icon: 'coffee', iconColor: 'text-primary', order: 6 },
      { id: 'desserts', name: 'Desserts', type: 'food', icon: 'bakery_dining', iconColor: 'text-primary', order: 7 },
      { id: 'snacks', name: 'Late Night Snacks', type: 'food', icon: 'cookie', iconColor: 'text-primary', order: 8 },
      { id: 'produce', name: 'Fresh Fruits & Veggies', type: 'grocery', icon: '🥦', order: 9 },
      { id: 'instant', name: 'Instant Food & Noodles', type: 'grocery', icon: '🍜', order: 10 },
      { id: 'cold-drinks', name: 'Cold Drinks & Juices', type: 'grocery', icon: '🥤', order: 11 },
      { id: 'bakery', name: 'Bakery & Biscuits', type: 'grocery', icon: '🍪', order: 12 }
    ]);
    logger.info(`Seeded ${categories.length} categories.`);

    // 5. Seed Coupons
    const coupons = await Coupon.create([
      {
        code: 'CAMPUSFREE',
        title: 'Free Delivery',
        description: 'Free delivery on orders over ₹149',
        minAmount: 149,
        discount: 20,
        discountType: 'flat',
        isActive: true,
        validTill: new Date('2027-12-31')
      },
      {
        code: 'WELCOME50',
        title: '50% OFF up to ₹100',
        description: 'Valid on orders over ₹199',
        minAmount: 199,
        discount: 50,
        discountType: 'flat',
        isActive: true,
        validTill: new Date('2027-12-31')
      },
      {
        code: 'RUSH30',
        title: 'Campus Rush Hour ₹30 OFF',
        description: 'Flat ₹30 off evening discount',
        minAmount: 120,
        discount: 30,
        discountType: 'flat',
        isActive: true,
        validTill: new Date('2027-12-31')
      },
      {
        code: 'LOCAFIRST',
        title: 'First Order ₹100 OFF',
        description: 'Flat ₹100 off on first 3 orders over ₹199',
        minAmount: 199,
        discount: 100,
        discountType: 'flat',
        isActive: true,
        validTill: new Date('2027-12-31')
      }
    ]);
    logger.info(`Seeded ${coupons.length} coupons.`);

    // 6 & 7. Seed Real Merchants & Real Products from Razorpay Storefronts
    await importAllRazorpayStores(false);



    // 8. Seed Grocery Items (10-minute mart)
    const groceryItems = await GroceryItem.create([
      {
        id: 'groc-1',
        name: 'Farm Fresh Hybrid Tomatoes',
        category: 'produce',
        subCategory: 'Fresh Veggies',
        weight: '500 g',
        price: 22,
        originalPrice: 26,
        discountPercent: 15,
        eta: '10 Mins ETA',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuC4e48WVHshbyzSkiYWA3I6EsyZshjr34MgoThLZLsCjqpxUHkFCjMvj1Hd0qc1wxWo4IJ8DMgBVAXwhExB6U-6a6zKXRu-ZlX93SGGi07c7JN3VbXQFFSXr5czQTQkIKBtY3rDlaD7GRgD5tueMXKH0cVpqin5ioH99iZ6QIVUd1OtH4NRwsO25D54W5Xn2GX4tzStlzEKsutdTl4yVB1kFUPoS2nWZwTCAU7Fg6hD3G0YPHiIZWt7',
        inStock: true,
        tags: ['Fresh', 'Under ₹50'],
        stockQuantity: 150
      },
      {
        id: 'groc-2',
        name: 'Crisp Green Bell Pepper (Capsicum)',
        category: 'produce',
        subCategory: 'Fresh Veggies',
        weight: '250 g',
        price: 28,
        originalPrice: 35,
        discountPercent: 20,
        eta: '12 Mins ETA',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCl7qaasbSZrwVMjmGWI9AVP1Yklj8kQtsfBIRUmHRfjqJPFn8CPPttAxwrXCpeGpB0omIWMDqcnuUYL1n5gAiz3JSMikpgE5QK__sYN0JqZD9wcJQaJfj38h37Me-10BYDB9ZwEPoExb-MUp2NSi7z-uDRVVA6d_rrvp6OhWPEoyRquVs5UWsC6thbTA5BQA0BUaJYWt6Um0DLTGLXHXGCM8iW5VDoKbHevAKn3nqFeCBmamClQ35G',
        inStock: true,
        tags: ['Top Deals', 'Under ₹50'],
        stockQuantity: 100
      },
      {
        id: 'groc-3',
        name: 'Whole Wheat Brown Bread Loaf',
        category: 'dairy',
        subCategory: 'Bread & Pav',
        weight: '400 g',
        price: 45,
        originalPrice: 50,
        discountPercent: 10,
        eta: '10 Mins ETA',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDVVy1KsT6mwBqT4nwmmds_n24BsinuqFmB2zCk0vANB9dRklZUdpFixNBntvCzDmOoLozPtFXqdEIIVZPc9jzOfoxeAv24MrieXLsYRvnZJYxlO7po-Pt_9vbWHVyyGeB_mPLt0C9DS-ngHRR4YQWg8iXJ5MG9Bi1E5oDfTtPgbOFsoMJutvUHjYZpU6rbgtxeeebvSX2z3a3ysCHo9hySCdtheOn_03XoV7H',
        inStock: true,
        tags: ['Daily Staple'],
        stockQuantity: 80
      },
      {
        id: 'groc-4',
        name: 'Amul Taaza Toned Milk Pouch',
        category: 'dairy',
        subCategory: 'Milk',
        weight: '500 ml',
        price: 29,
        originalPrice: 31,
        discountPercent: 6,
        eta: '10 Mins ETA',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAOVx38qF2VhmV_kCDAjHEl0M-DjTHDHPat04TCndtzzTTGc5_x3vIR9bfuj-m3bi_1sTX-v1Hegm8U6i6JUXzAaE5N_9dzxqJYL2cKOMbYO_QyT0zA-e3V0Wi0S7z5ZGx9h9hY47G3j_3PqHfeWeYAl5KYp__7wEaJ6vsawXYA7762LwdySrtv4x7O-ytb1PnPUeenOy5Pe5Pg73BTU46BibTMy6jS0hto6gi9EjPvao77ItZogJVF',
        inStock: true,
        tags: ['Top Deals', 'Under ₹50'],
        stockQuantity: 200
      },
      {
        id: 'groc-5',
        name: 'Maggi 2-Minute Masala Noodles 4-Pack',
        category: 'instant',
        subCategory: 'Noodles',
        weight: '280 g',
        price: 56,
        originalPrice: 60,
        discountPercent: 7,
        eta: '12 Mins ETA',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuANLixCWvNXMiqyWuo4h_tzV5A6hXfpQxp_ZvCzrHgIMsm4S0fTnyeoygwILbkg5kX6ZtOIF9XN0Hlf0_xwHTjlUJvVroYmyZ7VgyZV_tLDwwX7vLX9Q_8xuwcDyyYPo1RfTak2dLcljvIBMV8S9T6gsA58aXoY2oOCkz-ZL2rbPibKyjYMQfLe0-o97JuVjd0cc1R_y2vuxu_JawjhufDkqeIWTH6DHIT2oT76DMf2v1HjtKUz3pDG',
        inStock: true,
        tags: ['Late Night', 'Campus Essential'],
        stockQuantity: 120
      },
      {
        id: 'groc-6',
        name: 'Robusta Golden Bananas',
        category: 'produce',
        subCategory: 'Fresh Fruits',
        weight: '500 g (4-5 pcs)',
        price: 35,
        originalPrice: 42,
        discountPercent: 16,
        eta: '10 Mins ETA',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuD-msGrCRMig3UvYqKLWQ-Iva7EQ8Cj4hovLRkU0gdNdPNArhB1WDp54dQAePueW4sD8RxjV6PiHpyF0RD1mOZ3JTZKwpHXQTb-tketUF9xC5bGv8XwJg7z8xITCuuDqGdGt1kcT4MSiokVzUuNLYSzmVYDVId3nLBoZMTz6Y5rWARayg3nURunRFwuryn5nOvmwHJL395FQjgZ2kO5UDmywVag9NsaKif9X8oDiiEu-FTASY2AdSrl',
        inStock: true,
        tags: ['Fresh', 'Under ₹50'],
        stockQuantity: 90
      },
      {
        id: 'groc-7',
        name: 'Cold Coffee Frappe Bottle',
        category: 'cold-drinks',
        subCategory: 'Cold Coffee',
        weight: '250 ml',
        price: 99,
        originalPrice: 110,
        discountPercent: 10,
        eta: '10 Mins ETA',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBZuBkSWmh2M-FhnyLmXUza--pJ4TtdpRHTnaJ7k4FuEB2eoPA5sekePqQuQ_nQ6irmDqX0OFJFJZHrD4fTx23ZPJk_SWfTKOdhAMkpzITsnfgXzyIRMyjXlnZNo4_-bzBvLE_rDKE-dLn3oPOp6tghtBlNXEUNRhlCfxbbD3v_5gPoSeytbiYPrK0dzarcruPwHc9rlQftlTiWCKRWw26q6uQ7AeAB8tewsBYGbSZDNjqG8I5eWhJ0',
        inStock: true,
        tags: ['Beverages', 'Express 8-Min'],
        stockQuantity: 60
      },
      {
        id: 'groc-8',
        name: 'Fresh Farm Eggs (6-Pack Box)',
        category: 'dairy',
        subCategory: 'Eggs',
        weight: '6 units',
        price: 48,
        originalPrice: 55,
        discountPercent: 12,
        eta: '10 Mins ETA',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuA9p3SYeZLLdrxV5TnNE7Pwv4xbfu0x_evxzMYOCiWmCZBDuOFOxJPUZyK6tNO3zJ6G5IIi4LNIwQlcXtWp6y8fkaf9PFzcEYsvg1SSaiHrTodKeWRsqiAPHeyJs46t_95_LAo6dcI1SiyWZG8vAt5ePfeczlMDRbNzLuv05ivhiJHtoMnIFQQH6kRTmbEL94lUxkOoGuS0elhKbgSXwn4uGfsvTD41C_9qxGl3CgPymWtVOjgReP64',
        inStock: true,
        tags: ['Under ₹50', 'Fresh'],
        stockQuantity: 110
      }
    ]);
    logger.info(`Seeded ${groceryItems.length} grocery items.`);

    // 9. Seed Active Live Tracking Order (#LB-892401)
    const aaravUser = users[0];
    await Order.create({
      id: 'ord-892401',
      orderNumber: 'LB-892401',
      userId: aaravUser._id.toString(),
      placedAt: '1:15 PM',
      status: 'out_for_delivery',
      statusTimeline: [
        { status: 'placed', timestamp: new Date(Date.now() - 25 * 60 * 1000), note: 'Order placed by customer' },
        { status: 'confirmed', timestamp: new Date(Date.now() - 22 * 60 * 1000), note: 'Kitchen accepted order' },
        { status: 'prepared', timestamp: new Date(Date.now() - 15 * 60 * 1000), note: 'Meal freshly prepared & packed' },
        { status: 'picked_up', timestamp: new Date(Date.now() - 8 * 60 * 1000), note: 'Rider picked up parcel' },
        { status: 'out_for_delivery', timestamp: new Date(Date.now() - 5 * 60 * 1000), note: 'Rider on route to Boys Hostel Block C' }
      ],
      estimatedArrival: '1:35 PM',
      remainingMinutes: 12,
      itemTotal: 165,
      deliveryFee: 0,
      taxesAndHandling: 15,
      discount: 50,
      totalToPay: 130,
      appliedPromo: 'WELCOME50',
      deliveryAddress: aaravUser.selectedAddress,
      deliveryInstructions: 'Leave at door',
      driver: {
        name: 'Vikram Singh',
        phone: '+91 98123 45678',
        vehicleNumber: 'UK-08-EV-4421',
        vehicleType: 'Zero Carbon Electric Moped',
        rating: 4.9,
        deliveriesCount: 1240,
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg',
        currentLocation: {
          lat: 29.8543,
          lng: 77.888
        }
      },
      otpOnArrival: '4819',
      paymentMethod: 'UPI (Google Pay)',
      paymentStatus: 'paid',
      items: [
        {
          cartItemId: 'item-1',
          type: 'food',
          id: 'li_TYnRD6hqhBToIj',
          restaurantName: 'Pure South Indian Chutmalpur',
          name: 'Butter Masala Dosa',
          price: 95,
          quantity: 1,
          image:
            'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
          dietary: 'veg'
        },
        {
          cartItemId: 'item-2',
          type: 'food',
          id: 'li_TYnRD7F2J3IFaq',
          restaurantName: 'Pure South Indian Chutmalpur',
          name: 'Idli (2 PC)',
          price: 70,
          quantity: 1,
          image:
            'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
          dietary: 'veg'
        }
      ]
    });

    // 10. Seed Initial Cart for Aarav User
    const initialCart = new Cart({
      userId: aaravUser._id.toString(),
      items: [
        {
          cartItemId: 'init-1',
          type: 'food',
          id: 'li_TYnRD6hqhBToIj',
          restaurantId: 'st_TYnRD3iI21IWyp',
          restaurantName: 'Pure South Indian Chutmalpur',
          name: 'Butter Masala Dosa',
          image:
            'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
          dietary: 'veg',
          price: 95,
          quantity: 1
        },
        {
          cartItemId: 'init-2',
          type: 'food',
          id: 'li_TYnRD7F2J3IFaq',
          restaurantId: 'st_TYnRD3iI21IWyp',
          restaurantName: 'Pure South Indian Chutmalpur',
          name: 'Idli (2 PC)',
          image:
            'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
          dietary: 'veg',
          price: 70,
          quantity: 1
        }
      ],
      appliedPromo: 'WELCOME50',

      driverTip: 0,
      deliveryInstruction: 'Leave at door'
    });
    initialCart.calculateTotals();
    await initialCart.save();

    logger.info('✅ LocaBite database seeded successfully!');
    if (disconnectAfter) {
      await disconnectDatabase();
      process.exit(0);
    }
  } catch (error: any) {
    logger.error('❌ Seeding failed:', error);
    if (disconnectAfter) {
      process.exit(1);
    }
  }
};

export const seedInitialData = seed;

if (require.main === module) {
  seed(true);
}

