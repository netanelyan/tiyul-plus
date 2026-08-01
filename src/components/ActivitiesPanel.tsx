'use client';

import { useEffect, useRef, useState } from 'react';
import PanelSection from '@/components/PanelSection';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import { formatDurationHe } from '@/lib/duration';
import { hePrefix } from '@/lib/hebrew';

/**
 * "פעילויות שאפשר להזמין" - **תוכן של שותף, מסומן ככזה.**
 *
 * ## מה הרכיב הזה לא עושה
 *
 * לא ממציא מחיר, לא ממיר מטבע, לא מתרגם כותרת ולא מדרג. כל מספר וכל שם
 * מגיעים מהתשובה של Viator כפי שהיא, והשרת כבר זרק כל מוצר שחסר לו אחד
 * מהם. אין כאן גם שום כתיבה: הפעילויות לא נכנסות לטיול, לא לאחסון
 * המקומי ולא לחשבון - הן חיות ב-state של הרכיב עד שסוגרים את המסך.
 *
 * ## המדור נפתח בלחיצה, ולא נטען לבד
 *
 * זו לא רק חסכנות בבקשות. מדור מסחרי שנפתח מעצמו בתוך תוכנית טיול הוא
 * פרסומת; מדור שנפתח כשמבקשים אותו הוא כלי. הוא גם מקופל כברירת מחדל
 * כמו שאר הבלוקים באזור הזה.
 *
 * ## הסימון בזמן פיתוח
 *
 * במצב sandbox הנתונים של Viator **בדיוניים**. אי אפשר לסמוך על כך
 * שמישהו יזכור את זה, ולכן יש פס אזהרה שאי אפשר לפספס מעל הרשימה **וגם**
 * תג על כל כרטיס בנפרד - וכפתור ההזמנה מנוטרל, כי אין מה להזמין.
 */

interface Offer {
  code: string;
  title: string;
  fromPrice: number | null;
  currency: string | null;
  rating: number | null;
  reviews: number | null;
  durationMinutes: number | null;
  image: string | null;
  url: string;
  sandbox: boolean;
}

interface Result {
  mode: 'off' | 'sandbox' | 'production';
  offers: Offer[];
  reason: string;
}

/** בדיוק מה שהוחזר: המספר והמטבע שלהם, בלי המרה ובלי עיגול */
const price = (n: number | null, cur: string | null) =>
  n === null || !cur ? null : `${cur} ${n % 1 === 0 ? n : n.toFixed(2)}`;

