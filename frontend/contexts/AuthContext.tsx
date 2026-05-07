import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, clearAuthTokens, getAccessToken, saveAuthTokens } from '@/lib/api';
import { AuthUser } from '@/types/database';

interface AuthContextType {
  user: AuthUser | null;
  session: string | null;
  profile: AuthUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null; user?: AuthUser }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, role: 'landlord' | 'tenant', phone?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const normalizeUser = (user: any): AuthUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  firstName: user.firstName,
  lastName: user.lastName,
  name: `${user.firstName} ${user.lastName}`,
  phone: user.phone ?? '',
  profileImage: user.profileImage ?? '',
  mustChangePassword: user.mustChangePassword ?? false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const data = await apiGet('/api/auth/me');
      const normalized = normalizeUser(data.user);
      setUser(normalized);
      setProfile(normalized);
      const token = await getAccessToken();
      setSession(token);
    } catch (error) {
      setUser(null);
      setProfile(null);
      setSession(null);
      await clearAuthTokens();
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  useEffect(() => {
    const init = async () => {
      try {
        await fetchProfile();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const signIn = async (identifier: string, password: string) => {
    try {
      const data = await apiPost('/api/auth/login', { identifier, password });
      if (!data?.token || !data?.refreshToken || !data?.user) {
        return { error: 'Invalid login response' };
      }
      await saveAuthTokens(data.token, data.refreshToken);
      const normalized = normalizeUser(data.user);
      setUser(normalized);
      setProfile(normalized);
      setSession(data.token);
      return { error: null, user: normalized };
    } catch (error: any) {
      return { error: error.message || 'Unable to sign in' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: 'landlord' | 'tenant',
    phone: string = ''
  ) => {
    try {
      await apiPost('/api/auth/register', {
        email,
        password,
        firstName,
        lastName,
        phone,
        role
      });
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Unable to register' };
    }
  };

  const signOut = async () => {
    await clearAuthTokens();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
