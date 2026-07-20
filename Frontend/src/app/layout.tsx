import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { SiteHeader } from '@/components/SiteHeader';
import { APP_NAME, APP_NAME_EN } from '@/lib/config';

export const metadata: Metadata = {
  title: `${APP_NAME} · ${APP_NAME_EN}`,
  description: 'Online multiplayer Tien Len — Khmer & English',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" suppressHydrationWarning>
      <body className="min-h-screen bg-hero-mesh antialiased">
        <Providers>
          <SiteHeader />
          <main className="relative z-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
