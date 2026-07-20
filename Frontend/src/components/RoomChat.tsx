'use client';

import { useState } from 'react';
import type { ChatMessage } from '@tien-len/shared';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

const EMOJIS = ['👍', '🔥', '😂', '😮', '👏', '😎', '🃏', '🏆'];

interface RoomChatProps {
  messages: ChatMessage[];
  onSend: (content: string, isEmoji?: boolean) => void;
}

export function RoomChat({ messages, onSend }: RoomChatProps) {
  const [text, setText] = useState('');
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  return (
    <div className="panel flex h-72 flex-col overflow-hidden md:h-full">
      <div className="border-b border-[var(--border)] px-4 py-3 font-semibold">{dict.chat}</div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
        {messages.map((m) => (
          <div key={m.id}>
            <span className="text-gold-300">{m.nickname}: </span>
            <span className={m.isEmoji ? 'text-xl' : 'text-[var(--muted)]'}>{m.content}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 border-t border-[var(--border)] px-3 py-2">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className="rounded-lg px-2 py-1 hover:bg-white/5"
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
          className="flex-1 rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-gold-400"
          maxLength={200}
        />
        <button type="submit" className="btn-primary !px-3 !py-2 text-sm">
          Send
        </button>
      </form>
    </div>
  );
}
