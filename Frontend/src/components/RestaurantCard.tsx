import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const navigate = useNavigate();
  const targetIdOrSlug = restaurant.slug || restaurant.id || (restaurant as any)._id || '';

  return (
    <div
      onClick={() => navigate(`/restaurant/${targetIdOrSlug}`)}
      className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-level-1 hover:shadow-level-2 transition-all duration-300 group cursor-pointer flex flex-col border border-outline-variant/20 hover:border-primary/20"
    >
      {/* 16:9 Banner Image with Overlays */}
      <div className="relative h-44 w-full overflow-hidden bg-surface-container">
        <img
          src={restaurant.bannerImage}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {restaurant.discountOffer && (
          <span className="absolute top-2.5 left-2.5 bg-on-surface/90 text-surface text-[10px] font-bold px-2 py-0.5 rounded shadow-sm backdrop-blur-xs">
            {restaurant.discountOffer}
          </span>
        )}
        <span className="absolute bottom-2.5 right-2.5 bg-surface-container-lowest/90 backdrop-blur-md text-on-surface text-[11px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-secondary">schedule</span>
          {restaurant.deliveryTime || '25-30 min'}
        </span>
      </div>

      {/* Details Container */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className="font-label-lg text-[15px] font-bold text-on-surface group-hover:text-primary transition-colors truncate">
              {restaurant.name}
            </h3>
            <span className="inline-flex items-center gap-0.5 bg-surface-container-low px-1.5 py-0.5 rounded text-[11px] font-bold text-on-surface shrink-0">
              <span className="material-symbols-outlined text-[13px] text-tertiary material-symbols-fill">
                star
              </span>
              {restaurant.rating ?? 4.5}
            </span>
          </div>
          <p className="text-[12px] text-on-surface-variant truncate">
            {(restaurant.cuisines || []).join(' • ')}
          </p>
        </div>

        <div className="pt-3 mt-2 border-t border-outline-variant/30 flex items-center justify-between text-[12px] text-on-surface-variant">
          <span>{restaurant.distance} • ₹{restaurant.deliveryFee} delivery</span>
          <span className="text-secondary font-semibold">
            {restaurant.badge || 'Fast dispatch'}
          </span>
        </div>
      </div>
    </div>
  );
};
