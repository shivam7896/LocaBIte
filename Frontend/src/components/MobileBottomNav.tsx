import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  // If in auth flow or onboarding, don't obstruct screen
  if (location.pathname === '/onboarding') {
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-outline-variant/30 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-4 flex items-center justify-around">
        {/* Explore / Food */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive && location.pathname !== '/mart' && location.pathname !== '/tracking' && location.pathname !== '/auth'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">restaurant</span>
          <span className="text-[10px] font-label-sm">Food</span>
        </NavLink>

        {/* Mart / 10-Min Grocery */}
        <NavLink
          to="/mart"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
              isActive ? 'text-secondary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <div className="relative">
            <span className="material-symbols-outlined text-[22px]">bolt</span>
            <span className="absolute -top-1 -right-2 bg-secondary text-white text-[8px] font-bold px-1 rounded-full">
              10m
            </span>
          </div>
          <span className="text-[10px] font-label-sm">Mart</span>
        </NavLink>

        {/* Orders / Live Tracking */}
        <NavLink
          to="/tracking"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">two_wheeler</span>
          <span className="text-[10px] font-label-sm">Orders</span>
        </NavLink>

        {/* Profile / Account */}
        <NavLink
          to="/auth"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">person</span>
          <span className="text-[10px] font-label-sm">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
