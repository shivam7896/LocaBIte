import React, { useState, useEffect, useRef } from 'react';
import { api, getSocket } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
  restaurantName?: string;
}

interface ActiveRiderOrder {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'placed' | 'confirmed' | 'prepared' | 'picked_up' | 'out_for_delivery' | 'delivered';
  placedAt: string;
  estimatedArrival: string;
  remainingMinutes: number;
  totalToPay: number;
  restaurantName?: string;
  items: OrderItem[];
  deliveryAddress: {
    title?: string;
    building: string;
    room: string;
    landmark?: string;
    phone: string;
    campus?: string;
  };
  deliveryInstructions?: string;
  otpOnArrival: string;
  driver?: any;
  merchantId?: string;
}

// Campus waypoints for route simulation: Burger Junction -> Boys Hostel Block C
const CAMPUS_ROUTE_POINTS = [
  { lat: 29.8543, lng: 77.888, label: 'Kitchen / Campus Food Court' },
  { lat: 29.8552, lng: 77.8892, label: 'Central Library Lawn' },
  { lat: 29.8561, lng: 77.8905, label: 'Academic Block A Roundabout' },
  { lat: 29.8573, lng: 77.8918, label: 'Sports Arena Gate 2' },
  { lat: 29.8586, lng: 77.8931, label: 'Hostel Quadrangle Crossway' },
  { lat: 29.8598, lng: 77.8945, label: 'Boys Hostel Block C Entrance' }
];

