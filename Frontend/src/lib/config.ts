export const APP_NAME = 'ទៀនលើន';
export const APP_NAME_EN = 'Tien Len';
export const LITE_MODE =
  process.env.NEXT_PUBLIC_LITE_MODE === 'true' ||
  process.env.NEXT_PUBLIC_LITE_MODE === '1';

function shouldUseRelativeUrls(): boolean {
  if (
    process.env.NEXT_PUBLIC_RELATIVE_URLS === 'true' ||
    process.env.NEXT_PUBLIC_RELATIVE_URLS === '1'
  ) {
    return true;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port;
    if (port === '8080') {
      return true;
    }
    return (
      host.includes('trycloudflare.com') ||
      host.endsWith('.cloudflare.com') ||
      host.endsWith('.workers.dev')
    );
  }
  return false;
}

export function getApiUrl(): string {
  if (shouldUseRelativeUrls()) {
    return '/api';
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
}

export function getWsUrl(): string {
  if (typeof window !== 'undefined' && shouldUseRelativeUrls()) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';
}

/** @deprecated use getApiUrl() */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
/** @deprecated use getWsUrl() */
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';
