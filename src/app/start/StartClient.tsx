'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * שלוש דרכים להתחיל, כולן מזינות את אותו סוכן ואת אותו Trip:
 * 1. שיחה חופשית - טקסט חופשי → /chat?q=
 * 2. שאלון מובנה - בחירות כפתור שנהפכות לפרומפט עברי (הסוכן קורא מהן
 *    את Trip.preferences - party/pace/budget/kosher/shabbat/shopping/
 *    interests), בלי מודל נתונים חדש.
 * 3. קישור מרשת חברתית - עדיין לא נתמך (ראו הערת הכנות בתחתית): חילוץ
 *    אמיתי דורש החלטת מקור-נתונים (YouTube בלבד ריאלי, בתשלום/תלות),
 *    ואינסטגרם/טיקטוק לא ניתנים בלי הפרת תנאי שימוש. לא בונים כפתור מזויף.
 */

type City = { slug: string; name: string; country: string };
type Tab = 'chat' | 'quiz' | 'link';

const PARTY = [
  { v: 'couple', label: 'זוג' },
  { v: 'family', label: 'משפחה' },
  { v: 'friends', label: 'חברים' },
  { v: 'solo', label: 'לבד' },
];
const BUDGET = [
  { v: 'low', label: 'חסכוני' },
  { v: 'medium', label: 'רגיל' },
  { v: 'high', label: 'מפנק' },
];
const PACE = [
  { v: 'relaxed', label: 'רגוע' },
  { v: 'packed', label: 'אינטנסיבי' },
];
const SHOPPING = [
  { v: 'less', label: 'פחות' },
  { v: 'normal', label: 'רגיל' },
  { v: 'more', label: 'יותר' },
];
const INTERESTS = [
  { v: 'families', label: 'כיף לילדים' },
  { v: 'history', label: 'היסטוריה' },
  { v: 'art', label: 'אמנות' },
  { v: 'foodie', label: 'אוכל' },
  { v: 'outdoors', label: 'טבע' },
  { v: 'nightlife', label: 'חיי לילה' },
  { v: 'romantic', label: 'רומנטי' },
];

