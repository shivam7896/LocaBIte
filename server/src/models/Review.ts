import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  userId: string;
  userName: string;
  targetType: 'restaurant' | 'dish';
  targetId: string;
  rating: number;
  comment?: string;
}

const ReviewSchema = new Schema<IReview>(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    targetType: { type: String, enum: ['restaurant', 'dish'], required: true },
    targetId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' }
  },
  {
    timestamps: true
  }
);

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
