import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { Category } from '../models/Category';
import { sendResponse, sendError } from '../utils/apiResponse';
import { getCategoryMatcher } from '../utils/categoryMatcher';


export class RestaurantController {
  /**
   * List all restaurants with filtering and sorting
   */
  static async getAllRestaurants(req: Request, res: Response): Promise<any> {
    try {
      const { isPureVeg, cuisine, search, sort } = req.query;

      // Filter out suspended, rejected, or pending merchants
      const query: Record<string, any> = {
        status: { $nin: ['suspended', 'rejected', 'pending'] }
      };

      if (isPureVeg === 'true') {
        query.isPureVeg = true;
      }

      if (cuisine && typeof cuisine === 'string') {
        query.cuisines = { $in: [new RegExp(cuisine, 'i')] };
      }

      if (search && typeof search === 'string') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { cuisines: { $in: [new RegExp(search, 'i')] } },
          { tagline: { $regex: search, $options: 'i' } }
        ];
      }

      let sortOption: Record<string, any> = { rating: -1 };
      if (sort === 'deliveryTime') {
        sortOption = { deliveryTime: 1 };
      }

      const restaurants = await Restaurant.find(query).sort(sortOption);

      return sendResponse({
        res,
        data: restaurants,
        meta: { total: restaurants.length }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get single restaurant by ID or Slug, with its full menu attached
   */
  static async getRestaurantByIdOrSlug(req: Request, res: Response): Promise<any> {
    const { idOrSlug } = req.params;
    try {
      const trimmed = (idOrSlug || '').trim();
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const candidates: any[] = [
        { id: trimmed },
        { slug: trimmed },
        { id: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { slug: { $regex: new RegExp(`^${escaped}$`, 'i') } }
      ];

      // If numeric (e.g. "1"), check rest-1 or rest-01
      if (/^\d+$/.test(trimmed)) {
        candidates.push({ id: `rest-${trimmed}` });
        candidates.push({ id: `rest-${parseInt(trimmed, 10)}` });
      }

      // If user passed rest-1, also check numeric 1
      if (trimmed.startsWith('rest-')) {
        const numPart = trimmed.replace('rest-', '');
        candidates.push({ id: numPart });
      }

      // If valid 24-character mongo ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        candidates.push({ _id: trimmed });
      }

      const restaurant = await Restaurant.findOne({
        $or: candidates
      }).lean();

      if (!restaurant) {
        return sendError(res, `Restaurant '${idOrSlug}' not found`, 404);
      }

      if (restaurant.status === 'suspended' || restaurant.status === 'rejected' || restaurant.status === 'pending') {
        return sendError(res, `This outlet is currently ${restaurant.status} and not accepting customer orders.`, 403);
      }

      const menu = await MenuItem.find({
        $or: [
          { restaurantId: restaurant.id },
          { restaurantId: (restaurant as any)._id?.toString() }
        ],
        isAvailable: true,
        status: { $ne: 'disabled' }
      }).lean();

      return sendResponse({
        res,
        data: {
          ...restaurant,
          menu
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get all food categories
   */
  static async getCategories(req: Request, res: Response): Promise<any> {
    try {
      const { type } = req.query;
      const filter: any = { isVisible: { $ne: false } };
      if (type && type !== 'all') {
        filter.$or = [{ type }, { type: 'all' }];
      }
      const categories = await Category.find(filter).sort({ order: 1 });
      return sendResponse({
        res,
        data: categories
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get Picked for You / Trending Dishes across active restaurants
   */
  static async getFeaturedDishes(req: Request, res: Response): Promise<any> {
    try {
      const { limit = '24', category } = req.query;

      // Find active merchants first
      const activeRestaurants = await Restaurant.find({
        status: { $nin: ['suspended', 'rejected', 'pending'] }
      }).select('id name deliveryTime');

      const restMap = new Map<string, { name: string; deliveryTime: string }>();
      activeRestaurants.forEach(r => restMap.set(r.id, { name: r.name, deliveryTime: r.deliveryTime || '15-20 mins' }));

      const query: any = {
        restaurantId: { $in: Array.from(restMap.keys()) },
        isAvailable: true,
        status: { $ne: 'disabled' }
      };

      if (category && category !== 'all') {
        const catMatcher = getCategoryMatcher(String(category));
        query.$and = [
          { restaurantId: { $in: Array.from(restMap.keys()) } },
          { isAvailable: true },
          { status: { $ne: 'disabled' } },
          catMatcher
        ];
        delete query.restaurantId;
        delete query.isAvailable;
        delete query.status;
      }

      let dishes = await MenuItem.find(query)
        .sort({ featured: -1, isPopular: -1, rating: -1 })
        .limit(Number(limit));


      // Attach restaurantName and ETA to each dish
      const enrichedDishes = dishes.map(d => {
        const restInfo = restMap.get(d.restaurantId);
        return {
          ...d.toObject(),
          restaurantName: restInfo?.name || 'LocaBite Eatery',
          eta: restInfo?.deliveryTime?.split(' ')[0] || '15m'
        };
      });

      return sendResponse({
        res,
        data: enrichedDishes
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get menu items for a specific restaurant
   */
  static async getMenuItems(req: Request, res: Response): Promise<any> {
    const { restaurantId } = req.params;
    const { category, dietary } = req.query;

    try {
      const query: Record<string, any> = { restaurantId, isAvailable: true };

      if (category && typeof category === 'string' && category !== 'all') {
        query.category = { $regex: new RegExp(`^${category}$`, 'i') };
      }

      if (dietary && typeof dietary === 'string') {
        query.dietary = dietary;
      }

      const items = await MenuItem.find(query);

      return sendResponse({
        res,
        data: items
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
