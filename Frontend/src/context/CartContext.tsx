import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Address, MenuItem, GroceryItem, CustomizationOption } from '../types';
import { api } from '../services/api';

const defaultAddress: Address = {
  id: 'addr-default',
  title: 'Choose delivery location',
  type: 'apartment',
  campus: '',
  building: 'No location selected',
  room: '',
  landmark: '',
  phone: '',
  isPrimary: true
};

interface CartContextType {
  items: CartItem[];
  addMenuItem: (
    item: MenuItem,
    customizations?: {
      size?: CustomizationOption;
      addons?: CustomizationOption[];
      spiceLevel?: string;
    },
    quantity?: number
  ) => void;
  addGroceryItem: (item: GroceryItem, quantity?: number) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  itemTotal: number;
  deliveryFee: number;
  taxesAndHandling: number;
  driverTip: number;
  setDriverTip: (tip: number) => void;
  appliedPromo: string | null;
  discount: number;
  availableCoupons: any[];
  applyPromo: (code: string) => { success: boolean; message: string };
  removePromo: () => void;
  totalToPay: number;
  totalItemsCount: number;
  selectedAddress: Address;
  setSelectedAddress: (addr: Address) => void;
  deliveryInstruction: string;
  setDeliveryInstruction: (inst: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [driverTip, setDriverTip] = useState<number>(0);
  const [selectedAddress, setSelectedAddress] = useState<Address>(defaultAddress);
  const [deliveryInstruction, setDeliveryInstruction] = useState<string>('Leave at door');

  // Load server-side cart, coupons and user profile on mount
  useEffect(() => {
    const fetchCartAndCoupons = async () => {
      try {
        const [cartRes, coupRes, profileRes] = await Promise.all([
          api.cart.get(),
          api.cart.getCoupons(),
          api.auth.getProfile()
        ]);
        if (cartRes.success && cartRes.data) {
          if (cartRes.data.items && cartRes.data.items.length > 0) {
            setItems(cartRes.data.items);
          }
          if (cartRes.data.appliedPromo) setAppliedPromo(cartRes.data.appliedPromo);
          if (cartRes.data.driverTip !== undefined) setDriverTip(cartRes.data.driverTip);
          if (cartRes.data.deliveryInstruction) setDeliveryInstruction(cartRes.data.deliveryInstruction);
        }
        if (coupRes.success && coupRes.data) {
          setCoupons(coupRes.data);
        }
        if (profileRes.success && profileRes.data?.selectedAddress) {
          setSelectedAddress(profileRes.data.selectedAddress);
        }
      } catch (err: any) {
        console.warn('Cart initialization error:', err.message);
      }
    };
    fetchCartAndCoupons();
  }, []);

  // Compute item total
  const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Delivery fee logic: Free delivery as requested
  const deliveryFee = 0;

  // Campus Handling & Taxes: 0 as requested
  const taxesAndHandling = 0;

  // Discount calculation from real active coupons in DB
  let discount = 0;
  if (appliedPromo) {
    const promo = coupons.find(p => p.code === appliedPromo);
    if (promo && itemTotal >= promo.minAmount) {
      discount = promo.discount;
    }
  }

  const totalToPay = Math.max(0, itemTotal + deliveryFee + taxesAndHandling + driverTip - discount);
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const addMenuItem = (
    item: MenuItem,
    customizations?: {
      size?: CustomizationOption;
      addons?: CustomizationOption[];
      spiceLevel?: string;
    },
    quantity = 1
  ) => {
    let finalPrice = item.price;
    let customKey = item.id;

    if (customizations?.size) {
      finalPrice += customizations.size.price;
      customKey += `-${customizations.size.id}`;
    }
    if (customizations?.addons) {
      customizations.addons.forEach(a => {
        finalPrice += a.price;
        customKey += `-${a.id}`;
      });
    }
    if (customizations?.spiceLevel) {
      customKey += `-${customizations.spiceLevel}`;
    }

    setItems(prev => {
      const existing = prev.find(i => i.cartItemId === customKey);
      if (existing) {
        return prev.map(i =>
          i.cartItemId === customKey ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          cartItemId: customKey,
          type: 'food',
          id: item.id,
          restaurantId: item.restaurantId,
          restaurantName: (item as any).brand || (item as any).restaurantName || 'Campus Eatery',
          name: item.name,
          image: item.image,
          dietary: item.dietary,
          price: finalPrice,
          quantity,
          customizations
        }
      ];
    });

    // Sync with backend API
    api.cart.addItem({
      type: 'food',
      productId: item.id,
      quantity,
      customizations
    });
  };

  const addGroceryItem = (item: GroceryItem, quantity = 1) => {
    const customKey = `groc-${item.id}`;
    setItems(prev => {
      const existing = prev.find(i => i.cartItemId === customKey);
      if (existing) {
        return prev.map(i =>
          i.cartItemId === customKey ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          cartItemId: customKey,
          type: 'grocery',
          id: item.id,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity,
          unitWeight: item.weight
        }
      ];
    });

    api.cart.addItem({
      type: 'grocery',
      productId: item.id,
      quantity
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setItems(prev => {
      return prev
        .map(item => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });

    api.cart.updateQuantity(cartItemId, delta);
  };

  const removeItem = (cartItemId: string) => {
    setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
    api.cart.removeItem(cartItemId);
  };

  const clearCart = () => {
    setItems([]);
    api.cart.clear();
  };

  const applyPromo = (code: string) => {
    api.cart.applyCoupon(code);
    const found = coupons.find(p => p.code.toUpperCase() === code.toUpperCase());
    if (!found) {
      return { success: false, message: 'Invalid or expired coupon code.' };
    }
    if (itemTotal < found.minAmount) {
      return { success: false, message: `Add items worth ₹${found.minAmount - itemTotal} more to apply ${found.code}.` };
    }
    setAppliedPromo(found.code);
    return { success: true, message: `${found.title} applied successfully!` };
  };

  const removePromo = () => {
    setAppliedPromo(null);
    api.cart.removeCoupon();
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addMenuItem,
        addGroceryItem,
        updateQuantity,
        removeItem,
        clearCart,
        itemTotal,
        deliveryFee,
        taxesAndHandling,
        driverTip,
        setDriverTip,
        appliedPromo,
        discount,
        availableCoupons: coupons,
        applyPromo,
        removePromo,
        totalToPay,
        totalItemsCount,
        selectedAddress,
        setSelectedAddress,
        deliveryInstruction,
        setDeliveryInstruction
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
