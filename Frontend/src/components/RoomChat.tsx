'use client';

import { useState } from 'react';
import type { ChatMessage } from '@tien-len/shared';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

const EMOJIS = ['👍', '🔥', '😂', '😮', '👏', '😎', '🃏', '🏆'];

interface RoomChatProps {
  messages: ChatMessage[];
  onSend: (content: string, isEmoji?: boolean) => void;
  mobile?: boolean;
}

export function RoomChat({ messages, onSend, mobile }: RoomChatProps) {
  const [text, setText] = useState('');
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  return (
    <div
      className={
        mobile
          ? 'flex h-full min-h-[40dvh] flex-col'
          : 'panel flex h-72 flex-col overflow-hidden md:h-full'
      }
    >
      {!mobile && (
        <div className="border-b border-[var(--border)] px-4 py-3 font-semibold">{dict.chat}</div>
      )}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-[var(--muted)]">{dict.chat}…</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="rounded-xl bg-black/15 px-3 py-2">
            <span className="text-xs font-semibold text-gold-300">{m.nickname}</span>
            <p className={m.isEmoji ? 'text-2xl' : 'text-[var(--muted)]'}>{m.content}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 border-t border-[var(--border)] px-3 py-2">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg active:bg-white/10"
            onClick={() => onSend(e, true)}
          >
            {e}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2 border-t border-[var(--border)] p-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!text.trim()) {
            return;
          }
          onSend(text.trim());
          setText('');
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-field !min-h-[44px] flex-1 !rounded-xl !py-2 text-sm"
          maxLength={200}
          placeholder={dict.chat}
        />
        <button type="submit" className="btn-primary !min-h-[44px] !rounded-xl !px-4 !py-2 text-sm">
          {dict.send}
        </button>
      </form>
    </div>
  );
}
