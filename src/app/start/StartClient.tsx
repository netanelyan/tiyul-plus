'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QuizWizard from './QuizWizard';

/**
 * שלוש דרכים להתחיל, כולן מובילות לאותו Trip:
 * 1. שיחה חופשית - טקסט חופשי → /chat?q=
 * 2. שאלון מובנה - שאלון מודרך רב-שלבי (QuizWizard) שאוסף העדפות לפי
 *    המודל הקיים ומייצר טיול אמיתי עם generateTrip, ואז נוחת במתכנן.
 * 3. קישור מרשת חברתית - עדיין לא נתמך (הערת כנות): חילוץ אמיתי דורש
 *    החלטת מקור-נתונים (YouTube בלבד ריאלי, בתשלום/תלות), ואינסטגרם/
 *    טיקטוק לא ניתנים בלי הפרת תנאי שימוש. לא בונים כפתור מזויף.
 */

type City = { slug: string; name: string; country: string };
type Tab = 'chat' | 'quiz' | 'link';

export default function StartClient({ cities }: { cities: City[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('quiz');

  const [freeText, setFreeText] = useState('');
  const [link, setLink] = useState('');
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  const submitFree = () => {
    if (freeText.trim()) router.push(`/chat?q=${encodeURIComponent(freeText.trim())}`);
  };

  const submitLink = () => {
    const url = link.trim();
    if (!url) return;
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
      setLinkMsg('לא זיהינו פלטפורמה נתמכת. אפשר לתאר מה ראיתם בשיחה החופשית.');
    }
  };

  return (
    <div className="mt-8">
      {/* בורר שלושת הכניסות */}
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'quiz'} onClick={() => setTab('quiz')}>
          📋 שאלון מובנה
        </TabButton>
        <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>
          💬 שיחה חופשית
        </TabButton>
        <TabButton active={tab === 'link'} onClick={() => setTab('link')}>
          🔗 קישור מרשת חברתית
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
          <h2 className="text-lg font-bold text-night">ראיתם ריל או סרטון עם מקומות?</h2>
          <p className="mt-1 text-sm text-night/55">
            הדביקו קישור. נזהה את הפלטפורמה ונגיד לכם בכנות מה אפשר לעשות איתה.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setLinkMsg(null);
              }}
              placeholder="הדביקו כאן קישור מיוטיוב / אינסטגרם / טיקטוק"
              className="flex-1 rounded-xl border border-night/15 bg-cream px-4 py-3 text-night outline-none transition placeholder:text-night/40 focus:border-sunset/40 focus:ring-4 focus:ring-sunset/15"
            />
            <button
              onClick={submitLink}
              disabled={!link.trim()}
              className="rounded-xl bg-night px-6 py-3 font-bold text-cream transition hover:bg-night-soft disabled:opacity-50"
            >
              בדיקה
            </button>
          </div>
          {linkMsg && (
            <p className="mt-4 rounded-xl bg-zest/15 px-4 py-3 text-sm font-semibold leading-relaxed text-night/75">
              {linkMsg}
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-night/45">
            שקיפות: חילוץ מקומות אוטומטי מסרטונים עדיין לא פעיל. יוטיוב היא הפלטפורמה
            היחידה שבה זה ריאלי טכנית, ותופעל בהמשך; אינסטגרם, טיקטוק ופייסבוק חוסמות
            קריאת תוכן מקישור חיצוני בתנאי השימוש שלהן.
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
