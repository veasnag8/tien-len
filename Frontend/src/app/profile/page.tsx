'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { LITE_MODE } from '@/lib/config';
import { t } from '@/lib/i18n';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const logout = useAuthStore((s) => s.logout);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  useEffect(() => {
    if (LITE_MODE) {
      router.replace('/');
    }
  }, [router]);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.profile(),
    enabled: Boolean(user),
  });
  const historyQuery = useQuery({
    queryKey: ['history'],
    queryFn: () => api.history(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [loading, router, user]);

  if (LITE_MODE) {
    return null;
  }

  if (loading || !user) {
    return <p className="p-10 text-center">Loading…</p>;
  }

  const profile = profileQuery.data ?? user;

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <div className="panel p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-felt-700 text-2xl font-bold text-gold-300">
            {profile.nickname.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-4xl text-gold-300">{profile.nickname}</h1>
            <p className="text-[var(--muted)]">
              {profile.country} · {profile.provider}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <Stat label={dict.gamesPlayed} value={String(profile.gamesPlayed)} />
          <Stat label={dict.wins} value={String(profile.wins)} />
          <Stat label={dict.winRate} value={`${profile.winRate}%`} />
          <Stat label={dict.points} value={String(profile.points)} />
        </div>

        <h2 className="font-display mt-10 mb-4 text-2xl text-gold-300">{dict.history}</h2>
        <div className="space-y-2">
          {(historyQuery.data ?? []).map((h) => (
            <div
              key={h.id}
              className="flex justify-between rounded-xl border border-[var(--border)] bg-black/20 px-4 py-3 text-sm"
            >
              <span>
                #{h.placement} / {h.playerCount} ·{' '}
                <span className={h.points < 0 ? 'text-rose-300' : 'text-emerald-300'}>
                  {h.points > 0 ? `+${h.points}` : h.points} pts
                </span>
              </span>
              <span className="text-[var(--muted)]">
                {new Date(h.playedAt).toLocaleString()}
              </span>
            </div>
          ))}
          {(historyQuery.data ?? []).length === 0 && (
            <p className="text-[var(--muted)]">No games yet</p>
          )}
        </div>

        <button
          type="button"
          className="btn-secondary mt-8"
          onClick={() => void logout().then(() => router.push('/'))}
        >
          {dict.logout}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-3xl text-gold-300">{value}</p>
    </div>
  );
}
