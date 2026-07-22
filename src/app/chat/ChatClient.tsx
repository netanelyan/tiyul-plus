'use client';

import { useEffect, useRef, useState } from 'react';
import type { Place } from '@/lib/types';
import { destinations } from '@/data/destinations';
import PlacesMap from '@/components/PlacesMap';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  destinationSlug?: string;
  placeIds?: string[];
}

const suggestions = [
  'תבנה לי מסלול לרומא',
  'איפה אוכלים כשר בבודפשט?',
  'מה צריך לדעת לפני טיסה לאתונה?',
];

/** מרנדר **מודגש** בסיסי בלי ספריות */
function renderText(text: string) {
  return text.split('\n').map((line, i) => (
    <p key={i} className="min-h-[0.5em]">
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        ),
      )}
    </p>
  ));
}

function MessageMap({ slug, placeIds }: { slug: string; placeIds: string[] }) {
  const dest = destinations.find((d) => d.slug === slug);
  if (!dest) return null;
  const places = placeIds
    .map((id) => dest.places.find((p) => p.id === id))
    .filter((p): p is Place => Boolean(p));
  if (places.length === 0) return null;
  return (
    <div className="mt-3 h-64 overflow-hidden rounded-2xl ring-1 ring-night/10">
      <PlacesMap center={dest.center} zoom={dest.zoom} places={places} />
    </div>
  );
}

export default function ChatClient() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'היי! אני עוזר הטיולים של טיול+. שאלו אותי על מסלולים, אוכל כשר או מידע פרקטי ליעדים שלנו - והתשובות יגיעו עם מפה.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    // "חושב…" מוצג רק עד המקטע הראשון; משם ההודעה נבנית טוקן-אחרי-טוקן
    let appended = false;
    const patchLast = (patch: (msg: Msg) => Msg) =>
      setMessages((m) => [...m.slice(0, -1), patch(m[m.length - 1])]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok || !res.body) throw new Error('bad response');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          let event: {
            type: string;
            text?: string;
            destinationSlug?: string;
            placeIds?: string[];
          };
          try {
            event = JSON.parse(line.slice(5));
          } catch {
            continue;
          }
          if (event.type === 'text' && event.text) {
            const chunk = event.text;
            if (!appended) {
              appended = true;
              setLoading(false);
              setMessages((m) => [...m, { role: 'assistant', content: chunk }]);
            } else {
              patchLast((msg) => ({ ...msg, content: msg.content + chunk }));
            }
          } else if (event.type === 'meta' && appended) {
            patchLast((msg) => ({
              ...msg,
              destinationSlug: event.destinationSlug,
              placeIds: event.placeIds,
            }));
          }
        }
      }
      if (!appended) throw new Error('empty stream');
    } catch {
      if (!appended) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'אופס, משהו השתבש. נסו שוב.' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-180px)] max-w-3xl flex-col">
      <h1 className="display text-2xl text-night">צ׳אט הטיולים</h1>
      <p className="mt-1.5 text-sm text-night/60">
        עברית מלאה, תשובות מעוגנות בדאטה אמיתי, ומפה מתחת לכל תשובה רלוונטית.
      </p>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-2xl bg-shell p-5 ring-1 ring-night/10">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-start' : ''}>
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-tr-md bg-night font-medium text-cream'
                  : 'w-full max-w-full bg-cream text-night'
              }`}
            >
              {renderText(msg.content)}
              {msg.destinationSlug && msg.placeIds && msg.placeIds.length > 0 && (
                <MessageMap slug={msg.destinationSlug} placeIds={msg.placeIds} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="w-fit animate-pulse rounded-2xl bg-cream px-5 py-3.5 text-sm font-medium text-night/40">
            חושב…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full bg-shell px-4 py-2 text-xs font-medium text-night/70 ring-1 ring-night/10 transition hover:bg-night/5 hover:ring-night/25"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="למשל: תבנה לי מסלול ל-3 ימים ברומא עם אוכל כשר"
          className="flex-1 rounded-xl bg-shell px-5 py-3.5 text-sm text-night outline-none ring-1 ring-night/10 transition focus:ring-2 focus:ring-sunset"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-sunset px-6 py-3.5 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40"
        >
          שליחה
        </button>
      </form>
    </div>
  );
}
