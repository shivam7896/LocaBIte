import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/', optionalAuth, OrderController.createOrder);
router.get('/my-orders', optionalAuth, OrderController.getUserOrders);
router.get('/:orderId', optionalAuth, OrderController.getOrderById);
router.post('/:orderId/cancel', optionalAuth, OrderController.cancelOrder);
router.post('/:orderId/reorder', optionalAuth, OrderController.reorder);

export default router;
