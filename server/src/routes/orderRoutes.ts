import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { optionalAuth, authenticateUser } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateUser, OrderController.createOrder);
router.get('/my-orders', authenticateUser, OrderController.getUserOrders);
router.get('/:orderId', optionalAuth, OrderController.getOrderById);
router.post('/:orderId/cancel', authenticateUser, OrderController.cancelOrder);
router.post('/:orderId/reorder', authenticateUser, OrderController.reorder);

export default router;
