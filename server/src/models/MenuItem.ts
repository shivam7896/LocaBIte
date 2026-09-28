import mongoose, { Schema, Document } from 'mongoose';
import { DietaryType, CustomizationGroup } from '../types';

export interface IMenuItem extends Document {
  id: string; // custom ID like bj-1
  restaurantId: string; // matches Restaurant.id
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  mrp?: number;
  discount?: number;
  tax?: number;
  image: string;
  dietary: DietaryType;
  category: string;
  subCategory?: string;
  brand?: string;
  sku?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  rating?: number;
  reviewsCount?: number;
  isPopular?: boolean;
  isCustomizable?: boolean;
  customizationGroups?: CustomizationGroup[];
  isAvailable: boolean;
  status: 'draft' | 'pending' | 'active' | 'rejected' | 'disabled';
  featured?: boolean;
  tags?: string[];
}

const CustomizationOptionSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, default: 0 }
  },
  { _id: false }
);

const CustomizationGroupSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    type: { type: String, enum: ['radio', 'checkbox'], required: true },
    required: { type: Boolean, default: false },
    options: { type: [CustomizationOptionSchema], default: [] }
  },
  { _id: false }
);

const MenuItemSchema = new Schema<IMenuItem>(
  {
    id: { type: String, required: true, unique: true, index: true },
    restaurantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    mrp: { type: Number },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 5 },
    image: { type: String, required: true },
    dietary: { type: String, enum: ['veg', 'non-veg', 'egg', 'vegan'], default: 'veg' },
    category: { type: String, required: true, index: true },
    subCategory: { type: String },
    brand: { type: String, default: 'LocaBite Kitchen' },
    sku: { type: String },
    stockQuantity: { type: Number, default: 50 },
    lowStockThreshold: { type: Number, default: 10 },
    rating: { type: Number, default: 4.5 },
    reviewsCount: { type: Number, default: 0 },
    isPopular: { type: Boolean, default: false },
    isCustomizable: { type: Boolean, default: false },
    customizationGroups: { type: [CustomizationGroupSchema], default: [] },
    isAvailable: { type: Boolean, default: true },
    status: { type: String, enum: ['draft', 'pending', 'active', 'rejected', 'disabled'], default: 'active', index: true },
    featured: { type: Boolean, default: false },
    tags: { type: [String], default: [] }
  },
  {
    timestamps: true
  }
);

MenuItemSchema.index({ name: 'text', description: 'text', category: 'text' });

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
