'use client';

import { useState, useSyncExternalStore } from 'react';

/**
 * What this device is currently holding, and the buttons to remove it.
 *
 * ## Why this is not a cookie banner
 *
 * The audit behind it found no analytics, no pixel, no advertising network and
 * no cookie on any ordinary page - so there is nothing here to consent to, and
 * a banner asking permission for nothing is its own kind of dark pattern:
 * it trains people to dismiss a dialog that carried no choice.
 *
 * What the site *does* keep is browser storage, and the honest version of
 * "reject" and "change your mind later" for browser storage is this: show what
 * is actually there, right now, and let it be deleted - per item, not
 * all-or-nothing.
 *
 * ## The split down the middle is the important part
 *
 * `content` is the traveller's own work. For somebody without an account it
 * exists **nowhere else**, so deleting it is losing it, and a control that
 * makes that easy to do by accident is worse than no control. It is separated,
 * labelled, and asks before it acts.
 *
 * `optional` is everything the site could do without. Those delete on one
 * click with no confirmation, because nothing is lost.
 *
 * Nothing here is read on the server and no value is ever displayed - only
 * whether a key is present and roughly how large it is. The point is to answer
 * "what do you have on me", not to put it back on the screen.
 */

type Group = 'optional' | 'content';

interface StoredItem {
  key: string;
  label: string;
  what: string;
  group: Group;
  /** A key that is a prefix rather than an exact name (per-trip chat history) */
  prefix?: boolean;
}

const ITEMS: StoredItem[] = [
  {
    key: 'tiyul-plus:last-email',
    label: 'כתובת המייל האחרונה',
    what: 'נשמרת רק אם ביקשתם, בתיבת ההתחברות. זה הדבר היחיד כאן שאינו נדרש לתפעול.',
    group: 'optional',
  },
  {
    key: 'tiyul-plus:kosher-pref',
    label: 'מתג ״אוכל כשר״',
    what: 'המצב שבחרתם בדף הבית. מעיד על העדפה דתית, ולכן נאמר כאן במפורש.',
    group: 'optional',
  },
  {
    key: 'tiyul-plus:a11y',
    label: 'הגדרות נגישות',
    what: 'גודל טקסט, ניגודיות, עצירת אנימציות. מחיקה מחזירה את האתר לברירת המחדל.',
    group: 'optional',
  },
  {
    key: 'tiyul-plus:coach:agent',
    label: 'סימון שראיתם את הסבר הפתיחה',
    what: 'מחיקה תציג אותו שוב.',
    group: 'optional',
  },
  {
    key: 'tiyul-plus:cities:v1',
    label: 'נתוני ערים שנשמרו',
    what: 'תוכן מהקטלוג הציבורי, לא מידע עליכם. נשמר כדי שהטיול ייפתח גם בלי אינטרנט.',
    group: 'optional',
  },
  {
    key: 'tiyul-plus:explored:v2',
    label: 'יעדים שנחקרו לבקשתכם',
    what: 'ערים מחוץ לקטלוג שביקשתם מהסוכן לבדוק.',
    group: 'optional',
  },
  {
    key: 'tiyul-plus:client-id',
    label: 'מזהה דפדפן',
    what: 'מחרוזת אקראית לחלוקת מכסות שימוש. אין בה שום פרט עליכם. מחיקה תיצור אחת חדשה בפעם הבאה.',
    group: 'optional',
  },
  {
    key: 'tiyul-plus:trips:v1',
    label: 'הטיולים שלכם',
    what: 'בלי חשבון - זה העותק היחיד שקיים. מחיקה כאן היא מחיקה סופית.',
    group: 'content',
  },
  {
    key: 'tiyul-plus:chat:',
    label: 'השיחות עם הסוכן',
    what: 'ההתכתבות נשמרת כאן בלבד ולא בשרתים שלנו.',
    group: 'content',
    prefix: true,
  },
];

interface Present {
  bytes: number;
  count: number;
}

function measure(item: StoredItem): Present | null {
  try {
    if (!item.prefix) {
      const v = localStorage.getItem(item.key);
      return v === null ? null : { bytes: v.length, count: 1 };
    }
    let bytes = 0;
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(item.key)) continue;
      bytes += localStorage.getItem(k)?.length ?? 0;
      count++;
    }
    return count === 0 ? null : { bytes, count };
  } catch {
    return null;
  }
}

