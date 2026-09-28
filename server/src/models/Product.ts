import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  id: string; // stable external ID/SKU, e.g. li_TYnRD6hqhBToIj
  sku: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  mrp: number;
  discount: number;
  category: string;
  subCategory?: string;
  merchantId: string;
  merchantName: string;
  image: string;
  isAvailable: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  productType: 'food' | 'grocery';
  unit?: string;
  tags: string[];
  dietary?: 'veg' | 'non-veg' | 'egg' | 'vegan';
  rating?: number;
  reviewsCount?: number;
  status: 'active' | 'draft' | 'disabled';
  featured?: boolean;
}

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true, index: true },
    sku: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    mrp: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    category: { type: String, required: true, index: true },
    subCategory: { type: String, default: '' },
    merchantId: { type: String, required: true, index: true },
    merchantName: { type: String, required: true },
    image: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    stockQuantity: { type: Number, default: 50 },
    lowStockThreshold: { type: Number, default: 10 },
    productType: { type: String, enum: ['food', 'grocery'], default: 'food', index: true },
    unit: { type: String, default: '1 Unit' },
    tags: { type: [String], default: [] },
    dietary: { type: String, enum: ['veg', 'non-veg', 'egg', 'vegan'], default: 'veg' },
    rating: { type: Number, default: 4.8 },
    reviewsCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'draft', 'disabled'], default: 'active', index: true },
    featured: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

ProductSchema.index({ name: 'text', description: 'text', category: 'text', tags: 'text' });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
