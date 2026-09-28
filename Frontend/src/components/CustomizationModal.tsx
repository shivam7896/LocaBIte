import React, { useState, useEffect } from 'react';
import { MenuItem, CustomizationOption } from '../types';
import { VegBadge } from './VegBadge';

interface CustomizationModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customizations: {
    size?: CustomizationOption;
    addons?: CustomizationOption[];
    spiceLevel?: string;
  }) => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !item) return null;

  // Find size group, addons group, spice group
  const sizeGroup = item.customizationGroups?.find(g => g.id === 'size');
  const addonsGroup = item.customizationGroups?.find(g => g.id === 'addons');
  const spiceGroup = item.customizationGroups?.find(g => g.id === 'spice');

  // Default selected states
  const [selectedSize, setSelectedSize] = useState<CustomizationOption | undefined>(
    sizeGroup?.options[0]
  );
  const [selectedAddons, setSelectedAddons] = useState<CustomizationOption[]>([]);
  const [selectedSpice, setSelectedSpice] = useState<string>('Medium');

  useEffect(() => {
    if (sizeGroup?.options.length) {
      setSelectedSize(sizeGroup.options[0]);
    }
    // Default checked addon from Stitch: Extra Melted Aged Cheddar
    if (addonsGroup?.options.length) {
      setSelectedAddons([addonsGroup.options[0]]);
    }
    setSelectedSpice('Medium');
  }, [item]);

  // Calculate live total
  const basePrice = item.price;
  const sizeExtra = selectedSize ? selectedSize.price : 0;
  const addonsExtra = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const currentTotal = basePrice + sizeExtra + addonsExtra;

  const handleToggleAddon = (option: CustomizationOption) => {
    setSelectedAddons(prev => {
      const exists = prev.some(a => a.id === option.id);
      if (exists) {
        return prev.filter(a => a.id !== option.id);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleConfirm = () => {
    onConfirm({
      size: selectedSize,
      addons: selectedAddons,
      spiceLevel: selectedSpice
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-on-surface/60 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh] border border-outline-variant/30 animate-in fade-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <VegBadge type={item.dietary} size="md" />
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Customize Dish
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[260px] sm:max-w-xs">
                {item.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable Customization Options */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Section 1: Size Selection */}
          {sizeGroup && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">
                    {sizeGroup.title}
                  </span>
                  {sizeGroup.subtitle && (
                    <span className="text-[11px] text-on-surface-variant">
                      {sizeGroup.subtitle}
                    </span>
                  )}
                </div>
                <span className="bg-primary/10 text-primary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Required
                </span>
              </div>
              <div className="space-y-2.5">
                {sizeGroup.options.map(option => {
                  const isChecked = selectedSize?.id === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-outline-variant/30 hover:border-outline-variant bg-surface-container-lowest'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="burgerSize"
                          checked={isChecked}
                          onChange={() => setSelectedSize(option)}
                          className="w-4 h-4 text-primary focus:ring-0 accent-primary cursor-pointer"
                        />
                        <span className="font-label-md text-label-md text-on-surface font-bold">
                          {option.name}
                        </span>
                      </div>
                      <span
                        className={`font-label-md text-label-md ${
                          isChecked ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'
                        }`}
                      >
                        {option.price === 0 ? 'Included' : `+₹${option.price}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Add-ons */}
          {addonsGroup && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-label-lg text-on-surface font-bold">
                  {addonsGroup.title}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Optional toppings
                </span>
              </div>
              <div className="space-y-2.5">
                {addonsGroup.options.map(option => {
                  const isChecked = selectedAddons.some(a => a.id === option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-outline-variant/30 hover:border-outline-variant bg-surface-container-lowest'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAddon(option)}
                          className="w-4 h-4 text-primary focus:ring-0 rounded accent-primary cursor-pointer"
                        />
                        <span className="font-label-md text-label-md text-on-surface font-semibold">
                          {option.name}
                        </span>
                      </div>
                      <span className="font-price-numeral text-label-md text-primary font-bold">
                        +₹{option.price}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Spice Level */}
          {spiceGroup && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-label-lg text-on-surface font-bold">
                  {spiceGroup.title}
                </span>
                <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                  Select 1
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'Mild', label: 'Mild', sub: 'Gentle herb' },
                  { id: 'Medium', label: 'Medium 🔥', sub: 'Classic relish' },
                  { id: 'Hot', label: 'Hot 🔥🔥', sub: 'Ghost pepper' }
                ].map(spice => {
                  const isChecked = selectedSpice === spice.id;
                  return (
                    <button
                      key={spice.id}
                      type="button"
                      onClick={() => setSelectedSpice(spice.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors text-center ${
                        isChecked
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline-variant/30 hover:bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <span className="font-label-md text-label-md font-bold">{spice.label}</span>
                      <span className="text-[10px] text-on-surface-variant mt-0.5">{spice.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/30 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-between gap-4 sticky bottom-0 z-10">
          <div className="flex flex-col">
            <span className="font-body-sm text-[12px] text-on-surface-variant">Customized Total</span>
            <span className="font-price-numeral text-headline-md text-primary font-extrabold">
              ₹{currentTotal}
            </span>
          </div>
          <button
            onClick={handleConfirm}
            className="flex-1 max-w-[280px] bg-primary hover:bg-primary-container text-on-primary py-3 px-6 rounded-full font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(174,42,0,0.3)] transition-all active:scale-95"
          >
            <span>Add to Tray</span>
            <span className="font-price-numeral">• ₹{currentTotal}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
