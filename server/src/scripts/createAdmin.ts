import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/locabite';

async function createAdmin() {
  const email = process.env.ADMIN_PROVISION_EMAIL || 'admin@locabite.com';
  const password = process.env.ADMIN_PROVISION_PASSWORD || 'AdminPassword@123';

  if (!email || !password) {
    console.error('Please set ADMIN_PROVISION_EMAIL and ADMIN_PROVISION_PASSWORD in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      existingUser.role = 'admin';
      existingUser.password = password; // Will be hashed by pre-save hook
      await existingUser.save();
      console.log(`Existing user ${email} upgraded to admin.`);
    } else {
      const newAdmin = new User({
        name: 'System Administrator',
        phone: '+91 99999 88888',
        email: email.toLowerCase(),
        password: password,
        role: 'admin',
        membershipLevel: 'Campus Executive',
        loyaltyCoins: 0,
        preferences: {
          dietary: ['non-veg'],
          categories: [],
          orderStyle: []
        },
        addresses: []
      });
      await newAdmin.save();
      console.log(`New admin account created for ${email}.`);
    }

  } catch (error) {
    console.error('Failed to create admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
