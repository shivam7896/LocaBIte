import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DietaryType } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  loginStep: 'input' | 'otp' | 'onboarding' | 'done';
  pendingIdentifier: string;
  sendOtp: (identifier: string) => Promise<void>;
  verifyOtp: (code: string, identifierOverride?: string) => Promise<boolean>;
  loginWithGoogle: (email?: string) => Promise<boolean>;
  savePreferences: (dietary: DietaryType[], orderStyle: ('food' | 'mart')[]) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
  loginAsDemo: () => Promise<void>;
  loginWithToken: (token: string, userData: any) => void;
  setLoginStep: (step: 'input' | 'otp' | 'onboarding' | 'done') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginStep, setLoginStep] = useState<'input' | 'otp' | 'onboarding' | 'done'>('input');
  const [pendingIdentifier, setPendingIdentifier] = useState<string>('aarav.sharma@quantum.edu.in');

  // Verify and fetch profile on load if token exists
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('locabite_token');
      if (token) {
        try {
          const res = await api.auth.getProfile();
          if (res.success && res.data) {
            setUser(res.data);
            setIsLoggedIn(true);
            return;
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('locabite_token');
        }
      }
      // If no valid token exists, user remains unauthenticated
      setUser(null);
      setIsLoggedIn(false);
    };
    initAuth();
  }, []);

  const sendOtp = async (identifier: string) => {
    setPendingIdentifier(identifier);
    setLoginStep('otp');
    await api.auth.sendOtp(identifier);
  };

  const verifyOtp = async (code: string, identifierOverride?: string): Promise<boolean> => {
    const id = identifierOverride || pendingIdentifier;
    const res = await api.auth.verifyOtp(id, code);
    if (res.success && res.data?.user) {
      if (res.data.accessToken) {
        localStorage.setItem('locabite_token', res.data.accessToken);
      }
      setUser(res.data.user);
      setIsLoggedIn(true);
      setLoginStep('onboarding');
      return true;
    }
    return false;
  };

  const loginWithGoogle = async (token: string): Promise<boolean> => {
    try {
      const res = await api.auth.googleLogin(token);
      if (res.success && res.data?.user) {
        if (res.data.accessToken) {
          localStorage.setItem('locabite_token', res.data.accessToken);
        }
        setUser(res.data.user);
        setIsLoggedIn(true);
        setLoginStep('onboarding');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const savePreferences = async (dietary: DietaryType[], orderStyle: ('food' | 'mart')[]) => {
    await api.auth.savePreferences(dietary, orderStyle);
    if (user) {
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          dietary,
          orderStyle
        }
      });
    }
    setLoginStep('done');
  };

  const refreshProfile = async () => {
    try {
      const res = await api.auth.getProfile();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (e) {
      console.warn('Failed to refresh profile', e);
    }
  };

  const logout = () => {
    api.auth.logout();
    localStorage.removeItem('locabite_token');
    localStorage.removeItem('locabite_notifications');
    setUser(null);
    setIsLoggedIn(false);
    setLoginStep('input');
  };

  const loginAsDemo = async () => {
    const res = await api.auth.demoLogin();
    if (res.success && res.data?.accessToken) {
      localStorage.setItem('locabite_token', res.data.accessToken);
      setUser(res.data.user);
      setIsLoggedIn(true);
      setLoginStep('done');
    }
  };

  const loginWithToken = (token: string, userData: any) => {
    localStorage.setItem('locabite_token', token);
    setUser(userData);
    setIsLoggedIn(true);
    setLoginStep('done');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        loginStep,
        pendingIdentifier,
        sendOtp,
        verifyOtp,
        loginWithGoogle,
        savePreferences,
        refreshProfile,
        logout,
        loginAsDemo,
        loginWithToken,
        setLoginStep
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
