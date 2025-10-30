// Það er ekki verið að nota þessa skrá eins og er, en hún er importeruð á einhverjum stöðum


'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/lib/authService';

export default function LogoutButton() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    authService.getUser().then(user => {
      if (user?.name) setName(user.name);
    });
  }, []);

  return (
    <div className="flex items-center gap-3">
      {name && (
        <span className="text-sm text-gray-700">
          Skráður inn sem {name}
        </span>
      )}
      <button
        onClick={authService.logout}
        style={{ backgroundColor: 'var(--pm-gray-dark)' }}
        className="text-white px-4 py-2 rounded hover:opacity-90 transition"
      >
        Logout
      </button>
    </div>
  );
}
