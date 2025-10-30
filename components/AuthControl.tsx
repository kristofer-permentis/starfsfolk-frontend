'use client';

import { useAuth } from '@/hooks/useAuth';
import Button from './Button';

export default function AuthControl() {
  const { user, isAuthenticated, login, logout } = useAuth();

  return (
    <div className="flex items-center gap-3">
      {isAuthenticated ? (
        <>
          <span className="text-sm text-gray-700">Skráður inn sem {user?.name}</span>
          <Button variant="pmgray" onClick={logout}>Útskrá</Button>

        </>
      ) : (
          <Button variant="pmgray" onClick={login}>Innskrá</Button>

      )}
    </div>
  );
}
