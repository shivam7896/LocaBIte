import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/razorpay-order', optionalAuth, PaymentController.createOrder);
router.post('/verify', optionalAuth, PaymentController.verifyPayment);
router.post('/webhook', PaymentController.handleWebhook);

export default router;