export const RiderDashboard: React.FC = () => {
  const { user, loginWithToken, logout } = useAuth();

  // Rider Auth States
  const [emailInput, setEmailInput] = useState<string>('vikram.rider@gmail.com');
  const [otpInput, setOtpInput] = useState<string>('789612');
  const [authStep, setAuthStep] = useState<'email' | 'otp'>('email');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Rider Terminal State
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [shiftStats, setShiftStats] = useState({
    completedDeliveriesToday: 6,
    todayEarnings: 270,
    rating: 4.9,
    batteryPercent: 88,
    vehicleNumber: 'UK-08-EV-4421',
    vehicleType: 'Zero Carbon Electric Moped'
  });

  // Orders State
  const [activeOrder, setActiveOrder] = useState<ActiveRiderOrder | null>(null);
  const [availableOrders, setAvailableOrders] = useState<ActiveRiderOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // OTP Verification for delivery completion
  const [deliveryOtpInput, setDeliveryOtpInput] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);

  // GPS & Live Location State (Hybrid)
  const [gpsMode, setGpsMode] = useState<'simulator' | 'device'>('simulator');
  const [currentCoordIndex, setCurrentCoordIndex] = useState<number>(0);
  const [simulatedCoord, setSimulatedCoord] = useState<{ lat: number; lng: number }>({
    lat: 29.8543,
    lng: 77.888
  });
  const [isAutoDriving, setIsAutoDriving] = useState<boolean>(false);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);

  const showToast = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorNotice(msg);
      setTimeout(() => setErrorNotice(null), 4000);
    } else {
      setActionNotice(msg);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const isRiderRole =
    user?.role === 'delivery_partner' ||
    user?.role === 'rider' ||
    user?.role === 'admin';

  // 1. Initial Load when user has rider role
  useEffect(() => {
    if (isRiderRole) {
      loadRiderData();
    }
  }, [user]);

  // 2. Connect to Socket.IO rooms for real-time dispatch updates
  useEffect(() => {
    if (!isRiderRole) return;

    const socket = getSocket();
    socket.emit('join_fleet_room');

    const handleNewOrder = (order: any) => {
      showToast(`⚡ New order #${order.orderNumber || order.id} broadcasted!`);
      setAvailableOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        return [order, ...prev];
      });
    };

    const handleOrderStatus = (updatedOrder: any) => {
      if (activeOrder && (activeOrder.id === updatedOrder.id || activeOrder.orderNumber === updatedOrder.orderNumber)) {
        if (updatedOrder.status === 'delivered' || updatedOrder.status === 'cancelled') {
          setActiveOrder(null);
          loadRiderData();
        } else {
          setActiveOrder(prev => (prev ? { ...prev, ...updatedOrder } : updatedOrder));
        }
      }
    };

    socket.on('new_order_available', handleNewOrder);
    socket.on('order_status_updated', handleOrderStatus);

    return () => {
      socket.off('new_order_available', handleNewOrder);
      socket.off('order_status_updated', handleOrderStatus);
    };
  }, [isRiderRole, activeOrder?.id]);

  // 3. Real Device Geolocation Watcher
  useEffect(() => {
    if (gpsMode === 'device' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        pos => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setSimulatedCoord(coords);
          broadcastLocation(coords.lat, coords.lng, pos.coords.speed || 22);
        },
        err => {
          console.warn('[Geolocation] Device GPS error, switching to Simulator:', err.message);
          setGpsMode('simulator');
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [gpsMode, activeOrder?.id]);

  // 4. Auto-Drive Simulator interval
  useEffect(() => {
    let interval: any = null;
    if (isAutoDriving && gpsMode === 'simulator') {
      interval = setInterval(() => {
        setCurrentCoordIndex(prev => {
          const next = (prev + 1) % CAMPUS_ROUTE_POINTS.length;
          const pt = CAMPUS_ROUTE_POINTS[next];
          setSimulatedCoord({ lat: pt.lat, lng: pt.lng });
          broadcastLocation(pt.lat, pt.lng, 25);
          return next;
        });
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoDriving, gpsMode, activeOrder?.id]);

  // Load Rider Profile & Orders
  const loadRiderData = async () => {
    setIsLoadingOrders(true);
    try {
      const [profileRes, ordersRes] = await Promise.all([
        api.rider.getProfile(),
        api.rider.getOrders()
      ]);

      if (profileRes.success && profileRes.data) {
        setRiderProfile(profileRes.data.profile);
        setIsOnline(profileRes.data.shift?.isOnline ?? true);
        if (profileRes.data.shift) {
          setShiftStats(prev => ({
            ...prev,
            ...profileRes.data.shift
          }));
        }
      }

      if (ordersRes.success && ordersRes.data) {
        setActiveOrder(ordersRes.data.activeOrder || null);
        setAvailableOrders(ordersRes.data.availableOrders || []);
        setCompletedOrders(ordersRes.data.completedOrders || []);
      }
    } catch (err: any) {
      console.error('Failed to load rider data:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Broadcast GPS coordinates
  const broadcastLocation = (lat: number, lng: number, speed = 24) => {
    const socket = getSocket();
    const payload = {
      orderId: activeOrder?.id,
      driverId: riderProfile?.id || 'driver-1',
      driverName: riderProfile?.name || user?.name || 'Vikram Singh',
      lat,
      lng,
      speed,
      heading: 45
    };

    // Emit via Socket.IO for instant zero-latency map rendering
    socket.emit('driver_location_broadcast', payload);

    // Also persist to API
    api.rider.updateLocation(payload).catch(() => {});
    setLastBroadcastTime(new Date().toLocaleTimeString());
  };

  // Handle Duty Toggle
  const handleToggleDuty = async () => {
    try {
      const next = !isOnline;
      setIsOnline(next);
      const res = await api.rider.toggleAvailability(next);
      if (res.success) {
        showToast(res.message);
      }
    } catch {
      setIsOnline(!isOnline);
    }
  };

  // Check Email during Login
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const res = await api.rider.checkEmail(emailInput);
      if (res.success && res.data) {
        if (!res.data.exists) {
          setAuthError(
            'No account found with this email. Please request an Administrator in the Admin Panel to create/assign your rider account.'
          );
        } else if (!res.data.isRider) {
          setAuthError(
            `Access Denied: This account is currently registered with role '${res.data.role}'. The Super Admin must change your role to 'Rider' in the Admin Dashboard Users tab.`
          );
        } else {
          setAuthSuccess(`Welcome ${res.data.name}! We've issued a 6-digit verification code.`);
          setAuthStep('otp');
          // Request OTP via backend auth service
          api.auth.sendOtp(emailInput).catch(() => {});
        }
      } else {
        setAuthError(res.message || 'Failed to verify email credentials.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Network error verifying email.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Submit OTP to Login as Rider
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await api.auth.verifyOtp(emailInput, otpInput);
      if (res.success && res.data) {
        loginWithToken(res.data.accessToken, res.data.user);
        showToast(`Rider Terminal authorized. Welcome, ${res.data.user.name}!`);
      } else {
        setAuthError(res.message || 'Invalid verification OTP code.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to verify OTP code.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Quick 1-Click Demo Login as Vikram Singh (Rider) with personal email
  const handleQuickDemoLogin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setEmailInput('vikram.rider@gmail.com');
    setOtpInput('789612');

    try {
      const res = await api.auth.verifyOtp('vikram.rider@gmail.com', '789612');
      if (res.success && res.data) {
        loginWithToken(res.data.accessToken, res.data.user);
        showToast(`⚡ Authorized as Vikram Singh (Fleet Partner)!`);
      } else {
        // Fallback demo login
        const demoRes = await api.auth.demoLogin();
        if (demoRes.success && demoRes.data) {
          loginWithToken(demoRes.data.accessToken, { ...demoRes.data.user, role: 'delivery_partner' });
          showToast(`⚡ Demo rider terminal loaded!`);
        }
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Accept Order
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const res = await api.rider.acceptOrder(orderId);
      if (res.success && res.data) {
        setActiveOrder(res.data);
        setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
        showToast(`Order #${res.data.orderNumber} accepted! Routing initiated.`);
        // Start simulation from waypoint 0
        setCurrentCoordIndex(0);
        const pt = CAMPUS_ROUTE_POINTS[0];
        setSimulatedCoord({ lat: pt.lat, lng: pt.lng });
        broadcastLocation(pt.lat, pt.lng, 20);
      } else {
        showToast(res.message || 'Could not accept order', true);
      }
    } catch (err: any) {
      showToast(err.message || 'Error accepting order', true);
    }
  };

  // Decline Order
  const handleRejectOrder = async (orderId: string) => {
    try {
      await api.rider.rejectOrder(orderId);
      setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
      showToast(`Order #${orderId} dismissed from queue.`);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Advance Order Status (picked_up, out_for_delivery, delivered)
  const handleAdvanceStatus = async (status: string) => {
    if (!activeOrder) return;
    try {
      const res = await api.rider.updateOrderStatus(activeOrder.id, status);
      if (res.success && res.data) {
        setActiveOrder(res.data);
        showToast(`Status updated to ${status.replace('_', ' ').toUpperCase()}!`);
      } else {
        showToast(res.message || 'Failed to update order status', true);
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status', true);
    }
  };

  // Complete Delivery with OTP
  const handleCompleteDeliveryWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    setIsVerifyingOtp(true);
    try {
      const res = await api.rider.updateOrderStatus(
        activeOrder.id,
        'delivered',
        deliveryOtpInput.trim(),
        'Handed over to student at hostel door'
      );

      if (res.success) {
        showToast(`🎉 Order #${activeOrder.orderNumber} successfully delivered! +₹45 added.`);
        setActiveOrder(null);
        setDeliveryOtpInput('');
        loadRiderData();
      } else {
        showToast(res.message || 'Invalid delivery OTP code', true);
      }
    } catch (err: any) {
      showToast(err.message || 'Verification failed', true);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ================= RENDER: AUTHENTICATION SCREEN =================
  if (!isRiderRole) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-surface py-12">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-level-3 flex flex-col gap-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary mx-auto flex items-center justify-center border border-secondary/20 shadow-xs">
              <span className="material-symbols-outlined text-[36px]">electric_moped</span>
            </div>
            <h1 className="font-headline-sm text-2xl font-black text-on-surface">
              LocaBite Rider Terminal
            </h1>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
              Campus Express Delivery Fleet Portal. Accept live orders, broadcast GPS coordinates, and complete student deliveries.
            </p>
          </div>

          {/* Quick 1-Click Launch Button */}
          <div className="p-3.5 rounded-2xl bg-secondary/10 border border-secondary/20 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Fast Fleet Testing</span>
              </span>
              <span className="text-[11px] font-bold text-on-surface-variant">vikram.rider@gmail.com</span>
            </div>
            <button
              onClick={handleQuickDemoLogin}
              disabled={isAuthenticating}
              className="w-full py-2.5 px-4 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>1-Click Launch as Vikram Singh (vikram.rider@gmail.com)</span>
            </button>
          </div>

          {/* Personal Email Clarification Notice */}
          <div className="p-3 rounded-2xl bg-surface-container border border-outline-variant/30 flex items-start gap-2 text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary shrink-0">info</span>
            <div>
              <strong className="text-on-surface block">Personal Email Authentication:</strong>
              No @locabite domain needed. Riders use their personal email. The Admin sets your role to <span className="font-bold text-secondary">Delivery Rider</span> in the Admin Dashboard to grant access.
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-outline-variant/30" />
            <span className="text-[11px] font-bold text-on-surface-variant uppercase">
              Or Login with Personal Email
            </span>
            <div className="h-px flex-1 bg-outline-variant/30" />
          </div>

          {/* Alerts */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{authError}</span>
              </div>
              <div className="pt-1 border-t border-red-500/20 flex items-center justify-between">
                <span className="text-[11px] text-on-surface-variant">Need to set user role?</span>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline text-[11px]"
                >
                  <span>Go to Admin Dashboard</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                </Link>
              </div>
            </div>
          )}

          {authSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
              <span>{authSuccess}</span>
            </div>
          )}

          {/* Step 1: Email Form */}
          {authStep === 'email' ? (
            <form onSubmit={handleVerifyEmail} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="font-bold uppercase text-[10px] text-on-surface-variant">
                  Rider Personal Email * (Gmail, Outlook, etc.)
                </label>
                <div className="relative mt-1">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="e.g. vikram.rider@gmail.com or your personal email"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1.5">
                  The Admin must assign the <strong>Delivery Rider</strong> role to this personal email in the Admin Dashboard (Users tab).
                </p>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-xs hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isAuthenticating ? (
                  <span className="animate-spin material-symbols-outlined text-[16px]">sync</span>
                ) : (
                  <>
                    <span>Verify Rider Credentials</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Step 2: OTP Verification Form */
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 text-xs">
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-bold uppercase text-[10px] text-on-surface-variant">
                    6-Digit OTP Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthStep('email')}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  placeholder="Enter 6-digit OTP code"
                  className="w-full mt-1 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-mono text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  autoFocus
                />
                <span className="text-[10px] text-on-surface-variant mt-1 block text-center">
                  Dev bypass codes: <code>789612</code> or <code>123456</code>
                </span>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-2.5 rounded-xl bg-secondary text-on-secondary font-bold text-xs shadow-xs hover:bg-secondary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isAuthenticating ? (
                  <span className="animate-spin material-symbols-outlined text-[16px]">sync</span>
                ) : (
                  <>
                    <span>Log in to Rider Terminal</span>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Admin Role Reminder Notice */}
          <div className="pt-3 border-t border-outline-variant/20 text-center">
            <span className="text-[11px] text-on-surface-variant">
              Are you an Admin looking to assign riders?{' '}
              <Link to="/admin" className="text-primary font-bold hover:underline">
                Go to Admin Dashboard
              </Link>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER: ACTIVE RIDER TERMINAL =================
  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Rider Top Navigation HUD */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/20 shadow-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Rider Profile Pill */}
          <div className="flex items-center gap-3">
            <img
              src={
                riderProfile?.avatar ||
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg'
              }
              alt="Rider Avatar"
              className="w-10 h-10 rounded-full object-cover border border-secondary/40 shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-on-surface">
                  {riderProfile?.name || user?.name || 'Vikram Singh'}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20">
                  {shiftStats.vehicleNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-medium">
                <span className="text-amber-500 font-bold">★ {shiftStats.rating}</span>
                <span>•</span>
                <span>{shiftStats.completedDeliveriesToday} drops today</span>
                <span>•</span>
                <span className="text-secondary font-bold">₹{shiftStats.todayEarnings} earned</span>
              </div>
            </div>
          </div>

          {/* Duty Switch & GPS Broadcaster Status */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* GPS Pulse Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[11px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-on-surface">GPS Live</span>
              {lastBroadcastTime && (
                <span className="text-[10px] text-on-surface-variant font-normal">
                  ({lastBroadcastTime.slice(0, 5)})
                </span>
              )}
            </div>

            {/* Online / Offline Toggle Button */}
            <button
              onClick={handleToggleDuty}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer ${
                isOnline
                  ? 'bg-secondary text-on-secondary shadow-secondary/20'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isOnline ? 'toggle_on' : 'toggle_off'}
              </span>
              <span>{isOnline ? 'ONLINE & ACTIVE' : 'OFFLINE'}</span>
            </button>

            {/* Switch Account / Logout */}
            <button
              onClick={() => logout()}
              title="Logout from Rider terminal"
              className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-red-500"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Action Notifications */}
      {actionNotice && (
        <div className="fixed top-20 right-4 z-50 bg-secondary text-on-secondary px-4 py-2.5 rounded-2xl shadow-level-3 font-bold text-xs flex items-center gap-2 animate-in slide-in-from-top">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{actionNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="fixed top-20 right-4 z-50 bg-red-600 text-white px-4 py-2.5 rounded-2xl shadow-level-3 font-bold text-xs flex items-center gap-2 animate-in slide-in-from-top">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Main Terminal Grid */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ================= 1. ACTIVE MISSION HUD (IF ON ACTIVE ORDER) ================= */}
        {activeOrder ? (
          <section className="bg-surface-container-lowest rounded-3xl p-5 sm:p-7 border-2 border-primary/30 shadow-level-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span>Active Mission in Progress</span>
                </div>
                <h2 className="font-headline-sm text-xl font-black text-on-surface flex items-center gap-2">
                  <span>Order #{activeOrder.orderNumber}</span>
                  <span className="text-primary font-bold text-sm">• ₹{activeOrder.totalToPay}</span>
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Placed at {activeOrder.placedAt} • Estimated arrival: <strong>{activeOrder.estimatedArrival}</strong>
                </p>
              </div>

              {/* Step Progress Pill */}
              <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant/30 text-xs font-bold">
                <span className="text-on-surface-variant uppercase text-[10px]">Current Stage:</span>
                <span className="px-2 py-0.5 rounded-lg bg-primary text-on-primary font-black uppercase text-[11px]">
                  {activeOrder.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Mission Details Cards: Store & Customer Drop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Point */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                    <span className="material-symbols-outlined text-[18px]">storefront</span>
                    <span>1. Store Pickup Point</span>
                  </div>
                  <h3 className="font-bold text-sm text-on-surface">{activeOrder.items?.[0]?.restaurantName || 'Campus Eatery'}</h3>
                  <p className="text-xs text-on-surface-variant">
                    Central Quadrangle Kitchen Block, Ground Floor
                  </p>
                  <div className="text-[11px] font-medium text-on-surface-variant pt-1">
                    Items: {activeOrder.items?.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                  </div>
                </div>

                {activeOrder.status === 'confirmed' || activeOrder.status === 'prepared' ? (
                  <button
                    onClick={() => handleAdvanceStatus('picked_up')}
                    className="w-full py-2.5 rounded-xl bg-secondary text-on-secondary font-bold text-xs shadow-xs hover:bg-secondary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                    <span>Confirm Items Picked Up from Store</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Items Collected from Store</span>
                  </span>
                )}
              </div>

              {/* Destination Drop */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    <span>2. Student Delivery Destination</span>
                  </div>
                  <h3 className="font-bold text-sm text-on-surface">
                    {activeOrder.deliveryAddress?.building}, Room {activeOrder.deliveryAddress?.room}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {activeOrder.deliveryAddress?.campus || 'Quantum University'} • {activeOrder.deliveryAddress?.landmark || 'Hostel Lawn'}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <a
                      href={`tel:${activeOrder.deliveryAddress?.phone}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      <span>Call Student ({activeOrder.deliveryAddress?.phone})</span>
                    </a>
                  </div>
                  {activeOrder.deliveryInstructions && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                      <strong>Note:</strong> {activeOrder.deliveryInstructions}
                    </div>
                  )}
                </div>

                {activeOrder.status === 'picked_up' && (
                  <button
                    onClick={() => handleAdvanceStatus('out_for_delivery')}
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-xs hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">two_wheeler</span>
                    <span>Start Navigation (Out for Delivery)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Handover & OTP Verification (When Out for Delivery or at Door) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                    <span>3. Delivery Handover & Customer OTP Verification</span>
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Ask the customer for the 4-digit arrival OTP shown on their screen to release and mark order delivered.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  (Demo fallback OTP: <code>{activeOrder.otpOnArrival}</code> or <code>1234</code>)
                </span>
              </div>

              <form onSubmit={handleCompleteDeliveryWithOtp} className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={deliveryOtpInput}
                  onChange={e => setDeliveryOtpInput(e.target.value)}
                  placeholder="Enter 4-Digit OTP"
                  className="px-4 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 font-mono text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40 w-44"
                />
                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isVerifyingOtp ? (
                    <span className="animate-spin material-symbols-outlined text-[16px]">sync</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      <span>Verify OTP & Complete Delivery</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Live GPS Broadcaster HUD & Interactive Campus Route Simulator */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">explore</span>
                  <span className="font-bold text-xs text-on-surface">
                    Live GPS Broadcaster (Hybrid Tracking)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setGpsMode('simulator')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                      gpsMode === 'simulator'
                        ? 'bg-secondary text-on-secondary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    Campus Simulator
                  </button>
                  <button
                    onClick={() => setGpsMode('device')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                      gpsMode === 'device'
                        ? 'bg-secondary text-on-secondary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    Real Device GPS
                  </button>
                </div>
              </div>

              {/* Waypoint Scrubber */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
                  <span>Current Waypoint: <strong>{CAMPUS_ROUTE_POINTS[currentCoordIndex]?.label}</strong></span>
                  <span>Lat: {simulatedCoord.lat.toFixed(4)}, Lng: {simulatedCoord.lng.toFixed(4)}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={CAMPUS_ROUTE_POINTS.length - 1}
                  value={currentCoordIndex}
                  onChange={e => {
                    const idx = Number(e.target.value);
                    setCurrentCoordIndex(idx);
                    const pt = CAMPUS_ROUTE_POINTS[idx];
                    setSimulatedCoord({ lat: pt.lat, lng: pt.lng });
                    broadcastLocation(pt.lat, pt.lng, 25);
                  }}
                  className="w-full accent-secondary cursor-pointer"
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsAutoDriving(!isAutoDriving)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isAutoDriving
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                        : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isAutoDriving ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isAutoDriving ? 'Pause Auto-Drive' : '▶ Play Auto-Drive Simulation'}</span>
                  </button>

                  <span className="text-[11px] text-on-surface-variant font-medium">
                    Broadcasted in real time to Customer & Admin screens
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ================= 2. LIVE INCOMING DISPATCH STREAM ================= */}
        <section className="bg-surface-container-lowest rounded-3xl p-5 sm:p-7 border border-outline-variant/30 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
            <div>
              <h2 className="font-headline-sm text-lg font-black text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">radar</span>
                <span>Incoming Campus Dispatch Queue ({availableOrders.length})</span>
              </h2>
              <p className="text-xs text-on-surface-variant">
                Live broadcasted orders waiting for rider acceptance on Quantum campus
              </p>
            </div>
            <button
              onClick={loadRiderData}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface border border-outline-variant/30 self-start sm:self-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Refresh Queue</span>
            </button>
          </div>

          {availableOrders.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[24px]">done_all</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface">Queue is currently clear!</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                Keep your duty switch <strong>ONLINE</strong>. When students place food or grocery orders, incoming tasks will chime here in real-time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableOrders.map(order => (
                <div
                  key={order.id}
                  className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-4 hover:border-secondary/50 transition-all"
                >
                  <div className="space-y-2.5">
                    {/* Header: Order # & Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">
                          #{order.orderNumber || order.id}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">• {order.placedAt}</span>
                      </div>
                      <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-secondary/10 text-secondary">
                        Payout: +₹45
                      </span>
                    </div>

                    {/* Route Info */}
                    <div className="space-y-1.5 text-xs text-on-surface-variant">
                      <div className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-secondary text-[16px] shrink-0 mt-0.5">
                          storefront
                        </span>
                        <span>Pickup: <strong>{order.items?.[0]?.restaurantName || 'Campus Merchant'}</strong></span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">
                          location_on
                        </span>
                        <span>
                          Drop: <strong>{order.deliveryAddress?.building}, Room {order.deliveryAddress?.room}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/20">
                      Items: {order.items?.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                    </div>
                  </div>

                  {/* Accept / Decline Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20">
                    <button
                      onClick={() => handleRejectOrder(order.id)}
                      className="flex-1 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface-variant transition-all cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      className="flex-2 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-xs shadow-xs hover:bg-secondary/90 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Accept Delivery</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================= 3. RECENT COMPLETED DELIVERIES ================= */}
        {completedOrders.length > 0 && (
          <section className="bg-surface-container-lowest rounded-3xl p-5 sm:p-7 border border-outline-variant/30 shadow-xs space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
              <span>Completed Deliveries ({completedOrders.length})</span>
            </h3>

            <div className="divide-y divide-outline-variant/20 text-xs">
              {completedOrders.map((ord: any) => (
                <div key={ord.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface">#{ord.orderNumber}</span>
                      <span className="text-[11px] text-on-surface-variant">• {ord.deliveryAddress?.building}</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Delivered • Payout ₹45 credited
                    </span>
                  </div>
                  <span className="font-price-numeral font-bold text-on-surface">
                    ₹{ord.totalToPay}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
