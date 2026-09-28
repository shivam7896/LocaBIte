import React from 'react';
import { DietaryType } from '../types';

interface VegBadgeProps {
  type: DietaryType;
  showText?: boolean;
  size?: 'sm' | 'md';
}

export const VegBadge: React.FC<VegBadgeProps> = ({ type, showText = false, size = 'sm' }) => {
  const isVeg = type === 'veg' || type === 'vegan';
  const boxSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <div className="inline-flex items-center gap-1.5" title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}>
      <div
        className={`${boxSize} rounded-[4px] border ${
          isVeg ? 'border-secondary' : 'border-primary'
        } flex items-center justify-center p-0.5 shrink-0 bg-surface-container-lowest`}
      >
        <div
          className={`${dotSize} ${
            isVeg ? 'rounded-full bg-secondary' : 'rounded-[2px] bg-primary'
          }`}
        />
      </div>
      {showText && (
        <span
          className={`font-label-sm ${
            isVeg ? 'text-secondary' : 'text-primary'
          } font-bold`}
        >
          {isVeg ? 'Veg' : 'Non-Veg'}
        </span>
      )}
    </div>
  );
};
