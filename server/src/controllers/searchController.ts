import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { GroceryItem } from '../models/GroceryItem';
import { sendResponse, sendError } from '../utils/apiResponse';

export class SearchController {
  /**
   * Unified Search across Restaurants, Dishes, and Grocery SKUs
   */
  static async search(req: Request, res: Response): Promise<any> {
    const { q = '', type = 'all', limit = '10' } = req.query;
    const queryStr = String(q).trim();

    if (!queryStr) {
      return sendResponse({
        res,
        data: {
          restaurants: [],
          dishes: [],
          groceries: []
        }
      });
    }

    try {
      const regex = new RegExp(queryStr, 'i');
      const maxResults = Number(limit);

      const promises: Promise<any>[] = [];

      // 1. Search Restaurants (Active only)
      if (type === 'all' || type === 'food') {
        promises.push(
          Restaurant.find({
            status: { $nin: ['suspended', 'rejected', 'pending'] },
            $or: [{ name: regex }, { cuisines: { $in: [regex] } }, { tagline: regex }]
          }).limit(maxResults)
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      // 2. Search Dishes (Available and from active restaurants)
      if (type === 'all' || type === 'food') {
        promises.push(
          (async () => {
            const activeRests = await Restaurant.find({ status: { $nin: ['suspended', 'rejected', 'pending'] } }).select('id');
            const activeRestIds = activeRests.map(r => r.id);
            return MenuItem.find({
              restaurantId: { $in: activeRestIds },
              isAvailable: true,
              status: { $ne: 'disabled' },
              $or: [{ name: regex }, { description: regex }, { category: regex }]
            }).limit(maxResults);
          })()
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      // 3. Search Groceries (Active & In Stock)
      if (type === 'all' || type === 'grocery') {
        promises.push(
          GroceryItem.find({
            inStock: true,
            status: { $ne: 'disabled' },
            $or: [{ name: regex }, { subCategory: regex }, { tags: { $in: [regex] } }]
          }).limit(maxResults)
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      const [restaurants, dishes, groceries] = await Promise.all(promises);

      return sendResponse({
        res,
        data: {
          query: queryStr,
          counts: {
            restaurants: restaurants.length,
            dishes: dishes.length,
            groceries: groceries.length,
            total: restaurants.length + dishes.length + groceries.length
          },
          restaurants,
          dishes,
          groceries
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
