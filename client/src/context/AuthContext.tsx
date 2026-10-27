import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../lib/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: { email: string; password: string; first_name: string; last_name: string; phone?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  quickLogin: (role: UserRole) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; title: string }> = {
  citizen: {
    email: 'citizen1@civictrack.demo',
    pass: 'Citizen@CivicTrack2024',
    title: 'Citizen (Rahul Verma)',
  },
  officer: {
    email: 'officer.roads@civictrack.demo',
    pass: 'Officer@CivicTrack2024',
    title: 'Field Officer (Amit Singh)',
  },
  manager: {
    email: 'roads.manager@civictrack.demo',
    pass: 'Manager@CivicTrack2024',
    title: 'Dept Manager (Priya Sharma)',
  },
  admin: {
    email: 'admin@civictrack.demo',
    pass: 'Admin@CivicTrack2024',
    title: 'System Admin (Rajesh Kumar)',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await authApi.login({ email, password });
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
        toast.success(`Welcome back, ${res.data.data.user.first_name}!`);
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed. Please check credentials.';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; first_name: string; last_name: string; phone?: string }): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await authApi.register(data);
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
        toast.success('Registration successful!');
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed.';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      toast.success('Logged out successfully');
    } catch {
      setUser(null);
    }
  };

  const quickLogin = async (role: UserRole): Promise<boolean> => {
    const creds = DEMO_CREDENTIALS[role];
    if (!creds) return false;
    const success = await login(creds.email, creds.pass);
    if (success) {
      toast.success(`Switched persona to: ${creds.title}`);
    }
    return success;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        quickLogin,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { DEMO_CREDENTIALS };
