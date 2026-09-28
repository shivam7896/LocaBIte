import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { GroceryItem } from '../models/GroceryItem';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Order } from '../models/Order';
import { Coupon } from '../models/Coupon';
import { DeliveryPartner } from '../models/DeliveryPartner';
import { AuditLog } from '../models/AuditLog';
import { Payment } from '../models/Payment';
import { emitOrderStatusUpdate } from '../sockets/orderSocket';
import { sendResponse, sendError } from '../utils/apiResponse';
import { EmailService } from '../services/emailService';
import { logger } from '../utils/logger';

const getMerchantForUser = async (user: any): Promise<any> => {
  if (!user || user.role !== 'restaurant_owner') return null;
  return (
    await Restaurant.findOne({
      $or: [
        { contactEmail: user.email },
        { ownerName: user.name || user.email },
        { id: user.merchantId }
      ]
    }) || await Restaurant.findOne()
  );
};

export class AdminController {
  /**
   * 1. Dashboard Comprehensive Statistics & Charts
   */
  static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const merchant = await getMerchantForUser(req.user);

      let [
        totalUsers,
        totalCustomers,
        totalOrders,
        ordersToday,
        activeOrdersCount,
        allRestaurants,
        menuItems,
        groceryItems,
        totalCoupons,
        allOrders,
        recentOrders,
        recentAuditLogs
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'customer' }),
        Order.countDocuments(),
        Order.countDocuments({ createdAt: { $gte: startOfToday } }),
        Order.countDocuments({ status: { $in: ['placed', 'confirmed', 'prepared', 'picked_up', 'out_for_delivery'] } }),
        Restaurant.find().sort({ createdAt: -1 }),
        MenuItem.find(),
        GroceryItem.find(),
        Coupon.countDocuments(),
        Order.find().select('status totalToPay createdAt items deliveryAddress'),
        Order.find().sort({ createdAt: -1 }).limit(10),
        AuditLog.find().sort({ timestamp: -1 }).limit(8)
      ]);

      // If logged in as restaurant_owner, scope metrics strictly to this merchant!
      if (merchant) {
        menuItems = menuItems.filter(m => m.restaurantId === merchant.id);
        groceryItems = groceryItems.filter(g => g.merchantId === merchant.id);
        allOrders = allOrders.filter(o => o.items?.some((it: any) => it.restaurantId === merchant.id));
        recentOrders = recentOrders.filter(o => o.items?.some((it: any) => it.restaurantId === merchant.id));
        totalOrders = allOrders.length;
        ordersToday = allOrders.filter(o => new Date(o.createdAt) >= startOfToday).length;
        activeOrdersCount = allOrders.filter(o => ['placed', 'confirmed', 'prepared', 'picked_up', 'out_for_delivery'].includes(o.status)).length;
      }

      const totalRevenue = allOrders
        .filter(o => o.status !== 'cancelled' && o.status !== 'failed')
        .reduce((sum, o) => sum + (o.totalToPay || 0), 0);

      const activeMerchants = allRestaurants.filter(r => r.status === 'active' || !r.status).length;
      const pendingMerchants = allRestaurants.filter(r => r.status === 'pending').length;

      // Low stock products count
      const lowStockDishes = menuItems.filter(m => (m.stockQuantity || 50) <= (m.lowStockThreshold || 10));
      const lowStockGroceries = groceryItems.filter(g => (g.stockQuantity || 100) <= (g.lowStockThreshold || 15));
      const lowStockCount = lowStockDishes.length + lowStockGroceries.length;

      // Calculate last 7 days chart data
      const salesChart = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

        const daysOrders = allOrders.filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= dayStart && orderDate <= dayEnd;
        });

        const dayRevenue = daysOrders
          .filter(o => o.status !== 'cancelled' && o.status !== 'failed')
          .reduce((sum, o) => sum + (o.totalToPay || 0), 0);

        salesChart.push({
          day: dayLabel,
          date: dayStart.toISOString().split('T')[0],
          sales: dayRevenue,
          orders: daysOrders.length
        });
      }

      // Top Selling Products
      const itemCounts: Record<string, { name: string; quantity: number; sales: number; image: string }> = {};
      allOrders.forEach(o => {
        if (o.status !== 'cancelled' && o.status !== 'failed' && o.items) {
          o.items.forEach(it => {
            const key = it.name || it.cartItemId;
            if (!itemCounts[key]) {
              itemCounts[key] = { name: it.name, quantity: 0, sales: 0, image: it.image || '' };
            }
            itemCounts[key].quantity += (it.quantity || 1);
            itemCounts[key].sales += (it.price || 0) * (it.quantity || 1);
          });
        }
      });

      const topProducts = Object.values(itemCounts)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Top Merchants
      const topMerchants = allRestaurants.slice(0, 5).map(r => ({
        id: r.id,
        name: r.name,
        logoImage: r.logoImage,
        rating: r.rating,
        reviewsCount: r.reviewsCount,
        ordersCount: 42 + Math.floor((r.rating || 4) * 20),
        revenue: 15400 + Math.floor((r.rating || 4) * 5200)
      }));

      return sendResponse({
        res,
        data: {
          metrics: {
            totalRevenue,
            totalOrders,
            ordersToday,
            activeOrdersCount,
            totalUsers,
            totalCustomers,
            activeMerchants,
            pendingMerchants,
            totalProducts: menuItems.length + groceryItems.length,
            lowStockCount,
            activeCoupons: totalCoupons
          },
          salesChart,
          topProducts,
          topMerchants,
          recentOrders,
          recentMerchantActivity: recentAuditLogs
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * 2. Users Management
   */
  static async getUsers(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { role, search } = req.query;
      const query: Record<string, any> = {};

      if (role && typeof role === 'string' && role !== 'all') {
        query.role = role;
      }
      if (search && typeof search === 'string') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query).select('-password -otpCode').sort({ createdAt: -1 });

      return sendResponse({
        res,
        data: users,
        meta: { total: users.length }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { userId } = req.params;
    const { role } = req.body;
    try {
      const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password -otpCode');
      if (!user) return sendError(res, 'User not found', 404);

      // If elevated to delivery partner or rider, ensure a DeliveryPartner record is active
      if (role === 'delivery_partner' || role === 'rider') {
        const query: any[] = [];
        if (user.email) query.push({ email: user.email.toLowerCase().trim() });
        if (user.phone) query.push({ phone: user.phone });
        query.push({ id: user._id.toString() });

        let dp = await DeliveryPartner.findOne({ $or: query });
        if (!dp) {
          const defaultAvatar =
            user.avatar ||
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg';
          dp = new DeliveryPartner({
            id: `driver-${Date.now().toString().slice(-6)}`,
            name: user.name || 'Campus Express Rider',
            phone: user.phone || '+91 98123 45678',
            email: user.email ? user.email.toLowerCase().trim() : undefined,
            avatar: defaultAvatar,
            vehicleNumber: `UK-08-EV-${Math.floor(1000 + Math.random() * 9000)}`,
            vehicleType: 'Zero Carbon Electric Moped',
            rating: 4.9,
            deliveriesCount: 0,
            currentLocation: { lat: 29.8543, lng: 77.888 },
            isAvailable: true
          });
          await dp.save();
        } else if (user.email && !dp.email) {
          dp.email = user.email.toLowerCase().trim();
          await dp.save();
        }
      }

      return sendResponse({
        res,
        message: `User role updated to ${role}. ${role === 'delivery_partner' || role === 'rider' ? 'Rider terminal access granted for personal email.' : ''}`,
        data: user
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async toggleUserStatus(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { userId } = req.params;
    try {
      const user = await User.findById(userId);
      if (!user) return sendError(res, 'User not found', 404);

      user.isActive = !user.isActive;
      await user.save();

      return sendResponse({
        res,
        message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
        data: user
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * 3. Merchants Management
   */
  static async getMerchants(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { type, status, search } = req.query;
      const query: Record<string, any> = {};

      if (type && typeof type === 'string' && type !== 'all') {
        query.merchantType = type;
      }
      if (status && typeof status === 'string' && status !== 'all') {
        query.status = status;
      }
      if (search && typeof search === 'string') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { tagline: { $regex: search, $options: 'i' } },
          { contactEmail: { $regex: search, $options: 'i' } }
        ];
      }

      const merchants = await Restaurant.find(query).sort({ createdAt: -1 });

      return sendResponse({
        res,
        data: merchants,
        meta: { total: merchants.length }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getMerchantById(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      const merchant = await Restaurant.findOne({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });
      if (!merchant) return sendError(res, 'Merchant not found', 404);

      // Associated products and orders
      const [dishes, orders] = await Promise.all([
        MenuItem.find({ restaurantId: merchant.id }),
        Order.find({ 'items.restaurantId': merchant.id }).sort({ createdAt: -1 }).limit(20)
      ]);

      return sendResponse({
        res,
        data: {
          merchant,
          products: dishes,
          recentOrders: orders,
          stats: {
            productsCount: dishes.length,
            totalOrders: orders.length,
            revenue: orders.reduce((s, o) => s + (o.totalToPay || 0), 0)
          }
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateMerchantStatus(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    const { status, reason } = req.body; // status: active, pending, rejected, suspended
    try {
      const merchant = await Restaurant.findOne({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });
      if (!merchant) return sendError(res, 'Merchant not found', 404);

      merchant.status = status;
      if (reason) merchant.rejectionReason = reason;
      if (status === 'active') merchant.isOpen = true;
      if (status === 'suspended' || status === 'rejected') merchant.isOpen = false;

      await merchant.save();

      return sendResponse({
        res,
        message: `Merchant status updated to ${status}`,
        data: merchant
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateMerchantCommission(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    const { commissionRate } = req.body;
    try {
      const merchant = await Restaurant.findOne({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });
      if (!merchant) return sendError(res, 'Merchant not found', 404);

      merchant.commissionRate = Number(commissionRate);
      await merchant.save();

      return sendResponse({
        res,
        message: `Commission updated to ${commissionRate}%`,
        data: merchant
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async createRestaurant(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const id = `rest-${Date.now()}`;
      const slug = (req.body.name || 'merchant')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const restaurant = new Restaurant({
        ...req.body,
        id,
        slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
        status: req.body.status || 'active'
      });
      await restaurant.save();

      return sendResponse({
        res,
        statusCode: 201,
        message: 'Merchant outlet registered successfully',
        data: restaurant
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateRestaurant(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      const ownerMerchant = await getMerchantForUser(req.user);
      if (ownerMerchant && ownerMerchant.id !== id && ownerMerchant._id.toString() !== id) {
        return sendError(res, 'Forbidden: You can only edit your own store details', 403);
      }

      const restaurant = await Restaurant.findOneAndUpdate(
        { $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
        req.body,
        { new: true }
      );
      if (!restaurant) return sendError(res, 'Merchant not found', 404);

      return sendResponse({
        res,
        message: 'Merchant details updated',
        data: restaurant
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async deleteRestaurant(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      await Restaurant.findOneAndDelete({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });
      await MenuItem.deleteMany({ restaurantId: id });

      return sendResponse({
        res,
        message: 'Merchant and products removed'
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Merchant Self-Application / Onboarding
   */
  static async applyMerchant(req: any, res: Response): Promise<any> {
    try {
      if (!req.body.name || !req.body.name.trim()) {
        return sendError(res, 'Merchant / Outlet name is required', 400);
      }

      const id = req.body.id || `rest-app-${Date.now()}`;
      const slug = (req.body.name || 'new-merchant')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const status = req.body.status || 'pending';
      const isOpen = req.body.isOpen !== undefined ? req.body.isOpen : (status === 'active');

      const openingHours = req.body.openingHours ? {
        open: req.body.openingHours.open || req.body.openingHours.openTime || '08:00 AM',
        close: req.body.openingHours.close || req.body.openingHours.closeTime || '11:30 PM',
        openTime: req.body.openingHours.openTime || req.body.openingHours.open || '08:00 AM',
        closeTime: req.body.openingHours.closeTime || req.body.openingHours.close || '11:30 PM',
        daysOpen: req.body.openingHours.daysOpen || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      } : undefined;

      const merchant = new Restaurant({
        ...req.body,
        id,
        slug: `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`,
        logoImage: req.body.logoImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80',
        bannerImage: req.body.bannerImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80',
        openingHours,
        status,
        isOpen
      });
      await merchant.save();

      return sendResponse({
        res,
        statusCode: 201,
        message: status === 'active' 
          ? 'Merchant onboarded and activated successfully!' 
          : 'Application submitted successfully! Your account will become active once reviewed by our campus admin team.',
        data: merchant
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * 4. Unified Product Management (Food Dishes & Grocery Items)
   */
  static async getProducts(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { type, merchantId, category, stockStatus, status, search } = req.query;

      const [menuItems, groceryItems] = await Promise.all([
        MenuItem.find().sort({ createdAt: -1 }),
        GroceryItem.find().sort({ createdAt: -1 })
      ]);

      // Normalize into a single unified product schema
      let unifiedProducts = [
        ...menuItems.map(m => ({
          id: m.id,
          type: 'food' as const,
          name: m.name,
          description: m.description,
          price: m.price,
          originalPrice: m.originalPrice || m.price,
          mrp: m.mrp || m.originalPrice || m.price,
          discount: m.discount || 0,
          tax: m.tax || 5,
          image: m.image,
          category: m.category,
          subCategory: m.subCategory || '',
          brand: m.brand || 'LocaBite Eatery',
          sku: m.sku || `SKU-${m.id.toUpperCase()}`,
          stockQuantity: m.stockQuantity || 50,
          lowStockThreshold: m.lowStockThreshold || 10,
          dietary: m.dietary,
          rating: m.rating,
          isAvailable: m.isAvailable,
          status: m.status || 'active',
          merchantId: m.restaurantId,
          featured: m.featured || false,
          customizationGroups: m.customizationGroups || []
        })),
        ...groceryItems.map(g => ({
          id: g.id,
          type: 'grocery' as const,
          name: g.name,
          description: g.description || '',
          price: g.price,
          originalPrice: g.originalPrice,
          mrp: g.mrp || g.originalPrice,
          discount: g.discountPercent || 0,
          tax: g.tax || 0,
          image: g.image,
          category: g.category,
          subCategory: g.subCategory || '',
          brand: g.brand || 'LocaBite Fresh',
          sku: g.sku || `SKU-GROC-${g.id.toUpperCase()}`,
          stockQuantity: g.stockQuantity || 100,
          lowStockThreshold: g.lowStockThreshold || 15,
          dietary: 'veg' as const,
          rating: 4.8,
          isAvailable: g.inStock,
          status: g.status || 'active',
          merchantId: g.merchantId || 'mart-main',
          featured: g.featured || false,
          customizationGroups: []
        }))
      ];

      // Merchant Role Scoping
      const ownerMerchant = await getMerchantForUser(req.user);
      if (ownerMerchant) {
        unifiedProducts = unifiedProducts.filter(p => p.merchantId === ownerMerchant.id);
      }

      // Filter by type
      if (type && type !== 'all') {
        unifiedProducts = unifiedProducts.filter(p => p.type === type);
      }
      // Filter by merchant
      if (merchantId && merchantId !== 'all') {
        unifiedProducts = unifiedProducts.filter(p => p.merchantId === merchantId);
      }
      // Filter by category
      if (category && category !== 'all') {
        unifiedProducts = unifiedProducts.filter(p => p.category.toLowerCase() === (category as string).toLowerCase());
      }
      // Filter by status
      if (status && status !== 'all') {
        unifiedProducts = unifiedProducts.filter(p => p.status === status);
      }
      // Filter by stockStatus
      if (stockStatus === 'low') {
        unifiedProducts = unifiedProducts.filter(p => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0);
      } else if (stockStatus === 'out') {
        unifiedProducts = unifiedProducts.filter(p => p.stockQuantity <= 0 || !p.isAvailable);
      } else if (stockStatus === 'in') {
        unifiedProducts = unifiedProducts.filter(p => p.stockQuantity > p.lowStockThreshold);
      }
      // Search
      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        unifiedProducts = unifiedProducts.filter(
          p =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q)
        );
      }

      return sendResponse({
        res,
        data: unifiedProducts,
        meta: { total: unifiedProducts.length }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async createProduct(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const ownerMerchant = await getMerchantForUser(req.user);
      const effectiveMerchantId = ownerMerchant ? ownerMerchant.id : (req.body.merchantId || req.body.restaurantId || 'rest-1');

      const { type = 'food' } = req.body;
      const id = type === 'food' ? `item-${Date.now()}` : `groc-${Date.now()}`;
      const sku = req.body.sku || `SKU-${Date.now().toString().slice(-6)}`;

      if (type === 'food') {
        const item = new MenuItem({
          ...req.body,
          id,
          sku,
          image: req.body.image || 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=500&auto=format&fit=crop&q=80',
          restaurantId: effectiveMerchantId,
          stockQuantity: Number(req.body.stockQuantity || 50),
          price: Number(req.body.price),
          originalPrice: Number(req.body.mrp || req.body.originalPrice || req.body.price),
          status: req.body.status || 'active'
        });
        await item.save();

        await Product.create({
          id,
          sku,
          name: req.body.name,
          description: req.body.description || '',
          price: Number(req.body.price),
          originalPrice: Number(req.body.mrp || req.body.originalPrice || req.body.price),
          mrp: Number(req.body.mrp || req.body.originalPrice || req.body.price),
          discount: Number(req.body.discount || 0),
          category: req.body.category || 'General',
          subCategory: req.body.subCategory || '',
          merchantId: effectiveMerchantId,
          merchantName: req.body.brand || 'Campus Eatery',
          image: req.body.image || item.image,
          isAvailable: req.body.isAvailable !== false,
          stockQuantity: Number(req.body.stockQuantity || 50),
          productType: 'food',
          dietary: req.body.dietary || 'veg',
          status: req.body.status || 'active'
        }).catch(() => {});

        return sendResponse({ res, statusCode: 201, message: 'Food product created', data: item });
      } else {
        const item = new GroceryItem({
          ...req.body,
          id,
          sku,
          image: req.body.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
          merchantId: effectiveMerchantId,
          weight: req.body.weight || '500g',
          stockQuantity: Number(req.body.stockQuantity || 100),
          price: Number(req.body.price),
          originalPrice: Number(req.body.mrp || req.body.originalPrice || req.body.price),
          status: req.body.status || 'active'
        });
        await item.save();

        await Product.create({
          id,
          sku,
          name: req.body.name,
          description: req.body.description || '',
          price: Number(req.body.price),
          originalPrice: Number(req.body.mrp || req.body.originalPrice || req.body.price),
          mrp: Number(req.body.mrp || req.body.originalPrice || req.body.price),
          discount: Number(req.body.discount || 0),
          category: req.body.category || 'General',
          subCategory: req.body.subCategory || '',
          merchantId: effectiveMerchantId,
          merchantName: req.body.brand || 'LocaBite Fresh',
          image: req.body.image || item.image,
          isAvailable: req.body.isAvailable !== false,
          stockQuantity: Number(req.body.stockQuantity || 100),
          productType: 'grocery',
          unit: req.body.weight || '500g',
          dietary: 'veg',
          status: req.body.status || 'active'
        }).catch(() => {});

        return sendResponse({ res, statusCode: 201, message: 'Grocery item created', data: item });
      }
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateProduct(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      const ownerMerchant = await getMerchantForUser(req.user);
      if (ownerMerchant) {
        const existing: any = await MenuItem.findOne({ id }) || await GroceryItem.findOne({ id });
        const existingMerchant = existing?.restaurantId || existing?.merchantId;
        if (existing && existingMerchant && existingMerchant !== ownerMerchant.id) {
          return sendError(res, 'Forbidden: You can only edit your own store products', 403);
        }
      }

      let updated: any = await MenuItem.findOneAndUpdate({ id }, req.body, { new: true });
      if (!updated) {
        updated = await GroceryItem.findOneAndUpdate({ id }, req.body, { new: true });
      }
      if (!updated) return sendError(res, 'Product not found', 404);

      // Keep Product model synchronized
      await Product.findOneAndUpdate(
        { $or: [{ id }, { sku: id }] },
        { $set: req.body },
        { new: true }
      ).catch(() => {});

      return sendResponse({
        res,
        message: 'Product updated successfully',
        data: updated
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateProductStock(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    const { stockQuantity, isAvailable, delta } = req.body;
    try {
      let food = await MenuItem.findOne({ id });
      if (food) {
        if (delta !== undefined) {
          food.stockQuantity = Math.max(0, (food.stockQuantity || 0) + Number(delta));
        } else if (stockQuantity !== undefined) {
          food.stockQuantity = Math.max(0, Number(stockQuantity));
        }
        if (isAvailable !== undefined) {
          food.isAvailable = Boolean(isAvailable);
        } else if (food.stockQuantity === 0) {
          food.isAvailable = false;
        } else if (food.stockQuantity > 0 && !food.isAvailable) {
          food.isAvailable = true;
        }
        await food.save();
        await Product.findOneAndUpdate(
          { $or: [{ id }, { sku: id }] },
          { $set: { stockQuantity: food.stockQuantity, isAvailable: food.isAvailable } }
        ).catch(() => {});
        return sendResponse({ res, message: 'Stock updated successfully', data: food });
      }

      let groc = await GroceryItem.findOne({ id });
      if (groc) {
        if (delta !== undefined) {
          groc.stockQuantity = Math.max(0, (groc.stockQuantity || 0) + Number(delta));
        } else if (stockQuantity !== undefined) {
          groc.stockQuantity = Math.max(0, Number(stockQuantity));
        }
        if (isAvailable !== undefined) {
          groc.isAvailable = Boolean(isAvailable);
        } else if (groc.stockQuantity === 0) {
          groc.isAvailable = false;
        } else if (groc.stockQuantity > 0 && !groc.isAvailable) {
          groc.isAvailable = true;
        }
        await groc.save();
        await Product.findOneAndUpdate(
          { $or: [{ id }, { sku: id }] },
          { $set: { stockQuantity: groc.stockQuantity, isAvailable: groc.isAvailable } }
        ).catch(() => {});
        return sendResponse({ res, message: 'Stock updated successfully', data: groc });
      }

      return sendError(res, 'Product not found', 404);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async deleteProduct(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      const ownerMerchant = await getMerchantForUser(req.user);
      if (ownerMerchant) {
        const existing: any = await MenuItem.findOne({ id }) || await GroceryItem.findOne({ id });
        const existingMerchant = existing?.restaurantId || existing?.merchantId;
        if (existing && existingMerchant && existingMerchant !== ownerMerchant.id) {
          return sendError(res, 'Forbidden: You can only delete your own store products', 403);
        }
      }

      let deleted: any = await MenuItem.findOneAndDelete({ id });
      if (!deleted) {
        deleted = await GroceryItem.findOneAndDelete({ id });
      }

      // Delete from Product model
      await Product.findOneAndDelete({ $or: [{ id }, { sku: id }] }).catch(() => {});

      return sendResponse({
        res,
        message: 'Product deleted'
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async duplicateProduct(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      const ownerMerchant = await getMerchantForUser(req.user);
      if (ownerMerchant) {
        const existing: any = (await MenuItem.findOne({ id })) || (await GroceryItem.findOne({ id }));
        const existingMerchant = existing?.restaurantId || existing?.merchantId;
        if (existing && existingMerchant && existingMerchant !== ownerMerchant.id) {
          return sendError(res, 'Forbidden: You can only duplicate your own store products', 403);
        }
      }

      const food = await MenuItem.findOne({ id });
      if (food) {
        const copy = new MenuItem({
          ...food.toObject(),
          _id: undefined,
          id: `item-${Date.now()}`,
          sku: `SKU-${Date.now().toString().slice(-6)}`,
          name: `${food.name} (Copy)`,
          status: 'draft'
        });
        await copy.save();
        return sendResponse({ res, statusCode: 201, message: 'Product duplicated as draft', data: copy });
      }

      const groc = await GroceryItem.findOne({ id });
      if (groc) {
        const copy = new GroceryItem({
          ...groc.toObject(),
          _id: undefined,
          id: `groc-${Date.now()}`,
          sku: `SKU-${Date.now().toString().slice(-6)}`,
          name: `${groc.name} (Copy)`,
          status: 'draft'
        });
        await copy.save();
        return sendResponse({ res, statusCode: 201, message: 'Grocery item duplicated as draft', data: copy });
      }

      return sendError(res, 'Product not found', 404);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async bulkUpdateProducts(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { productIds = [], priceChangePercent, stockChangeDelta, status } = req.body;
    try {
      let updatedCount = 0;

      for (const id of productIds) {
        let food = await MenuItem.findOne({ id });
        if (food) {
          if (priceChangePercent !== undefined) {
            food.price = Math.round(food.price * (1 + Number(priceChangePercent) / 100));
          }
          if (stockChangeDelta !== undefined) {
            food.stockQuantity = Math.max(0, (food.stockQuantity || 50) + Number(stockChangeDelta));
          }
          if (status) {
            food.status = status;
          }
          await food.save();
          updatedCount++;
          continue;
        }

        let groc = await GroceryItem.findOne({ id });
        if (groc) {
          if (priceChangePercent !== undefined) {
            groc.price = Math.round(groc.price * (1 + Number(priceChangePercent) / 100));
          }
          if (stockChangeDelta !== undefined) {
            groc.stockQuantity = Math.max(0, (groc.stockQuantity || 100) + Number(stockChangeDelta));
          }
          if (status) {
            groc.status = status;
          }
          await groc.save();
          updatedCount++;
        }
      }

      return sendResponse({
        res,
        message: `Successfully bulk updated ${updatedCount} products`,
        data: { updatedCount }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * 5. Categories Management
   */
  static async getCategories(_req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const categories = await Category.find().sort({ order: 1 });
      return sendResponse({ res, data: categories });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async createCategory(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const id = req.body.id || (req.body.name || 'cat').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const cat = new Category({
        ...req.body,
        id
      });
      await cat.save();
      return sendResponse({ res, statusCode: 201, message: 'Category created', data: cat });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateCategory(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      const cat = await Category.findOneAndUpdate({ id }, req.body, { new: true });
      if (!cat) return sendError(res, 'Category not found', 404);
      return sendResponse({ res, message: 'Category updated', data: cat });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async deleteCategory(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      await Category.findOneAndDelete({ id });
      return sendResponse({ res, message: 'Category deleted' });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * 6. Orders & Refund Management
   */
  static async getOrders(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { status, merchantId, search } = req.query;
      const query: Record<string, any> = {};

      const ownerMerchant = await getMerchantForUser(req.user);
      if (ownerMerchant) {
        query['items.restaurantId'] = ownerMerchant.id;
      } else if (merchantId && typeof merchantId === 'string' && merchantId !== 'all') {
        query['items.restaurantId'] = merchantId;
      }

      if (status && typeof status === 'string' && status !== 'all') {
        query.status = status;
      }
      if (search && typeof search === 'string') {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'deliveryAddress.phone': { $regex: search, $options: 'i' } },
          { 'deliveryAddress.building': { $regex: search, $options: 'i' } }
        ];
      }

      const orders = await Order.find(query).sort({ createdAt: -1 });

      return sendResponse({
        res,
        data: orders,
        meta: { total: orders.length }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateOrderStatus(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    const { status, note } = req.body;

    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });

      if (!order) return sendError(res, 'Order not found', 404);

      const ownerMerchant = await getMerchantForUser(req.user);
      if (ownerMerchant) {
        const hasMerchantItem = order.items?.some((i: any) => i.restaurantId === ownerMerchant.id);
        if (!hasMerchantItem) {
          return sendError(res, 'Forbidden: You cannot modify orders for another merchant', 403);
        }
      }

      order.status = status;
      order.statusTimeline.push({
        status,
        timestamp: new Date(),
        note: note || `Updated status to ${status}`
      });

      if (status === 'delivered') {
        order.remainingMinutes = 0;
        order.estimatedArrival = 'Delivered';
      }

      await order.save();
      emitOrderStatusUpdate(order.id, order);

      // Dispatch real-time status update email via Resend
      EmailService.sendOrderNotification({
        order,
        event: 'status_update',
        statusNote: note
      }).catch(err => {
        logger.error(`[ADMIN] Failed to dispatch status email for #${order.orderNumber}: ${err.message}`);
      });

      return sendResponse({
        res,
        message: `Order status set to ${status}`,
        data: order
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async processRefund(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { orderId } = req.params;
    const { amount, reason } = req.body;

    try {
      const order = await Order.findOne({
        $or: [{ id: orderId }, { orderNumber: orderId }]
      });
      if (!order) return sendError(res, 'Order not found', 404);

      const refundAmount = Number(amount) || order.totalToPay;
      order.paymentStatus = 'refunded';
      order.refundAmount = refundAmount;
      order.refundReason = reason || 'Admin issued refund';
      order.refundedAt = new Date();

      order.statusTimeline.push({
        status: order.status,
        timestamp: new Date(),
        note: `Processed refund of ₹${refundAmount}. Reason: ${order.refundReason}`
      });

      await order.save();

      // Record refund in Payment table
      await Payment.create({
        orderId: order.id,
        userId: order.userId,
        amount: refundAmount,
        currency: 'INR',
        status: 'refunded'
      });

      return sendResponse({
        res,
        message: `Refund of ₹${refundAmount} processed successfully`,
        data: order
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * 7. Coupons & Offers Management
   */
  static async getCoupons(_req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const coupons = await Coupon.find().sort({ createdAt: -1 });
      return sendResponse({ res, data: coupons });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async createCoupon(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const coupon = new Coupon({
        ...req.body,
        code: req.body.code.toUpperCase()
      });
      await coupon.save();
      return sendResponse({ res, statusCode: 201, message: 'Coupon created', data: coupon });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async deleteCoupon(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { code } = req.params;
    try {
      await Coupon.findOneAndDelete({ code: code.toUpperCase() });
      return sendResponse({ res, message: 'Coupon deleted' });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * 8. Delivery Fleet Management
   */
  static async getDeliveryPartners(_req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
      return sendResponse({ res, data: partners });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async createDeliveryPartner(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const id = `driver-${Date.now()}`;
      const defaultAvatar =
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg';
      const partner = new DeliveryPartner({
        avatar: defaultAvatar,
        rating: 4.9,
        deliveriesCount: 0,
        isAvailable: true,
        ...req.body,
        id
      });
      await partner.save();

      // If email or phone provided, ensure user account exists with role delivery_partner
      if (req.body.email || req.body.phone) {
        const query = req.body.email
          ? { email: req.body.email.toLowerCase().trim() }
          : { phone: req.body.phone };

        let user = await User.findOne(query);
        if (user) {
          user.role = 'delivery_partner';
          if (!user.email && req.body.email) user.email = req.body.email.toLowerCase().trim();
          await user.save();
        } else {
          user = new User({
            name: req.body.name || 'Campus Rider',
            phone: req.body.phone || `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
            email: req.body.email ? req.body.email.toLowerCase().trim() : undefined,
            role: 'delivery_partner',
            membershipLevel: 'Premier Rider',
            loyaltyCoins: 500,
            avatar: req.body.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg',
            addresses: []
          });
          await user.save();
        }
      }

      return sendResponse({
        res,
        statusCode: 201,
        message: 'Delivery partner registered and user role set to delivery_partner',
        data: partner
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * 9. Audit Logs
   */
  static async getAuditLogs(_req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
      return sendResponse({ res, data: logs });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
