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

export interface MenuItem {
  id: string;
  _id?: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  mrp?: number;
  discount?: number;
  sku?: string;
  stockQuantity?: number;
  image: string;
  dietary: DietaryType;
  category: string;
  rating?: number;
  reviewsCount?: number;
  isPopular?: boolean;
  isCustomizable?: boolean;
  customizationGroups?: CustomizationGroup[];
  [key: string]: any;
}

export interface Product {
  id: string;
  _id?: string;
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
  merchantName?: string;
  image: string;
  isAvailable: boolean;
  stock?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  productType: 'food' | 'grocery';
  unit?: string;
  tags?: string[];
  dietary?: DietaryType;
  rating?: number;
  reviewsCount?: number;
  status: 'active' | 'draft' | 'disabled';
  [key: string]: any;
}

export interface Restaurant {
  id: string;
  _id?: string;
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
  isPureVeg?: boolean;
  badge?: string;
  discountOffer?: string;
  discountCode?: string;
  fssaiLicense?: string;
  categories: string[];
  menu: MenuItem[];
  [key: string]: any;
}

export interface GroceryItem {
  id: string;
  _id?: string;
  name: string;
  category: string;
  subCategory?: string;
  weight: string;
  price: number;
  originalPrice: number;
  discountPercent?: number;
  eta: string;
  image: string;
  inStock: boolean;
  tags?: string[];
  [key: string]: any;
}

export interface CartItem {
  cartItemId: string; // Unique ID per customization combo
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

export interface Address {
  id: string;
  title: string;
  type: 'hostel' | 'department' | 'home' | 'other';
  campus: string;
  building: string;
  room: string;
  landmark?: string;
  phone: string;
  isPrimary?: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  role?: 'customer' | 'restaurant_owner' | 'grocery_owner' | 'delivery_partner' | 'admin' | string;
  membershipLevel?: string;
  loyaltyCoins?: number;
  selectedAddress?: Address;
  addresses: Address[];
  preferences?: {
    dietary: DietaryType[];
    categories: string[];
    orderStyle: ('food' | 'mart')[];
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  placedAt: string;
  items: CartItem[];
  itemTotal: number;
  deliveryFee: number;
  taxesAndHandling: number;
  discount: number;
  totalToPay: number;
  appliedPromo?: string;
  status: 'placed' | 'prepared' | 'picked_up' | 'out_for_delivery' | 'delivered';
  estimatedArrival: string;
  remainingMinutes: number;
  deliveryAddress: Address;
  deliveryInstructions?: string;
  driver?: {
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
  };
  otpOnArrival: string;
  paymentMethod: string;
}
