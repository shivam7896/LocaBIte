import mongoose, { Schema, Document } from 'mongoose';
import { DietaryType, CustomizationOption } from '../types';

export interface ICartItem {
  cartItemId: string;
  type: 'food' | 'grocery';
  id: string;
  restaurantId?: string;
  restaurantName?: string;
  name: string;
  image: string;
  dietary?: DietaryType;
  price: number;
  quantity: number;
  unitWeight?: string;
  customizations?: {
    size?: CustomizationOption;
    addons?: CustomizationOption[];
    spiceLevel?: string;
  };
}

export interface ICart extends Document {
  userId: string;
  items: ICartItem[];
  appliedPromo?: string | null;
  driverTip: number;
  deliveryInstruction: string;
  itemTotal: number;
  deliveryFee: number;
  taxesAndHandling: number;
  discount: number;
  totalToPay: number;
  calculateTotals(): void;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    cartItemId: { type: String, required: true },
    type: { type: String, enum: ['food', 'grocery'], required: true },
    id: { type: String, required: true },
    restaurantId: { type: String },
    restaurantName: { type: String },
    name: { type: String, required: true },
    image: { type: String, required: true },
    dietary: { type: String, enum: ['veg', 'non-veg', 'egg', 'vegan'] },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitWeight: { type: String },
    customizations: {
      size: { id: String, name: String, price: Number },
      addons: [{ id: String, name: String, price: Number }],
      spiceLevel: String
    }
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    items: { type: [CartItemSchema], default: [] },
    appliedPromo: { type: String, default: null },
    driverTip: { type: Number, default: 0 },
    deliveryInstruction: { type: String, default: 'Leave at door' },
    itemTotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    taxesAndHandling: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalToPay: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

CartSchema.methods.calculateTotals = function () {
  this.itemTotal = this.items.reduce((sum: number, item: ICartItem) => sum + item.price * item.quantity, 0);

  // Delivery fee logic matching Stitch UI: free if total >= 199 or promo is CAMPUSFREE, else 20
  const isFreeDelivery = this.itemTotal >= 199 || this.appliedPromo === 'CAMPUSFREE';
  this.deliveryFee = this.items.length === 0 ? 0 : isFreeDelivery ? 0 : 20;

  // Taxes & Campus handling: flat ₹21
  this.taxesAndHandling = this.items.length === 0 ? 0 : 21;

  this.totalToPay = Math.max(0, this.itemTotal + this.deliveryFee + this.taxesAndHandling + this.driverTip - this.discount);
};

export const Cart = mongoose.model<ICart>('Cart', CartSchema);
