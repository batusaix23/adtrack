import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aguadulce Track - Sistema de Mantenimiento de Piscinas',
  description: 'Sistema SaaS para empresas de mantenimiento de piscinas',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Aguadulce Track',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AguaTrack" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1e293b',
                color: '#fff',
                borderRadius: '10px',
              },
            }}
          />
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registered:', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
