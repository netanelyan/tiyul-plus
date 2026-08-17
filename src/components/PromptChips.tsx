'use client';

import { useEffect, useRef, useState } from 'react';
import { pickChips, type PromptChip } from '@/lib/promptChips';

/**
 * The opening suggestions as a single dropdown instead of wrapped pills: an "ideas for a trip"
 * button opens a panel of rows (emoji + text). Selecting fills the input (chip.fill when
 * present) and closes - it does not send. Keyboard: arrows between rows, Escape closes; it
 * also closes on an outside click. No menu library - tokens only.
 * The trigger is deterministic (SSR-safe); the random selection runs after mount.
 */
export default function PromptChips({
  onPick,
  trailing,
}: {
  onPick: (text: string) => void;
  trailing?: React.ReactNode;
}) {
  const [chips, setChips] = useState<PromptChip[] | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setChips(pickChips());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onRootKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !chips?.length) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const current = rowRefs.current.findIndex((el) => el === document.activeElement);
    const dir = e.key === 'ArrowDown' ? 1 : -1;
    const next = (current + dir + chips.length) % chips.length;
    rowRefs.current[next]?.focus();
  };

  return (
    <div ref={rootRef} onKeyDown={onRootKeyDown} className="relative mx-auto mt-4 w-full max-w-2xl">
      {/* badge is inline-flex, so mx-auto does not centre it - wrap it in a flex row.
          trailing (the kashrut toggle) sits in the same centred row. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="badge rounded-full bg-shell px-4 py-2.5 text-sm font-semibold text-night/70 ring-1 ring-night/10 transition hover:bg-sunset/5 hover:text-night hover:ring-sunset/30"
        >
          <span aria-hidden>💡</span>
          רעיונות לטיול
          <span
            aria-hidden
            className={`text-xs text-night/40 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </button>
        {trailing}
      </div>

      {open && chips && (
        <div
          role="listbox"
          aria-label="רעיונות לטיול"
          className="rise-in absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl bg-shell p-2 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
        >
          {chips.map((chip, i) => (
            <button
              key={chip.text}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              role="option"
              aria-selected={false}
              onClick={() => {
                onPick(chip.fill ?? chip.text);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start font-medium text-night/80 outline-none transition hover:bg-sunset/5 hover:text-night focus:bg-sunset/5"
            >
              <span className="shrink-0 text-lg leading-none" aria-hidden>
                {chip.emoji}
              </span>
              <span className="min-w-0 truncate">{chip.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
