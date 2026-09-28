import { Router } from 'express';
import authRoutes from './authRoutes';
import restaurantRoutes from './restaurantRoutes';
import groceryRoutes from './groceryRoutes';
import cartRoutes from './cartRoutes';
import orderRoutes from './orderRoutes';
import paymentRoutes from './paymentRoutes';
import trackingRoutes from './trackingRoutes';
import searchRoutes from './searchRoutes';
import adminRoutes from './adminRoutes';
import productRoutes from './productRoutes';
import merchantRoutes from './merchantRoutes';
import riderRoutes from './riderRoutes';

const router = Router();

// Health Check
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'LocaBite Production Backend API',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/groceries', groceryRoutes);
router.use('/products', productRoutes);
router.use('/merchants', merchantRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/tracking', trackingRoutes);
router.use('/search', searchRoutes);
router.use('/admin', adminRoutes);
router.use('/rider', riderRoutes);

export default router;
