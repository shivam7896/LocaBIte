import React, { useState, useEffect } from 'react';
import { useOrder } from '../context/OrderContext';
import { VegBadge } from '../components/VegBadge';
import { getSocket } from '../services/api';

export const OrderTrackingPage: React.FC = () => {
  const { activeOrder, pastOrders, reorder, updateOrderStatus } = useOrder();
  const [showCallModal, setShowCallModal] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  // Live real-time Rider Geolocation listener
  const [liveDriverLocation, setLiveDriverLocation] = useState<{
    lat: number;
    lng: number;
    speed?: number;
  } | null>(activeOrder?.driver?.currentLocation || null);

  useEffect(() => {
    if (!activeOrder?.id) return;

    const socket = getSocket();
    socket.emit('join_order_room', { orderId: activeOrder.id });

    const handleDriverLoc = (loc: { lat: number; lng: number; speed?: number }) => {
      setLiveDriverLocation(loc);
    };

    socket.on('driver_location_updated', handleDriverLoc);

    return () => {
      socket.off('driver_location_updated', handleDriverLoc);
      socket.emit('leave_order_room', { orderId: activeOrder.id });
    };
  }, [activeOrder?.id]);

  // Compute dynamic map coordinate & distance based on live rider coordinates
  const riderPos = (() => {
    const loc = liveDriverLocation || activeOrder?.driver?.currentLocation;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
      return { x: 360, y: 260, meters: 450 };
    }
    const minLat = 29.8543;
    const maxLat = 29.8598;
    const minLng = 77.888;
    const maxLng = 77.8945;

    const latRatio = Math.max(0, Math.min(1, (loc.lat - minLat) / (maxLat - minLat || 0.0055)));
    const lngRatio = Math.max(0, Math.min(1, (loc.lng - minLng) / (maxLng - minLng || 0.0065)));
    const ratio = Math.max(0, Math.min(1, (latRatio + lngRatio) / 2));

    const startX = 150;
    const startY = 150;
    const endX = 550;
    const endY = 350;

    const x = Math.round(startX + (endX - startX) * ratio);
    const arcHeight = Math.sin(ratio * Math.PI) * 45;
    const y = Math.round(startY + (endY - startY) * ratio - arcHeight * (ratio > 0.5 ? -1 : 1));

    const meters = Math.max(25, Math.round((1 - ratio) * 850));
    return { x, y, meters };
  })();

  if (!activeOrder) {
    return (
      <div className="w-full min-h-[60vh] py-12 px-4 sm:px-6 lg:px-10 max-w-[1280px] mx-auto">
        <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 mb-8">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary mb-3">
            <span className="material-symbols-outlined text-[36px]">pending_actions</span>
          </div>
          <h2 className="font-headline-md text-2xl font-bold text-on-surface">
            No Active Delivery in Progress
          </h2>
          <p className="font-body-md text-on-surface-variant max-w-sm mt-1 mb-4">
            You don't have an order in transit right now. Place an order to see live real-time GPS tracking.
          </p>
          <a
            href="/"
            className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full text-sm shadow-xs hover:bg-primary-container"
          >
            Explore Campus Eateries
          </a>
        </div>

        {pastOrders.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline-md text-xl font-bold text-on-surface">Order History</h3>
                <p className="font-body-sm text-xs text-on-surface-variant">Your previous orders</p>
              </div>
              {reorderNotice && (
                <span className="bg-secondary/10 text-secondary font-bold text-xs px-3 py-1.5 rounded-full">
                  {reorderNotice}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastOrders.map(order => (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface">#{order.orderNumber || order.id}</span>
                        <span className="text-xs text-on-surface-variant">• {order.placedAt}</span>
                      </div>
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-secondary/10 text-secondary">
                        {order.status}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-on-surface-variant">
                          <span>{it.quantity}x {it.name}</span>
                          <span>₹{it.price * it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-on-surface-variant">Total Paid</span>
                      <span className="font-price-numeral font-bold text-primary text-base">₹{order.totalToPay}</span>
                    </div>
                    <button
                      onClick={async () => {
                        const ok = await reorder(order.id);
                        if (ok) {
                          setReorderNotice(`Items from #${order.orderNumber || order.id} added to tray!`);
                          setTimeout(() => setReorderNotice(null), 4000);
                        }
                      }}
                      className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-bold text-xs px-4 py-2 rounded-xl transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      <span>Reorder Basket</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const steps = [
    { id: 'placed', label: 'Order Placed', time: '1:15 PM', statusDesc: 'Confirmed', icon: 'check' },
    { id: 'prepared', label: 'Store Prepared', time: '1:22 PM', statusDesc: 'Fresh & Packed', icon: 'kitchen' },
    { id: 'picked_up', label: 'Picked Up', time: '1:25 PM', statusDesc: 'Insulated Bag', icon: 'inventory_2' },
    { id: 'out_for_delivery', label: 'Out for Delivery', time: '1:28 PM', statusDesc: 'En Route', icon: 'two_wheeler' },
    { id: 'delivered', label: 'Delivered', time: '1:35 PM', statusDesc: 'Hostel Gate Drop', icon: 'verified' }
  ];

  const currentStepIdx = steps.findIndex(s => s.id === activeOrder.status);

  return (
    <div className="w-full bg-surface pb-28 lg:pb-16">
      {/* Interactive Header Ticker */}
      <section className="w-full bg-surface-container-high py-2.5 border-b border-outline-variant/20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-wrap items-center justify-between gap-2 font-body-sm text-[12px]">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="inline-flex relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
            </span>
            <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider font-bold">
              Live Tracking Active
            </span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant">
              Order <strong className="font-bold text-on-surface">#{activeOrder.orderNumber}</strong>
            </span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant">Placed at {activeOrder.placedAt}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-secondary font-semibold">
              <span className="material-symbols-outlined text-[16px]">electric_moped</span>
              <span className="font-label-sm text-[11px] uppercase">Zero Carbon Dispatch</span>
            </div>
            <span className="hidden sm:inline-block text-outline-variant">•</span>
            <div className="hidden sm:flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>
                OTP on Arrival:{' '}
                <strong className="font-price-numeral text-on-surface tracking-wider ml-0.5 text-primary text-[14px]">
                  {activeOrder.otpOnArrival}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Status Hero Banner */}
      <section className="w-full bg-surface-container-lowest shadow-sm py-6 sm:py-8 border-b border-outline-variant/20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container">
                <span className="material-symbols-outlined text-[16px] animate-spin" style={{ animationDuration: '4s' }}>
                  sync
                </span>
                <span className="font-label-sm text-[11px] font-bold tracking-wide uppercase">
                  Hyper-Speed Campus Dispatch
                </span>
              </div>
              <h1 className="font-headline-lg text-2xl sm:text-3xl lg:text-4xl text-on-surface font-extrabold flex items-center gap-2.5">
                <span>Your order is on the way!</span>
                <span className="material-symbols-outlined text-primary text-[32px]">
                  two_wheeler
                </span>
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                Rider {activeOrder.driver?.name || 'Vikram'} has picked up your meal & supplies and is steering towards your hostel gate.
              </p>
            </div>

            {/* Countdown Widget */}
            <div className="flex items-center gap-4 sm:gap-6 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 w-fit">
              <div className="relative flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    className="text-surface-variant"
                    cx="40"
                    cy="40"
                    fill="transparent"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="6"
                  />
                  <circle
                    className="text-primary transition-all duration-1000"
                    cx="40"
                    cy="40"
                    fill="transparent"
                    r="32"
                    stroke="currentColor"
                    strokeDasharray="201"
                    strokeDashoffset="52"
                    strokeLinecap="round"
                    strokeWidth="6"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                  <span className="font-price-numeral text-headline-md text-primary font-extrabold text-[22px]">
                    {activeOrder.remainingMinutes}
                  </span>
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-bold">
                    mins
                  </span>
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                  Estimated Arrival
                </span>
                <div className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                  {activeOrder.estimatedArrival}
                </div>
                <div className="flex items-center gap-1 font-body-sm text-[11px] text-secondary font-medium">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  <span>Running on-time (Ahead by 2m)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time 5-Step Order Progress Timeline */}
          <div className="mt-8 pt-6 border-t border-outline-variant/20">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
              {/* Connector Line (Desktop) */}
              <div className="hidden sm:block absolute top-5 left-[10%] right-[10%] h-1 bg-surface-variant -z-0">
                <div
                  className="h-full bg-secondary transition-all duration-700"
                  style={{ width: `${Math.min(100, (currentStepIdx / (steps.length - 1)) * 100)}%` }}
                />
              </div>

              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div
                    key={step.id}
                    onClick={() => updateOrderStatus(step.id as any)}
                    className="flex sm:flex-col items-center gap-3 relative z-10 text-left sm:text-center cursor-pointer group"
                    title="Click to simulate advancing status"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xs transition-all ${
                        isCurrent
                          ? 'bg-primary text-on-primary ring-4 ring-primary/20 scale-110'
                          : isCompleted
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{step.icon}</span>
                    </div>

                    <div>
                      <div
                        className={`font-label-md text-label-md font-bold ${
                          isCurrent ? 'text-primary' : isCompleted ? 'text-on-surface' : 'text-on-surface-variant'
                        }`}
                      >
                        {step.label}
                      </div>
                      <div className="font-body-sm text-[11px] text-on-surface-variant">
                        {step.time}
                      </div>
                      <span
                        className={`inline-block mt-0.5 font-label-sm text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isCompleted
                            ? 'text-secondary bg-secondary-container/30'
                            : 'text-on-surface-variant/60'
                        }`}
                      >
                        {step.statusDesc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column: Campus Delivery Route Map & Rider Info + Order Items */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Map Simulation & Rider Card (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Simulated Campus GPS Map */}
          <div className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden shadow-level-1 border border-outline-variant/30 bg-surface-container-high">
            {/* SVG stylized map drawing */}
            <svg className="w-full h-full" viewBox="0 0 800 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Map background grids & blocks */}
              <rect width="800" height="500" fill="#e9edff" />
              {/* Campus Roads */}
              <path
                d="M50 150 H750 M150 50 V450 M400 50 V450 M650 50 V450 M50 350 H750 M250 150 C320 200 480 300 550 350"
                stroke="#d3daef"
                strokeWidth="28"
                strokeLinecap="round"
              />
              <path
                d="M50 150 H750 M150 50 V450 M400 50 V450 M650 50 V450 M50 350 H750 M250 150 C320 200 480 300 550 350"
                stroke="#ffffff"
                strokeWidth="20"
                strokeLinecap="round"
              />

              {/* Delivery Active Route Path (Glow emerald) */}
              <path
                d="M150 150 Q280 150 350 250 T550 350"
                stroke="#10B981"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="12 8"
                className="animate-pulse"
              />

              {/* Restaurant Marker (Point A) */}
              <g transform="translate(150, 150)">
                <circle r="18" fill="#ae2a00" />
                <circle r="6" fill="#ffffff" />
                <text x="24" y="5" fill="#141B2B" fontSize="13" fontWeight="bold">
                  {activeOrder?.items?.[0]?.restaurantName || 'Pure South Indian (Campus Point)'}
                </text>
              </g>

              {/* Destination Marker (Point B - Hostel) */}
              <g transform="translate(550, 350)">
                <circle r="22" fill="#006c49" opacity="0.3" className="animate-ping" />
                <circle r="16" fill="#006c49" />
                <circle r="6" fill="#ffffff" />
                <text x="24" y="5" fill="#141B2B" fontSize="13" fontWeight="bold">
                  Boys Hostel Block C (Your Drop)
                </text>
              </g>

              {/* Live Scooter / Rider Icon Moving dynamically on Route based on GPS / Simulator */}
              <g
                transform={`translate(${riderPos.x}, ${riderPos.y})`}
                className="transition-all duration-700 ease-out"
              >
                <circle r="22" fill="#F04F23" opacity="0.3" className="animate-ping" />
                <circle r="18" fill="#F04F23" filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.25))" />
                <text x="-9" y="6" fill="#ffffff" fontSize="18" fontFamily="'Material Symbols Outlined'">
                  two_wheeler
                </text>
              </g>
            </svg>

            {/* Overlaid Live Status Pill */}
            <div className="absolute top-4 left-4 bg-surface-container-lowest/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-md border border-outline-variant/30 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
              <span className="text-[12px] font-bold text-on-surface">
                {activeOrder.driver?.name || 'Rider'} is {riderPos.meters} meters away
              </span>
            </div>

            <div className="absolute bottom-4 right-4 bg-surface-container-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-outline-variant/30 text-[11px] font-medium text-on-surface-variant">
              Campus Speed Cap: 25 km/h
            </div>
          </div>

          {/* Rider Profile Card */}
          {activeOrder.driver && (
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-level-1 border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={activeOrder.driver.avatar}
                    alt={activeOrder.driver.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-secondary"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                    ⚡
                  </span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="font-label-lg text-[16px] font-bold text-on-surface">
                      {activeOrder.driver.name}
                    </h3>
                    <span className="bg-secondary-container text-on-secondary-container px-2 py-0.2 rounded-full text-[10px] font-bold">
                      ⭐ {activeOrder.driver.rating}
                    </span>
                  </div>
                  <span className="text-[12px] text-on-surface-variant">
                    {activeOrder.driver.vehicleType} • {activeOrder.driver.vehicleNumber}
                  </span>
                  <span className="text-[11px] text-secondary font-semibold mt-0.5">
                    {activeOrder.driver.deliveriesCount}+ successful campus deliveries
                  </span>
                </div>
              </div>

              {/* Call and Chat Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowCallModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface px-4 py-2.5 rounded-xl font-label-md text-label-md font-bold transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">call</span>
                  <span>Call Rider</span>
                </button>
                <button
                  onClick={() => alert(`Opening live campus chat with ${activeOrder.driver?.name}...`)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary px-4 py-2.5 rounded-xl font-label-md text-label-md font-bold transition-all active:scale-95 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Chat</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Items Summary & Support (5 Cols) */}
        <aside className="lg:col-span-5 flex flex-col gap-5">
          {/* Order Details Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-level-1 border border-outline-variant/30 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Order Summary
              </span>
              <span className="bg-primary/10 text-primary font-mono text-[12px] font-bold px-2 py-0.5 rounded-md">
                #{activeOrder.orderNumber}
              </span>
            </div>

            {/* Deliver To Info */}
            <div className="flex items-start gap-2.5 text-body-sm text-[12px] bg-surface-container-low p-3 rounded-xl">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                location_on
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-on-surface">
                  {activeOrder.deliveryAddress.building}
                </span>
                <span className="text-on-surface-variant">
                  {activeOrder.deliveryAddress.room}, {activeOrder.deliveryAddress.campus}
                </span>
                {activeOrder.deliveryInstructions && (
                  <span className="text-secondary font-medium mt-1">
                    Note: {activeOrder.deliveryInstructions}
                  </span>
                )}
              </div>
            </div>

            {/* Item List */}
            <div className="flex flex-col divide-y divide-outline-variant/20">
              {activeOrder.items.map(item => (
                <div key={item.cartItemId} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.dietary && <VegBadge type={item.dietary} size="sm" />}
                    <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                      {item.name}
                    </span>
                    <span className="text-[12px] text-on-surface-variant font-medium">
                      x{item.quantity}
                    </span>
                  </div>
                  <span className="font-price-numeral text-label-md font-bold text-on-surface">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="pt-3 border-t border-outline-variant/20 flex flex-col gap-1.5 text-[12px] text-on-surface-variant">
              <div className="flex items-center justify-between">
                <span>Item Total</span>
                <span>₹{activeOrder.itemTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery Partner Fee</span>
                <span className="text-secondary font-bold">
                  {activeOrder.deliveryFee === 0 ? 'FREE' : `₹${activeOrder.deliveryFee}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Campus Handling & Taxes</span>
                <span>₹{activeOrder.taxesAndHandling}</span>
              </div>
              {activeOrder.discount > 0 && (
                <div className="flex items-center justify-between text-secondary font-semibold">
                  <span>Discount Applied ({activeOrder.appliedPromo})</span>
                  <span>-₹{activeOrder.discount}</span>
                </div>
              )}
              <div className="border-t border-outline-variant/30 my-1" />
              <div className="flex items-center justify-between text-[15px] font-bold text-on-surface">
                <span>Total Paid via {activeOrder.paymentMethod}</span>
                <span className="font-price-numeral text-primary">₹{activeOrder.totalToPay}</span>
              </div>
            </div>

            {/* Help & Support Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setShowSupportModal(true)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold text-center transition-colors"
              >
                Need Help with Order?
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Order History / Past Campus Orders Section */}
      {pastOrders.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 mt-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                Previous Orders
              </h2>
              <p className="font-body-md text-body-sm text-on-surface-variant">
                Past campus deliveries from your account
              </p>
            </div>
            {reorderNotice && (
              <span className="bg-secondary/10 text-secondary font-bold text-xs px-3 py-1.5 rounded-full">
                {reorderNotice}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastOrders.map(order => (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface">#{order.orderNumber || order.id}</span>
                      <span className="text-xs text-on-surface-variant">• {order.placedAt}</span>
                    </div>
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-secondary/10 text-secondary">
                      {order.status}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-on-surface-variant">
                        <span>{it.quantity}x {it.name}</span>
                        <span>₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-on-surface-variant">Total Paid</span>
                    <span className="font-price-numeral font-bold text-primary text-base">₹{order.totalToPay}</span>
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await reorder(order.id);
                      if (ok) {
                        setReorderNotice(`Items from #${order.orderNumber || order.id} added to tray!`);
                        setTimeout(() => setReorderNotice(null), 4000);
                      }
                    }}
                    className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-bold text-xs px-4 py-2 rounded-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Reorder Basket</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Call Modal */}
      {showCallModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/60 backdrop-blur-md"
          onClick={() => setShowCallModal(false)}
        >
          <div
            className="bg-surface-container-lowest max-w-sm w-full p-6 rounded-2xl shadow-level-3 text-center flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">call</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Call {activeOrder.driver?.name}
              </h3>
              <p className="text-[13px] text-on-surface-variant mt-1">
                Connected via LocaBite masked campus caller.
              </p>
              <div className="font-price-numeral text-xl font-bold text-primary mt-2">
                {activeOrder.driver?.phone}
              </div>
            </div>
            <button
              onClick={() => setShowCallModal(false)}
              className="w-full bg-primary text-on-primary py-2.5 rounded-xl font-bold font-label-md"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/60 backdrop-blur-md"
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="bg-surface-container-lowest max-w-md w-full p-6 rounded-2xl shadow-level-3 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                LocaBite Campus Support
              </h3>
              <button
                onClick={() => setShowSupportModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="font-body-md text-on-surface-variant text-[13px]">
              Our campus hub desk is available 24/7. How can we help you regarding order #{activeOrder.orderNumber}?
            </p>
            <div className="flex flex-col gap-2">
              {[
                'Delivery is taking longer than expected',
                'Items are missing or wrong in the order',
                'Update delivery instructions for rider',
                'Cancel current active order'
              ].map(reason => (
                <button
                  key={reason}
                  onClick={() => {
                    alert(`Reported: "${reason}". An agent has been alerted and will ping your phone shortly!`);
                    setShowSupportModal(false);
                  }}
                  className="p-3 text-left rounded-xl bg-surface-container-low hover:bg-surface-container font-label-md text-[13px] text-on-surface transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
