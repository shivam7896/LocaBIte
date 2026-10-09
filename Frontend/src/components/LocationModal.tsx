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
  const [view, setView] = useState<'list' | 'map' | 'details'>('list');
  const [pendingLocation, setPendingLocation] = useState<any>(null);
  const defaultPhone = user?.phone?.startsWith('G-') ? '' : (user?.phone || '');
  const [addressForm, setAddressForm] = useState({ room: '', landmark: '', phone: defaultPhone });

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

  const handleLocationSelected = (addressDetails: { title: string; fullAddress: string; lat: number; lng: number }) => {
    setPendingLocation(addressDetails);
    setAddressForm(prev => ({ ...prev, phone: defaultPhone }));
    setView('details');
  };

  const handleSaveDetails = async () => {
    if (!pendingLocation || !addressForm.phone || !addressForm.room) {
      alert("Please fill in the required fields (Flat/Room and Phone).");
      return;
    }

    const newAddress: Address = {
      id: 'addr-' + Date.now(),
      title: pendingLocation.title,
      type: 'apartment',
      campus: pendingLocation.title,
      building: pendingLocation.fullAddress,
      room: addressForm.room,
      landmark: addressForm.landmark,
      phone: addressForm.phone,
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
    setPendingLocation(null);
  };

  const handleModalClose = () => {
    setView('list');
    setPendingLocation(null);
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
                {view === 'map' ? 'Choose on Map' : view === 'details' ? 'Add Details' : 'Select Delivery Location'}
              </h3>
              <p className="text-[12px] text-on-surface-variant">
                {view === 'map' ? 'Tap anywhere on the map to set location' : view === 'details' ? 'Complete your address' : 'Direct to your home or office'}
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

        {view === 'map' && (
          <MapPicker 
            onLocationSelected={handleLocationSelected} 
            onCancel={() => setView('list')} 
          />
        )}
        
        {view === 'list' && (
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
        {view === 'details' && pendingLocation && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col gap-1">
              <span className="font-label-md text-on-surface font-bold">{pendingLocation.title}</span>
              <span className="text-[12px] text-on-surface-variant line-clamp-2">{pendingLocation.fullAddress}</span>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[12px] font-bold text-on-surface-variant mb-1 block">Flat / Room No. *</label>
                <input 
                  type="text" 
                  value={addressForm.room}
                  onChange={(e) => setAddressForm({ ...addressForm, room: e.target.value })}
                  placeholder="e.g. Room 101, B Block"
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface text-[14px] outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-on-surface-variant mb-1 block">Landmark (Optional)</label>
                <input 
                  type="text" 
                  value={addressForm.landmark}
                  onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  placeholder="e.g. Near main gate"
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface text-[14px] outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-on-surface-variant mb-1 block">Phone Number *</label>
                <input 
                  type="tel" 
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface text-[14px] outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setView('map')}
                className="flex-1 h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-bold transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={!addressForm.room || !addressForm.phone}
                className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Save & Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
