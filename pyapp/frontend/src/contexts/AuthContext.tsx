import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';

export type AuthRole = {
  name?: string;
  display_name?: string;
};

export type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  phone_number?: string;
  ambassador_id?: string;
  ambassador_profile?: { id?: string };
  permissions?: string[];
  must_change_password?: boolean;
  role?: AuthRole | null;
  roles?: string[];
  [key: string]: unknown;
};

type AuthContextValues = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  showPasswordChange: boolean;
  login: (email: string, password: string) => Promise<{ data: { data: { token: string; user: AuthUser } } }>;
  logout: () => void;
  register: (userData: Record<string, unknown>) => Promise<{ data: { data: { message: string } } }>;
  getProfile: () => Promise<AuthUser | null>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  dismissPasswordChange: () => void;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValues | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    // Clear corrupted data (token stored as literal 'undefined' string)
    if (!storedToken || storedToken === 'undefined' || storedToken === 'null') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        setUser(parsedUser);
        setToken(storedToken);
        if (parsedUser.permissions && Array.isArray(parsedUser.permissions)) {
          setPermissions(parsedUser.permissions as string[]);
        }
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
    return () => { mountedRef.current = false; };
  }, []);

    const login = async (email: string, password: string) => {
     const response = await authAPI.login(email, password);
    const body = response.data;
    const data = body?.data ?? body;
    const loginToken = data?.token;
    const loginUser = data?.user;
    if (!loginToken || typeof loginToken !== 'string') {
      throw new Error('Login response missing token');
    }
    localStorage.setItem('token', loginToken);
    setToken(loginToken);

    // Fetch full profile with ambassador_profile from /me endpoint
    try {
      const meResponse = await authAPI.getMe();
      const meData = meResponse.data as AuthUser;
      localStorage.setItem('user', JSON.stringify(meData));
      setUser(meData);
      if (meData?.permissions && Array.isArray(meData.permissions)) {
        setPermissions(meData.permissions as string[]);
      }
      if (meData?.must_change_password) {
        setShowPasswordChange(true);
      }
    } catch {
      // Fallback to login response if /me fails
      const fallbackUser = loginUser as AuthUser | null;
      localStorage.setItem('user', JSON.stringify(fallbackUser));
      setUser(fallbackUser);
      if (loginUser?.permissions && Array.isArray(loginUser.permissions)) {
        setPermissions(loginUser.permissions as string[]);
      }
      if (loginUser?.must_change_password) {
        setShowPasswordChange(true);
      }
    }
    return response;
  };

  const logout = () => {
    if (!mountedRef.current) return;
    // Remove saved credentials for the current user
    if (user?.email) {
      localStorage.removeItem(`credentials:${user.email}`);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setPermissions([]);
    window.location.href = '/login';
  };

  const register = async (userData: Record<string, unknown>) => {
    return await authAPI.register(userData);
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
    await authAPI.changePassword(data);
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.must_change_password = false;
        localStorage.setItem('user', JSON.stringify(parsedUser));
        setUser(parsedUser);
      } catch {
        // ignore
      }
    }
    setShowPasswordChange(false);
  };

  const dismissPasswordChange = () => {
    setShowPasswordChange(false);
  };

  const getProfile = async () => {
    if (!token) return null;
    const response = await authAPI.getProfile();
    const userData = response.data as AuthUser;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Extract permissions from user object
    if (userData.permissions && Array.isArray(userData.permissions)) {
      setPermissions(userData.permissions as string[]);
    }
    return userData;
  };

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, showPasswordChange, login, logout, register, changePassword, dismissPasswordChange, getProfile, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
