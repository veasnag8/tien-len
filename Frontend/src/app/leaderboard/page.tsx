'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LeaderboardPeriod } from '@tien-len/shared';
import { api } from '@/lib/api';
import { useSettingsStore } from '@/lib/settings-store';
import { LITE_MODE } from '@/lib/config';
import { t } from '@/lib/i18n';

const PERIODS: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly', 'all_time'];

export default function LeaderboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time');
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  useEffect(() => {
    if (LITE_MODE) {
      router.replace('/');
    }
  }, [router]);

  const labels: Record<LeaderboardPeriod, string> = {
    daily: dict.daily,
    weekly: dict.weekly,
    monthly: dict.monthly,
    all_time: dict.allTime,
  };

  const query = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => api.leaderboard(period),
    enabled: !LITE_MODE,
  });

  if (LITE_MODE) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="font-display mb-6 text-5xl text-gold-300">{dict.leaderboard}</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={period === p ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setPeriod(p)}
          >
            {labels[p]}
          </button>
        ))}
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">W</th>
              <th className="px-4 py-3">WR</th>
              <th className="px-4 py-3">Pts</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((row) => (
              <tr key={row.userId} className="border-b border-[var(--border)]/50">
                <td className="px-4 py-3 text-gold-300">{row.rank}</td>
                <td className="px-4 py-3">
                  {row.nickname}{' '}
                  <span className="text-[var(--muted)]">{row.country}</span>
                </td>
                <td className="px-4 py-3">{row.wins}</td>
                <td className="px-4 py-3">{row.winRate}%</td>
                <td className="px-4 py-3">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.isLoading && <p className="p-4 text-[var(--muted)]">Loading…</p>}
      </div>
    </div>
  );
}
