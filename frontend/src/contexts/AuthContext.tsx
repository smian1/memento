import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

interface AuthUser {
  userId: number;
  username: string;
  isAdmin: boolean;
}

interface UserConfig {
  timezone: string;
  hasApiKey?: boolean;
}

interface SystemStatus {
  hasUsers: boolean;
  needsSetup: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  needsConfig: boolean;
  config?: UserConfig | null;
}

interface AuthContextValue {
  loading: boolean;
  status: SystemStatus | null;
  user: AuthUser | null;
  config: UserConfig | null;
  refreshStatus: () => Promise<void>;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  completeSetup: (payload: { username: string; password: string; timezone: string; apiKey: string }) => Promise<void>;
  updateConfig: (payload: { timezone: string; apiKey: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus | null>(null);

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const response = await api.get<SystemStatus>('/system/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to load system status', error);
      const statusCode = (error as any)?.response?.status;
      if (statusCode === 401) {
        setStatus({
          hasUsers: true,
          needsSetup: false,
          authenticated: false,
          user: null,
          needsConfig: false
        });
      } else {
        setStatus({
          hasUsers: false,
          needsSetup: true,
          authenticated: false,
          user: null,
          needsConfig: false
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    await api.post('/auth/login', credentials);
    await refreshStatus();
  };

  const logout = async () => {
    await api.post('/auth/logout', {});
    await refreshStatus();
  };

  const completeSetup = async (payload: { username: string; password: string; timezone: string; apiKey: string }) => {
    await api.post('/auth/setup', payload);
    await refreshStatus();
  };

  const updateConfig = async (payload: { timezone: string; apiKey: string }) => {
    await api.put('/config', payload);
    await refreshStatus();
  };

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    status,
    user: status?.user ?? null,
    config: status?.config ?? null,
    refreshStatus,
    login,
    logout,
    completeSetup,
    updateConfig
  }), [loading, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
