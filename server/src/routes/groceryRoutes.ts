import { Router } from 'express';
import { GroceryController } from '../controllers/groceryController';

const router = Router();

router.get('/', GroceryController.getAllGroceries);
router.get('/deals', GroceryController.getTopDeals);
router.get('/:id', GroceryController.getGroceryItemById);

export default router;