export default function ActivitiesPanel({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const [open, setOpen] = useState(false);
  /*
    התוצאה נושאת איתה את העיר שהיא שייכת לה, במקום אפקט שמאפס אותה
    כשהעיר משתנה. זה גם מונע הבזק של הפעילויות של העיר הקודמת, וגם
    מוריד אפקט שכל תפקידו היה לנקות state.
  */
  const [state, setState] = useState<{ city: string; result: Result } | null>(null);
  const [loading, setLoading] = useState(false);
  const data = state && state.city === citySlug ? state.result : null;
  /*
    ה-ref הוא מה שמונע בקשה כפולה, ובכוונה לא `loading`.

    בגרסה הראשונה `loading` היה גם השומר וגם תלות של האפקט, ולכן
    `setLoading(true)` שינה תלות, האפקט רץ מחדש, **הניקוי סימן את
    הבקשה שבדרך כלא-רלוונטית**, והריצה השנייה יצאה מיד בגלל השומר.
    התוצאה: הבקשה הצליחה, 200 חזר, ואף אחד לא כתב את התשובה - המדור
    נשאר על "בודק מה יש בעיר" לנצח. ה-API עבד; רק המסך היה תקוע, ולכן
    שום בדיקת שרת לא יכלה לראות את זה. תפס את זה דפדפן אמיתי.

    ref מתעדכן סינכרונית ואינו תלות, ולכן האפקט רץ בדיוק פעם אחת לכל
    עיר. בכישלון הוא מתאפס, כדי שפתיחה נוספת תנסה שוב.
  */
  const askedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || askedRef.current === citySlug) return;
    askedRef.current = citySlug;
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/activities?city=${encodeURIComponent(citySlug)}`);
        const json = (await res.json()) as Result;
        if (alive) setState({ city: citySlug, result: json });
      } catch {
        // כישלון שקט: המדור פשוט אומר שאין כרגע, והמסך ממשיך
        askedRef.current = null;
        if (alive) setState({ city: citySlug, result: { mode: 'off', offers: [], reason: 'unavailable' } });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, citySlug]);

  const offers = data?.offers ?? [];
  const sandbox = offers.some((o) => o.sandbox);

  /*
    כשאין מה להציג המדור לא נעלם אחרי שנפתח - הוא אומר בפשטות שאין,
    וזו התשובה הכנה. מה שכן: הוא לא מנסה להסביר למה, ולא מציג שגיאה.
  */
  const emptyLine =
    data && offers.length === 0
      ? 'לא נמצאו פעילויות להזמנה בעיר הזו כרגע.'
      : null;

  return (
    <PanelSection
      panelKey="activities"
      icon="🎟️"
      title={`פעילויות ${hePrefix('ב', cityName)}`}
      meta={<span className="text-[11px] font-medium text-night/45">להזמנה דרך Viator</span>}
      ariaLabel={`פעילויות להזמנה ${hePrefix('ב', cityName)}`}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        {sandbox && (
          /* אי אפשר לפספס, וזה הרעיון */
          <div
            data-sandbox-banner
            className="mb-3 rounded-xl bg-sunset px-3 py-2 text-xs font-black text-cream"
          >
            ⚠️ מצב בדיקה (sandbox) - הפעילויות והמחירים כאן מומצאים ואינם אמיתיים. לא להזמנה.
          </div>
        )}

        {loading && <ThinkingIndicator label="בודק מה יש בעיר" />}

        {emptyLine && <p className="text-sm font-medium text-night/55">{emptyLine}</p>}

        {offers.length > 0 && (
          <ul className="space-y-2">
            {offers.map((o) => {
              const p = price(o.fromPrice, o.currency);
              const dur = formatDurationHe(o.durationMinutes ?? undefined);
              return (
                <li
                  key={o.code}
                  data-offer
                  data-sandbox={o.sandbox ? '1' : undefined}
                  className="flex items-center gap-3 rounded-xl bg-cream p-2.5"
                >
                  {o.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.image}
                      alt=""
                      loading="lazy"
                      className="h-14 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {/*
                      שתי שורות ולא `truncate`: שם המוצר הוא בדיוק מה שאסור
                      לנו להמציא, ולכן גם אסור לנו לחתוך אותו ל-"Fictional Col…".
                      ב-390 שורה אחת חתכה כל שם אמיתי באמצע.
                    */}
                    {/*
                      `bdi` ולא `dir="auto"`: שם באנגלית עם `dir="auto"` הופך
                      את כל הבלוק ל-LTR, כך שהכותרת נצמדת לשמאל בזמן ששורת
                      המחיר שמתחתיה נשארת מימין - והכרטיס נראה שבור. `bdi`
                      מבודד את כיוון הטקסט פנימה ומשאיר את היישור של העמוד.
                    */}
                    <div className="line-clamp-2 text-sm font-bold text-night">
                      <bdi>{o.title}</bdi>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-night/50">
                      {/* רק המספר והמטבע הם LTR; "החל מ-" הוא עברית ונשאר RTL */}
                      {p && (
                        <span>
                          החל מ-
                          <span dir="ltr">{p}</span>
                        </span>
                      )}
                      {o.rating !== null && (
                        <span>
                          ★ {o.rating.toFixed(1)}
                          {o.reviews !== null && ` (${o.reviews.toLocaleString('he-IL')})`}
                        </span>
                      )}
                      {dur && <span>{dur}</span>}
                      {o.sandbox && (
                        <span className="rounded-full bg-sunset/20 px-1.5 py-0.5 text-sunset-deep">
                          נתון בדיוני
                        </span>
                      )}
                    </div>
                  </div>
                  {o.sandbox ? (
                    <span className="shrink-0 rounded-xl bg-night/10 px-3 py-2 text-xs font-bold text-night/40">
                      חסום בבדיקה
                    </span>
                  ) : (
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener nofollow sponsored"
                      className="shrink-0 rounded-xl bg-sunset px-3 py-2 text-xs font-bold text-cream transition hover:bg-sunset-deep"
                    >
                      להזמנה ←
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/*
          הגילוי הנאות, ולא באותיות קטנות: מי הבעלים של התוכן, איפה
          מזמינים, ושאנחנו מרוויחים מהקישור. גם המחיר מסויג - "החל מ-"
          הוא מה שהם מחזירים, והמחיר הסופי נקבע אצלם.
        */}
        <p className="mt-3 text-[11px] font-medium leading-relaxed text-night/45">
          הפעילויות, המחירים והדירוגים מוצגים כפי שהתקבלו מ-Viator ועשויים להשתנות. ההזמנה והתשלום
          מתבצעים באתר של Viator ולא כאן, ואנחנו עשויים לקבל עמלה על הזמנה שבוצעה דרך הקישור. אין
          לזה שום השפעה על מה שהמתכנן ממליץ.
        </p>
      </div>
    </PanelSection>
  );
}
