'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CityOption } from '@/lib/citySearch';
import { useTrip } from '@/lib/trip/TripContext';
import { buildTripFromImport, looksLikeMyMaps } from '@/lib/trip/importedTrip';
import { saveExplored } from '@/lib/explore/storage';
import { authHeader } from '@/lib/auth/client';
import type { Destination } from '@/lib/types';
import QuizWizard from './QuizWizard';

/**
 * Three ways to start, all leading to the same Trip:
 * 1. Free conversation - free text -> /chat?q=
 * 2. Structured questionnaire - a guided multi-step questionnaire (QuizWizard) that collects
 *    preferences using the existing model and produces a real trip with generateTrip, then lands
 *    in the planner.
 * 3. A link - Google My Maps is genuinely supported (KML import -> trip); reels and videos are not
 *    yet (an honesty note): real extraction requires a data-source decision (only YouTube is
 *    realistic, at a cost or a dependency), and Instagram/TikTok cannot be done without breaching
 *    their terms of use. We do not build a fake button.
 */

type Tab = 'chat' | 'quiz' | 'link';

export default function StartClient({ cities }: { cities: CityOption[] }) {
  const router = useRouter();
  const trip = useTrip();
  const [tab, setTab] = useState<Tab>('quiz');

  const [freeText, setFreeText] = useState('');
  const [link, setLink] = useState('');
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const submitFree = () => {
    if (freeText.trim()) router.push(`/chat?q=${encodeURIComponent(freeText.trim())}`);
  };

  const submitLink = async () => {
    const url = link.trim();
    if (!url || importing) return;
    // Google My Maps - genuinely supported: importing the points into a new trip
    if (looksLikeMyMaps(url)) {
      setImporting(true);
      setLinkMsg('מושכים את המפה מ-Google My Maps…');
      try {
        const res = await fetch('/api/import-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify({ url }),
        });
        const data = (await res.json()) as { destination?: Destination; error?: string };
        if (data.destination) {
          saveExplored(data.destination);
          trip.createTripFrom(buildTripFromImport(data.destination));
          router.push('/chat');
          return;
        }
        setLinkMsg(data.error ?? 'משהו השתבש בייבוא - נסו שוב.');
      } catch {
        setLinkMsg('משהו השתבש בחיבור - נסו שוב.');
      } finally {
        setImporting(false);
      }
      return;
    }
    const isYouTube = /youtube\.com|youtu\.be/i.test(url);
    const isIG = /instagram\.com/i.test(url);
    const isTikTok = /tiktok\.com/i.test(url);
    const isFB = /facebook\.com|fb\.watch/i.test(url);
    if (isYouTube) {
      setLinkMsg(
        'זיהינו קישור יוטיוב. חילוץ המקומות מסרטונים עדיין בפיתוח - זו הפלטפורמה היחידה שבה זה ריאלי, ונפעיל אותה בהמשך. בינתיים אפשר לתאר את הסרטון בשיחה החופשית.',
      );
    } else if (isIG || isTikTok || isFB) {
      setLinkMsg(
        'הפלטפורמה הזו (אינסטגרם/טיקטוק/פייסבוק) חוסמת קריאת תוכן מקישור חיצוני בתנאי השימוש, ולכן לא נתמכת. אפשר להעתיק את הכיתוב/רשימת המקומות ולהדביק אותם בשיחה החופשית.',
      );
    } else {
      setLinkMsg('לא זיהינו פלטפורמה נתמכת. אפשר לתאר מה ראיתם בשיחה החופשית - או להדביק קישור למפה מ-Google My Maps וניבא אותה לטיול.');
    }
  };

  return (
    <div className="mt-8">
      {/* The three-entry picker */}
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'quiz'} onClick={() => setTab('quiz')}>
          📋 שאלון מובנה
        </TabButton>
        <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>
          💬 שיחה חופשית
        </TabButton>
        <TabButton active={tab === 'link'} onClick={() => setTab('link')}>
          🔗 ייבוא מקישור
        </TabButton>
      </div>

      {tab === 'quiz' && <QuizWizard cities={cities} />}

      {tab === 'chat' && (
        <div className="mt-5 rounded-2xl bg-shell p-5 ring-1 ring-night/10 sm:p-7">
          <h2 className="text-lg font-bold text-night">ספרו לסוכן במילים שלכם</h2>
          <p className="mt-1 text-sm text-night/55">
            הכי חופשי: מה בא לכם, עם מי, מתי ומה חשוב - והוא בונה טיול אמיתי.
          </p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={4}
            placeholder="למשל: שבוע ברומא עם הילדים, תקציב רגיל, הרבה אוכל ופחות מוזיאונים"
            className="mt-4 w-full rounded-xl border border-night/15 bg-cream px-4 py-3 text-night outline-none transition placeholder:text-night/40 focus:border-sunset/40 focus:ring-4 focus:ring-sunset/15"
          />
          <button
            onClick={submitFree}
            disabled={!freeText.trim()}
            className="mt-3 rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:bg-sunset/50"
          >
            נתחיל לתכנן ←
          </button>
        </div>
      )}

      {tab === 'link' && (
        <div className="mt-5 rounded-2xl bg-shell p-5 ring-1 ring-night/10 sm:p-7">
          <h2 className="text-lg font-bold text-night">יש לכם מפה או קישור עם מקומות?</h2>
          <p className="mt-1 text-sm text-night/55">
            📍 מפה מ-<b>Google My Maps</b> מיובאת לטיול אמיתי - כל הנקודות שסימנתם,
            עם ימים ומפה. קישורים אחרים? נגיד בכנות מה אפשר.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setLinkMsg(null);
              }}
              placeholder="קישור למפה מ-My Maps, או קישור מיוטיוב / אינסטגרם"
              className="flex-1 rounded-xl border border-night/15 bg-cream px-4 py-3 text-night outline-none transition placeholder:text-night/40 focus:border-sunset/40 focus:ring-4 focus:ring-sunset/15"
            />
            <button
              onClick={() => void submitLink()}
              disabled={!link.trim() || importing}
              className="rounded-xl bg-night px-6 py-3 font-bold text-cream transition hover:bg-night-soft disabled:opacity-50"
            >
              {importing ? 'מושך…' : 'ייבוא / בדיקה'}
            </button>
          </div>
          {linkMsg && (
            <p className="mt-4 rounded-xl bg-zest/15 px-4 py-3 text-sm font-semibold leading-relaxed text-night/75">
              {linkMsg}
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-night/45">
            ייבוא My Maps דורש שהמפה תהיה משותפת כ&quot;כל מי שיש לו הקישור יכול
            להציג&quot;. שקיפות לגבי סרטונים: חילוץ מקומות אוטומטי מהם עדיין לא פעיל -
            יוטיוב ריאלי טכנית ויופעל בהמשך; אינסטגרם, טיקטוק ופייסבוק חוסמות קריאת
            תוכן חיצונית בתנאי השימוש שלהן. TripAdvisor לא מציע ייצוא ציבורי של מפות
            שמורות ולכן לא נתמך.
          </p>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-5 py-2.5 text-sm font-bold ring-1 transition ${
        active ? 'bg-night text-cream ring-night' : 'bg-shell text-night/65 ring-night/15 hover:ring-night/30'
      }`}
    >
      {children}
    </button>
  );
}
