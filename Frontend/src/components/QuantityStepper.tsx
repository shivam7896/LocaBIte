import React from 'react';

interface QuantityStepperProps {
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  variant?: 'coral' | 'emerald';
  size?: 'sm' | 'md';
  customizable?: boolean;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  variant = 'coral',
  size = 'md',
  customizable = false
}) => {
  const isEmerald = variant === 'emerald';
  const colorClass = isEmerald ? 'text-secondary hover:bg-secondary' : 'text-primary hover:bg-primary';
  const bgLightClass = isEmerald ? 'bg-secondary/10' : 'bg-primary/10';
  const solidBgClass = isEmerald ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary';
  const borderClass = isEmerald ? 'border-secondary/30' : 'border-primary/30';

  if (quantity === 0) {
    return (
      <button
        onClick={e => {
          e.stopPropagation();
          onAdd();
        }}
        className={`relative ${bgLightClass} ${colorClass} hover:text-white font-label-md text-label-md font-bold ${
          size === 'sm' ? 'px-2.5 py-1' : 'px-4 py-1.5'
        } rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-1 shadow-sm select-none border border-transparent hover:border-transparent`}
      >
        <span>+ ADD</span>
        {customizable && (
          <span className="text-[9px] uppercase tracking-tighter opacity-80 ml-0.5 font-normal">
            custom
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      className={`flex items-center justify-between rounded-lg overflow-hidden border ${borderClass} bg-surface-container-lowest shadow-sm ${
        size === 'sm' ? 'h-7 min-w-[76px]' : 'h-8 min-w-[88px]'
      }`}
    >
      <button
        onClick={onDecrement}
        className={`w-7 h-full flex items-center justify-center text-on-surface hover:${solidBgClass} hover:text-white transition-colors active:scale-90`}
        aria-label="Decrease quantity"
      >
        <span className="material-symbols-outlined text-[15px]">remove</span>
      </button>
      <span className="font-price-numeral font-extrabold text-[13px] px-1 text-on-surface select-none">
        {quantity}
      </span>
      <button
        onClick={onIncrement}
        className={`w-7 h-full flex items-center justify-center text-on-surface hover:${solidBgClass} hover:text-white transition-colors active:scale-90`}
        aria-label="Increase quantity"
      >
        <span className="material-symbols-outlined text-[15px]">add</span>
      </button>
    </div>
  );
};
