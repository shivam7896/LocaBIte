import { Router } from 'express';
import { TrackingController } from '../controllers/trackingController';

const router = Router();

router.get('/:orderId', TrackingController.getOrderTracking);
router.put('/:orderId/status', TrackingController.updateStatus);
router.put('/:orderId/location', TrackingController.updateDriverLocation);

export default router;
