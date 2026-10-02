import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, CartItem, Address } from '../types';
import { api, getSocket } from '../services/api';

interface OrderContextType {
  activeOrder: Order | null;
  pastOrders: Order[];
  placeOrder: (
    items: CartItem[],
    total: number,
    itemTotal: number,
    deliveryFee: number,
    taxes: number,
    discount: number,
    promo: string | null,
    address: Address,
    instructions: string,
    paymentMethod: string
  ) => Promise<Order>;
  updateOrderStatus: (status: Order['status']) => Promise<void>;
  cancelOrder: (reason?: string) => Promise<boolean>;
  reorder: (orderId: string) => Promise<boolean>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);

  // Load orders from backend API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.orders.getMyOrders();
        if (res.success && res.data) {
          if (res.data.activeOrder) {
            setActiveOrder(res.data.activeOrder);
          } else {
            setActiveOrder(null);
          }
          if (res.data.pastOrders) {
            setPastOrders(res.data.pastOrders);
          }
        }
      } catch (err: any) {
        console.warn('Orders fetch error:', err.message);
      }
    };
    fetchOrders();
  }, []);

  // Connect to Socket.IO for real-time tracking updates
  useEffect(() => {
    if (!activeOrder?.id) return;

    const socket = getSocket();
    socket.emit('join_order_room', { orderId: activeOrder.id });

    const handleStatusUpdate = (updatedOrder: Order) => {
      if (updatedOrder.id === activeOrder.id || updatedOrder.orderNumber === activeOrder.orderNumber) {
        setActiveOrder(prev => ({
          ...prev,
          ...updatedOrder
        }));
      }
    };

    const handleDriverLocation = (location: { lat: number; lng: number }) => {
      setActiveOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          driver: prev.driver ? { ...prev.driver, currentLocation: location } : prev.driver
        };
      });
    };

    socket.on('order_status_updated', handleStatusUpdate);
    socket.on('driver_location_updated', handleDriverLocation);

    return () => {
      socket.off('order_status_updated', handleStatusUpdate);
      socket.off('driver_location_updated', handleDriverLocation);
      socket.emit('leave_order_room', { orderId: activeOrder.id });
    };
  }, [activeOrder?.id]);

  // Arrival minutes countdown simulation
  useEffect(() => {
    if (!activeOrder || activeOrder.status === 'delivered') return;

    const timer = setInterval(() => {
      setActiveOrder(prev => {
        if (!prev) return null;
        if (prev.remainingMinutes > 1) {
          return { ...prev, remainingMinutes: prev.remainingMinutes - 1 };
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [activeOrder]);

  const placeOrder = async (
    items: CartItem[],
    total: number,
    itemTotal: number,
    deliveryFee: number,
    taxes: number,
    discount: number,
    promo: string | null,
    address: Address,
    instructions: string,
    paymentMethod: string
  ): Promise<Order> => {
    const token = localStorage.getItem('locabite_token');
    if (!token) {
      throw new Error('Authentication required: You must be logged in to place an order.');
    }

    const res = await api.orders.create({
      deliveryAddress: address,
      deliveryInstructions: instructions,
      paymentMethod,
      appliedPromo: promo || undefined,
      directItems: items
    });

    if (res.success && res.data?.order) {
      setActiveOrder(res.data.order);
      return res.data.order;
    }

    if (
      !res.success &&
      (res.message?.toLowerCase().includes('token') ||
        res.message?.toLowerCase().includes('authentication') ||
        res.message?.toLowerCase().includes('log in') ||
        res.message?.toLowerCase().includes('unauthorized'))
    ) {
      throw new Error(res.message || 'Authentication required: You must be logged in to place an order.');
    }

    // Fallback if offline
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const newOrder: Order = {
      id: `ord-${randomNum}`,
      orderNumber: `LB-${randomNum}`,
      placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'placed',
      estimatedArrival: 'In 15–20 mins',
      remainingMinutes: 15,
      items,
      itemTotal,
      deliveryFee,
      taxesAndHandling: taxes,
      discount,
      totalToPay: total,
      appliedPromo: promo || undefined,
      deliveryAddress: address,
      deliveryInstructions: instructions,
      otpOnArrival: Math.floor(1000 + Math.random() * 9000).toString(),
      paymentMethod,
      driver: {
        name: 'Vikram Singh',
        phone: '+91 98123 45678',
        vehicleNumber: 'UK-08-EV-4421',
        vehicleType: 'Zero Carbon Electric Moped',
        rating: 4.9,
        deliveriesCount: 1240,
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg'
      }
    };

    setActiveOrder(newOrder);
    return newOrder;
  };

  const updateOrderStatus = async (status: Order['status']) => {
    if (activeOrder) {
      await api.tracking.updateStatus(activeOrder.id, status);
      setActiveOrder({ ...activeOrder, status });
    }
  };

  const cancelOrder = async (reason?: string): Promise<boolean> => {
    if (!activeOrder) return false;
    const res = await api.orders.cancel(activeOrder.id, reason);
    if (res.success && res.data) {
      setActiveOrder(res.data);
      return true;
    }
    return false;
  };

  const reorder = async (orderId: string): Promise<boolean> => {
    const res = await api.orders.reorder(orderId);
    return !!res.success;
  };

  return (
    <OrderContext.Provider
      value={{
        activeOrder,
        pastOrders,
        placeOrder,
        updateOrderStatus,
        cancelOrder,
        reorder
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
