'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { LITE_MODE } from '@/lib/config';
import { t } from '@/lib/i18n';
import { API_URL } from '@/lib/config';

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (LITE_MODE) {
      router.replace('/');
    }
  }, [router]);

  if (LITE_MODE) {
    return null;
  }

  const nextPath = params.get('next') || '/play';

  function goNext() {
    router.push(nextPath.startsWith('/') ? nextPath : '/play');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result =
        mode === 'login'
          ? await api.login({ email, password })
          : await api.register({ email, password, nickname });
      api.setToken(result.accessToken);
      setUser(result.user);
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function guest() {
    const name = nickname.trim();
    if (!name || name.length < 2) {
      setError(dict.nicknameRequired);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.guest({ nickname: name });
      api.setToken(result.accessToken);
      setUser(result.user);
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-pad mx-auto max-w-md">
      <div className="panel p-5 sm:p-8">
        <h1 className="font-display mb-6 text-4xl text-gold-300">
          {mode === 'login' ? dict.login : dict.register}
        </h1>

        <div className="mb-4 grid gap-2">
          <a className="btn-secondary w-full" href={`${API_URL}/auth/google`}>
            {dict.google}
          </a>
          <a className="btn-secondary w-full" href={`${API_URL}/auth/facebook`}>
            {dict.facebook}
          </a>
        </div>

        <div className="my-5 text-center text-sm text-[var(--muted)]">or</div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <input
            className="input-field"
            placeholder={dict.enterNickname}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            minLength={2}
            maxLength={24}
            required={mode === 'register'}
          />
          <input
            className="input-field"
            type="email"
            placeholder={dict.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder={dict.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {mode === 'login' ? dict.login : dict.register}
          </button>
        </form>

        <button
          type="button"
          className="btn-secondary mt-3 w-full"
          onClick={() => void guest()}
          disabled={loading}
        >
          {dict.guest}
        </button>

        <button
          type="button"
          className="mt-4 text-sm text-gold-300"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? dict.register : dict.login}
        </button>

        <Link href="/" className="mt-6 block text-sm text-[var(--muted)]">
          ← Home
        </Link>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center">Loading…</p>}>
      <AuthForm />
    </Suspense>
  );
}
