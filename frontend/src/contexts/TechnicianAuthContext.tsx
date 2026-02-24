'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  companyName: string;
}

interface TechnicianAuthContextType {
  technician: Technician | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPin: (email: string, pin: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const TechnicianAuthContext = createContext<TechnicianAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'technicianAccessToken';
const REFRESH_TOKEN_KEY = 'technicianRefreshToken';

export function TechnicianAuthProvider({ children }: { children: React.ReactNode }) {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Set up axios interceptor for technician requests
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        // Only add technician token for technician-portal routes
        if (config.url?.startsWith('/technician-portal')) {
          const token = localStorage.getItem(TOKEN_KEY);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  const loadTechnician = useCallback(async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token by getting profile
      const response = await api.get('/technician-portal/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTechnician(response.data.technician);
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setTechnician(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTechnician();
  }, [loadTechnician]);

  const login = async (email: string, password: string) => {
    const response = await api.post('/technician-portal/login', { email, password });
    const { technician: tech, accessToken, refreshToken } = response.data;

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setTechnician(tech);

    router.push('/technician');
  };

  const loginWithPin = async (email: string, pin: string) => {
    const response = await api.post('/technician-portal/login', { email, pin });
    const { technician: tech, accessToken, refreshToken } = response.data;

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setTechnician(tech);

    router.push('/technician');
  };

  const refreshToken = async () => {
    try {
      const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!currentRefreshToken) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/technician-portal/refresh-token', {
        refreshToken: currentRefreshToken
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    } catch (error) {
      logout();
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setTechnician(null);
    router.push('/technician/login');
  };

  return (
    <TechnicianAuthContext.Provider
      value={{ technician, loading, login, loginWithPin, logout, refreshToken }}
    >
      {children}
    </TechnicianAuthContext.Provider>
  );
}

export function useTechnicianAuth() {
  const context = useContext(TechnicianAuthContext);
  if (context === undefined) {
    throw new Error('useTechnicianAuth must be used within a TechnicianAuthProvider');
  }
  return context;
}
