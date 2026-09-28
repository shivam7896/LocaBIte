import { Router } from 'express';
import { RiderController } from '../controllers/riderController';
import { authenticateUser, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Public verification: Check if an email is registered as a Rider
router.post('/auth/check', RiderController.checkRiderEmail);

// Protected Rider endpoints
router.use(authenticateUser);
router.use(requireRole('delivery_partner', 'rider', 'admin'));

// Rider profile & duty availability
router.get('/profile', RiderController.getProfile);
router.put('/availability', RiderController.toggleAvailability);

// Orders dispatch & management
router.get('/orders', RiderController.getOrders);
router.post('/orders/:orderId/accept', RiderController.acceptOrder);
router.post('/orders/:orderId/reject', RiderController.rejectOrder);
router.put('/orders/:orderId/status', RiderController.updateOrderStatus);

// GPS Location broadcast
router.post('/location', RiderController.updateLocation);

export default router;
