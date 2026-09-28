import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateUser } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateMiddleware';
import { authRateLimiter } from '../middleware/rateLimitMiddleware';
import {
  sendOtpSchema,
  verifyOtpSchema,
  signupSchema,
  loginSchema,
  updatePreferencesSchema,
  addressSchema
} from '../validations/authValidation';

const router = Router();

// Public Authentication
router.post('/send-otp', authRateLimiter, validateRequest(sendOtpSchema), AuthController.sendOtp);
router.post('/verify-otp', authRateLimiter, validateRequest(verifyOtpSchema), AuthController.verifyOtp);
router.post('/signup', authRateLimiter, validateRequest(signupSchema), AuthController.signup);
router.post('/register', authRateLimiter, validateRequest(signupSchema), AuthController.signup);
router.post('/login', authRateLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/demo-login', AuthController.loginAsDemo);
router.post('/refresh', AuthController.refreshToken);

// Authenticated User Routes
router.get('/profile', authenticateUser, AuthController.getProfile);
router.put('/profile', authenticateUser, AuthController.updateProfile);
router.put('/preferences', authenticateUser, validateRequest(updatePreferencesSchema), AuthController.savePreferences);

// Saved Addresses
router.get('/addresses', authenticateUser, AuthController.getAddresses);
router.post('/addresses', authenticateUser, validateRequest(addressSchema), AuthController.addAddress);
router.put('/addresses/:addressId/default', authenticateUser, AuthController.setDefaultAddress);
router.delete('/addresses/:addressId', authenticateUser, AuthController.deleteAddress);

router.post('/logout', authenticateUser, AuthController.logout);

export default router;
