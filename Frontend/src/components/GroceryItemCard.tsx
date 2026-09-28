import React from 'react';
import { GroceryItem } from '../types';
import { useCart } from '../context/CartContext';
import { QuantityStepper } from './QuantityStepper';

interface GroceryItemCardProps {
  item: GroceryItem;
}

export const GroceryItemCard: React.FC<GroceryItemCardProps> = ({ item }) => {
  const { items, addGroceryItem, updateQuantity } = useCart();

  const cartItem = items.find(i => i.id === item.id && i.type === 'grocery');
  const quantity = cartItem ? cartItem.quantity : 0;

  return (
    <div className="bg-surface-container-lowest rounded-xl p-3 shadow-level-1 hover:shadow-level-2 transition-all duration-300 flex flex-col justify-between group border border-outline-variant/20 hover:border-secondary/30">
      {/* 1:1 Aspect Ratio Image Container */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-surface-container-low mb-2 flex items-center justify-center">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {item.discountPercent && (
          <span className="absolute top-1.5 left-1.5 bg-secondary text-on-secondary font-label-sm text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm">
            {item.discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Item Info */}
      <div>
        <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">
          {item.weight}
        </span>
        <h3 className="font-headline-sm text-[13px] font-bold text-on-surface line-clamp-1 leading-snug mt-0.5">
          {item.name}
        </h3>
        <span className="font-body-sm text-[11px] text-secondary font-semibold flex items-center gap-1 mt-0.5">
          <span className="material-symbols-outlined text-[13px]">bolt</span>
          {item.eta}
        </span>
      </div>

      {/* Price & Quantity Stepper */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-outline-variant/20">
        <div className="flex items-baseline gap-1">
          <span className="font-price-numeral text-price-numeral text-on-surface font-extrabold">
            ₹{item.price}
          </span>
          {item.originalPrice > item.price && (
            <span className="font-body-sm text-[11px] line-through text-on-surface-variant/70">
              ₹{item.originalPrice}
            </span>
          )}
        </div>
        <QuantityStepper
          quantity={quantity}
          variant="emerald"
          size="sm"
          onAdd={() => addGroceryItem(item, 1)}
          onIncrement={() => updateQuantity(cartItem!.cartItemId, 1)}
          onDecrement={() => updateQuantity(cartItem!.cartItemId, -1)}
        />
      </div>
    </div>
  );
};
