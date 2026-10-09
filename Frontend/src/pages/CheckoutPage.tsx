import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { useOrder } from '../context/OrderContext';
import { VegBadge } from '../components/VegBadge';
import { QuantityStepper } from '../components/QuantityStepper';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LocationModal } from '../components/LocationModal';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    updateQuantity,
    removeItem,
    itemTotal,
    deliveryFee,
    taxesAndHandling,
    driverTip,
    setDriverTip,
    appliedPromo,
    discount,
    availableCoupons,
    applyPromo,
    removePromo,
    totalToPay,
    totalItemsCount,
    selectedAddress,
    deliveryInstruction,
    setDeliveryInstruction,
    clearCart
  } = useCart();

  const { placeOrder, cancelOrder } = useOrder();

  const [couponInput, setCouponInput] = useState<string>('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const { isLoggedIn, loginAsDemo } = useAuth();

  const deliveryInstructionsList = [
    { id: 'Leave at door', label: 'Leave at door', icon: 'door_front' },
    { id: 'Avoid calling', label: 'Avoid calling', icon: 'volume_off' },
    { id: 'Ring bell', label: 'Ring bell', icon: 'notifications' },
    { id: 'Hand to guard', label: 'Hand to guard', icon: 'security' }
  ];

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = codeToApply || couponInput;
    if (!code.trim()) return;

    const res = applyPromo(code);
    setCouponMsg({ text: res.message, isError: !res.success });
    if (res.success) setCouponInput('');
  };

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const finalizeOrder = (targetId: string) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    clearCart();
    setIsPlacingOrder(false);
    navigate(`/tracking?id=${targetId}`);
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    if (!isLoggedIn) {
      navigate('/auth?redirect=/checkout');
      return;
    }

    if (!selectedAddress || selectedAddress.id === 'addr-default' || selectedAddress.building === 'No location selected') {
      alert('Please select or add a delivery address before placing your order.');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const order = await placeOrder(
        items,
        totalToPay,
        itemTotal,
        deliveryFee,
        taxesAndHandling,
        discount,
        appliedPromo,
        selectedAddress,
        deliveryInstruction,
        paymentMethod === 'upi' ? 'UPI (Google Pay / PhonePe)' : paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cash on Delivery'
      );

      const targetId = order?.id || order?.orderNumber || 'LB-LIVE';

      // If online payment (UPI or Card), attempt Razorpay checkout if script & key are available
      if (paymentMethod === 'upi' || paymentMethod === 'card') {
        try {
          const scriptLoaded = await loadRazorpayScript();
          if (scriptLoaded && (window as any).Razorpay) {
            const rzpRes = await api.payments.createRazorpayOrder(targetId);
            if (rzpRes.success && rzpRes.data?.keyId && !rzpRes.data.keyId.includes('placeholder')) {
              const options = {
                key: rzpRes.data.keyId,
                amount: rzpRes.data.amount,
                currency: rzpRes.data.currency || 'INR',
                name: 'LocaBite Campus Express',
                description: `Order #${targetId}`,
                order_id: rzpRes.data.razorpayOrderId,
                handler: async (response: any) => {
                  try {
                    const verifyRes = await api.payments.verifyPayment({
                      orderId: targetId,
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature
                    });
                    
                    if (verifyRes && verifyRes.success) {
                      finalizeOrder(targetId);
                    } else {
                      setIsPlacingOrder(false);
                      alert(verifyRes?.message || 'Payment verification failed. Please contact support.');
                    }
                  } catch (err: any) {
                    setIsPlacingOrder(false);
                    alert(err.message || 'An error occurred during payment verification.');
                  }
                },
                prefill: {
                  name: selectedAddress.building || 'Campus Student',
                  contact: selectedAddress.phone || '+919876543210'
                },
                theme: { color: '#ae2a00' },
                modal: {
                  ondismiss: async () => {
                    setIsPlacingOrder(false);
                    await cancelOrder('Payment cancelled by user');
                    alert('Payment was cancelled. You can try placing the order again.');
                  }
                }
              };
              const rzp = new (window as any).Razorpay(options);
              rzp.open();
              return;
            }
          }
        } catch (payErr) {
          console.error('Razorpay checkout initialization error:', payErr);
          setIsPlacingOrder(false);
          alert('Failed to initialize payment gateway. Please try Cash on Delivery or contact support.');
          return;
        }
      }

      // Finalize only for COD
      if (paymentMethod === 'Cash on Delivery') {
        finalizeOrder(targetId);
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      setIsPlacingOrder(false);
      if (err.message?.includes('Authentication') || err.message?.includes('log in') || err.message?.includes('token')) {
        navigate('/auth?redirect=/checkout');
      } else {
        alert(err.message || 'Could not place order. Please try again.');
      }
    }
  };

  if (items.length === 0) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center text-primary mb-4">
          <span className="material-symbols-outlined text-[40px]">shopping_basket</span>
        </div>
        <h2 className="font-headline-md text-2xl font-bold text-on-surface">Your Tray is Empty</h2>
        <p className="font-body-md text-on-surface-variant max-w-sm mt-1 mb-6">
          Looks like you haven't added any campus food or groceries to your basket yet.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-on-primary font-label-lg font-bold px-6 py-3 rounded-full shadow-level-1 active:scale-95 transition-all"
        >
          Explore Campus Outlets
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface pb-28 lg:pb-16 pt-4 sm:pt-6">
      <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-10">
        {/* Breadcrumb Progress Stepper */}
        <nav aria-label="Checkout Progress" className="w-full bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm mb-6 border border-outline-variant/20">
          <div className="flex items-center justify-between relative max-w-2xl mx-auto">
            {/* Connecting Bar */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-surface-container rounded-full -z-0" />
            <div className="absolute left-6 w-1/2 top-1/2 -translate-y-1/2 h-1 bg-secondary rounded-full -z-0 transition-all duration-300" />

            {/* Step 1: Cart Items */}
            <div className="flex flex-col items-center gap-1 relative z-10">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">check</span>
              </div>
              <span className="font-label-sm text-[11px] sm:text-label-md text-secondary font-bold">
                1. Cart
              </span>
            </div>

            {/* Step 2: Address */}
            <div className="flex flex-col items-center gap-1 relative z-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md animate-pulse">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">location_on</span>
              </div>
              <span className="font-label-sm text-[11px] sm:text-label-md text-primary font-bold">
                2. Address
              </span>
            </div>

            {/* Step 3: Payment */}
            <div className="flex flex-col items-center gap-1 relative z-10">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">credit_card</span>
              </div>
              <span className="font-label-sm text-[11px] sm:text-label-md text-on-surface-variant font-medium">
                3. Payment
              </span>
            </div>

            {/* Step 4: Tracking */}
            <div className="flex flex-col items-center gap-1 relative z-10">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">moped</span>
              </div>
              <span className="font-label-sm text-[11px] sm:text-label-md text-on-surface-variant font-medium">
                4. Live ETA
              </span>
            </div>
          </div>
        </nav>

        {/* 2-Column Checkout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Address, Instructions, Items, Payment (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* If NOT logged in: Prominent Authentication Gate Banner */}
            {!isLoggedIn && (
              <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border-2 border-primary/40 shadow-level-2 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <span className="material-symbols-outlined text-[26px]">lock</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[16px] text-on-surface">
                        Sign In Required to Order
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-black uppercase">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-[12px] sm:text-[13px] text-on-surface-variant leading-relaxed">
                      You must be signed in with your campus account to dispatch your delivery, track your rider live on campus map, and receive your receipt.
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/auth?redirect=/checkout')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-[#d63d10] text-on-primary font-bold text-[13px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Sign In to Continue</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await loginAsDemo();
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer text-center sm:text-right"
                  >
                    Quick Student Demo Login
                  </button>
                </div>
              </div>
            )}

            {/* Section 1: Delivery Address */}
            <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-level-1 border border-outline-variant/20">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Delivery Address
                  </h2>
                </div>
                <span className="text-secondary font-label-sm text-[11px] font-bold bg-secondary-container/50 px-2 py-0.5 rounded-full">
                  12-15 min drop
                </span>
              </div>

              {/* Selected Address Card */}
              <div className="bg-surface-container-low p-4 rounded-xl relative overflow-hidden border border-secondary/20 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-[24px] mt-0.5">
                    home_pin
                  </span>
                  <div className="flex flex-col gap-1 pr-6">
                    <div className="flex items-center gap-2">
                      <span className="font-headline-sm text-[15px] font-bold text-on-surface">
                        {selectedAddress.title}
                      </span>
                      <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full text-[10px] font-semibold">
                        Primary
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                      {selectedAddress.campus}, {selectedAddress.building}, {selectedAddress.room}
                    </p>
                    <div className="flex items-center gap-2 text-on-surface-variant text-[12px] mt-1">
                      <span className="material-symbols-outlined text-[15px]">call</span>
                      <span>{selectedAddress.phone}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="shrink-0 text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  <span className="hidden sm:inline">Edit</span>
                </button>
              </div>

              {/* Rider Delivery Instructions */}
              <div className="mt-5">
                <span className="block font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-bold mb-2">
                  Delivery Instructions for Rider
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {deliveryInstructionsList.map(inst => {
                    const isSelected = deliveryInstruction === inst.id;
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => setDeliveryInstruction(inst.id)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-center transition-all ${
                          isSelected
                            ? 'bg-primary/10 text-primary border border-primary/40 shadow-xs font-bold'
                            : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{inst.icon}</span>
                        <span className="text-[11px] font-medium leading-tight">{inst.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 2: Order Items in Basket */}
            <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-level-1 border border-outline-variant/20">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    restaurant_menu
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Items in Basket ({totalItemsCount})
                  </h3>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-outline-variant/20">
                {items.map(item => (
                  <div key={item.cartItemId} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-outline-variant/20"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          {item.dietary && <VegBadge type={item.dietary} size="sm" />}
                          <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                            {item.name}
                          </span>
                        </div>
                        {item.customizations?.size && (
                          <span className="text-[11px] text-on-surface-variant">
                            Size: {item.customizations.size.name}
                          </span>
                        )}
                        {item.customizations?.addons && item.customizations.addons.length > 0 && (
                          <span className="text-[11px] text-on-surface-variant truncate">
                            Add-ons: {item.customizations.addons.map(a => a.name).join(', ')}
                          </span>
                        )}
                        {item.unitWeight && (
                          <span className="text-[11px] text-secondary font-medium">
                            {item.unitWeight}
                          </span>
                        )}
                        <span className="font-price-numeral text-[13px] font-extrabold text-on-surface mt-0.5">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <QuantityStepper
                        quantity={item.quantity}
                        size="sm"
                        onAdd={() => {}}
                        onIncrement={() => updateQuantity(item.cartItemId, 1)}
                        onDecrement={() => updateQuantity(item.cartItemId, -1)}
                      />
                      <button
                        onClick={() => removeItem(item.cartItemId)}
                        className="text-on-surface-variant hover:text-error transition-colors p-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Driver Tip */}
            <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-level-1 border border-outline-variant/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">
                    volunteer_activism
                  </span>
                  <div>
                    <h3 className="font-headline-sm text-[15px] font-bold text-on-surface">
                      Tip Your Campus Rider
                    </h3>
                    <p className="text-[12px] text-on-surface-variant">
                      100% of this tip goes directly to your student delivery partner.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[0, 20, 30, 50].map(tipAmount => (
                  <button
                    key={tipAmount}
                    type="button"
                    onClick={() => setDriverTip(tipAmount)}
                    className={`py-2 px-3 rounded-xl text-[13px] font-bold transition-all ${
                      driverTip === tipAmount
                        ? 'bg-secondary text-on-secondary shadow-xs'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    {tipAmount === 0 ? 'Not now' : `₹${tipAmount}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 4: Payment Method */}
            <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-level-1 border border-outline-variant/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  account_balance_wallet
                </span>
                <h3 className="font-headline-sm text-[15px] font-bold text-on-surface">
                  Payment Method
                </h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'upi',
                    name: 'Instant UPI (Google Pay, PhonePe, Paytm)',
                    sub: 'Zero processing fee • Instant verification',
                    icon: 'account_balance'
                  },
                  {
                    id: 'card',
                    name: 'Credit or Debit Card',
                    sub: 'Visa, Mastercard, RuPay',
                    icon: 'credit_card'
                  },
                  {
                    id: 'cod',
                    name: 'Cash on Delivery (Hostel Gate)',
                    sub: 'Pay cash or scan QR with rider on arrival',
                    icon: 'payments'
                  }
                ].map(method => {
                  const isSelected = paymentMethod === method.id;
                  return (
                    <label
                      key={method.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-outline-variant/30 hover:border-outline-variant bg-surface-container-lowest'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={isSelected}
                          onChange={() => setPaymentMethod(method.id)}
                          className="w-4 h-4 text-primary focus:ring-0 accent-primary cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md font-bold text-on-surface">
                            {method.name}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">{method.sub}</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                        {method.icon}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Bill Details, Coupons, Place Order CTA (5 Cols) */}
          <aside className="lg:col-span-5 sticky top-24 flex flex-col gap-4">
            {/* Bill Details Summary Card */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-level-2 border border-outline-variant/30 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Bill Summary
                </span>
                <span className="text-[12px] font-semibold text-secondary flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  SSL Secure
                </span>
              </div>

              {/* Coupon Entry & Quick Chips */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter promo coupon code"
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-[13px] font-mono tracking-wider focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                  <button
                    onClick={() => handleApplyCoupon()}
                    className="h-10 px-4 rounded-xl bg-on-surface text-surface font-label-md text-label-md font-bold active:scale-95 transition-all"
                  >
                    Apply
                  </button>
                </div>

                {couponMsg && (
                  <span
                    className={`text-[12px] font-medium ${
                      couponMsg.isError ? 'text-error' : 'text-secondary'
                    }`}
                  >
                    {couponMsg.text}
                  </span>
                )}

                {/* Quick Apply Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(availableCoupons || []).map(p => (
                    <button
                      key={p.code}
                      onClick={() => handleApplyCoupon(p.code)}
                      className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold transition-all ${
                        appliedPromo === p.code
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-primary/10'
                      }`}
                    >
                      {p.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Items */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-outline-variant/20 font-body-sm text-[13px]">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Item Total</span>
                  <span className="font-semibold text-on-surface">₹{itemTotal}</span>
                </div>

                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Delivery Partner Fee</span>
                  <span className={deliveryFee === 0 ? 'text-secondary font-bold' : 'text-on-surface'}>
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Campus Handling & Taxes</span>
                  <span className="text-on-surface">₹{taxesAndHandling}</span>
                </div>

                {driverTip > 0 && (
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span>Driver Tip</span>
                    <span className="text-on-surface font-semibold">₹{driverTip}</span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex items-center justify-between text-secondary font-semibold">
                    <span className="flex items-center gap-1">
                      <span>Voucher Discount ({appliedPromo})</span>
                      <button
                        onClick={removePromo}
                        className="text-[10px] text-error hover:underline"
                      >
                        [remove]
                      </button>
                    </span>
                    <span>-₹{discount}</span>
                  </div>
                )}

                <div className="border-t border-outline-variant/30 my-1" />

                <div className="flex items-center justify-between font-label-lg text-label-lg font-extrabold text-on-surface text-[16px]">
                  <span>Total Amount</span>
                  <span className="font-price-numeral text-[22px] text-primary">₹{totalToPay}</span>
                </div>
              </div>

              {/* Place Order CTA Button */}
              {!isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => navigate('/auth?redirect=/checkout')}
                  className="w-full bg-primary hover:bg-[#d63d10] text-on-primary py-4 px-6 rounded-full font-label-lg text-label-lg font-bold flex items-center justify-between shadow-[0_4px_16px_rgba(174,42,0,0.3)] transition-all active:scale-[0.98] mt-2 cursor-pointer"
                >
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] opacity-90 uppercase tracking-wider font-semibold">
                      Account Required
                    </span>
                    <span className="font-price-numeral text-[18px]">₹{totalToPay}</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold">
                    <span>Log In to Place Order</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </div>
                </button>
              ) : (
                <button
                  disabled={isPlacingOrder}
                  onClick={handlePlaceOrder}
                  className="w-full bg-primary hover:bg-primary-container disabled:opacity-75 text-on-primary py-4 px-6 rounded-full font-label-lg text-label-lg font-bold flex items-center justify-between shadow-[0_4px_16px_rgba(174,42,0,0.3)] transition-all active:scale-[0.98] mt-2 cursor-pointer"
                >
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] opacity-90 uppercase tracking-wider font-semibold">
                      {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Pay Online'}
                    </span>
                    <span className="font-price-numeral text-[18px]">₹{totalToPay}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>{isPlacingOrder ? 'Confirming Order...' : 'Place Order'}</span>
                    <span className="material-symbols-outlined text-[20px]">
                      {isPlacingOrder ? 'sync' : 'arrow_forward'}
                    </span>
                  </div>
                </button>
              )}

              <button
                type="button"
                disabled={isPlacingOrder}
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this checkout and empty your tray?')) {
                    clearCart();
                    navigate('/');
                  }
                }}
                className="w-full bg-surface-container hover:bg-surface-container-high text-error py-3 rounded-full font-label-md font-bold transition-colors mt-2 disabled:opacity-50"
              >
                Cancel Checkout & Empty Tray
              </button>

              <div className="flex items-center justify-center gap-2 text-center text-on-surface-variant font-body-sm text-[11px] pt-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  verified_user
                </span>
                <span>Campus instant drop guarantee • Verified rider</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {isLocationModalOpen && <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />}
    </div>
  );
};
