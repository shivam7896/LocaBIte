import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export const FloatingCartBar: React.FC = () => {
  const { items, totalToPay, totalItemsCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on checkout, tracking, and auth pages
  if (
    items.length === 0 ||
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/tracking') ||
    location.pathname === '/auth'
  ) {
    return null;
  }

  // Get primary restaurant name if available
  const foodItem = items.find(i => i.type === 'food');
  const restaurantName = foodItem?.restaurantName || (items.some(i => i.type === 'grocery') ? 'LocaBite Mart' : 'Your Tray');

  return (
    <div className="lg:hidden fixed bottom-16 left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-primary text-on-primary rounded-2xl p-3.5 sm:p-4 shadow-level-2 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="bg-on-primary/20 px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold">
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
            </span>
            <span className="font-price-numeral text-price-numeral font-bold">
              ₹{totalToPay}
            </span>
          </div>
          <span className="font-body-sm text-[11px] text-on-primary/80 truncate max-w-[170px]">
            From {restaurantName}
          </span>
        </div>

        <button
          onClick={() => navigate('/checkout')}
          className="bg-surface-container-lowest text-primary hover:bg-surface-bright px-4 py-2 rounded-full font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <span>View Tray</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
