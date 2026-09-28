import { Router } from 'express';
import { ProductController } from '../controllers/productController';

const router = Router();

// Public Products APIs
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);

export default router;
