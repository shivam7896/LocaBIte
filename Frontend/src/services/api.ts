import { io, Socket } from 'socket.io-client';

const API_BASE_URL = typeof window !== 'undefined'
  ? ((import.meta as any).env?.VITE_API_URL || '/api')
  : 'http://localhost:5000/api';
const SOCKET_URL = typeof window !== 'undefined'
  ? ((import.meta as any).env?.VITE_SOCKET_URL || window.location.origin)
  : 'http://localhost:5000';



let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      withCredentials: true
    });
  }
  return socketInstance;
};

// Helper for making typed fetch requests
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; errors?: any }> {
  const token = localStorage.getItem('locabite_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const json = await res.json();
    return json;
  } catch (error: any) {
    console.warn(`[API] Error on ${endpoint}:`, error.message);
    return {
      success: false,
      message: error.message || 'Network error occurred'
    };
  }
}

export const api = {
  // Auth
  auth: {
    sendOtp: (identifier: string) =>
      request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ identifier }) }),
    verifyOtp: (identifier: string, code: string) =>
      request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier, code }) }),
    signup: (data: any) =>
      request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (identifier: string, password: string) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
    demoLogin: () =>
      request('/auth/demo-login', { method: 'POST' }),
    getProfile: () =>
      request('/auth/profile'),
    updateProfile: (data: any) =>
      request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    savePreferences: (dietary: string[], orderStyle: string[]) =>
      request('/auth/preferences', { method: 'PUT', body: JSON.stringify({ dietary, orderStyle }) }),
    getAddresses: () =>
      request('/auth/addresses'),
    addAddress: (address: any) =>
      request('/auth/addresses', { method: 'POST', body: JSON.stringify(address) }),
    setDefaultAddress: (addressId: string) =>
      request(`/auth/addresses/${addressId}/default`, { method: 'PUT' }),
    deleteAddress: (addressId: string) =>
      request(`/auth/addresses/${addressId}`, { method: 'DELETE' }),
    logout: () =>
      request('/auth/logout', { method: 'POST' })
  },

  // Restaurants & Dishes
  restaurants: {
    getAll: (params?: { isPureVeg?: boolean; cuisine?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.isPureVeg !== undefined) searchParams.set('isPureVeg', String(params.isPureVeg));
      if (params?.cuisine) searchParams.set('cuisine', params.cuisine);
      if (params?.search) searchParams.set('search', params.search);
      return request(`/restaurants?${searchParams.toString()}`);
    },
    getCategories: (params?: { type?: string }) => {
      const q = params?.type ? `?type=${params.type}` : '';
      return request(`/restaurants/categories${q}`);
    },
    getFeaturedDishes: (limit = 12, category?: string) => {
      const q = category && category !== 'all' ? `&category=${encodeURIComponent(category)}` : '';
      return request(`/restaurants/featured-dishes?limit=${limit}${q}`);
    },
    getByIdOrSlug: (idOrSlug: string) =>
      request(`/restaurants/${idOrSlug}`),
    getMenu: (restaurantId: string, params?: { category?: string; dietary?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.dietary) searchParams.set('dietary', params.dietary);
      return request(`/restaurants/${restaurantId}/menu?${searchParams.toString()}`);
    },
    apply: (data: any) =>
      request('/restaurants/apply', { method: 'POST', body: JSON.stringify(data) })
  },

  // Groceries
  groceries: {
    getAll: (params?: { category?: string; subCategory?: string; tag?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.subCategory) searchParams.set('subCategory', params.subCategory);
      if (params?.tag) searchParams.set('tag', params.tag);
      if (params?.search) searchParams.set('search', params.search);
      return request(`/groceries?${searchParams.toString()}`);
    },
    getCategories: () =>
      request('/restaurants/categories?type=grocery'),
    getDeals: () =>
      request('/groceries/deals'),
    getById: (id: string) =>
      request(`/groceries/${id}`)
  },

  // Products
  products: {
    getAll: (params?: { category?: string; merchantId?: string; type?: string; search?: string; dietary?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.merchantId) searchParams.set('merchantId', params.merchantId);
      if (params?.type) searchParams.set('type', params.type);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.dietary) searchParams.set('dietary', params.dietary);
      return request(`/products?${searchParams.toString()}`);
    },
    getById: (id: string) =>
      request(`/products/${id}`),
    getByMerchant: (merchantId: string) =>
      request(`/merchants/${merchantId}/products`)
  },

  // Cart
  cart: {
    get: () =>
      request('/cart'),
    addItem: (data: { type: 'food' | 'grocery'; productId: string; quantity?: number; customizations?: any }) =>
      request('/cart/items', { method: 'POST', body: JSON.stringify(data) }),
    updateQuantity: (cartItemId: string, delta: number) =>
      request('/cart/items/quantity', { method: 'PUT', body: JSON.stringify({ cartItemId, delta }) }),
    removeItem: (cartItemId: string) =>
      request(`/cart/items/${cartItemId}`, { method: 'DELETE' }),
    applyCoupon: (code: string) =>
      request('/cart/coupon', { method: 'POST', body: JSON.stringify({ code }) }),
    removeCoupon: () =>
      request('/cart/coupon', { method: 'DELETE' }),
    updateTip: (tip: number) =>
      request('/cart/tip', { method: 'PUT', body: JSON.stringify({ tip }) }),
    updateDeliveryInstruction: (instruction: string) =>
      request('/cart/instructions', { method: 'PUT', body: JSON.stringify({ instruction }) }),
    clear: () =>
      request('/cart/clear', { method: 'DELETE' }),
    getCoupons: () =>
      request('/cart/coupons')
  },

  // Orders
  orders: {
    create: (data: { deliveryAddress: any; deliveryInstructions?: string; paymentMethod: string; appliedPromo?: string; directItems?: any[] }) =>
      request('/orders', { method: 'POST', body: JSON.stringify(data) }),
    getMyOrders: () =>
      request('/orders/my-orders'),
    getById: (orderId: string) =>
      request(`/orders/${orderId}`),
    cancel: (orderId: string, reason?: string) =>
      request(`/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    reorder: (orderId: string) =>
      request(`/orders/${orderId}/reorder`, { method: 'POST' })
  },

  // Payments
  payments: {
    createRazorpayOrder: (orderId: string) =>
      request('/payments/razorpay-order', { method: 'POST', body: JSON.stringify({ orderId }) }),
    verifyPayment: (data: { orderId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
      request('/payments/verify', { method: 'POST', body: JSON.stringify(data) })
  },

  // Live Tracking
  tracking: {
    get: (orderId: string) =>
      request(`/tracking/${orderId}`),
    updateStatus: (orderId: string, status: string, note?: string) =>
      request(`/tracking/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status, note }) }),
    updateLocation: (orderId: string, lat: number, lng: number) =>
      request(`/tracking/${orderId}/location`, { method: 'PUT', body: JSON.stringify({ lat, lng }) })
  },

  // Marketplace Search
  search: (q: string, type: 'all' | 'food' | 'grocery' = 'all') =>
    request(`/search?q=${encodeURIComponent(q)}&type=${type}`),

  // Admin APIs
  admin: {
    getStats: () =>
      request('/admin/stats'),
    getUsers: (params?: { role?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.role) searchParams.set('role', params.role);
      if (params?.search) searchParams.set('search', params.search);
      return request(`/admin/users?${searchParams.toString()}`);
    },
    updateUserRole: (userId: string, role: string) =>
      request(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    toggleUserStatus: (userId: string) =>
      request(`/admin/users/${userId}/status`, { method: 'PUT' }),
    getOrders: (params?: { status?: string; merchantId?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.merchantId) searchParams.set('merchantId', params.merchantId);
      if (params?.search) searchParams.set('search', params.search);
      return request(`/admin/orders?${searchParams.toString()}`);
    },
    updateOrderStatus: (orderId: string, status: string, note?: string) =>
      request(`/admin/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status, note }) }),
    processRefund: (orderId: string, amount: number, reason: string) =>
      request(`/admin/orders/${orderId}/refund`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
    
    // Merchants
    getMerchants: (params?: { type?: string; status?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.set('type', params.type);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);
      return request(`/admin/merchants?${searchParams.toString()}`);
    },
    getMerchantById: (id: string) =>
      request(`/admin/merchants/${id}`),
    createMerchant: (data: any) =>
      request('/admin/merchants', { method: 'POST', body: JSON.stringify(data) }),
    updateMerchant: (id: string, data: any) =>
      request(`/admin/merchants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateMerchantStatus: (id: string, status: string, reason?: string) =>
      request(`/admin/merchants/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, reason }) }),
    updateMerchantCommission: (id: string, commissionRate: number) =>
      request(`/admin/merchants/${id}/commission`, { method: 'PUT', body: JSON.stringify({ commissionRate }) }),
    deleteMerchant: (id: string) =>
      request(`/admin/merchants/${id}`, { method: 'DELETE' }),

    // Legacy Restaurant support
    createRestaurant: (data: any) =>
      request('/admin/merchants', { method: 'POST', body: JSON.stringify(data) }),
    updateRestaurant: (id: string, data: any) =>
      request(`/admin/merchants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteRestaurant: (id: string) =>
      request(`/admin/merchants/${id}`, { method: 'DELETE' }),

    // Products (Unified Food Dishes & Grocery Items)
    getProducts: (params?: { type?: string; merchantId?: string; category?: string; stockStatus?: string; status?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.set('type', params.type);
      if (params?.merchantId) searchParams.set('merchantId', params.merchantId);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.stockStatus) searchParams.set('stockStatus', params.stockStatus);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);
      return request(`/admin/products?${searchParams.toString()}`);
    },
    createProduct: (data: any) =>
      request('/admin/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id: string, data: any) =>
      request(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateProductStock: (id: string, data: { stockQuantity?: number; isAvailable?: boolean; delta?: number }) =>
      request(`/admin/products/${id}/stock`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id: string) =>
      request(`/admin/products/${id}`, { method: 'DELETE' }),
    duplicateProduct: (id: string) =>
      request(`/admin/products/${id}/duplicate`, { method: 'POST' }),
    bulkUpdateProducts: (data: { productIds: string[]; priceChangePercent?: number; stockChangeDelta?: number; status?: string }) =>
      request('/admin/products/bulk-update', { method: 'POST', body: JSON.stringify(data) }),

    // Categories
    getCategories: () =>
      request('/admin/categories'),
    createCategory: (data: any) =>
      request('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id: string, data: any) =>
      request(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id: string) =>
      request(`/admin/categories/${id}`, { method: 'DELETE' }),

    // Coupons
    getCoupons: () =>
      request('/admin/coupons'),
    createCoupon: (data: any) =>
      request('/admin/coupons', { method: 'POST', body: JSON.stringify(data) }),
    deleteCoupon: (code: string) =>
      request(`/admin/coupons/${code}`, { method: 'DELETE' }),

    // Delivery Partners
    getDeliveryPartners: () =>
      request('/admin/delivery-partners'),
    createDeliveryPartner: (data: any) =>
      request('/admin/delivery-partners', { method: 'POST', body: JSON.stringify(data) }),

    // Audit Logs
    getAuditLogs: () =>
      request('/admin/audit-logs')
  },

  // Rider Terminal API
  rider: {
    checkEmail: (email: string) =>
      request('/rider/auth/check', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    getProfile: () =>
      request('/rider/profile'),
    toggleAvailability: (isAvailable: boolean) =>
      request('/rider/availability', {
        method: 'PUT',
        body: JSON.stringify({ isAvailable })
      }),
    getOrders: () =>
      request('/rider/orders'),
    acceptOrder: (orderId: string) =>
      request(`/rider/orders/${orderId}/accept`, {
        method: 'POST'
      }),
    rejectOrder: (orderId: string) =>
      request(`/rider/orders/${orderId}/reject`, {
        method: 'POST'
      }),
    updateOrderStatus: (orderId: string, status: string, otp?: string, note?: string) =>
      request(`/rider/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, otp, note })
      }),
    updateLocation: (data: { lat: number; lng: number; speed?: number; heading?: number; orderId?: string }) =>
      request('/rider/location', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  }
};