function remove(item: StoredItem): void {
  try {
    if (!item.prefix) {
      localStorage.removeItem(item.key);
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(item.key)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage blocked - nothing was stored either */
  }
}

const size = (bytes: number) =>
  bytes < 1024 ? `${bytes} תווים` : `כ-${Math.round(bytes / 1024)} KB`;

/*
  localStorage is an external store, so it is read through the primitive React
  provides for external stores rather than through an effect that setStates on
  mount. Three things fall out of that, and the third is the one that matters:

  - the server snapshot is `null`, so the markup React renders on the server and
    the markup it hydrates with agree, and there is no mismatch to warn about;
  - the snapshot is cached against a cheap signature, because
    `useSyncExternalStore` compares by identity and a fresh object every call
    would loop forever;
  - the `storage` event is a real subscription: clearing site data in another
    tab updates this list instead of leaving it showing what used to be there.
*/
let signature = '';
let snapshot: Record<string, Present | null> | null = null;
const listeners = new Set<() => void>();

function readSignature(): string {
  try {
    let s = '';
    for (const item of ITEMS) {
      const p = measure(item);
      s += `${item.key}:${p ? `${p.bytes}/${p.count}` : '-'};`;
    }
    return s;
  } catch {
    return 'blocked';
  }
}

function getSnapshot(): Record<string, Present | null> {
  const next = readSignature();
  if (next !== signature || snapshot === null) {
    signature = next;
    const built: Record<string, Present | null> = {};
    for (const item of ITEMS) built[item.key] = measure(item);
    snapshot = built;
  }
  return snapshot;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = () => onChange();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** Our own writes do not fire `storage` (that event is for OTHER tabs). */
const notify = () => listeners.forEach((fn) => fn());

export default function StorageControls() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const del = (item: StoredItem) => {
    remove(item);
    setConfirming(null);
    notify();
  };

  if (state === null) {
    return (
      <p role="status" className="rounded-xl bg-shell p-4 text-sm text-night/65 ring-1 ring-night/10">
        בודקים מה שמור במכשיר הזה…
      </p>
    );
  }

  const rows = (group: Group) =>
    ITEMS.filter((i) => i.group === group).map((item) => {
      const present = state[item.key];
      return (
        <li key={item.key} className="rounded-xl bg-shell p-3 ring-1 ring-night/10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-bold text-night">{item.label}</p>
            <p className="text-xs font-semibold text-night/65">
              {present
                ? `שמור · ${size(present.bytes)}${present.count > 1 ? ` · ${present.count} פריטים` : ''}`
                : 'לא שמור'}
            </p>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-night/70">{item.what}</p>
          {present &&
            (confirming === item.key ? (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-night">למחוק? אי אפשר לבטל.</span>
                <button
                  onClick={() => del(item)}
                  className="min-h-9 rounded-lg bg-sunset px-3 text-sm font-bold text-cream"
                >
                  כן, למחוק
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="min-h-9 rounded-lg px-3 text-sm font-bold text-night/70 underline"
                >
                  ביטול
                </button>
              </p>
            ) : (
              <button
                onClick={() => (item.group === 'content' ? setConfirming(item.key) : del(item))}
                className="mt-2 min-h-9 rounded-lg bg-night/5 px-3 text-sm font-bold text-night transition hover:bg-night/10"
              >
                מחיקה
              </button>
            ))}
        </li>
      );
    });

  const anything = ITEMS.some((i) => state[i.key]);

  return (
    <div>
      {!anything && (
        <p className="rounded-xl bg-shell p-4 leading-relaxed text-night/70 ring-1 ring-night/10">
          כרגע לא שמור במכשיר הזה שום דבר מהרשימה.
        </p>
      )}

      <h3 className="mt-4 font-bold text-night/90">מה שאפשר למחוק בלי לאבד כלום</h3>
      <ul className="mt-2 space-y-2">{rows('optional')}</ul>

      <h3 className="mt-6 font-bold text-night/90">התוכן שלכם</h3>
      <p className="mt-1 text-sm leading-relaxed text-night/70">
        בלי חשבון, מה שכאן הוא העותק היחיד שקיים - אצלנו בשרת אין כלום. לכן כאן יש אישור לפני
        מחיקה.
      </p>
      <ul className="mt-2 space-y-2">{rows('content')}</ul>
    </div>
  );
}
