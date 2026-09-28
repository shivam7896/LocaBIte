import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { User, IUser } from '../models/User';
import { OtpService } from '../services/otpService';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendResponse, sendError } from '../utils/apiResponse';
import { env } from '../config/env';
import { EmailService } from '../services/emailService';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * Request OTP
   */
  static async sendOtp(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { identifier } = req.body;
    try {
      const { otp } = await OtpService.generateAndSaveOtp(identifier);
      return sendResponse({
        res,
        message: 'OTP sent successfully to your device.',
        data: {
          identifier,
          // Expose OTP in development mode for easy testing
          ...(env.NODE_ENV !== 'production' && { devOtp: otp })
        }
      });
    } catch (err: any) {
      return sendError(res, `Failed to send OTP: ${err.message}`, 500);
    }
  }

  /**
   * Verify OTP and Login/Signup
   */
  static async verifyOtp(req: AuthenticatedRequest, res: Response): Promise<any> {
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    const code = req.body.code || req.body.otp;
    try {
      const user = await OtpService.verifyOtp(identifier, code);
      if (!user) {
        return sendError(res, 'Invalid or expired OTP code', 400);
      }

      const tokenPayload = {
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        phone: user.phone
      };

      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      user.refreshToken = refreshToken;
      await user.save();

      // Send welcome email if user hasn't received one yet and has an email address
      if (user.email && !user.welcomeEmailSent) {
        user.welcomeEmailSent = true;
        await user.save();
        EmailService.sendWelcomeEmail({
          to: user.email,
          userName: user.name
        }).catch(err => {
          logger.error(`[AUTH] Failed to send welcome email to ${user.email}: ${err.message}`);
        });
      }

      return sendResponse({
        res,
        message: 'Authentication successful',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (err: any) {
      return sendError(res, `Verification failed: ${err.message}`, 500);
    }
  }

  /**
   * Standard Signup with Password
   */
  static async signup(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { name, phone, email, password, role } = req.body;

    try {
      const existingUser = await User.findOne({
        $or: [{ phone }, ...(email ? [{ email: email.toLowerCase() }] : [])]
      });

      if (existingUser) {
        return sendError(res, 'A user with this phone or email already exists.', 409);
      }

      const user = new User({
        name,
        phone,
        email: email ? email.toLowerCase() : undefined,
        password,
        role: 'customer', // Public signups are always customer role
        membershipLevel: 'Gold Member',

        loyaltyCoins: 420,
        preferences: {
          dietary: ['non-veg'],
          categories: ['Burgers', 'North Indian', 'Groceries'],
          orderStyle: ['food', 'mart']
        },
        addresses: []
      });

      await user.save();

      const tokenPayload = {
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        phone: user.phone
      };

      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      user.refreshToken = refreshToken;
      await user.save();

      // Dispatch welcome email
      if (user.email && !user.welcomeEmailSent) {
        user.welcomeEmailSent = true;
        await user.save();
        EmailService.sendWelcomeEmail({
          to: user.email,
          userName: user.name
        }).catch(err => {
          logger.error(`[AUTH] Failed to send welcome email to ${user.email}: ${err.message}`);
        });
      }

      return sendResponse({
        res,
        statusCode: 201,
        message: 'Account created successfully',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (err: any) {
      return sendError(res, `Signup failed: ${err.message}`, 500);
    }
  }

  /**
   * Standard Login with Password
   */
  static async login(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { identifier, password } = req.body;

    try {
      const isEmail = identifier.includes('@');
      const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

      const user = await User.findOne(query);
      if (!user) {
        return sendError(res, 'Invalid credentials', 401);
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return sendError(res, 'Invalid credentials', 401);
      }

      const tokenPayload = {
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        phone: user.phone
      };

      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      user.refreshToken = refreshToken;
      await user.save();

      return sendResponse({
        res,
        message: 'Login successful',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (err: any) {
      return sendError(res, `Login failed: ${err.message}`, 500);
    }
  }

  /**
   * One-Click Demo Login (Aarav Sharma)
   */
  static async loginAsDemo(_req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      let demoUser = await User.findOne({ phone: '+91 98765 43210' });

      if (!demoUser) {
        demoUser = new User({
          name: 'Aarav Sharma',
          phone: '+91 98765 43210',
          email: 'aarav.sharma@quantum.edu.in',
          role: 'customer',
          membershipLevel: 'Gold Member',
          loyaltyCoins: 420,
          selectedAddress: {
            title: 'Boys Hostel Block C',
            type: 'hostel',
            campus: 'Quantum University, Roorkee',
            building: 'Block C, Room 204',
            room: 'Room 204',
            landmark: 'Near Quadrangle Lawn',
            phone: '+91 98765 43210',
            isPrimary: true
          },
          addresses: [
            {
              title: 'Boys Hostel Block C',
              type: 'hostel',
              campus: 'Quantum University, Roorkee',
              building: 'Block C, Room 204',
              room: 'Room 204',
              landmark: 'Near Quadrangle Lawn',
              phone: '+91 98765 43210',
              isPrimary: true
            },
            {
              title: 'Central Library Ground Floor',
              type: 'department',
              campus: 'Quantum University, Roorkee',
              building: 'Academic Block A',
              room: 'Study Desk 14',
              landmark: 'Library Reception Desk',
              phone: '+91 98765 43210',
              isPrimary: false
            }
          ],
          preferences: {
            dietary: ['non-veg'],
            categories: ['Burgers', 'North Indian', 'Groceries'],
            orderStyle: ['food', 'mart']
          }
        });
        await demoUser.save();
      }

      const tokenPayload = {
        userId: demoUser._id.toString(),
        role: demoUser.role,
        email: demoUser.email,
        phone: demoUser.phone
      };

      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      demoUser.refreshToken = refreshToken;
      await demoUser.save();

      return sendResponse({
        res,
        message: 'Logged in as Demo User',
        data: {
          user: demoUser,
          accessToken,
          refreshToken
        }
      });
    } catch (err: any) {
      return sendError(res, `Demo login failed: ${err.message}`, 500);
    }
  }

  /**
   * Refresh Access Token
   */
  static async refreshToken(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendError(res, 'Refresh token required', 400);
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user || user.refreshToken !== refreshToken || !user.isActive) {
        return sendError(res, 'Invalid refresh token', 401);
      }

      const newAccessToken = signAccessToken({
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        phone: user.phone
      });

      return sendResponse({
        res,
        message: 'Token refreshed',
        data: { accessToken: newAccessToken }
      });
    } catch (err: any) {
      return sendError(res, 'Invalid or expired refresh token', 401);
    }
  }

  /**
   * Get Current Authenticated Profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const user = await User.findById(req.user!.userId).select('-password -otpCode');
      if (!user) {
        return sendError(res, 'User not found', 404);
      }
      return sendResponse({
        res,
        data: user
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Update Profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { name, email, avatar } = req.body;
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) return sendError(res, 'User not found', 404);

      if (name) user.name = name;
      if (email) user.email = email.toLowerCase();
      if (avatar) user.avatar = avatar;

      await user.save();

      return sendResponse({
        res,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Save User Preferences (Dietary & Order Style)
   */
  static async savePreferences(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { dietary, orderStyle } = req.body;
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) return sendError(res, 'User not found', 404);

      user.preferences = {
        ...user.preferences,
        ...(dietary && { dietary }),
        ...(orderStyle && { orderStyle })
      };

      await user.save();

      return sendResponse({
        res,
        message: 'Preferences saved successfully',
        data: user.preferences
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Get Saved Addresses
   */
  static async getAddresses(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) return sendError(res, 'User not found', 404);

      return sendResponse({
        res,
        data: {
          selectedAddress: user.selectedAddress || user.addresses[0] || null,
          addresses: user.addresses
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Add a New Address
   */
  static async addAddress(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) return sendError(res, 'User not found', 404);

      const newAddress = {
        ...req.body,
        id: `addr-${Date.now()}`
      };

      if (newAddress.isPrimary || user.addresses.length === 0) {
        user.addresses.forEach(a => (a.isPrimary = false));
        newAddress.isPrimary = true;
        user.selectedAddress = newAddress;
      }

      user.addresses.push(newAddress);
      await user.save();

      return sendResponse({
        res,
        statusCode: 201,
        message: 'Address added successfully',
        data: {
          address: newAddress,
          addresses: user.addresses
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Set Default / Active Address
   */
  static async setDefaultAddress(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { addressId } = req.params;
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) return sendError(res, 'User not found', 404);

      const targetAddr = user.addresses.find(a => a.id === addressId);
      if (!targetAddr) {
        return sendError(res, 'Address not found', 404);
      }

      user.addresses.forEach(a => {
        a.isPrimary = a.id === addressId;
      });
      user.selectedAddress = targetAddr;
      await user.save();

      return sendResponse({
        res,
        message: 'Primary address updated',
        data: {
          selectedAddress: user.selectedAddress,
          addresses: user.addresses
        }
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Delete Address
   */
  static async deleteAddress(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { addressId } = req.params;
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) return sendError(res, 'User not found', 404);

      user.addresses = user.addresses.filter(a => a.id !== addressId);
      if (user.selectedAddress?.id === addressId) {
        user.selectedAddress = user.addresses[0] || undefined;
      }
      await user.save();

      return sendResponse({
        res,
        message: 'Address removed successfully',
        data: user.addresses
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Logout
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      if (req.user) {
        await User.findByIdAndUpdate(req.user.userId, { refreshToken: null });
      }
      return sendResponse({
        res,
        message: 'Logged out successfully'
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
