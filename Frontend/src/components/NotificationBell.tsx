import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, WebsiteNotification } from '../context/NotificationContext';

export const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isAudioEnabled,
    permissionStatus,
    toggleAudio,
    requestDesktopPermission,
    markAllAsRead,
    clearAllNotifications,
    sendTestNotification
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (item: WebsiteNotification) => {
    setIsOpen(false);
    if (item.role === 'rider') {
      navigate('/rider');
    } else if (item.role === 'admin') {
      navigate('/admin');
    } else {
      navigate(item.orderId ? `/tracking?orderId=${item.orderId}` : '/tracking');
    }
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          isOpen
            ? 'bg-primary text-on-primary shadow-xs'
            : 'bg-surface-container-low hover:bg-surface-container text-on-surface hover:text-primary'
        }`}
        title="Notifications & Order Alerts"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
          {unreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-secondary text-on-secondary text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[90vw] max-w-[360px] sm:w-96 bg-surface-container-lowest border border-outline-variant/40 rounded-3xl shadow-level-4 z-50 overflow-hidden flex flex-col text-xs animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-surface-container-low/70 border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[14px] text-on-surface">Order Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-black text-[10px]">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleAudio}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isAudioEnabled
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
                title={isAudioEnabled ? 'Mute Audio Chime' : 'Enable Audio Chime'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isAudioEnabled ? 'volume_up' : 'volume_off'}
                </span>
              </button>

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="text-[11px] font-bold text-on-surface-variant hover:text-error px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>



          {/* Notifications List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/20">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-on-surface-variant space-y-1">
                <span className="material-symbols-outlined text-[32px] opacity-40">notifications_paused</span>
                <p className="font-bold text-[12px]">No notifications yet</p>
                <p className="text-[11px] opacity-80">
                  You will see your order updates here!
                </p>
              </div>
            ) : (
              notifications.map(item => {
                const isCustomer = item.role === 'customer';
                const isAdmin = item.role === 'admin';
                const isRider = item.role === 'rider';

                const icon =
                  item.type === 'order_confirmed'
                    ? 'check_circle'
                    : item.type === 'rider_assigned'
                    ? 'two_wheeler'
                    : item.type === 'out_for_delivery'
                    ? 'rocket_launch'
                    : item.type === 'delivered'
                    ? 'verified'
                    : 'notifications';

                const roleColor = isCustomer
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : isAdmin
                  ? 'text-primary bg-primary/10'
                  : 'text-secondary bg-secondary/10';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className="p-3 hover:bg-surface-container-low transition-colors cursor-pointer flex items-start gap-2.5"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${roleColor}`}>
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[12px] text-on-surface truncate">{item.title}</span>
                        <span className="text-[10px] text-on-surface-variant shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2">
                        {item.message}
                      </p>
                      <div className="text-[10px] font-bold text-primary flex items-center gap-1 pt-0.5">
                        <span>
                          {isRider ? 'Open in Rider Terminal →' : isAdmin ? 'Review in Admin →' : 'Track Order →'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
