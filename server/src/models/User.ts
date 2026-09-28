import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, DietaryType, UserAddress } from '../types';

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  avatar: string;
  role: UserRole;
  membershipLevel: string;
  loyaltyCoins: number;
  selectedAddress?: UserAddress;
  addresses: UserAddress[];
  preferences: {
    dietary: DietaryType[];
    categories: string[];
    orderStyle: ('food' | 'mart')[];
  };
  favorites: {
    restaurants: string[];
    dishes: string[];
  };
  otpCode?: string;
  otpExpiresAt?: Date;
  refreshToken?: string;
  isActive: boolean;
  welcomeEmailSent?: boolean;
  isTestAccount?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AddressSchema = new Schema<UserAddress>(
  {
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    title: { type: String, required: true },
    type: { type: String, enum: ['hostel', 'department', 'home', 'other'], default: 'hostel' },
    campus: { type: String, default: 'Quantum University, Roorkee' },
    building: { type: String, required: true },
    room: { type: String, required: true },
    landmark: { type: String, default: '' },
    phone: { type: String, required: true },
    isPrimary: { type: Boolean, default: false }
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, sparse: true, trim: true, lowercase: true },
    password: { type: String },
    avatar: {
      type: String,
      default:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg'
    },
    role: {
      type: String,
      enum: ['customer', 'restaurant_owner', 'grocery_owner', 'delivery_partner', 'rider', 'admin'],
      default: 'customer'
    },
    membershipLevel: { type: String, default: 'Gold Member' },
    loyaltyCoins: { type: Number, default: 420 },
    selectedAddress: { type: AddressSchema },
    addresses: { type: [AddressSchema], default: [] },
    preferences: {
      dietary: { type: [String], default: ['non-veg'] },
      categories: { type: [String], default: ['Burgers', 'North Indian', 'Groceries'] },
      orderStyle: { type: [String], default: ['food', 'mart'] }
    },
    favorites: {
      restaurants: { type: [String], default: [] },
      dishes: { type: [String], default: [] }
    },
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    refreshToken: { type: String },
    welcomeEmailSent: { type: Boolean, default: false },
    isTestAccount: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.otpCode;
        return ret;
      }
    }
  }

);

UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  // Prevent double hashing if already a bcrypt hash
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
