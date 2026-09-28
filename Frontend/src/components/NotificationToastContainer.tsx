import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, WebsiteNotification } from '../context/NotificationContext';

export const NotificationToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotifications();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0"
      aria-live="polite"
      aria-label="Live Website Notifications"
    >
      {toasts.map(toast => {
        const isCustomer = toast.role === 'customer' || toast.type === 'order_confirmed';
        const isAdmin = toast.role === 'admin';
        const isRider = toast.role === 'rider';

        const roleBadge = isCustomer
          ? { label: 'Customer Update', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
          : isAdmin
          ? { label: 'Admin / Merchant Alert', bg: 'bg-primary/15 text-primary border-primary/30' }
          : { label: 'Rider Dispatch Alert', bg: 'bg-secondary/15 text-secondary border-secondary/30' };

        const icon =
          toast.type === 'order_confirmed'
            ? 'check_circle'
            : toast.type === 'rider_assigned'
            ? 'two_wheeler'
            : toast.type === 'out_for_delivery'
            ? 'rocket_launch'
            : toast.type === 'delivered'
            ? 'verified'
            : 'notifications_active';

        const handleAction = () => {
          dismissToast(toast.id);
          if (toast.role === 'rider') {
            navigate('/rider');
          } else if (toast.role === 'admin') {
            navigate('/admin');
          } else {
            navigate(toast.orderId ? `/tracking?orderId=${toast.orderId}` : '/tracking');
          }
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/40 rounded-2xl p-4 shadow-level-4 transition-all duration-300 ease-out transform translate-y-0 opacity-100 flex flex-col gap-2 animate-in fade-in slide-in-from-top-3"
          >
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${roleBadge.bg}`}
                >
                  <span className="material-symbols-outlined text-[13px]">{icon}</span>
                  <span>{roleBadge.label}</span>
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">Just now</span>
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
                title="Dismiss"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-0.5">
              <h4 className="font-bold text-[13px] text-on-surface flex items-center gap-1.5">
                <span>{toast.title}</span>
              </h4>
              <p className="text-[12px] text-on-surface-variant leading-relaxed">
                {toast.message}
              </p>
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
              <div className="text-[11px] font-mono font-bold text-on-surface-variant">
                {toast.orderNumber ? `#${toast.orderNumber}` : ''}
                {toast.totalToPay ? ` • ₹${toast.totalToPay}` : ''}
              </div>

              <button
                onClick={handleAction}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary text-on-primary font-bold text-[11px] hover:bg-primary-container transition-all cursor-pointer shadow-2xs"
              >
                <span>
                  {isRider ? 'Open Terminal' : isAdmin ? 'Review in Admin' : 'Track Order'}
                </span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
