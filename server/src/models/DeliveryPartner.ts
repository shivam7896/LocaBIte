import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryPartner extends Document {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar: string;
  vehicleNumber: string;
  vehicleType: string;
  rating: number;
  deliveriesCount: number;
  currentLocation: {
    lat: number;
    lng: number;
  };
  isAvailable: boolean;
  activeOrderId?: string;
}

const DeliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, sparse: true, lowercase: true },
    avatar: {
      type: String,
      default:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg'
    },
    vehicleNumber: { type: String, required: true },
    vehicleType: { type: String, default: 'Zero Carbon Electric Moped' },
    rating: { type: Number, default: 4.9 },
    deliveriesCount: { type: Number, default: 1200 },
    currentLocation: {
      lat: { type: Number, default: 29.8543 },
      lng: { type: Number, default: 77.888 }
    },
    isAvailable: { type: Boolean, default: true },
    activeOrderId: { type: String }
  },
  {
    timestamps: true
  }
);

export const DeliveryPartner = mongoose.model<IDeliveryPartner>('DeliveryPartner', DeliveryPartnerSchema);
