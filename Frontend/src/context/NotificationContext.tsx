import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSocket } from '../services/api';
import { useAuth } from './AuthContext';

export interface WebsiteNotification {
  id: string;
  role: 'customer' | 'admin' | 'rider' | 'all';
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  totalToPay?: number;
  customerName?: string;
  driverName?: string;
  address?: string;
  type: 'order_confirmed' | 'new_order' | 'rider_assigned' | 'out_for_delivery' | 'delivered';
  timestamp: string;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: WebsiteNotification[];
  toasts: WebsiteNotification[];
  unreadCount: number;
  isAudioEnabled: boolean;
  permissionStatus: NotificationPermission;
  toggleAudio: () => void;
  requestDesktopPermission: () => Promise<boolean>;
  markAllAsRead: () => void;
  dismissToast: (id: string) => void;
  clearAllNotifications: () => void;
  sendTestNotification: (targetRole: 'customer' | 'admin' | 'rider') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Web Audio API Synthesizer for pleasant, dependency-free audio alerts
const playAudioAlert = (toneType: WebsiteNotification['type']) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (toneType === 'order_confirmed') {
      // Cheerful 3-tone arpeggio: C5 -> E5 -> G5
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);
        gain.gain.setValueAtTime(0.22, now + idx * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.36);
      });
    } else if (toneType === 'new_order') {
      // Restaurant order chime: double ping 880Hz -> 1046Hz
      const now = ctx.currentTime;
      [880, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.28, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.39);
      });
    } else if (toneType === 'delivered') {
      // Celebration fanfare: 659Hz -> 784Hz -> 1046Hz
      const now = ctx.currentTime;
      [659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.25, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.31);
      });
    } else {
      // 2-tone dispatch ping: 587Hz -> 880Hz
      const now = ctx.currentTime;
      [587.33, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.29);
      });
    }
  } catch (err) {
    console.debug('[Audio Alert] AudioContext muted or pending user interaction:', err);
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<WebsiteNotification[]>(() => {
    try {
      const stored = localStorage.getItem('locabite_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<WebsiteNotification[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    return localStorage.getItem('locabite_audio_alerts') !== 'false';
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('locabite_notifications', JSON.stringify(notifications.slice(0, 50)));
    } catch {}
  }, [notifications]);

  // Request native OS desktop notifications
  const requestDesktopPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);
      if (result === 'granted') {
        new Notification('LocaBite Notifications Enabled! 🔔', {
          body: 'You will receive real-time order confirmation, admin order alerts, and rider dispatch updates.'
        });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Desktop notification permission request error:', err);
      return false;
    }
  };

  const toggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    localStorage.setItem('locabite_audio_alerts', String(next));
    if (next) {
      playAudioAlert('order_confirmed');
    }
  };

  // Dispatch incoming notification (plays audio, triggers desktop alert, queues in-app toast)
  const dispatchNotification = useCallback(
    (raw: Partial<WebsiteNotification>) => {
      const item: WebsiteNotification = {
        id: raw.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: raw.role || 'all',
        title: raw.title || 'LocaBite Notification',
        message: raw.message || 'You have an order update',
        orderId: raw.orderId,
        orderNumber: raw.orderNumber,
        totalToPay: raw.totalToPay,
        customerName: raw.customerName,
        driverName: raw.driverName,
        address: raw.address,
        type: raw.type || 'order_confirmed',
        timestamp: raw.timestamp || new Date().toISOString(),
        isRead: false
      };

      // 1. Add to in-app notification center history
      setNotifications(prev => [item, ...prev.filter(n => n.id !== item.id)].slice(0, 50));

      // 2. Add to active floating banner toast queue
      setToasts(prev => [item, ...prev.slice(0, 3)]);

      // Auto-dismiss toast after 7.5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== item.id));
      }, 7500);

      // 3. Play audio chime if enabled
      if (isAudioEnabled) {
        playAudioAlert(item.type);
      }

      // 4. Native Browser Desktop Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(item.title, {
            body: item.message,
            tag: item.orderId || item.id
          });
        } catch (e) {
          console.debug('Browser native notification error:', e);
        }
      }
    },
    [isAudioEnabled]
  );

  // Subscribe to real-time WebSockets
  useEffect(() => {
    const socket = getSocket();

    const handleNotification = (notif: WebsiteNotification) => {
      // Filter out notifications not meant for this user's role
      if (notif.role && notif.role !== 'all' && notif.role !== user?.role) {
        return;
      }
      dispatchNotification(notif);
    };

    // Generic order notification
    socket.on('order_notification', handleNotification);

    // Role-specific channels
    if (user?.role === 'customer') {
      socket.on('customer_order_notification', handleNotification);
    } else if (user?.role === 'admin') {
      socket.on('admin_new_order_notification', handleNotification);
    } else if (user?.role === 'rider') {
      socket.on('rider_dispatch_notification', handleNotification);
    }

    return () => {
      socket.off('order_notification', handleNotification);
      socket.off('customer_order_notification', handleNotification);
      socket.off('admin_new_order_notification', handleNotification);
      socket.off('rider_dispatch_notification', handleNotification);
    };
  }, [dispatchNotification, user?.role]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setToasts([]);
  };

  // 1-Click Simulation Tool to test Customer, Admin, or Rider notification directly in browser
  const sendTestNotification = (targetRole: 'customer' | 'admin' | 'rider') => {
    const orderNum = Math.floor(100000 + Math.random() * 900000);
    const total = 249;

    if (targetRole === 'customer') {
      dispatchNotification({
        role: 'customer',
        type: 'order_confirmed',
        title: 'Your Order is Confirmed! 🎉',
        message: `Order #${orderNum} (₹${total}) has been confirmed and received by the kitchen. Preparing your fresh items!`,
        orderId: `ord-${orderNum}`,
        orderNumber: String(orderNum),
        totalToPay: total,
        address: 'Boys Hostel Block C'
      });
    } else if (targetRole === 'admin') {
      dispatchNotification({
        role: 'admin',
        type: 'new_order',
        title: '🔔 New Order Received!',
        message: `Order #${orderNum} for ₹${total} received from Sarojini Bhawan, Room 204.`,
        orderId: `ord-${orderNum}`,
        orderNumber: String(orderNum),
        totalToPay: total,
        customerName: 'Aarav Sharma',
        address: 'Sarojini Bhawan, Room 204'
      });
    } else if (targetRole === 'rider') {
      dispatchNotification({
        role: 'rider',
        type: 'new_order',
        title: '⚡ New Delivery Available!',
        message: `Order #${orderNum} • ₹${total} to Boys Hostel Block C. Tap to accept delivery mission.`,
        orderId: `ord-${orderNum}`,
        orderNumber: String(orderNum),
        totalToPay: total,
        address: 'Boys Hostel Block C'
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        unreadCount,
        isAudioEnabled,
        permissionStatus,
        toggleAudio,
        requestDesktopPermission,
        markAllAsRead,
        dismissToast,
        clearAllNotifications,
        sendTestNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
