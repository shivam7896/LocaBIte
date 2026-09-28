import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateUser, requireRole } from '../middleware/authMiddleware';
import { logAdminAction } from '../middleware/auditMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import { UploadService } from '../services/uploadService';
import { sendResponse, sendError } from '../utils/apiResponse';

const router = Router();

// Apply authentication to all admin/merchant console routes
router.use(authenticateUser, requireRole('admin', 'restaurant_owner'));

// 1. Dashboard Metrics
router.get('/stats', AdminController.getDashboardStats);
router.get('/dashboard-stats', AdminController.getDashboardStats);

// 2. Users Management (Super Admin Only)
router.get('/users', requireRole('admin'), AdminController.getUsers);
router.put('/users/:userId/role', requireRole('admin'), logAdminAction('UPDATE_ROLE', 'USER'), AdminController.updateUserRole);
router.put('/users/:userId/status', requireRole('admin'), logAdminAction('TOGGLE_STATUS', 'USER'), AdminController.toggleUserStatus);

// 3. Orders Management & Refunds
router.get('/orders', AdminController.getOrders);
router.put('/orders/:orderId/status', logAdminAction('UPDATE_STATUS', 'ORDER'), AdminController.updateOrderStatus);
router.post('/orders/:orderId/refund', requireRole('admin'), logAdminAction('PROCESS_REFUND', 'ORDER'), AdminController.processRefund);

// 4. Merchants / Outlets Management
router.get('/merchants', AdminController.getMerchants);
router.get('/merchants/:id', AdminController.getMerchantById);
router.post('/merchants', requireRole('admin'), logAdminAction('CREATE', 'MERCHANT'), AdminController.createRestaurant);
router.put('/merchants/:id', logAdminAction('UPDATE', 'MERCHANT'), AdminController.updateRestaurant);
router.put('/merchants/:id/status', requireRole('admin'), logAdminAction('CHANGE_STATUS', 'MERCHANT'), AdminController.updateMerchantStatus);
router.put('/merchants/:id/commission', requireRole('admin'), logAdminAction('UPDATE_COMMISSION', 'MERCHANT'), AdminController.updateMerchantCommission);
router.delete('/merchants/:id', requireRole('admin'), logAdminAction('DELETE', 'MERCHANT'), AdminController.deleteRestaurant);

// Legacy Restaurant endpoints for compatibility
router.post('/restaurants', requireRole('admin'), logAdminAction('CREATE', 'RESTAURANT'), AdminController.createRestaurant);
router.put('/restaurants/:id', logAdminAction('UPDATE', 'RESTAURANT'), AdminController.updateRestaurant);
router.put('/restaurants/:id/status', requireRole('admin'), logAdminAction('CHANGE_STATUS', 'MERCHANT'), AdminController.updateMerchantStatus);
router.delete('/restaurants/:id', requireRole('admin'), logAdminAction('DELETE', 'RESTAURANT'), AdminController.deleteRestaurant);

// 5. Unified Products Operations (Food dishes & Grocery items)
router.get('/products', AdminController.getProducts);
router.post('/products', logAdminAction('CREATE', 'PRODUCT'), AdminController.createProduct);
router.put('/products/:id', logAdminAction('UPDATE', 'PRODUCT'), AdminController.updateProduct);
router.put('/products/:id/stock', logAdminAction('UPDATE_STOCK', 'PRODUCT'), AdminController.updateProductStock);
router.delete('/products/:id', logAdminAction('DELETE', 'PRODUCT'), AdminController.deleteProduct);
router.post('/products/:id/duplicate', logAdminAction('DUPLICATE', 'PRODUCT'), AdminController.duplicateProduct);
router.post('/products/bulk-update', logAdminAction('BULK_UPDATE', 'PRODUCT'), AdminController.bulkUpdateProducts);

// Legacy Menu Items & Groceries Management (mapped to unified product controller)
router.post('/menu-items', logAdminAction('CREATE', 'MENU_ITEM'), AdminController.createProduct);
router.put('/menu-items/:id', logAdminAction('UPDATE', 'MENU_ITEM'), AdminController.updateProduct);
router.delete('/menu-items/:id', logAdminAction('DELETE', 'MENU_ITEM'), AdminController.deleteProduct);

router.post('/groceries', logAdminAction('CREATE', 'GROCERY'), AdminController.createProduct);
router.put('/groceries/:id', logAdminAction('UPDATE', 'GROCERY'), AdminController.updateProduct);
router.delete('/groceries/:id', logAdminAction('DELETE', 'GROCERY'), AdminController.deleteProduct);

// 6. Categories & Subcategories Management (Super Admin Only for modifications)
router.get('/categories', AdminController.getCategories);
router.post('/categories', requireRole('admin'), logAdminAction('CREATE', 'CATEGORY'), AdminController.createCategory);
router.put('/categories/:id', requireRole('admin'), logAdminAction('UPDATE', 'CATEGORY'), AdminController.updateCategory);
router.delete('/categories/:id', requireRole('admin'), logAdminAction('DELETE', 'CATEGORY'), AdminController.deleteCategory);

// 7. Coupons & Offers Management (Super Admin Only for modifications)
router.get('/coupons', AdminController.getCoupons);
router.post('/coupons', requireRole('admin'), logAdminAction('CREATE', 'COUPON'), AdminController.createCoupon);
router.delete('/coupons/:code', requireRole('admin'), logAdminAction('DELETE', 'COUPON'), AdminController.deleteCoupon);

// 8. Delivery Partners Management (Super Admin Only for modifications)
router.get('/delivery-partners', AdminController.getDeliveryPartners);
router.post('/delivery-partners', requireRole('admin'), logAdminAction('CREATE', 'DRIVER'), AdminController.createDeliveryPartner);

// 9. Audit Logs (Super Admin Only)
router.get('/audit-logs', requireRole('admin'), AdminController.getAuditLogs);

// 10. Image Upload to Cloudinary
router.post('/upload', upload.single('image'), async (req, res): Promise<any> => {
  try {
    if (!req.file) {
      return sendError(res, 'No image file uploaded', 400);
    }
    const imageUrl = await UploadService.uploadBuffer(req.file.buffer);
    return sendResponse({
      res,
      message: 'Image uploaded successfully',
      data: { url: imageUrl }
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

export default router;
