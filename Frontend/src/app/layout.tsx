import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { SiteHeader } from '@/components/SiteHeader';
import { MobileNav } from '@/components/MobileNav';
import { AppShell } from '@/components/AppShell';
import { APP_NAME, APP_NAME_EN } from '@/lib/config';

export const metadata: Metadata = {
  title: `${APP_NAME} · ${APP_NAME_EN}`,
  description: 'Online multiplayer Tien Len — Khmer & English',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#07111f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" suppressHydrationWarning>
      <body className="min-h-dvh bg-hero-mesh antialiased">
        <Providers>
          <SiteHeader />
          <AppShell>{children}</AppShell>
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
