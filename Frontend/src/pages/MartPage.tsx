import React, { useState, useEffect } from 'react';
import { GroceryItemCard } from '../components/GroceryItemCard';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { GroceryItem } from '../types';
import { api } from '../services/api';

export const MartPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('produce');
  const [activeFilterChip, setActiveFilterChip] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { totalToPay, totalItemsCount } = useCart();
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMartData = async () => {
      setIsLoading(true);
      try {
        const [grocRes, catRes] = await Promise.all([
          api.groceries.getAll(),
          api.groceries.getCategories()
        ]);
        if (grocRes.success && grocRes.data) {
          setGroceries(grocRes.data);
        }
        if (catRes.success && catRes.data && catRes.data.length > 0) {
          setCategories(catRes.data);
          const hasProduce = catRes.data.some((c: any) => c.id === 'produce');
          if (!hasProduce && catRes.data[0]) {
            setSelectedCategory(catRes.data[0].id);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load mart data:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMartData();
  }, []);

  const filterChips = [
    { id: 'all', label: 'Top Deals 🔥' },
    { id: 'under50', label: '🏷️ Under ₹50' },
    { id: 'organic', label: '🌱 Organic Fresh' },
    { id: 'snacks', label: '🍿 Packaged Snacks' },
    { id: 'beverages', label: '🥤 Beverages' },
    { id: 'express', label: '⚡ 8-Min Express Items' }
  ];

  const getCategoryCount = (catId: string) => {
    if (catId === 'all') return groceries.length;
    return groceries.filter(g => (g.category || '').toLowerCase() === catId.toLowerCase()).length;
  };

  // Filter items by category, search, and active chips
  const filteredItems = groceries.filter(item => {
    // Search match
    if (searchQuery.trim() !== '') {
      const match =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
    } else {
      // Category match
      if (selectedCategory !== 'all' && (item.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // Chip filter
    if (activeFilterChip === 'under50') return item.price <= 50;
    if (activeFilterChip === 'organic') return item.tags?.includes('Organic') || item.category === 'produce';
    if (activeFilterChip === 'snacks') return item.category === 'snacks' || item.category === 'instant';
    if (activeFilterChip === 'beverages') return item.category === 'cold-drinks';
    if (activeFilterChip === 'express') return item.eta?.includes('8') || item.eta?.includes('10');

    return true;
  });

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);

  return (
    <div className="w-full bg-surface pb-28 lg:pb-16">
      {/* Mart Header Hero Section */}
      <section className="w-full bg-surface-container-low py-6 sm:py-8 border-b border-outline-variant/20 shadow-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[32px]">electric_bolt</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-extrabold tracking-tight">
                    LocaBite Mart
                  </h1>
                  <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
                    10-15 Min Delivery
                  </span>
                </div>
                <div className="flex items-center gap-2 font-body-sm text-[12px] text-on-surface-variant mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-secondary font-semibold">
                    <span className="material-symbols-outlined text-[15px] material-symbols-fill">
                      check_circle
                    </span>
                    Open Now
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
                    12 mins to your hostel gate
                  </span>
                  <span>•</span>
                  <span>Quantum Hub Express Warehouse</span>
                </div>
              </div>
            </div>

            {/* In-Store Search Bar */}
            <div className="w-full md:w-96">
              <div className="relative flex items-center w-full h-11 rounded-full bg-surface-container-lowest shadow-sm px-4 group focus-within:shadow-md transition-all border border-outline-variant/30">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px] mr-2 group-focus-within:text-secondary transition-colors">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search in 5,000+ groceries, dairy, snacks..."
                  className="w-full bg-transparent border-none outline-none font-body-md text-[13px] text-on-surface placeholder:text-on-surface-variant/60"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="material-symbols-outlined text-on-surface-variant text-[18px]"
                  >
                    close
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filterChips.map(chip => {
              const isActive = activeFilterChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilterChip(chip.id)}
                  className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all shrink-0 flex items-center gap-1.5 shadow-xs ${
                    isActive
                      ? 'bg-on-surface text-surface-container-lowest font-bold shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main 2-Column Store Layout */}
      <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Category Sidebar (Desktop) */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col gap-2 sticky top-24 bg-surface-container-lowest p-4 rounded-2xl shadow-level-1 border border-outline-variant/20">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Categories
            </span>
            <span className="font-label-sm text-label-sm text-secondary bg-secondary-container px-2 py-0.5 rounded-full font-bold">
              {groceries.length} Items
            </span>
          </div>

          <nav className="flex flex-col gap-1 w-full mt-1">
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-label-md text-label-md transition-all text-left ${
                    isSelected
                      ? 'bg-secondary-container text-on-secondary-container font-bold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[18px]">{cat.icon || '📦'}</span>
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span className="font-label-sm text-label-sm opacity-80">{getCategoryCount(cat.id)}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Horizontal Category Bar */}
        <div className="lg:hidden col-span-1 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-secondary text-on-secondary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface border border-outline-variant/30'
                }`}
              >
                <span>{cat.icon || '📦'}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Product Grid (9 Cols on Desktop) */}
        <main className="lg:col-span-9 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                {searchQuery ? `Search Results for "${searchQuery}"` : activeCategoryObj?.name || 'All Products'}
              </h2>
              <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                Delivered in 10-15 minutes by campus zero-carbon couriers
              </p>
            </div>
            <span className="text-[12px] font-semibold text-secondary">
              {filteredItems.length} items available
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="h-64 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-outline-variant/30 flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-outline text-[48px]">
                production_quantity_limits
              </span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                No grocery items found
              </h3>
              <p className="font-body-md text-on-surface-variant max-w-sm">
                Try selecting a different category or clear your search keyword to view more pantry essentials.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('produce');
                  setActiveFilterChip('all');
                }}
                className="bg-secondary text-on-secondary px-5 py-2 rounded-xl font-label-md font-bold mt-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {filteredItems.map(item => (
                <GroceryItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
