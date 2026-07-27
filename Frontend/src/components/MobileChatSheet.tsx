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
      {/* Quick Chat FAB — lightning bolt */}
      <button
        type="button"
        className="mobile-chat-fab mobile-quick-fab fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-[4.5rem] z-30 flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/40 bg-[var(--panel)] text-lg shadow-lg backdrop-blur md:hidden"
        onClick={() => setQuickOpen(true)}
        aria-label="Quick Chat"
      >
        ⚡
      </button>

      {/* Full Chat FAB */}
      <button
        type="button"
        className="mobile-chat-fab fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500 text-base font-bold text-ink-900 shadow-glow md:hidden min-[900px]:h-14 min-[900px]:w-14 min-[900px]:text-lg"
        onClick={() => setOpen(true)}
        aria-label={dict.chat}
      >
        💬
      </button>

      {/* Quick Chat drawer */}
      <AnimatePresence>
        {quickOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickOpen(false)}
              aria-label="Close quick chat"
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl md:hidden"
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

      {/* Full Chat sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[78dvh] flex-col rounded-t-3xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl md:hidden"
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
              {/* Quick chat strip inside the full chat sheet */}
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
