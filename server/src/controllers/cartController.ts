import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Cart, ICartItem } from '../models/Cart';
import { MenuItem } from '../models/MenuItem';
import { GroceryItem } from '../models/GroceryItem';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import { sendResponse, sendError } from '../utils/apiResponse';

export class CartController {
  /**
   * Helper to retrieve or create cart for user
   */
  private static async getOrCreateCart(userId: string) {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        driverTip: 0,
        deliveryInstruction: 'Leave at door'
      });
      cart.calculateTotals();
      await cart.save();
    }
    return cart;
  }

  /**
   * Get User Cart
   */
  static async getCart(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const userId = req.user?.userId || 'guest-session';
      const cart = await CartController.getOrCreateCart(userId);

      return sendResponse({
        res,
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Add Item to Cart (Food or Grocery)
   */
  static async addItem(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId || 'guest-session';
    const targetId = req.body.productId || req.body.id || `item-${Date.now()}`;
    const { type = 'food', quantity = 1, customizations } = req.body;

    try {
      const cart = await CartController.getOrCreateCart(userId);

      let newItem: ICartItem;
      let customKey = targetId;

      if (type === 'food') {
        let menuItem: any = await MenuItem.findOne({
          $or: [
            { id: targetId },
            { sku: targetId },
            ...(typeof targetId === 'string' && targetId.length === 24 ? [{ _id: targetId }] : [])
          ]
        });

        if (!menuItem) {
          menuItem = await Product.findOne({
            $or: [
              { id: targetId },
              { sku: targetId },
              ...(typeof targetId === 'string' && targetId.length === 24 ? [{ _id: targetId }] : [])
            ]
          });
        }

        if (!menuItem) {
          return sendError(res, `Product "${targetId}" not found in catalog`, 404);
        }

        if (menuItem.status === 'disabled' || menuItem.isAvailable === false) {
          return sendError(res, `Product "${menuItem.name}" is currently unavailable`, 400);
        }

        // Price MUST come strictly from MongoDB
        let calculatedPrice = Number(menuItem.price);
        if (customizations?.size) {
          calculatedPrice += Number(customizations.size.price || 0);
          customKey += `-${customizations.size.id}`;
        }
        if (customizations?.addons && Array.isArray(customizations.addons)) {
          customizations.addons.forEach((a: any) => {
            calculatedPrice += Number(a.price || 0);
            customKey += `-${a.id}`;
          });
        }
        if (customizations?.spiceLevel) {
          customKey += `-${customizations.spiceLevel}`;
        }

        newItem = {
          cartItemId: customKey,
          type: 'food',
          id: menuItem.id,
          restaurantId: menuItem.restaurantId || menuItem.merchantId || 'st_TYnRD3iI21IWyp',
          restaurantName: menuItem.brand || menuItem.merchantName || 'Campus Eatery',
          name: menuItem.name,
          image: menuItem.image || '',
          dietary: menuItem.dietary || 'veg',
          price: calculatedPrice,
          quantity,
          customizations
        };
      } else {
        let groceryItem: any = await GroceryItem.findOne({
          $or: [
            { id: targetId },
            { sku: targetId },
            ...(typeof targetId === 'string' && targetId.length === 24 ? [{ _id: targetId }] : [])
          ]
        });

        if (!groceryItem) {
          groceryItem = await Product.findOne({
            $or: [
              { id: targetId },
              { sku: targetId },
              ...(typeof targetId === 'string' && targetId.length === 24 ? [{ _id: targetId }] : [])
            ]
          });
        }

        if (!groceryItem) {
          return sendError(res, `Grocery product "${targetId}" not found in catalog`, 404);
        }

        if (groceryItem.status === 'disabled' || groceryItem.inStock === false) {
          return sendError(res, `Product "${groceryItem.name}" is out of stock`, 400);
        }

        customKey = `groc-${groceryItem.id}`;
        newItem = {
          cartItemId: customKey,
          type: 'grocery',
          id: groceryItem.id,
          name: groceryItem.name,
          image: groceryItem.image || '',
          price: Number(groceryItem.price), // Authoritative MongoDB price
          quantity,
          unitWeight: groceryItem.weight || groceryItem.unit || '500g'
        };
      }

      // Check if item already exists in cart with same customization
      const existingIndex = cart.items.findIndex(i => i.cartItemId === customKey);
      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += quantity;
      } else {
        cart.items.push(newItem);
      }

      cart.calculateTotals();
      await cart.save();

      return sendResponse({
        res,
        message: 'Item added to cart',
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Update Quantity of Cart Item (+1 or -1)
   */
  static async updateQuantity(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId || 'guest-session';
    const { cartItemId, delta } = req.body;

    try {
      const cart = await CartController.getOrCreateCart(userId);

      const itemIndex = cart.items.findIndex(i => i.cartItemId === cartItemId);
      if (itemIndex === -1) {
        return sendError(res, 'Item not found in cart', 404);
      }

      const newQty = cart.items[itemIndex].quantity + delta;
      if (newQty > 0) {
        cart.items[itemIndex].quantity = newQty;
      } else {
        cart.items.splice(itemIndex, 1);
      }

      cart.calculateTotals();
      await cart.save();

      return sendResponse({
        res,
        message: 'Cart updated',
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Remove Item from Cart
   */
  static async removeItem(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId || 'guest-session';
    const { cartItemId } = req.params;

    try {
      const cart = await CartController.getOrCreateCart(userId);
      cart.items = cart.items.filter(i => i.cartItemId !== cartItemId);

      cart.calculateTotals();
      await cart.save();

      return sendResponse({
        res,
        message: 'Item removed from cart',
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Apply Coupon Code
   */
  static async applyCoupon(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId || 'guest-session';
    const { code } = req.body;

    try {
      const cart = await CartController.getOrCreateCart(userId);

      const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true,
        validTill: { $gte: new Date() }
      });

      if (!coupon) {
        return sendError(res, 'Invalid or expired coupon code.', 400);
      }

      cart.calculateTotals();

      if (cart.itemTotal < coupon.minAmount) {
        return sendError(
          res,
          `Add items worth ₹${coupon.minAmount - cart.itemTotal} more to apply ${coupon.code}.`,
          400
        );
      }

      cart.appliedPromo = coupon.code;
      cart.discount = coupon.discount;
      cart.calculateTotals();
      await cart.save();

      return sendResponse({
        res,
        message: `${coupon.title} applied successfully!`,
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Remove Coupon Code
   */
  static async removeCoupon(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId || 'guest-session';

    try {
      const cart = await CartController.getOrCreateCart(userId);
      cart.appliedPromo = null;
      cart.discount = 0;
      cart.calculateTotals();
      await cart.save();

      return sendResponse({
        res,
        message: 'Coupon removed',
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Update Tip
   */
  static async updateTip(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId || 'guest-session';
    const { tip } = req.body;

    try {
      const cart = await CartController.getOrCreateCart(userId);
      cart.driverTip = Number(tip);
      cart.calculateTotals();
      await cart.save();

      return sendResponse({
        res,
        message: 'Driver tip updated',
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Update Delivery Instructions
   */
  static async updateDeliveryInstruction(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId || 'guest-session';
    const { instruction } = req.body;

    try {
      const cart = await CartController.getOrCreateCart(userId);
      cart.deliveryInstruction = instruction;
      await cart.save();

      return sendResponse({
        res,
        message: 'Instructions updated',
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Clear Cart
   */
  static async clearCart(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.user?.userId || 'guest-session';

    try {
      const cart = await CartController.getOrCreateCart(userId);
      cart.items = [];
      cart.appliedPromo = null;
      cart.discount = 0;
      cart.driverTip = 0;
      cart.calculateTotals();
      await cart.save();

      return sendResponse({
        res,
        message: 'Cart cleared',
        data: cart
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get Active Coupons for Checkout
   */
  static async getAvailableCoupons(_req: any, res: Response): Promise<any> {
    try {
      const coupons = await Coupon.find({
        isActive: true,
        validTill: { $gte: new Date() }
      }).select('code title description minAmount discount discountType -_id');

      return sendResponse({
        res,
        data: coupons
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
