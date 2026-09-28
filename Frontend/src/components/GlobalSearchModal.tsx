import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { VegBadge } from './VegBadge';
import { api } from '../services/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [liveResults, setLiveResults] = useState<{ restaurants: any[]; dishes: any[]; groceries: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { addGroceryItem, addMenuItem } = useCart();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setLiveResults(null);
      setIsSearching(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const res = await api.search(query.trim());
          if (res.success && res.data) {
            setLiveResults(res.data);
          }
        } catch (err) {
          console.warn('Live search error:', err);
        } finally {
          setIsSearching(false);
        }
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setLiveResults(null);
      setIsSearching(false);
    }
  }, [query]);

  if (!isOpen) return null;

  // Real backend MongoDB search results
  const matchedRestaurants = liveResults?.restaurants || [];
  const matchedDishes = liveResults?.dishes || [];
  const matchedGroceries = liveResults?.groceries || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-on-surface/60 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-level-3 overflow-hidden flex flex-col border border-outline-variant/30 animate-in fade-in zoom-in-95 max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-outline-variant/20 flex items-center gap-3">
          {isSearching ? (
            <span className="material-symbols-outlined text-primary text-[24px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-primary text-[24px]">search</span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search restaurants, dishes, groceries or campus snacks..."
            className="flex-1 bg-transparent border-none outline-none font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/60"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-on-surface-variant hover:text-on-surface text-[13px] font-semibold"
            >
              Clear
            </button>
          )}
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-medium">
            ESC
          </span>
        </div>

        {/* Results Stream */}
        <div className="p-4 overflow-y-auto flex flex-col gap-6">
          {query.trim() === '' ? (
            <div className="flex flex-col gap-3">
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Popular Campus Cravings
              </span>
              <div className="flex flex-wrap gap-2">
                {['Smoky Bacon Burger', 'Dum Biryani', 'Cold Coffee', 'Amul Milk', 'Maggi 4-Pack', 'Woodfired Pizza'].map(
                  tag => (
                    <button
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface text-[12px] font-medium transition-colors"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Restaurants Section */}
              {matchedRestaurants.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                      Restaurants ({matchedRestaurants.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {matchedRestaurants.map(r => (
                      <div
                        key={r.id}
                        onClick={() => {
                          navigate(`/restaurant/${r.slug || r.id}`);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low transition-all cursor-pointer flex items-center gap-3"
                      >
                        <img
                          src={r.logoImage}
                          alt={r.name}
                          className="w-12 h-12 rounded-lg object-cover bg-surface-container"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-label-md text-label-md font-bold text-on-surface truncate">
                            {r.name}
                          </h4>
                          <span className="text-[11px] text-on-surface-variant truncate block">
                            {(r.cuisines || []).slice(0, 2).join(', ')} • {r.deliveryTime}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-tertiary flex items-center gap-0.5">
                          ⭐ {r.rating}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dishes Section */}
              {matchedDishes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                      Dishes & Meals ({matchedDishes.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {matchedDishes.slice(0, 5).map(dish => (
                      <div
                        key={dish.id}
                        className="p-2.5 rounded-xl border border-outline-variant/20 hover:border-primary/30 flex items-center justify-between gap-3 bg-surface-container-lowest"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <VegBadge type={dish.dietary} size="sm" />
                              <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                                {dish.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-on-surface-variant font-medium">
                              ₹{dish.price}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            addMenuItem(dish, undefined, 1);
                            onClose();
                          }}
                          className="bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-bold text-[12px] px-3 py-1 rounded-lg transition-colors shrink-0"
                        >
                          + ADD
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Groceries Section */}
              {matchedGroceries.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider text-secondary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">electric_bolt</span>
                      LocaBite Mart 10-Min Groceries ({matchedGroceries.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {matchedGroceries.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-outline-variant/20 hover:border-secondary/40 flex items-center justify-between gap-3 bg-surface-container-lowest"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-label-md text-label-md font-bold text-on-surface truncate block">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-secondary font-semibold">
                              {item.weight} • ₹{item.price} • {item.eta}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            addGroceryItem(item, 1);
                            onClose();
                          }}
                          className="bg-secondary/10 hover:bg-secondary text-secondary hover:text-on-secondary font-bold text-[12px] px-3 py-1 rounded-lg transition-colors shrink-0"
                        >
                          + ADD
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchedRestaurants.length === 0 && matchedDishes.length === 0 && matchedGroceries.length === 0 && (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-outline-variant text-[48px]">
                    sentiment_dissatisfied
                  </span>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                    No results found for "{query}". Try checking your spelling or craving keywords.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
