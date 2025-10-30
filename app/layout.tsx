// layout.tsx
import '@/app/globals.css';
import { ReactNode } from 'react';
import AuthProvider from '@/lib/authProvider';
import { authService } from '@/lib/authService';
import LogoutButton from '@/components/LogoutButton';
import AuthControl from '@/components/AuthControl';

export const metadata = {
  title: 'Per mentis - forritasafn',
  description: 'Forritasafn',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="is">
    <head>
        <link
          rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
    </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <AuthProvider>
          <header className="flex items-center justify-between p-4 bg-white shadow-md">
  <div className="flex items-center gap-4">
    <img src="/logo-30mm.png" alt="Per mentis logo" className="h-12 w-auto" />
    <h1 className="text-lg font-bold">Per mentis - forritasafn</h1>
  </div>
  <AuthControl />
</header>
          <main className="p-6">{children}</main>
          <footer className="text-center text-sm text-gray-500 p-4">
            &copy; {new Date().getFullYear()} Per mentis slf.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
