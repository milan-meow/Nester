import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me()
      .then((r) => setUser(r.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('nestar:logout', onLogout);
    return () => window.removeEventListener('nestar:logout', onLogout);
  }, []);

  const accept = useCallback(({ user: u, token }) => {
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (creds) => accept(await api.login(creds)),
    register: async (data) => accept(await api.register(data)),
    becomeOwner: async () => accept(await api.updateMe({ role: 'owner' })),
    logout: () => {
      tokenStore.set(null);
      setUser(null);
    },
  }), [user, loading, accept]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
