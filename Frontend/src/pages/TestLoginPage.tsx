import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Logo } from '../components/Logo';

export const TestLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithToken, isLoggedIn, user } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isTestEnabled, setIsTestEnabled] = useState<boolean | null>(null);

  // Check if test login is enabled in this environment on mount
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await api.auth.getTestLoginStatus();
        if (isMounted) {
          setIsTestEnabled(Boolean(res.success && res.data?.enabled));
        }
      } catch {
        if (isMounted) {
          setIsTestEnabled(false);
        }
      }
    };
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both test email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.auth.testLogin(email.trim(), password.trim());
      if (res.success && res.data?.accessToken && res.data?.user) {
        setSuccessMsg('✓ Test credentials verified. Establishing session...');
        loginWithToken(res.data.accessToken, res.data.user);

        // Redirect to store page for automated review flow
        setTimeout(() => {
          navigate('/mart');
        }, 600);
      } else {
        setErrorMsg(res.message || 'Invalid test credentials. Please verify your test email and password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication service error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-surface flex flex-col justify-center items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 sm:p-8 shadow-level-2">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo className="mb-3" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-secondary text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[14px]">fact_check</span>
            Automated Website Review Portal
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface">
            Razorpay Test Account Login
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-1">
            Dedicated test path for automated reviewer verification & checkout testing.
          </p>
        </div>

        {/* Disabled State Notice */}
        {isTestEnabled === false && (
          <div
            role="alert"
            className="mb-5 p-4 rounded-xl bg-error-container/30 border border-error/20 text-error text-[13px] leading-relaxed"
          >
            <strong>Test login is currently disabled.</strong>
            <p className="mt-1 text-[12px] opacity-90">
              Set <code className="bg-surface px-1 py-0.5 rounded font-mono">ENABLE_RAZORPAY_TEST_LOGIN=true</code> in your server environment to enable this portal during Razorpay review.
            </p>
          </div>
        )}

        {/* Logged in indicator */}
        {isLoggedIn && user && (
          <div className="mb-5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[12px] flex items-center justify-between">
            <span>
              Currently active as: <strong>{user.email || user.name}</strong>
            </span>
            <button
              onClick={() => navigate('/mart')}
              className="font-bold underline hover:opacity-80"
            >
              Continue to Store &rarr;
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            id="test-login-error"
            className="mb-4 p-3 rounded-xl bg-error-container/40 border border-error/30 text-error text-[13px] flex items-start gap-2"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div
            role="status"
            id="test-login-success"
            className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-700 text-[13px] flex items-center gap-2 font-medium"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0 text-green-600">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Pure & Reliable Testing Form (No Captcha, No OTP) */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[13px] font-semibold text-on-surface mb-1"
            >
              Test Account Username / Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              disabled={isLoading || isTestEnabled === false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. razorpay.tester@locabite.com"
              className="w-full h-11 px-3.5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[13px] font-semibold text-on-surface mb-1"
            >
              Test Account Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isLoading || isTestEnabled === false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter test password"
              className="w-full h-11 px-3.5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <button
            id="login-button"
            type="submit"
            disabled={isLoading || isTestEnabled === false}
            className="w-full h-12 mt-2 rounded-xl bg-primary hover:bg-[#d63d10] active:scale-[0.99] text-on-primary font-bold text-[14px] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Test Account</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Informational Guidance for Reviewer */}
        <div className="mt-6 pt-4 border-t border-outline-variant/30 text-center">
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            This customer account has standard student permissions to browse menus & 10-minute groceries, add items to cart, and verify live Razorpay payment processing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestLoginPage;
