import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { DietaryType, Address } from '../types';
import { api } from '../services/api';
import { LocationModal } from '../components/LocationModal';


export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, savePreferences } = useAuth();
  const { setSelectedAddress } = useCart();

  const [selectedModes, setSelectedModes] = useState<('food' | 'mart')[]>(['food', 'mart']);
  const [selectedDietary, setSelectedDietary] = useState<DietaryType[]>(['non-veg']);
  const [selectedHostelIndex, setSelectedHostelIndex] = useState<number>(0);
  const [addresses, setAddresses] = useState<Address[]>(
    user?.addresses && user.addresses.length > 0 ? user.addresses : []
  );
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = () => {
    api.auth.getAddresses().then(res => {
      if (res.success && res.data && res.data.addresses && res.data.addresses.length > 0) {
        setAddresses(res.data.addresses);
      }
    }).catch(e => console.warn('Load addresses error:', e));
  };

  const toggleMode = (mode: 'food' | 'mart') => {
    if (selectedModes.includes(mode)) {
      if (selectedModes.length > 1) {
        setSelectedModes(selectedModes.filter(m => m !== mode));
      }
    } else {
      setSelectedModes([...selectedModes, mode]);
    }
  };

  const toggleDietary = (type: DietaryType) => {
    if (selectedDietary.includes(type)) {
      if (selectedDietary.length > 1) {
        setSelectedDietary(selectedDietary.filter(t => t !== type));
      }
    } else {
      setSelectedDietary([...selectedDietary, type]);
    }
  };

  const handleFinish = async () => {
    await savePreferences(selectedDietary, selectedModes);
    if (addresses[selectedHostelIndex]) {
      setSelectedAddress(addresses[selectedHostelIndex]);
      if (addresses[selectedHostelIndex].id) {
        api.auth.setDefaultAddress(addresses[selectedHostelIndex].id).catch(() => {});
      }
    }
    navigate('/');
  };

  return (
    <div className="w-full bg-surface min-h-[calc(100vh-80px)] py-6 sm:py-10 pb-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Progress Header */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-on-primary font-label-sm text-xs font-bold">
                2
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                Step 2 of 2 • Setup Profile
              </span>
            </div>
            <span className="font-label-md text-label-md text-primary font-bold">
              100% Tailored
            </span>
          </div>

          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden flex gap-1">
            <div className="h-full w-1/2 bg-primary rounded-full" />
            <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>

        {/* Hero Title */}
        <div className="flex flex-col gap-1.5 mb-8">
          <h1 className="font-display-hero text-2xl sm:text-3xl text-on-surface font-extrabold tracking-tight">
            Personalize your <span className="text-primary">LocaBite</span>
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Tell us your preferences so we can tailor restaurants, grocery alerts, and local discounts.
          </p>
        </div>

        {/* Form Container */}
        <div className="flex flex-col gap-8">
          {/* Section 1: Ordering Style */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                What do you usually order?
              </h2>
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
                Select one or more
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Food Delivery */}
              <div
                onClick={() => toggleMode('food')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                  selectedModes.includes('food')
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-outline-variant/30 hover:border-outline-variant bg-surface-container-lowest'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[26px] material-symbols-fill">
                      restaurant
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-headline-sm text-[15px] font-bold text-on-surface">
                        Food Delivery
                      </span>
                      {selectedModes.includes('food') && (
                        <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </div>
                      )}
                    </div>
                    <p className="font-body-sm text-[12px] text-on-surface-variant mt-1 leading-snug">
                      Hot restaurant meals, late-night cravings & snacks.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/20">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed/60 px-2 py-0.5 text-[10px] font-bold text-on-primary-fixed-variant">
                    ⚡ Flat 40% Pass
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Avg 18m drop</span>
                </div>
              </div>

              {/* Card 2: LocaBite Mart */}
              <div
                onClick={() => toggleMode('mart')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                  selectedModes.includes('mart')
                    ? 'border-secondary bg-secondary/5 shadow-xs'
                    : 'border-outline-variant/30 hover:border-outline-variant bg-surface-container-lowest'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-secondary-container text-[26px] material-symbols-fill">
                      bolt
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-headline-sm text-[15px] font-bold text-on-surface">
                        LocaBite Mart
                      </span>
                      {selectedModes.includes('mart') && (
                        <div className="w-5 h-5 rounded-full bg-secondary text-on-secondary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </div>
                      )}
                    </div>
                    <p className="font-body-sm text-[12px] text-on-surface-variant mt-1 leading-snug">
                      10-minute dairy, fresh produce, noodles & stationery supplies.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/20">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/60 px-2 py-0.5 text-[10px] font-bold text-on-secondary-container">
                    ⚡ 10-15 Min Guarantee
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Home delivery</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Dietary Preferences */}
          <section className="flex flex-col gap-3">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Dietary Preference
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'veg', label: 'Vegetarian', icon: '🥦' },
                { id: 'non-veg', label: 'Non-Vegetarian', icon: '🍗' },
                { id: 'vegan', label: 'Vegan Plant-Based', icon: '🌱' },
                { id: 'egg', label: 'Eggetarian', icon: '🥚' }
              ].map(diet => {
                const isSelected = selectedDietary.includes(diet.id as DietaryType);
                return (
                  <button
                    key={diet.id}
                    type="button"
                    onClick={() => toggleDietary(diet.id as DietaryType)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-xs font-bold'
                        : 'border-outline-variant/30 hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <span className="text-2xl">{diet.icon}</span>
                    <span className="text-[12px] leading-tight">{diet.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Campus Hostel Hub */}
          <section className="flex flex-col gap-3">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Primary Delivery Location
            </h2>

            <div className="flex flex-col gap-2">
              {addresses.length === 0 ? (
                <div className="p-4 border border-dashed border-outline-variant rounded-xl text-center">
                  <p className="text-on-surface-variant text-[13px] mb-2">No delivery locations found.</p>
                  <button onClick={() => setIsLocationModalOpen(true)} type="button" className="text-primary text-[13px] font-bold">+ Add New Location</button>
                </div>
              ) : (
                addresses.map((addr, idx) => {
                  const isSelected = selectedHostelIndex === idx;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedHostelIndex(idx)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs font-semibold'
                          : 'border-outline-variant/30 hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          home_pin
                        </span>
                        <div>
                          <span className="text-[13px] font-bold text-on-surface">{addr.title}</span>
                          <span className="text-[11px] text-on-surface-variant block">
                            {addr.building}, {addr.campus}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="material-symbols-outlined text-primary text-[20px]">
                            check_circle
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add edit location logic here in the future
                          }}
                          className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit Location"
                        >
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            edit
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="w-full mt-2 p-3.5 rounded-xl border border-dashed border-primary/50 text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">add_location</span>
                  Add New Location
                </button>
              )}
            </div>
          </section>

          {/* Submit Action Button */}
          <button
            onClick={handleFinish}
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 shadow-level-2 transition-all active:scale-[0.99] mt-4"
          >
            <span>Finish & Start Exploring</span>
            <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
          </button>
        </div>
      </div>

      <LocationModal 
        isOpen={isLocationModalOpen} 
        onClose={() => {
          setIsLocationModalOpen(false);
          fetchAddresses();
        }} 
      />
    </div>
  );
};