function Choice({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
        active
          ? 'bg-sunset text-cream ring-sunset'
          : 'bg-shell text-night/65 ring-night/15 hover:ring-sunset/40'
      }`}
    >
      {label}
    </button>
  );
}

export default function StartClient({ cities }: { cities: City[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('quiz');

  // --- שיחה חופשית ---
  const [freeText, setFreeText] = useState('');

  // --- שאלון ---
  const [citySlug, setCitySlug] = useState('');
  const [days, setDays] = useState<number | ''>('');
  const [party, setParty] = useState('');
  const [budget, setBudget] = useState('');
  const [pace, setPace] = useState('');
  const [shopping, setShopping] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [kosher, setKosher] = useState(false);
  const [shabbat, setShabbat] = useState(false);

  // --- קישור ---
  const [link, setLink] = useState('');
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  const goChat = (q: string, withKosher: boolean) => {
    router.push(`/chat?q=${encodeURIComponent(q)}${withKosher ? '&kosher=1' : ''}`);
  };

  const submitFree = () => {
    if (freeText.trim()) goChat(freeText.trim(), false);
  };

  const submitQuiz = () => {
    const city = cities.find((c) => c.slug === citySlug);
    const parts: string[] = [];
    parts.push(
      city ? `אני רוצה לתכנן טיול ל${city.name}` : 'אני רוצה לתכנן טיול, עוד לא בטוח/ה לאן',
    );
    if (days) parts.push(`של ${days} ימים`);
    const partyLabel = PARTY.find((p) => p.v === party)?.label;
    if (partyLabel) parts.push(`נוסעים: ${partyLabel}`);
    const budgetLabel = BUDGET.find((b) => b.v === budget)?.label;
    if (budgetLabel) parts.push(`תקציב ${budgetLabel}`);
    const paceLabel = PACE.find((p) => p.v === pace)?.label;
    if (paceLabel) parts.push(`קצב ${paceLabel}`);
    if (interests.length) {
      const labels = interests
        .map((i) => INTERESTS.find((x) => x.v === i)?.label)
        .filter(Boolean)
        .join(', ');
      parts.push(`מתעניינים ב: ${labels}`);
    }
    const shopLabel = SHOPPING.find((s) => s.v === shopping)?.label;
    if (shopLabel) parts.push(`שופינג: ${shopLabel}`);
    if (shabbat) parts.push('חשוב לנו לשמור על שבת (קצב מותאם)');
    const q = parts.join('. ') + '.';
    goChat(q, kosher);
  };

  const submitLink = () => {
    const url = link.trim();
    if (!url) return;
    // כנות: חילוץ אמיתי עדיין לא בנוי (החלטת מקור-נתונים פתוחה). לא
    // מזייפים תוצאה - מסבירים מה המצב לפי הפלטפורמה.
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
        <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>
          💬 שיחה חופשית
        </TabButton>
        <TabButton active={tab === 'quiz'} onClick={() => setTab('quiz')}>
          📋 שאלון מובנה
        </TabButton>
        <TabButton active={tab === 'link'} onClick={() => setTab('link')}>
          🔗 קישור מרשת חברתית
        </TabButton>
      </div>

      <div className="mt-5 rounded-2xl bg-shell p-5 ring-1 ring-night/10 sm:p-7">
        {tab === 'chat' && (
          <div>
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

        {tab === 'quiz' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-night">כמה בחירות מהירות</h2>

            <Field label="יעד (אפשר לדלג)">
              <select
                value={citySlug}
                onChange={(e) => setCitySlug(e.target.value)}
                className="w-full rounded-xl border border-night/15 bg-cream px-4 py-2.5 text-night outline-none focus:border-sunset/40 focus:ring-4 focus:ring-sunset/15"
              >
                <option value="">עוד לא בטוח/ה</option>
                {cities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} · {c.country}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="כמה ימים? (אפשר לדלג)">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDays((d) => Math.max(1, (typeof d === 'number' ? d : 4) - 1))}
                  className="h-10 w-10 rounded-lg bg-cream text-lg font-bold text-night ring-1 ring-night/15"
                  aria-label="פחות ימים"
                >
                  −
                </button>
                <span className="min-w-16 text-center font-bold text-night">
                  {days === '' ? '—' : `${days} ימים`}
                </span>
                <button
                  type="button"
                  onClick={() => setDays((d) => Math.min(21, (typeof d === 'number' ? d : 3) + 1))}
                  className="h-10 w-10 rounded-lg bg-cream text-lg font-bold text-night ring-1 ring-night/15"
                  aria-label="עוד ימים"
                >
                  +
                </button>
              </div>
            </Field>

            <Field label="מי נוסע?">
              <div className="flex flex-wrap gap-2">
                {PARTY.map((o) => (
                  <Choice key={o.v} label={o.label} active={party === o.v} onClick={() => setParty(party === o.v ? '' : o.v)} />
                ))}
              </div>
            </Field>

            <Field label="תקציב">
              <div className="flex flex-wrap gap-2">
                {BUDGET.map((o) => (
                  <Choice key={o.v} label={o.label} active={budget === o.v} onClick={() => setBudget(budget === o.v ? '' : o.v)} />
                ))}
              </div>
            </Field>

            <Field label="קצב">
              <div className="flex flex-wrap gap-2">
                {PACE.map((o) => (
                  <Choice key={o.v} label={o.label} active={pace === o.v} onClick={() => setPace(pace === o.v ? '' : o.v)} />
                ))}
              </div>
            </Field>

            <Field label="שופינג">
              <div className="flex flex-wrap gap-2">
                {SHOPPING.map((o) => (
                  <Choice key={o.v} label={o.label} active={shopping === o.v} onClick={() => setShopping(shopping === o.v ? '' : o.v)} />
                ))}
              </div>
            </Field>

            <Field label="מה מעניין אתכם? (אפשר כמה)">
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((o) => (
                  <Choice
                    key={o.v}
                    label={o.label}
                    active={interests.includes(o.v)}
                    onClick={() =>
                      setInterests((cur) =>
                        cur.includes(o.v) ? cur.filter((x) => x !== o.v) : [...cur, o.v],
                      )
                    }
                  />
                ))}
              </div>
            </Field>

            {/* העדפות רגישות - כפתורים, לא שאלות (עקבי עם שאר האתר) */}
            <Field label="העדפות">
              <div className="flex flex-wrap gap-2">
                <Choice label="אוכל כשר" active={kosher} onClick={() => setKosher((v) => !v)} />
                <Choice label="שמירת שבת" active={shabbat} onClick={() => setShabbat((v) => !v)} />
              </div>
            </Field>

            <button
              onClick={submitQuiz}
              className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep"
            >
              בונים לי טיול ←
            </button>
          </div>
        )}

        {tab === 'link' && (
          <div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-bold text-night">{label}</div>
      {children}
    </div>
  );
}
