import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { VegBadge } from '../components/VegBadge';
import { QuantityStepper } from '../components/QuantityStepper';
import { CustomizationModal } from '../components/CustomizationModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Restaurant, MenuItem } from '../types';
import { api } from '../services/api';

export const RestaurantPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items,
    addMenuItem,
    updateQuantity,
    removeItem,
    itemTotal,
    deliveryFee,
    taxesAndHandling,
    discount,
    totalToPay,
    totalItemsCount
  } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const fetchRestaurant = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.restaurants.getByIdOrSlug(id);
        if (res.success && res.data) {
          if (isMounted) {
            setRestaurant(res.data);
            setActiveCategory('All');
          }
        } else {
          if (isMounted) {
            setError(res.message || 'This outlet is currently unavailable or inactive.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load restaurant details.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchRestaurant();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleShare = () => {
    if (!restaurant) return;
    if (navigator.share) {
      navigator.share({
        title: `${restaurant.name || 'Restaurant'} on LocaBite`,
        text: `Order fresh hot meals from ${restaurant.name || 'LocaBite'} on LocaBite campus delivery!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-surface pb-24 lg:pb-16 animate-pulse">
        <div className="h-60 sm:h-72 md:h-80 w-full bg-surface-container-high" />
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 -mt-16 relative z-20">
          <div className="bg-surface-container-lowest rounded-2xl shadow-level-2 p-6 h-36 border border-outline-variant/30 flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-surface-container-low" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-6 w-48 bg-surface-container-low rounded" />
              <div className="h-4 w-32 bg-surface-container-low rounded" />
            </div>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-64 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="w-full bg-surface py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-4 text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">storefront</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">Outlet Unavailable</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            {error || 'This restaurant is currently closed, suspended, or does not exist.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md font-bold transition-all hover:bg-primary-container"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Browse All Outlets</span>
            </Link>
            <Link
              to="/restaurant/pure-south-indian-chutmalpur"
              className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface px-5 py-2.5 rounded-full font-label-md font-bold transition-all hover:bg-surface-container-highest"
            >
              <span>Visit Pure South Indian</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayedMenu = (restaurant.menu || []).filter(dish => {
    if (!activeCategory || activeCategory === 'All') return true;
    return dish.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="w-full bg-surface pb-24 lg:pb-16">
      {/* Restaurant Hero Banner Backdrop */}
      <section className="relative w-full overflow-hidden bg-surface-container-high pb-8">
        <div
          className="relative h-60 sm:h-72 md:h-80 w-full bg-cover bg-center"
          style={{ backgroundImage: `url('${restaurant.bannerImage}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/40 to-transparent" />

          {/* Top Floating Controls inside Hero */}
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 flex items-center justify-between relative z-10">
            <Link
              to="/"
              className="flex items-center gap-1.5 bg-surface-container-lowest/85 hover:bg-surface-container-lowest backdrop-blur-md px-3.5 py-2 rounded-full text-on-surface shadow-sm transition-all active:scale-95 font-label-md text-label-md"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Outlets</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className="w-10 h-10 rounded-full bg-surface-container-lowest/90 hover:bg-surface-container-lowest backdrop-blur-md flex items-center justify-center text-on-surface-variant hover:text-primary shadow-sm transition-all active:scale-90"
                aria-label="Favorite"
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    isFavorited ? 'text-primary material-symbols-fill' : ''
                  }`}
                >
                  {isFavorited ? 'favorite' : 'favorite_border'}
                </span>
              </button>
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-surface-container-lowest/90 hover:bg-surface-container-lowest backdrop-blur-md flex items-center justify-center text-on-surface shadow-sm transition-all active:scale-90"
                aria-label="Share"
              >
                <span className="material-symbols-outlined text-[20px]">share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Restaurant Profile Badge Card (Overlapping Hero) */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 -mt-16 relative z-20">
          <div className="bg-surface-container-lowest rounded-2xl shadow-level-2 p-5 sm:p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-outline-variant/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-surface-container flex items-center justify-center shadow-inner border border-outline-variant/20">
                  <img
                    src={restaurant.logoImage}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-headline-lg text-2xl sm:text-3xl text-on-surface tracking-tight font-bold">
                    {restaurant.name}
                  </h1>
                  <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">bolt</span>
                    Campus Express
                  </span>
                </div>

                <p className="font-body-md text-body-md text-on-surface-variant flex flex-wrap items-center gap-2">
                  {(restaurant.cuisines || []).map((c, i) => (
                    <React.Fragment key={c}>
                      <span className="font-semibold text-on-surface">{c}</span>
                      {i < (restaurant.cuisines || []).length - 1 && <span>•</span>}
                    </React.Fragment>
                  ))}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[13px]">
                  <div className="flex items-center gap-1.5 bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-1 rounded-full font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px] text-tertiary material-symbols-fill">
                      star
                    </span>
                    <span className="font-bold">{restaurant.rating ?? 4.5}</span>
                    <span className="text-on-surface-variant font-medium">
                      ({(restaurant.reviewsCount || 0).toLocaleString()}+ reviews)
                    </span>
                  </div>
                  <span className="text-on-surface-variant/40 hidden sm:inline">|</span>
                  <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                    <span className="font-bold text-on-surface">{restaurant.deliveryTime || '25-30 min'}</span>
                  </div>
                  <span className="text-on-surface-variant/40 hidden sm:inline">|</span>
                  <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px]">distance</span>
                    <span>{restaurant.distance || '1.2 km away'}</span>
                  </div>
                  <span className="text-on-surface-variant/40 hidden sm:inline">|</span>
                  <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    <span>₹{restaurant.deliveryFee ?? 0} delivery • Min ₹{restaurant.minOrder ?? 99}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hygiene & Certification Micro-badge */}
            <div className="flex sm:flex-col items-start sm:items-end justify-between gap-3 pt-3 lg:pt-0 border-t sm:border-t-0 border-outline-variant/20">
              <div className="flex items-center gap-2 bg-surface-container px-3.5 py-2 rounded-xl">
                <span className="material-symbols-outlined text-secondary text-[22px]">health_and_safety</span>
                <div className="flex flex-col text-left">
                  <span className="font-label-sm text-[10px] text-on-surface font-bold uppercase">
                    LocaBite Certified
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    Daily temp checks & sanitisation
                  </span>
                </div>
              </div>
              <span className="font-body-sm text-[11px] text-on-surface-variant">
                FSSAI Lic: {restaurant.fssaiLicense || '10019022008472'}
              </span>
            </div>
          </div>

          {/* Live Campus Deals Strip */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gradient-to-r from-primary-fixed to-surface-container-lowest rounded-xl p-3.5 flex items-center justify-between shadow-sm border border-primary/20">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">local_offer</span>
                </span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-bold text-on-primary-fixed">
                    50% OFF up to ₹100
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Use code <strong className="text-primary font-bold">WELCOME50</strong> on orders &gt; ₹199
                  </span>
                </div>
              </div>
              <button
                onClick={() => alert('Code WELCOME50 applied automatically at checkout!')}
                className="text-[12px] font-bold text-primary hover:underline shrink-0"
              >
                APPLY
              </button>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-3.5 flex items-center justify-between shadow-sm border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">lunch_dining</span>
                </span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-bold text-on-surface">
                    Free Peri-Peri Fries on orders &gt; ₹349
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Automatic campus bonus dish added to tray
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Category Nav, Dishes Grid, and Sticky Campus Tray */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Category Tabs & Menu Stream (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Category Navigation Bar */}
            <div className="sticky top-20 z-30 bg-surface/95 backdrop-blur-md py-2 border-b border-outline-variant/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {['All', ...(restaurant.categories || [])].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl font-label-md text-label-md font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-on-surface text-surface shadow-sm'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Items for Selected Category */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md font-headline-md text-on-surface font-bold">
                  {activeCategory}
                </h2>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {displayedMenu.length} delicious options
                </span>
              </div>

              {displayedMenu.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/20">
                  <p className="text-on-surface-variant font-medium">No dishes available in this section.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedMenu.map(dish => {
                  const cartItem = items.find(i => i.id === dish.id);
                  const quantity = cartItem ? cartItem.quantity : 0;

                  return (
                    <div
                      key={dish.id}
                      className="bg-surface-container-lowest rounded-2xl p-4 shadow-level-1 hover:shadow-level-2 transition-all flex flex-col justify-between gap-4 border border-outline-variant/20"
                    >
                      <div className="relative h-44 rounded-xl overflow-hidden bg-surface-container">
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2.5 left-2.5 bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-0.5 rounded-full font-label-sm text-label-sm text-on-surface font-bold flex items-center gap-1 shadow-sm">
                          <VegBadge type={dish.dietary} size="sm" showText />
                        </span>
                        {dish.isCustomizable && (
                          <span className="absolute bottom-2.5 right-2.5 bg-primary/90 backdrop-blur-sm text-on-primary font-label-sm text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                            Customizable
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-headline-sm text-[15px] font-bold text-on-surface">
                            {dish.name}
                          </h4>
                          {dish.rating && (
                            <span className="text-[11px] font-bold text-tertiary flex items-center gap-0.5 shrink-0">
                              ⭐ {dish.rating}
                            </span>
                          )}
                        </div>
                        <p className="font-body-sm text-[12px] text-on-surface-variant line-clamp-2">
                          {dish.description}
                        </p>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-outline-variant/20">
                          <div className="flex items-baseline gap-1">
                            <span className="font-price-numeral text-headline-sm font-extrabold text-on-surface">
                              ₹{dish.price}
                            </span>
                            {dish.originalPrice && dish.originalPrice > dish.price && (
                              <span className="text-[12px] line-through text-on-surface-variant/70">
                                ₹{dish.originalPrice}
                              </span>
                            )}
                          </div>

                          {dish.isCustomizable ? (
                            <button
                              onClick={() => setCustomizingItem(dish)}
                              className="bg-primary hover:bg-primary-container text-on-primary px-4 py-1.5 rounded-full font-label-md text-label-md font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
                            >
                              <span>ADD</span>
                              <span className="text-[12px]">+</span>
                            </button>
                          ) : (
                            <QuantityStepper
                              quantity={quantity}
                              onAdd={() => addMenuItem(dish, undefined, 1)}
                              onIncrement={() => {
                                if (cartItem) {
                                  updateQuantity(cartItem.cartItemId, 1);
                                } else {
                                  addMenuItem(dish, undefined, 1);
                                }
                              }}
                              onDecrement={() => {
                                if (cartItem) {
                                  updateQuantity(cartItem.cartItemId, -1);
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

          {/* Right Column: Sticky Campus Mini-Cart Order Summary (4 Cols) */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-28 bg-surface-container-lowest rounded-2xl shadow-level-2 p-6 flex flex-col gap-5 border border-outline-variant/30">
              <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    shopping_basket
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Your Campus Tray
                  </h3>
                </div>
                <span className="bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                  {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {/* Free Delivery Tracker */}
              <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between font-label-sm text-label-sm">
                  <span className="text-secondary font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {itemTotal >= 199 ? 'Free Delivery Unlocked!' : `Add ₹${199 - itemTotal} for Free Delivery`}
                  </span>
                  <span className="text-on-surface-variant font-medium">
                    ₹{itemTotal} / ₹199
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="bg-secondary h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (itemTotal / 199) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Deliver To Card */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-3 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                  near_me
                </span>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">
                      Deliver to
                    </span>
                    <button
                      onClick={() => navigate('/checkout')}
                      className="text-primary font-label-sm text-[11px] font-bold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-bold truncate">
                    {user?.selectedAddress?.campus || 'Quantum University, Roorkee'}
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant truncate">
                    {user?.selectedAddress?.building || user?.selectedAddress?.title || 'Campus Hostel Address'}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
                {items.length === 0 ? (
                  <p className="text-center py-6 text-on-surface-variant font-body-sm">
                    Your tray is empty. Add delicious items from the menu to start!
                  </p>
                ) : (
                  items.map(cartItem => (
                    <div
                      key={cartItem.cartItemId}
                      className="flex items-center justify-between gap-3 pb-3 border-b border-outline-variant/20"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {cartItem.dietary && <VegBadge type={cartItem.dietary} size="sm" />}
                        <div className="flex flex-col truncate">
                          <span className="font-label-md text-label-md text-on-surface truncate font-semibold">
                            {cartItem.name}
                          </span>
                          <span className="font-body-sm text-[11px] text-on-surface-variant">
                            {cartItem.customizations?.size?.name || 'Standard'} • {cartItem.quantity}x
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-price-numeral text-price-numeral font-bold text-on-surface">
                          ₹{cartItem.price * cartItem.quantity}
                        </span>
                        <button
                          onClick={() => removeItem(cartItem.cartItemId)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          aria-label="Remove item"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bill Details */}
              <div className="flex flex-col gap-2 pt-2 bg-surface-container-low/50 p-4 rounded-xl">
                <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                  <span>Item Total</span>
                  <span className="font-medium text-on-surface">₹{itemTotal}</span>
                </div>
                <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                  <span>Delivery Partner Fee (1.4 km)</span>
                  <span className={deliveryFee === 0 ? 'text-secondary font-bold' : 'text-on-surface'}>
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                  <span>Campus Handling & Taxes</span>
                  <span className="font-medium text-on-surface">₹{taxesAndHandling}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between font-body-sm text-body-sm text-secondary font-medium">
                    <span>WELCOME50 Instant Off</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="border-t border-outline-variant/30 my-1" />
                <div className="flex items-center justify-between font-label-lg text-label-lg font-extrabold text-on-surface">
                  <span>To Pay</span>
                  <span className="font-price-numeral text-[20px] text-primary">₹{totalToPay}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                disabled={items.length === 0}
                onClick={() => navigate('/checkout')}
                className="w-full bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary py-3.5 px-5 rounded-full font-label-lg text-label-lg font-bold flex items-center justify-between shadow-[0_4px_16px_rgba(174,42,0,0.3)] transition-all active:scale-[0.98]"
              >
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[11px] opacity-90 uppercase tracking-wider font-semibold">
                    Total Bill
                  </span>
                  <span className="font-price-numeral text-[16px]">₹{totalToPay}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span>Proceed to Checkout</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </div>
              </button>

              <div className="flex items-center justify-center gap-2 text-center text-on-surface-variant font-body-sm text-body-sm pt-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  verified_user
                </span>
                <span>Contactless hostel desk drop available</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

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
