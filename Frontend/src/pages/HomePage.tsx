import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RestaurantCard } from '../components/RestaurantCard';
import { GroceryItemCard } from '../components/GroceryItemCard';
import { QuantityStepper } from '../components/QuantityStepper';
import { useCart } from '../context/CartContext';
import { CustomizationModal } from '../components/CustomizationModal';
import { MenuItem, Restaurant, GroceryItem } from '../types';
import { api } from '../services/api';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { items, addMenuItem, updateQuantity } = useCart();

  // Filter state for restaurants
  const [selectedRestFilter, setSelectedRestFilter] = useState<'all' | 'veg' | 'fast' | 'top'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeGroceryTab, setActiveGroceryTab] = useState<string>('produce');

  // Customization modal state
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // Live collections from database
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pickedDishes, setPickedDishes] = useState<any[]>([]);
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDishLoading, setIsDishLoading] = useState<boolean>(false);

  // Flash deal countdown timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live marketplace catalog from MongoDB
  useEffect(() => {
    const loadHomeData = async () => {
      setIsLoading(true);
      try {
        const [restRes, catRes, dishRes, grocRes] = await Promise.all([
          api.restaurants.getAll(),
          api.restaurants.getCategories(),
          api.restaurants.getFeaturedDishes(12),
          api.groceries.getAll()
        ]);

        if (restRes.success && restRes.data) {
          setRestaurants(restRes.data);
        }
        if (catRes.success && catRes.data) {
          setCategories(catRes.data);
        }
        if (dishRes.success && dishRes.data) {
          setPickedDishes(dishRes.data);
        }
        if (grocRes.success && grocRes.data) {
          setGroceries(grocRes.data);
        }
      } catch (err: any) {
        console.warn('Home data load error:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadHomeData();
  }, []);

  // Handle dynamic category selection
  const handleCategorySelect = async (catId: string) => {
    setActiveCategory(catId);
    if (catId === 'groceries') {
      navigate('/mart');
      return;
    }
    setIsDishLoading(true);
    try {
      const dishRes = await api.restaurants.getFeaturedDishes(24, catId);
      if (dishRes.success && dishRes.data) {
        setPickedDishes(dishRes.data);
      }
    } catch (err: any) {
      console.warn('Failed to load category dishes:', err.message);
    } finally {
      setIsDishLoading(false);
    }
  };

  // Filter restaurants
  const filteredRestaurants = (restaurants || []).filter(r => {
    if (!r) return false;
    if (selectedRestFilter === 'veg') return r.cuisines?.some(c => c.toLowerCase().includes('veg') || c.toLowerCase().includes('salad')) || r.isPureVeg;
    if (selectedRestFilter === 'fast') return r.deliveryTime?.includes('15') || r.deliveryTime?.includes('20');
    if (selectedRestFilter === 'top') return (r.rating || 0) >= 4.6;
    return true;
  });

  // Filter groceries by tab
  const filteredGroceries = groceries.filter(g => {
    const cat = (g.category || '').toLowerCase();
    if (activeGroceryTab === 'produce') return cat.includes('produce') || cat.includes('fruit') || cat.includes('veg');
    if (activeGroceryTab === 'dairy') return cat.includes('dairy') || cat.includes('bread') || cat.includes('egg');
    if (activeGroceryTab === 'instant') return cat.includes('instant') || cat.includes('snack') || cat.includes('munch');
    return cat.includes('drink') || cat.includes('beverage') || cat.includes('juice');
  });

  return (
    <div className="w-full bg-surface">
      {/* Top Flash Broadcast Banner */}
      <div className="w-full bg-surface-container-low text-on-surface py-2 border-b border-outline-variant/20">
        <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4 font-body-sm text-[12px]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-bold text-on-surface">Quantum Campus Express</span>
            <span className="text-on-surface-variant/70 hidden sm:inline">•</span>
            <span className="text-on-surface-variant font-medium hidden sm:inline">
              Avg delivery 14 mins across all hostels & departmental blocks
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
              <span className="material-symbols-outlined text-[13px]">local_activity</span> CAMPUSFREE
            </span>
            <span className="text-on-surface-variant">Free delivery on orders over ₹149</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative w-full bg-surface py-6 sm:py-8 lg:py-12 border-b border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Col: Messaging & Call to Actions */}
            <div className="lg:col-span-6 flex flex-col gap-4 sm:gap-5">
              <div className="inline-flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full w-fit">
                <span className="material-symbols-outlined text-secondary text-[16px]">verified</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant font-semibold">
                  Verified Campus Merchant Network • 120+ Outlets
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <h1 className="font-display-hero text-3xl sm:text-4xl lg:text-[42px] text-on-surface font-extrabold tracking-tight leading-tight">
                  Craving great food or daily essentials?{' '}
                  <span className="text-primary">At your door in 15 mins.</span>
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                  Order freshly prepared meals from beloved Roorkee restaurants, or campus pantry essentials delivered directly to your hostel gate.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <a
                  href="#quick-order"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold px-5 sm:px-6 py-3 rounded-xl shadow-level-1 transition-all active:scale-95"
                >
                  <span>Order Now</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
                <a
                  href="#restaurants"
                  className="inline-flex items-center gap-2 bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold px-4 sm:px-5 py-3 rounded-xl transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">storefront</span>
                  <span>Browse 48 Outlets</span>
                </a>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-outline-variant/30 max-w-md">
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm font-bold text-on-surface">14 mins</span>
                  <span className="text-[12px] text-on-surface-variant">Average drop</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm font-bold text-secondary">4.8 / 5</span>
                  <span className="text-[12px] text-on-surface-variant">Merchant rating</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm font-bold text-on-surface">₹0 Fees</span>
                  <span className="text-[12px] text-on-surface-variant">With code CAMPUSFREE</span>
                </div>
              </div>
            </div>

            {/* Right Col: High-Res Stitch Visual Showcase Collage */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-12 gap-3 h-[320px] sm:h-[360px]">
                {/* Primary Card: Brother's Pizza Feature */}
                <div
                  onClick={() => navigate('/restaurant/brothers-pizza')}
                  className="col-span-7 h-full relative rounded-2xl overflow-hidden group shadow-sm cursor-pointer border border-outline-variant/20"
                >
                  <img
                    src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80"
                    alt="Brother's Cheese Burst Pizza"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-bold text-on-surface shadow-sm">
                    Trending in Hostels
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-[16px] font-bold leading-tight">Cheese Burst Supreme Pizza</p>
                    <div className="flex items-center gap-2 mt-1 text-[12px] opacity-90">
                      <span>Brother's Pizza</span>
                      <span>•</span>
                      <span className="text-secondary-container font-semibold">20-25m delivery</span>
                    </div>
                  </div>
                </div>

                {/* Sub Cards: Fresh Groceries & Ali Baik */}
                <div className="col-span-5 flex flex-col gap-3 h-full">
                  <div
                    onClick={() => navigate('/mart')}
                    className="h-1/2 relative rounded-2xl overflow-hidden group shadow-sm cursor-pointer border border-outline-variant/20"
                  >
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9p3SYeZLLdrxV5TnNE7Pwv4xbfu0x_evxzMYOCiWmCZBDuOFOxJPUZyK6tNO3zJ6G5IIi4LNIwQlcXtWp6y8fkaf9PFzcEYsvg1SSaiHrTodKeWRsqiAPHeyJs46t_95_LAo6dcI1SiyWZG8vAt5ePfeczlMDRbNzLuv05ivhiJHtoMnIFQQH6kRTmbEL94lUxkOoGuS0elhKbgSXwn4uGfsvTD41C_9qxGl3CgPymWtVOjgReP64"
                      alt="Fresh farm produce"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-2.5 left-2.5 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-secondary px-1.5 py-0.5 rounded text-white">
                        10 Mins Mart
                      </span>
                      <p className="text-[13px] font-bold leading-tight mt-1">Farm Crisp Groceries</p>
                    </div>
                  </div>

                  <div
                    onClick={() => navigate('/restaurant/ali-baik-chutmalpur')}
                    className="h-1/2 relative rounded-2xl overflow-hidden group shadow-sm cursor-pointer border border-outline-variant/20"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80"
                      alt="Crispy Fried Chicken"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-2.5 left-2.5 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-tertiary-container px-1.5 py-0.5 rounded text-white">
                        Campus Favorite
                      </span>
                      <p className="text-[13px] font-bold leading-tight mt-1">Ali Baik Crispy Chicken</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Category Horizontal Scroll Bar */}
      <section className="w-full bg-surface py-5 border-b border-outline-variant/20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-sm uppercase tracking-wider text-on-surface-variant font-bold text-[11px]">
              Quick Categories
            </span>
            <button
              onClick={() => navigate('/mart')}
              className="font-label-md text-label-md text-primary hover:underline font-semibold"
            >
              View All Categories
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all shrink-0 shadow-xs ${
                    isActive
                      ? 'bg-on-surface text-surface font-bold shadow-sm'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${cat.iconColor || 'text-primary'}`}>
                    {cat.icon || 'restaurant'}
                  </span>
                  <span>{cat.name}</span>
                  {cat.badge && (
                    <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-1.5 rounded">
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Picked For You Section */}
      <section className="w-full py-8 sm:py-10 bg-surface-bright" id="quick-order">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold">
                  {activeCategory === 'all'
                    ? 'Picked for You'
                    : categories.find(c => c.id === activeCategory)?.name || 'Featured Dishes'}
                </h2>
                <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {pickedDishes.length} Items
                </span>
              </div>
              <p className="font-body-sm text-[13px] text-on-surface-variant mt-0.5">
                {activeCategory === 'all'
                  ? 'Fastest dispatch dishes and grocery essentials around Quantum University.'
                  : `Top-rated options in ${categories.find(c => c.id === activeCategory)?.name || 'this category'} from verified campus kitchens.`}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
                aria-label="Previous"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button
                className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
                aria-label="Next"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>

          {isDishLoading || (isLoading && pickedDishes.length === 0) ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-60 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-2.5 flex flex-col justify-between">
                  <div className="w-full aspect-square rounded-lg bg-surface-container-low" />
                  <div className="h-4 w-3/4 bg-surface-container-low rounded mt-2" />
                  <div className="h-4 w-1/2 bg-surface-container-low rounded" />
                </div>
              ))}
            </div>
          ) : pickedDishes.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/20 flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-outline text-[36px]">restaurant</span>
              <p className="text-on-surface font-bold text-sm">No dishes found in this category.</p>
              <button
                onClick={() => handleCategorySelect('all')}
                className="mt-1 text-xs font-bold text-primary underline"
              >
                Reset to All Dishes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {pickedDishes.map(dish => {
                const cartItem = items.find(i => i.id === dish.id);
                const quantity = cartItem ? cartItem.quantity : 0;

              return (
                <div
                  key={dish.id}
                  className="bg-surface-container-lowest rounded-xl p-2.5 shadow-level-1 hover:shadow-level-2 transition-all flex flex-col justify-between group border border-outline-variant/20"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-surface-container-low mb-2">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {dish.discount && (
                      <span className="absolute top-1.5 left-1.5 bg-on-surface text-surface text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {dish.discount}
                      </span>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface text-[11px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-secondary text-[12px]">bolt</span>
                      {dish.eta}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-on-surface-variant font-medium truncate max-w-[80px]">
                        {dish.restaurantName}
                      </span>
                      <span className="text-[11px] text-tertiary-container font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px] material-symbols-fill">
                          star
                        </span>
                        {dish.rating}
                      </span>
                    </div>
                    <h3 className="font-label-lg text-[13px] font-bold text-on-surface truncate">
                      {dish.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[14px] font-bold text-on-surface font-price-numeral">
                        ₹{dish.price}
                      </span>
                      {dish.originalPrice > dish.price && (
                        <span className="text-[11px] line-through text-on-surface-variant/70">
                          ₹{dish.originalPrice}
                        </span>
                      )}
                    </div>
                    <QuantityStepper
                      quantity={quantity}
                      size="sm"
                      variant={dish.restaurantId === 'mart' ? 'emerald' : 'coral'}
                      onAdd={() => {
                        addMenuItem({
                          id: dish.id,
                          restaurantId: dish.restaurantId,
                          name: dish.name,
                          description: dish.description,
                          price: dish.price,
                          originalPrice: dish.originalPrice,
                          image: dish.image,
                          dietary: dish.dietary,
                          category: 'Picked'
                        });
                      }}
                      onIncrement={() => updateQuantity(cartItem!.cartItemId, 1)}
                      onDecrement={() => updateQuantity(cartItem!.cartItemId, -1)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </section>

      {/* Popular Near You Restaurant Cards */}
      <section className="w-full py-10 sm:py-12 bg-surface" id="restaurants">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold">
                Popular Restaurants Near Campus
              </h2>
              <p className="font-body-sm text-[13px] text-on-surface-variant">
                Handpicked kitchens delivering fast with live preparation status.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedRestFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-[12px] transition-colors shrink-0 ${
                  selectedRestFilter === 'all'
                    ? 'bg-surface-container-lowest text-on-surface font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All ({restaurants.length})
              </button>
              <button
                onClick={() => setSelectedRestFilter('veg')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-[12px] transition-colors shrink-0 ${
                  selectedRestFilter === 'veg'
                    ? 'bg-surface-container-lowest text-on-surface font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Pure Veg / Healthy
              </button>
              <button
                onClick={() => setSelectedRestFilter('fast')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-[12px] transition-colors shrink-0 ${
                  selectedRestFilter === 'fast'
                    ? 'bg-surface-container-lowest text-on-surface font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Under 25 mins
              </button>
              <button
                onClick={() => setSelectedRestFilter('top')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-[12px] transition-colors shrink-0 ${
                  selectedRestFilter === 'top'
                    ? 'bg-surface-container-lowest text-on-surface font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Top Rated (4.6+)
              </button>
            </div>
          </div>

          {isLoading && filteredRestaurants.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-64 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4" />
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/20">
              <p className="text-on-surface-variant font-medium text-sm">No restaurants matching the selected filter.</p>
              <button onClick={() => setSelectedRestFilter('all')} className="mt-2 text-xs font-bold text-primary underline">
                Show All Outlets ({restaurants.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredRestaurants.map(restaurant => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* Flash Deals Countdown Strip Banner */}
      <section className="w-full py-5 bg-on-surface text-surface">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-surface/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px] text-secondary-container">
                timer
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-secondary-container font-bold">
                  Campus Rush Hour
                </span>
                <span className="font-label-lg text-[14px] font-bold text-surface">
                  Special Evening Drop Rates
                </span>
              </div>
              <p className="text-[12px] text-surface-variant opacity-80">
                Order before 9:00 PM for flat ₹30 off on any combo meal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[13px] font-bold text-surface bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-surface-variant text-[11px] mr-1 font-normal">Ends in:</span>
              <span>{String(timeLeft.hours).padStart(2, '0')}</span>h :{' '}
              <span>{String(timeLeft.minutes).padStart(2, '0')}</span>m :{' '}
              <span>{String(timeLeft.seconds).padStart(2, '0')}</span>s
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="bg-surface text-on-surface font-bold text-[12px] px-3 py-1.5 rounded-lg">
                CODE: RUSH30
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Fresh Groceries Delivered Fast Section (10-15 Mins) */}
      <section className="w-full py-10 sm:py-12 bg-surface-container-low border-t border-outline-variant/20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-on-secondary">
                  <span className="material-symbols-outlined text-[18px]">electric_bolt</span>
                </span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                  Fresh Groceries in 10-15 Mins
                </h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Daily milk, fresh fruits, vegetables and campus pantry staples from local dark stores.
              </p>
            </div>

            {/* Subcategory Switcher */}
            <div className="flex items-center gap-2 bg-surface-container-lowest p-1.5 rounded-full shadow-sm overflow-x-auto no-scrollbar">
              {[
                { id: 'produce', label: 'Fruits & Veggies' },
                { id: 'dairy', label: 'Dairy & Bread' },
                { id: 'instant', label: 'Instant Food' },
                { id: 'cold-drinks', label: 'Cold Drinks' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveGroceryTab(tab.id)}
                  className={`px-4 py-1.5 rounded-full font-label-md text-label-md font-bold transition-colors whitespace-nowrap ${
                    activeGroceryTab === tab.id
                      ? 'bg-secondary text-on-secondary shadow-sm'
                      : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grocery SKU Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredGroceries.map(item => (
              <GroceryItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Customization Modal */}
      <CustomizationModal
        item={customizingItem}
        isOpen={Boolean(customizingItem)}
        onClose={() => setCustomizingItem(null)}
        onConfirm={customizations => {
          if (customizingItem) {
            addMenuItem(customizingItem, customizations, 1);
          }
        }}
      />
    </div>
  );
};
