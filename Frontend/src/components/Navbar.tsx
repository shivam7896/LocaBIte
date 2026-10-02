import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { LocationModal } from './LocationModal';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationBell } from './NotificationBell';

export const Navbar: React.FC = () => {
  const { totalToPay, totalItemsCount, selectedAddress } = useCart();
  const { user, isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Shortcut for Command+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isFoodActive = location.pathname === '/' || location.pathname.startsWith('/restaurant');
  const isGroceryActive = location.pathname.startsWith('/mart');
  const isTrackingActive = location.pathname.startsWith('/tracking');
  const isRestaurantDetail = location.pathname.startsWith('/restaurant');

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/20">
        <div className="h-16 lg:h-18 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-2.5 sm:gap-3 lg:gap-4">
          {/* DESKTOP LEFT: Always consistent branding and Campus Hub selector across ALL screens */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-5 shrink-0">
            <Link to="/" className="shrink-0 flex items-center" title="LocaBite Home">
              <Logo size="md" />
            </Link>

            <div className="h-5 w-px bg-surface-variant hidden xl:block shrink-0" />

            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors text-left group shrink-0"
              title="Select Campus Delivery Hub"
            >
              <span className="material-symbols-outlined text-primary text-[19px] shrink-0">
                location_on
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Delivering to
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors max-w-[130px] 2xl:max-w-[160px] truncate">
                    {selectedAddress.building || 'Quantum University, Roorkee'}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">
                    expand_more
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* MOBILE LEFT (<lg): Adaptive back button for sub-pages or compact logo + delivery hub */}
          <div className="flex lg:hidden items-center gap-2 min-w-0 flex-1">
            {isRestaurantDetail ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => navigate(-1)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors shrink-0"
                  aria-label="Go back"
                >
                  <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                </button>
                <Link to="/" className="shrink-0 flex items-center">
                  <Logo size="sm" compact />
                </Link>
                <span className="font-headline-sm text-[14px] sm:text-[15px] text-on-surface font-bold truncate">
                  Outlet Menu
                </span>
              </div>
            ) : location.pathname.startsWith('/checkout') ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => navigate(-1)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors shrink-0"
                  aria-label="Go back"
                >
                  <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                </button>
                <Link to="/" className="shrink-0 flex items-center">
                  <Logo size="sm" compact />
                </Link>
                <span className="font-headline-sm text-[14px] sm:text-[15px] text-on-surface font-bold truncate">
                  Cart Checkout
                </span>
              </div>
            ) : location.pathname.startsWith('/tracking') ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => navigate(-1)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors shrink-0"
                  aria-label="Go back"
                >
                  <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                </button>
                <Link to="/" className="shrink-0 flex items-center">
                  <Logo size="sm" compact />
                </Link>
                <span className="font-headline-sm text-[14px] sm:text-[15px] text-on-surface font-bold truncate">
                  Live Tracking
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Link to="/" className="shrink-0 flex items-center">
                  <Logo size="sm" compact />
                </Link>
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-surface-container-low transition-colors text-left group min-w-0"
                >
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
                    location_on
                  </span>
                  <div className="flex flex-col leading-tight min-w-0">
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                        Delivering to
                      </span>
                      <span className="material-symbols-outlined text-[13px] text-primary">
                        expand_more
                      </span>
                    </div>
                    <span className="text-[12px] font-semibold text-on-surface group-hover:text-primary transition-colors max-w-[140px] sm:max-w-[200px] truncate">
                      {selectedAddress.building || 'Quantum University, Roorkee'}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* CENTER: Desktop Global Search Bar */}
          <div className="flex-1 max-w-md mx-1 lg:mx-2 min-w-0 hidden md:block">
            <div
              onClick={() => setIsSearchModalOpen(true)}
              className="relative flex items-center w-full h-10 lg:h-11 rounded-full bg-surface-container-lowest shadow-sm px-3.5 cursor-pointer group hover:shadow-md transition-all border border-outline-variant/30 min-w-0"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] lg:text-[20px] mr-2 shrink-0 group-hover:text-primary transition-colors">
                search
              </span>
              <span className="min-w-0 flex-1 bg-transparent font-body-md text-[13px] text-on-surface-variant/70 truncate">
                Search dishes, groceries or restaurants...
              </span>
              <span className="hidden xl:flex items-center px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] font-medium shrink-0 ml-1">
                ⌘K
              </span>
            </div>
          </div>

          {/* RIGHT: Navigation Links, Search, Cart & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 shrink-0">
            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-surface-container-low p-1 rounded-xl shrink-0">
              <Link
                to="/"
                className={`font-label-md text-label-md px-2.5 xl:px-3.5 py-1.5 rounded-lg transition-all ${
                  isFoodActive
                    ? 'bg-surface-container-lowest text-on-surface font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                <span className="hidden xl:inline">Food Delivery</span>
                <span className="xl:hidden">Food</span>
              </Link>
              <Link
                to="/mart"
                className={`font-label-md text-label-md px-2.5 xl:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  isGroceryActive
                    ? 'bg-surface-container-lowest text-on-surface font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                <span>Grocery</span>
                <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-1.5 py-0.2 rounded">
                  10m
                </span>
              </Link>
              <Link
                to="/tracking"
                className={`font-label-md text-label-md px-2.5 xl:px-3 py-1.5 rounded-lg transition-all ${
                  isTrackingActive
                    ? 'bg-surface-container-lowest text-on-surface font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                Orders
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`font-label-md text-label-md px-2.5 xl:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 font-bold'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                  <span>Admin</span>
                </Link>
              )}
              <Link
                to="/rider"
                className={`font-label-md text-label-md px-2.5 xl:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  location.pathname.startsWith('/rider')
                    ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                    : 'bg-secondary/10 text-secondary hover:bg-secondary/20 font-bold'
                }`}
                title="Campus Rider Portal"
              >
                <span className="material-symbols-outlined text-[15px]">electric_moped</span>
                <span>Rider</span>
              </Link>
            </nav>

            {/* Mobile Search Button (<md) */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="md:hidden w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0"
              aria-label="Open search"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            {/* Cart Button:
                On screens >=sm (tablets & desktop), visible in header.
                On handheld screens (<sm), cart is powered by FloatingCartBar & MobileBottomNav.
            */}
            <Link
              to="/checkout"
              className="hidden sm:flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary px-3 py-1.5 sm:py-2 rounded-xl transition-all font-label-md text-[12px] sm:text-[13px] font-bold active:scale-95 shadow-sm shrink-0"
              title="View Cart & Checkout"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px]">shopping_bag</span>
              <span className="font-price-numeral">₹{totalToPay}</span>
              <span className="w-1 h-1 rounded-full bg-secondary-container hidden sm:inline-block" />
              <span className="text-[11px] font-semibold opacity-95 hidden sm:inline-block">
                {totalItemsCount} <span className="hidden xl:inline">{totalItemsCount === 1 ? 'item' : 'items'}</span>
              </span>
            </Link>

            {/* Live Notification Bell with Audio Chimes & Test Simulation */}
            <NotificationBell />

            {/* Profile Avatar / Auth Entry */}
            <Link
              to="/auth"
              className="flex items-center gap-2 pl-0.5 cursor-pointer group shrink-0"
              title={isLoggedIn ? 'Account Settings' : 'Sign In'}
            >
              <div className="relative shrink-0">
                <img
                  src={
                    user?.avatar ||
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg'
                  }
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-outline-variant/40 group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                />
                <span className="absolute -bottom-0.5 -right-0.5 bg-secondary text-on-secondary rounded-full flex items-center justify-center w-3 h-3 shadow-xs">
                  <span className="material-symbols-outlined text-[8px] font-bold">check</span>
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Modals */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
};
