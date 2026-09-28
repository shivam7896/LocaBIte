import { Request, Response } from 'express';
import { GroceryItem } from '../models/GroceryItem';
import { sendResponse, sendError } from '../utils/apiResponse';

export class GroceryController {
  /**
   * List all grocery products with category and tag filtering
   */
  static async getAllGroceries(req: Request, res: Response): Promise<any> {
    try {
      const { category, subCategory, tag, search } = req.query;

      const query: Record<string, any> = {
        inStock: true,
        status: { $ne: 'disabled' }
      };

      if (category && typeof category === 'string' && category !== 'all') {
        query.category = { $regex: new RegExp(`^${category}$`, 'i') };
      }

      if (subCategory && typeof subCategory === 'string') {
        query.subCategory = { $regex: new RegExp(`^${subCategory}$`, 'i') };
      }

      if (tag && typeof tag === 'string') {
        query.tags = { $in: [tag] };
      }

      if (search && typeof search === 'string') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { subCategory: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const items = await GroceryItem.find(query);

      return sendResponse({
        res,
        data: items,
        meta: { total: items.length }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get single grocery product by ID
   */
  static async getGroceryItemById(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      const item = await GroceryItem.findOne({ id });
      if (!item) {
        return sendError(res, 'Grocery item not found', 404);
      }
      return sendResponse({
        res,
        data: item
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get Top Grocery Deals
   */
  static async getTopDeals(_req: Request, res: Response): Promise<any> {
    try {
      const items = await GroceryItem.find({
        inStock: true,
        $or: [{ tags: 'Top Deals' }, { discountPercent: { $gte: 10 } }, { price: { $lte: 50 } }]
      }).limit(12);

      return sendResponse({
        res,
        data: items
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
