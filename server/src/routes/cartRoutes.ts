import { Router } from 'express';
import { CartController } from '../controllers/cartController';
import { optionalAuth } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateMiddleware';
import {
  addCartItemSchema,
  updateCartItemQtySchema,
  applyCouponSchema,
  updateTipSchema,
  updateDeliveryInstructionSchema
} from '../validations/cartValidation';

const router = Router();

router.get('/', optionalAuth, CartController.getCart);
router.get('/coupons', CartController.getAvailableCoupons);
router.post('/items', optionalAuth, validateRequest(addCartItemSchema), CartController.addItem);
router.put('/items/quantity', optionalAuth, validateRequest(updateCartItemQtySchema), CartController.updateQuantity);
router.delete('/items/:cartItemId', optionalAuth, CartController.removeItem);
router.post('/coupon', optionalAuth, validateRequest(applyCouponSchema), CartController.applyCoupon);
router.delete('/coupon', optionalAuth, CartController.removeCoupon);
router.put('/tip', optionalAuth, validateRequest(updateTipSchema), CartController.updateTip);
router.put('/instructions', optionalAuth, validateRequest(updateDeliveryInstructionSchema), CartController.updateDeliveryInstruction);
router.delete('/clear', optionalAuth, CartController.clearCart);

export default router;
