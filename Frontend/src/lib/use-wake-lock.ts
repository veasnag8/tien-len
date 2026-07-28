'use client';

import { useEffect, useRef } from 'react';

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};

function supportsWakeLock(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

/**
 * Keep the screen on while `enabled` is true (room lobby + match).
 * Uses Screen Wake Lock API + silent playing-video fallback, and
 * re-acquires after tab hide/show, focus, pageshow, and user gestures.
 */
export function useWakeLock(enabled: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) {
      void releaseAll();
      return;
    }

    let cancelled = false;

    async function acquire(): Promise<void> {
      if (cancelled || !enabledRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      if (supportsWakeLock()) {
        try {
          const nav = navigator as Navigator & {
            wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
          };
          const sentinel = await nav.wakeLock.request('screen');
          if (cancelled || !enabledRef.current) {
            await sentinel.release().catch(() => undefined);
            return;
          }
          if (sentinelRef.current && !sentinelRef.current.released) {
            await sentinelRef.current.release().catch(() => undefined);
          }
          sentinelRef.current = sentinel;
          sentinel.addEventListener('release', () => {
            sentinelRef.current = null;
            if (enabledRef.current && document.visibilityState === 'visible') {
              void acquire();
            }
          });
          // Wake Lock held — video fallback not needed
          stopVideoFallback();
          return;
        } catch {
          // Denied / insecure context / battery saver → video fallback
        }
      }

      startVideoFallback();
    }

    function startVideoFallback(): void {
      if (cancelled) return;
      let video = videoRef.current;
      if (!video) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 2;
          canvas.height = 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 2, 2);
          }

          video = document.createElement('video');
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.style.cssText =
            'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;left:0;z-index:-1';

          // Prefer MediaStream from canvas (no binary asset needed)
          if (typeof canvas.captureStream === 'function') {
            video.srcObject = canvas.captureStream(1);
          }

          document.body.appendChild(video);
          videoRef.current = video;
        } catch {
          return;
        }
      }

      void video.play().catch(() => {
        // Autoplay blocked until next user gesture
      });
    }

    function stopVideoFallback(): void {
      const video = videoRef.current;
      if (!video) return;
      try {
        video.pause();
        const stream = video.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
        video.remove();
      } catch {
        // ignore
      }
      videoRef.current = null;
    }

    async function releaseAll(): Promise<void> {
      stopVideoFallback();
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        await sentinel.release().catch(() => undefined);
      }
    }

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && enabledRef.current) {
        void acquire();
      }
    };
    const onFocus = () => {
      if (enabledRef.current) void acquire();
    };
    const onPageShow = () => {
      if (enabledRef.current) void acquire();
    };
    const onGesture = () => {
      if (enabledRef.current) void acquire();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('pointerdown', onGesture, { passive: true });
    document.addEventListener('touchstart', onGesture, { passive: true });

    // Some Android OEMs drop wake locks quietly — refresh every 20s
    const interval = window.setInterval(() => {
      if (!enabledRef.current || document.visibilityState !== 'visible') return;
      const locked = sentinelRef.current && !sentinelRef.current.released;
      if (!locked) void acquire();
    }, 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('pointerdown', onGesture);
      document.removeEventListener('touchstart', onGesture);
      void releaseAll();
    };
  }, [enabled]);
}
