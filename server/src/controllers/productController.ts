import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { MenuItem } from '../models/MenuItem';
import { GroceryItem } from '../models/GroceryItem';
import { Restaurant } from '../models/Restaurant';
import { sendResponse, sendError } from '../utils/apiResponse';
import { getCategoryMatcher } from '../utils/categoryMatcher';


export class ProductController {
  /**
   * GET /api/products or /api/v1/products
   * List products across MongoDB with search and filtering
   */
  static async getProducts(req: Request, res: Response): Promise<any> {
    try {
      const {
        category,
        subCategory,
        merchantId,
        type,
        search,
        dietary,
        status = 'active',
        isAvailable
      } = req.query;

      // 1. First query unified Product model
      const query: any = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      if (isAvailable !== undefined && isAvailable !== 'all') {
        query.isAvailable = isAvailable === 'true';
      }
      if (merchantId && merchantId !== 'all') {
        query.merchantId = merchantId;
      }
      if (category && category !== 'all') {
        const catMatcher = getCategoryMatcher(String(category));
        query.$and = query.$and || [];
        query.$and.push(catMatcher);
      }
      if (subCategory && subCategory !== 'all') {
        query.subCategory = { $regex: new RegExp(`^${subCategory}$`, 'i') };
      }
      if (type && type !== 'all') {
        query.productType = type;
      }
      if (dietary && dietary !== 'all') {
        query.dietary = dietary;
      }
      if (search && typeof search === 'string') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ];
      }

      let products = await Product.find(query).sort({ createdAt: -1 }).lean();

      // If Product model has items, return them; also ensure MenuItems & GroceryItems are included
      if (!products || products.length === 0) {
        // Fallback to MenuItem & GroceryItem normalized
        const [menuItems, groceryItems] = await Promise.all([
          MenuItem.find({ status: { $ne: 'disabled' } }).lean(),
          GroceryItem.find({ status: { $ne: 'disabled' } }).lean()
        ]);

        const mappedMenu = menuItems.map(m => ({
          id: m.id,
          sku: m.sku || m.id,
          name: m.name,
          description: m.description,
          price: m.price,
          originalPrice: m.originalPrice || m.price,
          mrp: m.mrp || m.originalPrice || m.price,
          discount: m.discount || 0,
          category: m.category,
          subCategory: m.subCategory || '',
          merchantId: m.restaurantId,
          merchantName: m.brand || 'LocaBite Eatery',
          image: m.image,
          isAvailable: m.isAvailable,
          stock: m.stockQuantity || 50,
          stockQuantity: m.stockQuantity || 50,
          lowStockThreshold: m.lowStockThreshold || 10,
          productType: 'food' as const,
          unit: '1 Serving',
          tags: m.tags || [],
          dietary: m.dietary,
          rating: m.rating || 4.8,
          reviewsCount: m.reviewsCount || 0,
          status: m.status
        }));

        const mappedGroc = groceryItems.map(g => ({
          id: g.id,
          sku: g.sku || g.id,
          name: g.name,
          description: g.description || '',
          price: g.price,
          originalPrice: g.originalPrice,
          mrp: g.mrp || g.originalPrice,
          discount: g.discountPercent || 0,
          category: g.category,
          subCategory: g.subCategory || '',
          merchantId: g.merchantId || 'mart-main',
          merchantName: g.brand || 'LocaBite Fresh',
          image: g.image,
          isAvailable: g.inStock,
          stock: g.stockQuantity || 100,
          stockQuantity: g.stockQuantity || 100,
          lowStockThreshold: g.lowStockThreshold || 15,
          productType: 'grocery' as const,
          unit: g.weight || '500g',
          tags: g.tags || [],
          dietary: 'veg' as const,
          rating: 4.8,
          reviewsCount: 120,
          status: g.status
        }));

        products = [...mappedMenu, ...mappedGroc] as any;
      }

