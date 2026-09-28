import mongoose, { Schema, Document } from 'mongoose';
import { UserAddress } from '../types';
import { ICartItem } from './Cart';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'prepared'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export interface IOrderDriver {
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  rating: number;
  deliveriesCount: number;
  avatar: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface IOrder extends Document {
  id: string; // custom id like ord-892401
  orderNumber: string; // LB-892401
  userId: string;
  items: ICartItem[];
  itemTotal: number;
  deliveryFee: number;
  taxesAndHandling: number;
  discount: number;
  totalToPay: number;
  appliedPromo?: string;
  status: OrderStatus;
  statusTimeline: IOrderStatusHistory[];
  placedAt: string;
  estimatedArrival: string;
  remainingMinutes: number;
  deliveryAddress: UserAddress;
  deliveryInstructions?: string;
  driver?: IOrderDriver;
  otpOnArrival: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  merchantId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String }
  },
  { _id: false }
);

const OrderDriverSchema = new Schema<IOrderDriver>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    vehicleType: { type: String, default: 'Zero Carbon Electric Moped' },
    rating: { type: Number, default: 4.9 },
    deliveriesCount: { type: Number, default: 1200 },
    avatar: { type: String, required: true },
    currentLocation: {
      lat: { type: Number, default: 29.8543 },
      lng: { type: Number, default: 77.888 }
    }
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    items: [{ type: Schema.Types.Mixed }],
    itemTotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    taxesAndHandling: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalToPay: { type: Number, required: true },
    appliedPromo: { type: String },
    status: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'prepared',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'failed'
      ],
      default: 'placed',
      index: true
    },
    statusTimeline: { type: [OrderStatusHistorySchema], default: [] },
    placedAt: { type: String, required: true },
    estimatedArrival: { type: String, default: 'In 15–20 mins' },
    remainingMinutes: { type: Number, default: 15 },
    deliveryAddress: { type: Schema.Types.Mixed, required: true },
    deliveryInstructions: { type: String, default: 'Leave at door' },
    driver: { type: OrderDriverSchema },
    otpOnArrival: { type: String, required: true },
    paymentMethod: { type: String, default: 'UPI (Google Pay)' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    refundAmount: { type: Number },
    refundReason: { type: String },
    refundedAt: { type: Date },
    merchantId: { type: String, index: true },
    cancellationReason: { type: String }
  },
  {
    timestamps: true
  }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
