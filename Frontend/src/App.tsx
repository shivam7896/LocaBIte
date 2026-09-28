import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FloatingCartBar } from './components/FloatingCartBar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { RestaurantPage } from './pages/RestaurantPage';
import { MartPage } from './pages/MartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { RiderDashboard } from './pages/RiderDashboard';
import { TestLoginPage } from './pages/TestLoginPage';

// Scroll to top helper
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <OrderProvider>
          <Router>
            <ScrollToTop />
            <div className="min-h-screen flex flex-col bg-surface text-on-surface">
              <Navbar />

              {/* Main App Canvas */}
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/restaurant/:id" element={<RestaurantPage />} />
                  <Route path="/mart" element={<MartPage />} />
                  <Route path="/grocery" element={<MartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/cart" element={<CheckoutPage />} />
                  <Route path="/tracking" element={<OrderTrackingPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/test-login" element={<TestLoginPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/*" element={<AdminDashboard />} />
                  <Route path="/rider" element={<RiderDashboard />} />
                  <Route path="/driver" element={<RiderDashboard />} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </div>

              {/* Floating Bottom Cart Bar for Handheld Devices */}
              <FloatingCartBar />

              {/* Fixed Bottom Navigation for Mobile */}
              <MobileBottomNav />

              {/* Universal Footer */}
              <Footer />
            </div>
          </Router>
        </OrderProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
