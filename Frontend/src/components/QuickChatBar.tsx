'use client';

import { motion } from 'framer-motion';

const QUICK_MESSAGES = [
  'យូរមេស!!😒',
  'លឿនៗមើល!!😗',
  'បៀតូចៗដល់ហើយ!!😥',
  'ចេះស្អី!!😂',
  'ហាសហាសមិចដែរ!!😂',
  'ឈឺអត់!!🤣',
  'ដល់មេស!!😒',
  'សេដហាស!!😥',
  'ចាំមើលហាស!!😐',
  'ម្នាក់ម្ដងទេអាពៅ!!😊',
];

interface QuickChatBarProps {
  onSend: (content: string) => void;
  onClose?: () => void;
}

export function QuickChatBar({ onSend, onClose }: QuickChatBarProps) {
  return (
    <div className="quick-chat-bar flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Quick Chat
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-[var(--muted)] active:bg-white/10"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 py-2.5 scrollbar-none">
        {QUICK_MESSAGES.map((msg) => (
          <motion.button
            key={msg}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              onSend(msg);
              onClose?.();
            }}
            className="quick-chat-pill shrink-0 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium text-[var(--fg)] backdrop-blur-sm transition active:border-gold-400/60 active:bg-gold-500/15 active:text-gold-200"
          >
            {msg}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
