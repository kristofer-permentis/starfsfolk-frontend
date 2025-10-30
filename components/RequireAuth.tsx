'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
  unauthorized?: ReactNode;
}

export default function RequireAuth({
  children,
  fallback = <p>Loading...</p>,
  unauthorized = <p>Access denied.</p>,
}: RequireAuthProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return fallback;
  if (!isAuthenticated) return unauthorized;

  return <>{children}</>;
}
