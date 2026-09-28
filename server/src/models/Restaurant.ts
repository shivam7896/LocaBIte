import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  id: string; // custom string ID matching mockData, e.g. rest-1
  name: string;
  slug: string;
  tagline: string;
  cuisines: string[];
  rating: number;
  reviewsCount: number;
  deliveryTime: string;
  distance: string;
  deliveryFee: number;
  minOrder: number;
  bannerImage: string;
  logoImage: string;
  isPureVeg: boolean;
  badge?: string;
  discountOffer?: string;
  discountCode?: string;
  fssaiLicense?: string;
  categories: string[];
  isOpen: boolean;
  ownerId?: mongoose.Types.ObjectId;
  ownerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  merchantType: 'restaurant' | 'grocery' | 'both';
  status: 'active' | 'pending' | 'rejected' | 'suspended';
  rejectionReason?: string;
  commissionRate: number; // percentage, e.g. 15
  address?: {
    building?: string;
    room?: string;
    campus?: string;
    street?: string;
    city?: string;
    pincode?: string;
  };
  openingHours?: {
    open?: string;
    close?: string;
    openTime?: string;
    closeTime?: string;
    daysOpen?: string | string[];
  };
  bankDetails?: {
    accountName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
  };
  kycDocuments?: {
    fssaiDoc?: string;
    fssaiLicense?: string;
    gstDoc?: string;
    gstin?: string;
    idProof?: string;
    panNumber?: string;
    businessProof?: string;
    verified: boolean;
  };
  totalRevenue?: number;
  totalPayouts?: number;
  pendingPayouts?: number;
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    tagline: { type: String, default: '' },
    cuisines: { type: [String], default: [] },
    rating: { type: Number, default: 4.5 },
    reviewsCount: { type: Number, default: 0 },
    deliveryTime: { type: String, default: '20–25 min' },
    distance: { type: String, default: '1.2 km away' },
    deliveryFee: { type: Number, default: 20 },
    minOrder: { type: Number, default: 99 },
    bannerImage: { type: String, required: true },
    logoImage: { type: String, required: true },
    isPureVeg: { type: Boolean, default: false },
    badge: { type: String },
    discountOffer: { type: String },
    discountCode: { type: String },
    fssaiLicense: { type: String },
    categories: { type: [String], default: [] },
    isOpen: { type: Boolean, default: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    ownerName: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    merchantType: { type: String, enum: ['restaurant', 'grocery', 'both'], default: 'restaurant' },
    status: { type: String, enum: ['active', 'pending', 'rejected', 'suspended'], default: 'active', index: true },
    rejectionReason: { type: String },
    commissionRate: { type: Number, default: 15 },
    address: {
      building: { type: String },
      room: { type: String },
      campus: { type: String },
      street: { type: String },
      city: { type: String },
      pincode: { type: String }
    },
    openingHours: {
      open: { type: String, default: '09:00 AM' },
      close: { type: String, default: '11:00 PM' },
      openTime: { type: String },
      closeTime: { type: String },
      daysOpen: { type: Schema.Types.Mixed, default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
    },
    bankDetails: {
      accountName: { type: String },
      accountHolderName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
      upiId: { type: String }
    },
    kycDocuments: {
      fssaiDoc: { type: String },
      fssaiLicense: { type: String },
      gstDoc: { type: String },
      gstin: { type: String },
      idProof: { type: String },
      panNumber: { type: String },
      businessProof: { type: String },
      verified: { type: Boolean, default: true }
    },
    totalRevenue: { type: Number, default: 0 },
    totalPayouts: { type: Number, default: 0 },
    pendingPayouts: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

RestaurantSchema.index({ name: 'text', cuisines: 'text', tagline: 'text' });

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
