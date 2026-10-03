import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-low border-t border-outline-variant/30 text-on-surface pt-12 pb-24 lg:pb-12">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-outline-variant/30">
          {/* Brand Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link to="/">
              <Logo size="lg" />
            </Link>
            <p className="font-body-md text-on-surface-variant max-w-sm">
              Hyper-speed local food delivery and 10-minute grocery essentials. Connecting your home and office with beloved local kitchens.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container text-[12px] font-bold">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                Live in 18+ Cities
              </span>
            </div>
          </div>

          {/* Quick Categories */}
          <div className="flex flex-col gap-3">
            <h4 className="font-label-lg text-label-lg font-bold text-on-surface">Categories</h4>
            <div className="flex flex-col gap-2 font-body-sm text-[13px] text-on-surface-variant">
              <Link to="/?category=burgers" className="hover:text-primary transition-colors">
                Burgers & Fast Food
              </Link>
              <Link to="/?category=biryani" className="hover:text-primary transition-colors">
                Dum Biryani & Rice
              </Link>
              <Link to="/?category=pizza" className="hover:text-primary transition-colors">
                Woodfired Pizzas
              </Link>
              <Link to="/mart" className="hover:text-secondary font-semibold transition-colors flex items-center gap-1">
                <span>LocaBite Mart</span>
                <span className="bg-secondary-container text-on-secondary-container text-[9px] font-bold px-1 rounded">10m</span>
              </Link>
              <Link to="/mart?cat=dairy" className="hover:text-primary transition-colors">
                Dairy & Fresh Bread
              </Link>
            </div>
          </div>

          {/* Campus Services */}
          <div className="flex flex-col gap-3">
            <h4 className="font-label-lg text-label-lg font-bold text-on-surface">Local Services</h4>
            <div className="flex flex-col gap-2 font-body-sm text-[13px] text-on-surface-variant">
              <Link to="/tracking" className="hover:text-primary transition-colors">
                Live Order Tracking
              </Link>
              <span className="cursor-pointer hover:text-primary transition-colors">Home & Office Express Drops</span>
              <span className="cursor-pointer hover:text-primary transition-colors">Late Night Delivery</span>
              <span className="cursor-pointer hover:text-primary transition-colors">Customer Loyalty Coins</span>
              <span className="cursor-pointer hover:text-primary transition-colors">Partner With Us (Outlets)</span>
            </div>
          </div>

          {/* Trust & Certifications */}
          <div className="flex flex-col gap-3">
            <h4 className="font-label-lg text-label-lg font-bold text-on-surface">Trust & Safety</h4>
            <div className="flex flex-col gap-2 text-[12px] text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                <span>FSSAI Certified Outlets</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">lock</span>
                <span>256-Bit SSL Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">electric_moped</span>
                <span>Zero Carbon Fleet</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-body-sm text-[12px] text-on-surface-variant">
          <p>© 2026 LocaBite Technologies Inc. Built with love for local communities.</p>
          <div className="flex items-center gap-4">
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
            <span>•</span>
            <Link to="/admin" className="hover:text-primary transition-colors flex items-center gap-1 font-semibold text-outline">
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              Admin Console
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
