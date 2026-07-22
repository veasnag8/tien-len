'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrateSettings();
    void hydrateAuth().then(() => {
      // Boot realtime socket after token hydrate (dynamic import avoids circular load)
      void import('@/lib/use-game-socket').then(({ ensureGameSocket }) => {
        ensureGameSocket();
      });
    });
  }, [hydrateAuth, hydrateSettings]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
