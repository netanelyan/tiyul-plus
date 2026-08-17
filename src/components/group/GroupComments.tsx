'use client';

import { useState } from 'react';
import { commentsFor, type GroupComment } from '@/lib/trip/groupClient';

/**
 * The thread - per stop, or the general one when `placeId` is null.
 *
 * This is the piece that makes the shared trip worth using: voting says THAT
 * somebody objected, a comment says why ("we were there, it is closed on
 * Mondays"), and that sentence is what the group actually argues about. Without
 * it the conversation happens in WhatsApp and the plan and the discussion live in
 * two different places.
 *
 * Collapsed to a count until opened, because a trip has 20 stops and 20 open
 * threads is the wall this screen has been kept clear of.
 */
export default function GroupComments({
  placeId,
  comments,
  onAdd,
  onDelete,
  disabled,
  compact = true,
}: {
  placeId: string | null;
  comments: GroupComment[];
  onAdd: (body: string, placeId: string | null) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const mine = commentsFor(comments, placeId);
  const [open, setOpen] = useState(!compact);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErr(null);
    const res = await onAdd(body, placeId);
    setSending(false);
    if (res.ok) setText('');
    else setErr(res.error === 'too-many' ? 'הגעתם למגבלת התגובות בטיול הזה.' : 'לא נשלח - נסו שוב.');
  }

  if (compact && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1.5 flex min-h-[36px] items-center gap-1.5 rounded-full px-2 text-xs font-bold text-night/55 transition hover:text-sunset-deep"
      >
        💬 {mine.length > 0 ? `${mine.length} תגובות` : 'הוספת תגובה'}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl bg-cream/70 p-2.5 ring-1 ring-night/10">
      {mine.length === 0 && (
        <p className="px-1 pb-1.5 text-xs font-medium text-night/45">
          {placeId === null ? 'עוד לא נכתב כאן כלום.' : 'אף אחד לא הגיב על העצירה הזאת עדיין.'}
        </p>
      )}
      <ul className="space-y-1.5">
        {mine.map((c) => (
          <li key={c.id} className="rounded-lg bg-shell px-2.5 py-1.5 ring-1 ring-night/5">
            <p className="text-[11px] font-bold text-sunset-deep">
              {c.author}
              {c.mine && (
                <button
                  onClick={() => onDelete(c.id)}
                  className="ms-2 font-medium text-night/35 transition hover:text-night/70"
                  aria-label="מחיקת התגובה שלי"
                >
                  מחיקה
                </button>
              )}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-night/80">{c.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter is a new line - the messaging convention
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={disabled}
          rows={1}
          maxLength={500}
          placeholder={placeId === null ? 'משהו כללי על הטיול…' : 'מה דעתכם על העצירה הזאת?'}
          // 16px on mobile or iOS zooms the whole page on focus (session log, entry n)
          className="min-h-[44px] flex-1 resize-y rounded-lg border border-night/15 bg-shell px-3 py-2 text-base leading-relaxed text-night outline-none placeholder:text-night/35 focus:ring-4 focus:ring-sunset/15 disabled:opacity-50 sm:text-sm"
        />
        <button
          onClick={() => void submit()}
          disabled={disabled || sending || !text.trim()}
          className="min-h-[44px] shrink-0 rounded-lg bg-sunset px-4 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40"
        >
          {sending ? '…' : 'שליחה'}
        </button>
      </div>
      {err && <p className="mt-1 text-xs font-semibold text-sunset-deep">{err}</p>}
      {compact && (
        <button
          onClick={() => setOpen(false)}
          className="mt-1 text-[11px] font-bold text-night/40 transition hover:text-night/70"
        >
          סגירה
        </button>
      )}
    </div>
  );
}