      return sendResponse({
        res,
        data: products,
        meta: { total: products.length }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * GET /api/products/:id or /api/v1/products/:id
   * Get single product by id, sku, or mongo _id
   */
  static async getProductById(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      const candidates: any[] = [
        { id },
        { sku: id },
        { id: { $regex: new RegExp(`^${id}$`, 'i') } },
        { sku: { $regex: new RegExp(`^${id}$`, 'i') } }
      ];
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        candidates.push({ _id: id });
      }

      // Check Product model first
      let product: any = await Product.findOne({ $or: candidates }).lean();

      if (!product) {
        // Check MenuItem
        const menuItem = await MenuItem.findOne({ $or: candidates }).lean();
        if (menuItem) {
          product = {
            id: menuItem.id,
            sku: menuItem.sku || menuItem.id,
            name: menuItem.name,
            description: menuItem.description,
            price: menuItem.price,
            originalPrice: menuItem.originalPrice || menuItem.price,
            mrp: menuItem.mrp || menuItem.originalPrice || menuItem.price,
            discount: menuItem.discount || 0,
            category: menuItem.category,
            merchantId: menuItem.restaurantId,
            merchantName: menuItem.brand,
            image: menuItem.image,
            isAvailable: menuItem.isAvailable,
            stockQuantity: menuItem.stockQuantity,
            productType: 'food',
            unit: '1 Serving',
            tags: menuItem.tags || [],
            dietary: menuItem.dietary,
            status: menuItem.status
          };
        }
      }

      if (!product) {
        // Check GroceryItem
        const groceryItem = await GroceryItem.findOne({ $or: candidates }).lean();
        if (groceryItem) {
          product = {
            id: groceryItem.id,
            sku: groceryItem.sku || groceryItem.id,
            name: groceryItem.name,
            description: groceryItem.description,
            price: groceryItem.price,
            originalPrice: groceryItem.originalPrice,
            mrp: groceryItem.mrp || groceryItem.originalPrice,
            discount: groceryItem.discountPercent || 0,
            category: groceryItem.category,
            merchantId: groceryItem.merchantId,
            merchantName: groceryItem.brand,
            image: groceryItem.image,
            isAvailable: groceryItem.inStock,
            stockQuantity: groceryItem.stockQuantity,
            productType: 'grocery',
            unit: groceryItem.weight,
            tags: groceryItem.tags || [],
            dietary: 'veg',
            status: groceryItem.status
          };
        }
      }

      if (!product) {
        return sendError(res, `Product '${id}' not found`, 404);
      }

      return sendResponse({
        res,
        data: product
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * GET /api/merchants/:id/products or /api/v1/merchants/:id/products
   * List all products belonging to a merchant/store
   */
  static async getMerchantProducts(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    try {
      // Find merchant first by ID, slug, or numeric suffix
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const merchant = await Restaurant.findOne({
        $or: [
          { id },
          { slug: id },
          { id: { $regex: new RegExp(`^${escaped}$`, 'i') } },
          { slug: { $regex: new RegExp(`^${escaped}$`, 'i') } }
        ]
      }).lean();

      const merchantId = merchant ? merchant.id : id;

      // Find products for this merchant
      let products: any = await Product.find({
        merchantId,
        status: { $ne: 'disabled' }
      }).sort({ createdAt: -1 }).lean();

      if (!products || products.length === 0) {
        const menuItems = await MenuItem.find({
          restaurantId: merchantId,
          status: { $ne: 'disabled' }
        }).lean();

        products = menuItems.map(m => ({
          id: m.id,
          sku: m.sku || m.id,
          name: m.name,
          description: m.description,
          price: m.price,
          originalPrice: m.originalPrice || m.price,
          mrp: m.mrp || m.originalPrice || m.price,
          discount: m.discount || 0,
          category: m.category,
          merchantId: m.restaurantId,
          merchantName: merchant?.name || m.brand || 'Campus Eatery',
          image: m.image,
          isAvailable: m.isAvailable,
          stockQuantity: m.stockQuantity,
          productType: 'food',
          tags: m.tags || [],
          dietary: m.dietary,
          status: m.status
        }));
      }

      return sendResponse({
        res,
        data: products,
        meta: {
          merchantId,
          merchantName: merchant?.name || 'Store',
          total: products.length
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
