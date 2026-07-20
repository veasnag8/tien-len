'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

export default function HomePage() {
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center px-5 pb-16 pt-8 md:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -right-16 top-8 h-80 w-80 rounded-full bg-[#c43c3c]/15 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 9, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-8 left-0 h-96 w-96 rounded-full bg-gold-500/12 blur-3xl"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 11, repeat: Infinity }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
      </div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 text-sm tracking-[0.28em] text-gold-400"
      >
        {dict.eyebrow}
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="font-display max-w-4xl text-5xl leading-tight text-gold-300 md:text-7xl"
      >
        {dict.brand}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="mt-2 text-xl text-[var(--muted)] md:text-2xl"
      >
        {dict.brandKh}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-5 max-w-xl text-lg text-[var(--muted)]"
      >
        {dict.tagline}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="mt-10 flex flex-wrap gap-3"
      >
        <Link href="/play" className="btn-primary">
          {dict.play}
        </Link>
        <Link href="/room/create" className="btn-secondary">
          {dict.createRoom}
        </Link>
        <Link href="/room/join" className="btn-secondary">
          {dict.joinRoom}
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mt-16 grid max-w-3xl gap-4 sm:grid-cols-3"
      >
        {[
          { href: '/profile', label: dict.profile },
          { href: '/leaderboard', label: dict.leaderboard },
          { href: '/settings', label: dict.settings },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="panel px-4 py-5 transition hover:border-gold-400/50"
          >
            <span className="font-display text-2xl text-gold-300">{item.label}</span>
          </Link>
        ))}
      </motion.div>
    </section>
  );
}
