'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

export default function HomePage() {
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  return (
    <section className="page-pad mx-auto flex min-h-[calc(100dvh-var(--header-h)-var(--mobile-nav-h))] max-w-6xl flex-col justify-center pb-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -right-16 top-8 h-56 w-56 rounded-full bg-crimson/15 blur-3xl sm:h-80 sm:w-80"
          animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 9, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-24 left-0 h-64 w-64 rounded-full bg-gold-500/12 blur-3xl sm:bottom-8 sm:h-96 sm:w-96"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 11, repeat: Infinity }}
        />
      </div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-xs tracking-[0.22em] text-gold-400 sm:text-sm sm:tracking-[0.28em]"
      >
        {dict.eyebrow}
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="font-display max-w-4xl text-4xl leading-tight text-gold-300 sm:text-5xl md:text-7xl"
      >
        {dict.brand}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="mt-1 text-lg text-[var(--muted)] sm:text-xl md:text-2xl"
      >
        {dict.brandKh}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 max-w-xl text-base text-[var(--muted)] sm:text-lg"
      >
        {dict.tagline}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="mt-8 grid gap-3 sm:mt-10 sm:flex sm:flex-wrap"
      >
        <Link href="/play" className="btn-primary w-full sm:w-auto">
          {dict.play}
        </Link>
        <Link href="/room/create" className="btn-secondary w-full sm:w-auto">
          {dict.createRoom}
        </Link>
        <Link href="/room/join" className="btn-secondary w-full sm:w-auto">
          {dict.joinRoom}
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mt-10 grid grid-cols-3 gap-2 sm:mt-16 sm:max-w-3xl sm:gap-4"
      >
        {[
          { href: '/profile', label: dict.profile, icon: '👤' },
          { href: '/leaderboard', label: dict.leaderboard, icon: '🏆' },
          { href: '/settings', label: dict.settings, icon: '⚙️' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="panel flex flex-col items-center gap-2 px-2 py-4 text-center transition active:scale-[0.98] sm:items-start sm:px-4 sm:py-5 sm:text-left"
          >
            <span className="text-2xl sm:hidden">{item.icon}</span>
            <span className="font-display text-sm text-gold-300 sm:text-2xl">{item.label}</span>
          </Link>
        ))}
      </motion.div>
    </section>
  );
}
