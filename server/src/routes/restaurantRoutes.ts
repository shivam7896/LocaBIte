import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurantController';
import { AdminController } from '../controllers/adminController';

const router = Router();

router.get('/', RestaurantController.getAllRestaurants);
router.get('/categories', RestaurantController.getCategories);
router.get('/featured-dishes', RestaurantController.getFeaturedDishes);
router.post('/apply', AdminController.applyMerchant);
router.get('/:idOrSlug', RestaurantController.getRestaurantByIdOrSlug);
router.get('/:restaurantId/menu', RestaurantController.getMenuItems);

export default router;
