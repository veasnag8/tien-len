'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChatMessage } from '@tien-len/shared';
import { RoomChat } from './RoomChat';
import { QuickChatBar } from './QuickChatBar';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

interface MobileChatSheetProps {
  messages: ChatMessage[];
  onSend: (content: string, isEmoji?: boolean) => void;
}

/** In-game only — use lg:hidden so landscape phones (often >768px wide) still see FABs. */
export function MobileChatSheet({ messages, onSend }: MobileChatSheetProps) {
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!quickOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [quickOpen]);

  return (
    <>
      {/* Quick Chat */}
      <button
        type="button"
        className="mobile-chat-fab mobile-quick-fab fixed z-[45] flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/50 bg-black/70 text-base shadow-lg backdrop-blur lg:hidden"
        style={{
          top: 'max(0.35rem, env(safe-area-inset-top, 0px))',
          right: 'max(9.5rem, calc(env(safe-area-inset-right, 0px) + 8.75rem))',
        }}
        onClick={() => setQuickOpen(true)}
        aria-label="Quick Chat"
      >
        ⚡
      </button>

      {/* Chat — clear bubble so it doesn’t look like a coin */}
      <button
        type="button"
        className="mobile-chat-fab fixed z-[45] flex h-10 min-w-10 items-center justify-center gap-0.5 rounded-full border border-gold-400/60 bg-gold-500 px-2 text-[11px] font-bold text-ink-900 shadow-glow lg:hidden"
        style={{
          top: 'max(0.35rem, env(safe-area-inset-top, 0px))',
          right: 'max(6.75rem, calc(env(safe-area-inset-right, 0px) + 6rem))',
        }}
        onClick={() => setOpen(true)}
        aria-label={dict.chat}
      >
        💬
      </button>

      <AnimatePresence>
        {quickOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickOpen(false)}
              aria-label="Close quick chat"
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl lg:hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div className="flex justify-center px-4 pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>
              <QuickChatBar
                onSend={(msg) => onSend(msg)}
                onClose={() => setQuickOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[78dvh] flex-col rounded-t-3xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl lg:hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
                <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center justify-between px-5 pb-2">
                <h3 className="font-display text-xl text-gold-300">{dict.chat}</h3>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)]"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
              <div className="border-b border-[var(--border)]">
                <QuickChatBar onSend={(msg) => { onSend(msg); setOpen(false); }} />
              </div>
              <div className="min-h-0 flex-1 px-2">
                <RoomChat messages={messages} onSend={onSend} mobile />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
