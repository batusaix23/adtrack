'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  serviceCompany: string;
}

interface ClientPortalAuthContextType {
  client: Client | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const ClientPortalAuthContext = createContext<ClientPortalAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'portalAccessToken';
const REFRESH_TOKEN_KEY = 'portalRefreshToken';

export function ClientPortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Set up axios interceptor for portal requests
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        // Only add portal token for portal routes
        if (config.url?.startsWith('/portal')) {
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

  const loadClient = useCallback(async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token by getting profile
      const response = await api.get('/portal/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClient({
        id: response.data.client.id,
        firstName: response.data.client.firstName,
        lastName: response.data.client.lastName,
        companyName: response.data.client.companyName,
        email: response.data.client.email,
        serviceCompany: response.data.client.serviceCompany
      });
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const login = async (email: string, password: string) => {
    const response = await api.post('/portal/login', { email, password });
    const { client: clientData, accessToken, refreshToken } = response.data;

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setClient(clientData);

    router.push('/portal');
  };

  const refreshToken = async () => {
    try {
      const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!currentRefreshToken) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/portal/refresh-token', {
        refreshToken: currentRefreshToken
      });

      const { accessToken } = response.data;
      localStorage.setItem(TOKEN_KEY, accessToken);
    } catch (error) {
      logout();
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setClient(null);
    router.push('/portal/login');
  };

  return (
    <ClientPortalAuthContext.Provider
      value={{ client, loading, login, logout, refreshToken }}
    >
      {children}
    </ClientPortalAuthContext.Provider>
  );
}

export function useClientPortalAuth() {
  const context = useContext(ClientPortalAuthContext);
  if (context === undefined) {
    throw new Error('useClientPortalAuth must be used within a ClientPortalAuthProvider');
  }
  return context;
}
