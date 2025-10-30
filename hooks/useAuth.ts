'use client';

import { useEffect, useState } from 'react';
import { authService, UserInfo } from '@/lib/authService';

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true); // add this

  useEffect(() => {
    // Initial load
    authService.getUser().then(setUser).finally(() => setLoading(false));

    // Subscribe to changes
    const unsubscribe = authService.subscribe(() => {
      setLoading(true);
      authService.getUser().then(setUser).finally(() => setLoading(false));
    });

    return unsubscribe;
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    login: authService.login,
    logout: authService.logout,
    getToken: authService.getToken,
    loading, // ← add this
  };
}
