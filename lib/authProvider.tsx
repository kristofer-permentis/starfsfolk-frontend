'use client';

import { setAuthProvider } from './authService';
import { msalProvider } from './providers/msalProvider';
import { ReactNode, useEffect, useState } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // This can be replaced with logic to choose between MSAL / Dokobit later
    setAuthProvider(msalProvider);
    setReady(true);
  }, []);

  if (!ready) return null; // Or a spinner

  return <>{children}</>;
}
