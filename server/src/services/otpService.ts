import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';
import { EmailService } from './emailService';

export class OtpService {
  /**
   * Generates a 6-digit OTP code and sets 10-minute expiry on user
   */
  static async generateAndSaveOtp(identifier: string): Promise<{ user: IUser; otp: string }> {
    const isEmail = identifier.includes('@');
    const isSpecialAdmin =
      identifier.toLowerCase() === 'sk866436@gmail.com' ||
      identifier.toLowerCase() === 'admin@locabite.com';
    const otp = isSpecialAdmin ? '789612' : crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

    let user = await User.findOne(query);

    if (!user) {
      // Create user if signing up via OTP
      const defaultName = isSpecialAdmin
        ? identifier.toLowerCase() === 'sk866436@gmail.com'
          ? 'Shivam (Super Admin)'
          : 'Super Administrator'
        : isEmail
        ? identifier.split('@')[0]
        : `Campus Member ${identifier.slice(-4)}`;

      user = new User({
        name: defaultName,
        phone: isSpecialAdmin
          ? identifier.toLowerCase() === 'sk866436@gmail.com'
            ? '+91 86643 60000'
            : '+91 99999 88888'
          : isEmail
          ? `+91${crypto.randomInt(6000000000, 9999999999)}`
          : identifier,
        email: isEmail ? identifier.toLowerCase() : undefined,
        password: isSpecialAdmin ? '789612' : undefined,
        role: isSpecialAdmin ? 'admin' : 'customer',
        membershipLevel: isSpecialAdmin ? 'Campus Executive' : 'Gold Member',
        loyaltyCoins: 9999,
        preferences: {
          dietary: ['non-veg'],
          categories: ['Burgers', 'North Indian', 'Groceries'],
          orderStyle: ['food', 'mart']
        },
        addresses: []
      });
    } else if (isSpecialAdmin) {
      user.role = 'admin';
      user.password = '789612';
    }

    user.otpCode = otp;
    user.otpExpiresAt = expiresAt;
    await user.save();

    logger.info(`[OTP SERVICE] Generated OTP for ${identifier}: ${otp}`);

    // If identifier is an email, dispatch the email
    if (isEmail) {
      EmailService.sendOtpEmail({
        to: identifier.toLowerCase().trim(),
        otp,
        userName: user.name
      }).catch(err => {
        logger.error(`[OTP SERVICE] Error dispatching OTP email: ${err.message}`);
      });
    }

    return { user, otp };
  }

  /**
   * Verifies an OTP code
   */
  static async verifyOtp(identifier: string, code: string): Promise<IUser | null> {
    const isEmail = identifier.includes('@');
    const isSpecialAdmin =
      identifier.toLowerCase() === 'sk866436@gmail.com' ||
      identifier.toLowerCase() === 'admin@locabite.com';
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

    let user = await User.findOne(query);

    // Support demo OTP bypass codes (481920 or 123456) and admin OTP 789612
    const isDemoBypass =
      code === '481920' ||
      code === '123456' ||
      (isSpecialAdmin && code === '789612');

    if (!user) {
      if (isSpecialAdmin && code === '789612') {
        user = new User({
          name:
            identifier.toLowerCase() === 'sk866436@gmail.com'
              ? 'Shivam (Super Admin)'
              : 'Super Administrator',
          phone:
            identifier.toLowerCase() === 'sk866436@gmail.com'
              ? '+91 86643 60000'
              : '+91 99999 88888',
          email: identifier.toLowerCase(),
          password: '789612',
          role: 'admin',
          membershipLevel: 'Campus Executive',
          loyaltyCoins: 9999,
          preferences: {
            dietary: ['non-veg'],
            categories: ['Burgers', 'North Indian', 'Groceries'],
            orderStyle: ['food', 'mart']
          },
          addresses: [
            {
              id: 'addr-admin-1',
              title: 'Campus Administration HQ',
              type: 'department',
              campus: 'Quantum University, Roorkee',
              building: 'Administrative Block A',
              room: 'Executive Suite 101',
              phone: identifier.toLowerCase() === 'sk866436@gmail.com' ? '+91 86643 60000' : '+91 99999 88888',
              isPrimary: true
            }
          ]
        });
        await user.save();
        return user;
      }

      if (isDemoBypass) {
        const defaultName = isEmail ? identifier.split('@')[0] : `Campus Member ${identifier.slice(-4)}`;
        user = new User({
          name: defaultName,
          phone: isEmail ? `+91${crypto.randomInt(6000000000, 9999999999)}` : identifier,
          email: isEmail ? identifier.toLowerCase() : undefined,
          role: 'customer',
          membershipLevel: 'Gold Member',
          loyaltyCoins: 420,
          preferences: {
            dietary: ['non-veg'],
            categories: ['Burgers', 'North Indian', 'Groceries'],
            orderStyle: ['food', 'mart']
          },
          addresses: [
            {
              id: 'addr-default-1',
              title: 'Hostel / Campus',
              type: 'hostel',
              campus: 'Quantum University, Roorkee',
              building: 'Sarojini Bhawan',
              room: 'Room 204',
              phone: isEmail ? '+91 98765 43210' : identifier,
              isPrimary: true
            }
          ]
        });
        await user.save();
        return user;
      }
      return null;
    }

    if (isSpecialAdmin && code === '789612') {
      user.role = 'admin';
      user.password = '789612';
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
      await user.save();
      return user;
    }

    if (!isDemoBypass) {
      if (!user.otpCode || user.otpCode !== code) {
        return null;
      }
      if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
        return null; // Expired
      }
    }

    if (isSpecialAdmin) {
      user.role = 'admin';
      user.password = '789612';
    }

    // Clear OTP after successful verification
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    return user;
  }
}
