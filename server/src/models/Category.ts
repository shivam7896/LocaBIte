import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  id: string; // e.g. burgers, pizza, groceries
  name: string;
  type: 'food' | 'grocery' | 'all';
  icon: string;
  iconColor?: string;
  color?: string;
  badge?: string;
  image?: string;
  description?: string;
  parentCategoryId?: string;
  isVisible: boolean;
  order: number;
}

const CategorySchema = new Schema<ICategory>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['food', 'grocery', 'all'], default: 'food' },
    icon: { type: String, required: true },
    iconColor: { type: String, default: 'text-primary' },
    color: { type: String },
    badge: { type: String },
    image: { type: String },
    description: { type: String, default: '' },
    parentCategoryId: { type: String, index: true },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
