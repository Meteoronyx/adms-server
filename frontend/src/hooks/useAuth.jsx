import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { me } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const verifySession = useCallback(async () => {
    try {
      const res = await me();
      setIsAuthenticated(true);
      if (res && res.user) {
        setUser(res.user);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = useCallback(async (userData) => {
    setIsAuthenticated(true);
    if (userData && Array.isArray(userData.permissions)) {
      setUser(userData);
    } else {
      await verifySession();
    }
  }, [verifySession]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const hasPermission = useCallback((permissionCode) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    if (perms.includes('*')) return true;
    return perms.includes(permissionCode);
  }, [user]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading, refetchUser: verifySession, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
