import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  title: string;
  description: string;
  minAmount: number;
  discount: number;
  discountType: 'flat' | 'percentage';
  maxDiscount?: number;
  isActive: boolean;
  validTill: Date;
  usedCount: number;
  usageLimit?: number;
  merchantId?: string;
  categoryId?: string;
  isFreeDelivery?: boolean;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    minAmount: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true },
    discountType: { type: String, enum: ['flat', 'percentage'], default: 'flat' },
    maxDiscount: { type: Number },
    isActive: { type: Boolean, default: true },
    validTill: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    usedCount: { type: Number, default: 0 },
    usageLimit: { type: Number, default: 500 },
    merchantId: { type: String, index: true },
    categoryId: { type: String, index: true },
    isFreeDelivery: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

export const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);
