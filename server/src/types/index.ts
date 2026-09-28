import { Request } from 'express';

export type UserRole = 'customer' | 'restaurant_owner' | 'grocery_owner' | 'delivery_partner' | 'rider' | 'admin';

export type DietaryType = 'veg' | 'non-veg' | 'egg' | 'vegan';

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
}

export interface CustomizationGroup {
  id: string;
  title: string;
  subtitle?: string;
  type: 'radio' | 'checkbox';
  required: boolean;
  options: CustomizationOption[];
}

export interface UserAddress {
  id?: string;
  title: string;
  type: 'hostel' | 'department' | 'home' | 'other';
  campus: string;
  building: string;
  room: string;
  landmark?: string;
  phone: string;
  isPrimary?: boolean;
}

export interface AuthUserPayload {
  userId: string;
  role: UserRole;
  email?: string;
  phone?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}
