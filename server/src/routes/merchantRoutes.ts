import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { RestaurantController } from '../controllers/restaurantController';

const router = Router();

// Public Merchants & Merchant Products APIs
router.get('/', RestaurantController.getAllRestaurants);
router.get('/:id', RestaurantController.getRestaurantByIdOrSlug);
router.get('/:id/products', ProductController.getMerchantProducts);

export default router;
