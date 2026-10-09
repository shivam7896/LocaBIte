import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Address } from '../types';
import { api } from '../services/api';
import { MapPicker } from './MapPicker';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose }) => {
  const { selectedAddress, setSelectedAddress } = useCart();
  const { user, refreshProfile } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>(user?.addresses || (selectedAddress ? [selectedAddress] : []));
  const [view, setView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    if (isOpen) {
      api.auth.getAddresses().then(res => {
        if (res.success && res.data && res.data.addresses && res.data.addresses.length > 0) {
          setAddresses(res.data.addresses);
        } else if (user?.addresses && user.addresses.length > 0) {
          setAddresses(user.addresses);
        }
      }).catch(err => {
        console.warn('Fetch addresses error:', err);
      });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSelect = async (addr: Address) => {
    setSelectedAddress(addr);
    if (addr.id) {
      try {
        await api.auth.setDefaultAddress(addr.id);
      } catch (e) {
        console.warn('Set default address error:', e);
      }
    }
    onClose();
  };

  const handleLocationSelected = async (addressDetails: { title: string; fullAddress: string; lat: number; lng: number }) => {
    const newAddress: Address = {
      id: 'addr-' + Date.now(),
      title: addressDetails.title,
      type: 'apartment', // Default type for general addresses
      campus: addressDetails.title,
      building: addressDetails.fullAddress,
      room: '',
      landmark: '',
      phone: '',
      isPrimary: false
    };

    try {
      await api.auth.addAddress(newAddress);
      if (user) {
        await refreshProfile();
      }
    } catch (e) {
      console.warn('Set default address error:', e);
    }

    setAddresses([...addresses, newAddress]);
    handleSelect(newAddress);
    setView('list');
  };

  const handleModalClose = () => {
    setView('list');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/60 backdrop-blur-md transition-opacity"
      onClick={handleModalClose}
    >
      <div
        className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-level-3 p-6 flex flex-col gap-4 border border-outline-variant/30 animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">near_me</span>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {view === 'map' ? 'Choose on Map' : 'Select Delivery Location'}
              </h3>
              <p className="text-[12px] text-on-surface-variant">
                {view === 'map' ? 'Tap anywhere on the map to set location' : 'Direct to your home or office'}
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {view === 'map' ? (
          <MapPicker 
            onLocationSelected={handleLocationSelected} 
            onCancel={() => setView('list')} 
          />
        ) : (
          <>
            <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
          {addresses.map(addr => {
            const isSelected = selectedAddress.id === addr.id;
            return (
              <div
                key={addr.id}
                onClick={() => handleSelect(addr)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'border-secondary bg-secondary/5 shadow-sm'
                    : 'border-outline-variant/30 hover:border-outline-variant hover:bg-surface-container-low/50'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] mt-0.5 ${
                    isSelected ? 'text-secondary' : 'text-on-surface-variant'
                  }`}
                >
                  {addr.type === 'hostel' ? 'home_pin' : addr.type === 'department' ? 'menu_book' : 'apartment'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface font-bold">
                      {addr.title}
                    </span>
                    {isSelected && (
                      <span className="bg-secondary text-on-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">
                    {addr.campus}, {addr.building}
                  </p>
                  <span className="text-[11px] text-secondary font-medium mt-1 inline-block">
                    ⚡ 10-15m Instant Express drop
                  </span>
                </div>
              </div>
            );
          })}
        </div>

            <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant">
                Need drop at another location?
              </span>
              <button
                onClick={() => setView('map')}
                className="text-primary font-label-md text-label-md font-bold hover:underline"
              >
                + Add New Location
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
