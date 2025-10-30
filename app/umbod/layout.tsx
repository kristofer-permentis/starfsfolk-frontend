import '@/app/globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Per mentis - veita umboð',
  description: 'Per mentis - veita umboð',
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
    <body className="min-h-screen bg-white text-gray-900">
    { /* <body className="min-h-screen bg-gray-50 text-gray-900"> */ }
      {/*} <header className="flex items-center justify-between p-4 bg-white shadow-md">
  <div className="flex items-center gap-4">
    <img src="/logo-30mm.png" alt="Per mentis logo" className="h-12 w-auto" />
    <h1 className="text-lg font-bold">Per mentis</h1>
  </div>
</header> */}
          <main className="p-6">{children}</main>
      </body>
    </html>
  );
}