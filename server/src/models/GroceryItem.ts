import mongoose, { Schema, Document } from 'mongoose';

export interface IGroceryItem extends Document {
  id: string; // custom ID like groc-1
  merchantId?: string;
  name: string;
  description?: string;
  brand?: string;
  sku?: string;
  category: string; // produce, dairy, instant, etc.
  subCategory?: string;
  weight: string;
  price: number;
  originalPrice: number;
  mrp?: number;
  discountPercent?: number;
  tax?: number;
  eta: string;
  image: string;
  inStock: boolean;
  isAvailable?: boolean;
  tags?: string[];
  stockQuantity: number;
  lowStockThreshold: number;
  status: 'draft' | 'pending' | 'active' | 'rejected' | 'disabled';
  featured?: boolean;
}

const GroceryItemSchema = new Schema<IGroceryItem>(
  {
    id: { type: String, required: true, unique: true, index: true },
    merchantId: { type: String, default: 'mart-main', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    brand: { type: String, default: 'LocaBite Fresh' },
    sku: { type: String },
    category: { type: String, required: true, index: true },
    subCategory: { type: String, index: true },
    weight: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    mrp: { type: Number },
    discountPercent: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    eta: { type: String, default: '10 Mins ETA' },
    image: { type: String, required: true },
    inStock: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
    stockQuantity: { type: Number, default: 100 },
    lowStockThreshold: { type: Number, default: 15 },
    status: { type: String, enum: ['draft', 'pending', 'active', 'rejected', 'disabled'], default: 'active', index: true },
    featured: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

GroceryItemSchema.index({ name: 'text', category: 'text', subCategory: 'text', tags: 'text' });

export const GroceryItem = mongoose.model<IGroceryItem>('GroceryItem', GroceryItemSchema);
