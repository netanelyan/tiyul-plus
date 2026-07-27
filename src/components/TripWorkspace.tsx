'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Destination, Place } from '@/lib/types';
import type { TripPin, TripPreferences } from '@/lib/trip/types';
import { destinations as curatedDestinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { categoryMeta } from '@/lib/categories';
import { useTrip } from '@/lib/trip/TripContext';
import { travelLeg } from '@/lib/trip/travel';
import { useTripChat } from '@/lib/trip/useTripChat';
import { dayDescription, dayPlaces } from '@/lib/trip/dayDescription';
import { dayColor } from '@/lib/trip/dayColors';
import { encodeTripShare } from '@/lib/trip/share';
import PlacesMap from '@/components/PlacesMap';
import type { MapGroup, MapPin } from '@/components/MapInner';
import BookingPanel from '@/components/BookingPanel';
import PinsPanel from '@/components/PinsPanel';
import ChatPanel from '@/components/ChatPanel';
import Flag from '@/components/Flag';
import Logo from '@/components/Logo';
import AddDayPicker from '@/components/AddDayPicker';
import ImportMapModal from '@/components/ImportMapModal';
import ThinkingIndicator from '@/components/ThinkingIndicator';

/**
 * התצוגה המאוחדת של הטיול - מסך אחד לכל מה שקשור לטיול הפעיל:
 * מסלול היום (עריכה ידנית מלאה) + מפה + שיחה עם הסוכן, יחד.
 * אין יותר "טאב צ׳אט" נפרד מול "טאב תוכנית": גם /chat וגם /planner
 * מרנדרים את הרכיב הזה, ושניהם עובדים על אותו Trip object (TripContext)
 * - בקשה בשיחה ("תוסיף יום") מעדכנת את אותו טיול שמצויר כאן, בלי עותק.
 *
 * פריסה:
 * - xl: שלוש עמודות - מסלול (ימין), מפה (אמצע), שיחה (שמאל).
 * - lg: מסלול + מפה זה לצד זה, השיחה כפאנל רוחב מלא מתחתיהם.
 * - מובייל (~390px): הכול נערם - מפה, כרטיס היום, עצירות, סקירת הימים -
 *   והשיחה יושבת בסרגל דביק בתחתית שנפתח למגירה מלאה.
 */

export default function TripWorkspace({
  destinations = curatedDestinations,
  onNewTrip,
  initialQuery,
  initialKosher,
}: {
  /** ברירת מחדל: הדאטה האוצרת. /planner מעביר את מה שהספק החזיר. */
  destinations?: Destination[];
  onNewTrip: () => void;
  initialQuery?: string;
  initialKosher?: boolean;
}) {
  const trip = useTrip();
  const chat = useTripChat({ initialQuery, initialKosher });
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  /** 'day' = המפה של היום הנבחר · 'trip' = כל העצירות של כל הימים יחד */
  const [mapMode, setMapMode] = useState<'day' | 'trip'>('day');
  const [chatOpen, setChatOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [allDaysOpen, setAllDaysOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  /** מזהה היום שעבורו נפתח שדה ההערות (יום בלי הערה מציג כפתור בלבד) */
  const [noteOpenFor, setNoteOpenFor] = useState<string | null>(null);
  /**
   * רמז חד-פעמי שמצביע על שורת הכתיבה לסוכן.
   *
   * זה כל מה שנשאר מרעיון ה"מדריך": הצעה למסך הדרכה נדחתה כי היא לא
   * מפחיתה אף פקד ואף מוסיפה, ומלמדת אנשים לסבול מסך עמוס במקום לפרוק
   * אותו. שורה אחת שמסבירה איפה עושים את הדבר המרכזי כן שווה את המקום.
   *
   * מאותחל ל-false ונקרא מ-localStorage רק אחרי ה-mount, כדי שהשרת
   * והלקוח יסכימו בצביעה הראשונה (אותה מלכודת hydration שנפתרה כך
   * ב-PromptChips). מוצג פעם אחת לדפדפן ולא חוזר.
   */
  const [coach, setCoach] = useState(false);
  useEffect(() => {
    try {
      // localStorage לא קיים בשרת, ולכן הקריאה חייבת לקרות אחרי ה-mount:
      // אתחול ישיר ממנו היה יוצר אי-התאמת hydration. אותו דפוס בדיוק כמו
      // PromptChips ו-AccessibilityWidget בפרויקט הזה.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!window.localStorage.getItem(COACH_KEY)) setCoach(true);
    } catch {
      /* אחסון חסום - פשוט לא מציגים */
    }
  }, []);
  const dismissCoach = () => {
    setCoach(false);
    try {
      window.localStorage.setItem(COACH_KEY, '1');
    } catch {
      /* אחסון חסום - הרמז נעלם לסשן הזה ודי */
    }
  };
  const [linkCopied, setLinkCopied] = useState(false);
  /** סיכה שהמטייל בחר להניח ידנית: הלחיצה הבאה על המפה תקבע את מיקומה */
  const [placingPinId, setPlacingPinId] = useState<string | null>(null);

  const t = trip.currentTrip;
  // curated קודם; יעדים שנחקרו אוטומטית (AI Explorer) כ-fallback, כדי
  // שטיול שנבנה ביעד נחקר יתרנדר כרגיל בקנבס/מפה/הדפסה.
  const destOf = (slug: string) =>
    destinations.find((d) => d.slug === slug) ?? chat.explored.find((d) => d.slug === slug);
  const placeOf = (slug: string, id: string): Place | undefined =>
    destOf(slug)?.places.find((p) => p.id === id);

  // מעבר בין ערים: מחושב מהקואורדינטות האמיתיות, ומודע לרכב - כדי
  // שלא נכריז "טיסה" על נסיעה של שעתיים באותה מדינה.
  const carStatus = t?.preferences?.booking?.car;
  const hasCar = carStatus === 'have' || carStatus === 'need';
  const legOf = (fromSlug: string, toSlug: string) =>
    travelLeg(fromSlug, toSlug, {
      from: destOf(fromSlug),
      to: destOf(toSlug),
      hasCar,
    });

  const day = t ? (t.days.find((d) => d.id === selectedDayId) ?? t.days[0] ?? null) : null;
  const dayDest = day ? destOf(day.citySlug) : null;
  const dayIndex = t && day ? t.days.findIndex((d) => d.id === day.id) : -1;

  const places: Place[] = useMemo(
    () => (day ? dayPlaces(day, dayDest) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day, dayDest, t],
  );

  // תצוגת כל הטיול: כל יום כקבוצה - צבע משלו ומספר היום בסיכה.
  const tripGroups: MapGroup[] = useMemo(
    () =>
      (t?.days ?? [])
        .map((d, i) => ({
          badge: String(i + 1),
          color: dayColor(i),
          places: dayPlaces(d, destOf(d.citySlug)),
        }))
        .filter((g) => g.places.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, destinations, chat.explored],
  );

  /**
   * הסיכות של המטייל על המפה. רק כאלה שיש להן מיקום ממשי - סיכה
   * בלי קואורדינטות לא מצוירת בשום מקום, כי מיקום מנוחש גרוע
   * ממיקום חסר. הזיהוי נשאר יציב (useMemo) כדי שהמפה לא תקפוץ
   * בכל render, בדיוק כמו flat ב-MapInner.
   */
  const allPins: MapPin[] = useMemo(
    () =>
      (t?.pins ?? [])
        .filter((p): p is TripPin & { lat: number; lng: number } =>
          typeof p.lat === 'number' && typeof p.lng === 'number',
        )
        .map((p) => ({
          id: p.id,
          kind: p.kind,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          address: p.address,
          note: p.note,
        })),
    [t?.pins],
  );

  /** במפת היום מציגים רק את הסיכות של אותה עיר, ואת אלה בלי עיר. */
  const dayPins: MapPin[] = useMemo(() => {
    const citySlug = day?.citySlug;
    const byId = new Map((t?.pins ?? []).map((p) => [p.id, p]));
    return allPins.filter((p) => {
      const src = byId.get(p.id);
      return !src?.citySlug || src.citySlug === citySlug;
    });
  }, [allPins, day?.citySlug, t?.pins]);

  if (!trip.hydrated) {
    return (
      <div className="rounded-2xl bg-shell p-10 text-center font-semibold text-night/40 ring-1 ring-night/10">
        <ThinkingIndicator label="טוען את הטיולים שלך" className="justify-center" />
      </div>
    );
  }

  const totalStops = t?.days.reduce((n, d) => n + d.placeIds.length, 0) ?? 0;
  const googleDirectionsUrl =
    'https://www.google.com/maps/dir/' + places.map((p) => `${p.lat},${p.lng}`).join('/');

  const setPrefs = (patch: Partial<TripPreferences>) => {
    if (!t) return;
    trip.upsertTrip({ ...t, preferences: { ...t.preferences, ...patch } });
  };

  /**
   * המטייל הניח את הסיכה בעצמו - בלחיצה על המפה או בגרירה שלה.
   * זה המקור הכי אמין שיש, ולכן source נהיה 'manual' ומצב ההנחה נסגר.
   */
  const movePin = (id: string, lat: number, lng: number) => {
    if (!t) return;
    trip.upsertTrip({
      ...t,
      pins: (t.pins ?? []).map((p) =>
        p.id === id ? { ...p, lat, lng, source: 'manual' as const } : p,
      ),
    });
    setPlacingPinId(null);
  };

  const removePin = (id: string) => {
    if (!t) return;
    trip.upsertTrip({ ...t, pins: (t.pins ?? []).filter((p) => p.id !== id) });
    if (placingPinId === id) setPlacingPinId(null);
  };

  /**
   * קישור השיתוף: מנסים קוד קצר דרך /api/share (Supabase); בלי backend
   * מוגדר - נופלים בשקט לקישור ה-inline הארוך (v1), שעובד תמיד.
   * התוצאה נשמרת ב-ref לפי תוכן הטיול כדי לא לייצר קוד חדש בכל קליק.
   */
  const shareUrlCache = useRef<{ sig: string; url: string } | null>(null);

  async function getShareUrl(): Promise<string> {
    if (!t) return '';
    const sig = JSON.stringify([t.name, t.days.map((d) => [d.citySlug, d.placeIds, d.notes ?? ''])]);
    if (shareUrlCache.current?.sig === sig) return shareUrlCache.current.url;
    let url = `${window.location.origin}/t/${encodeTripShare(t)}`;
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip: t }),
      });
      const data = (await res.json()) as { code?: string | null };
      if (data.code) url = `${window.location.origin}/t/${data.code}`;
    } catch {
      /* נשארים עם הקישור הארוך */
    }
    shareUrlCache.current = { sig, url };
    return url;
  }

  async function copyShareLink() {
    if (!t) return;
    const url = await getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    if (!t) return;
    // פותחים חלון סינכרונית (שורד חוסמי פופאפ) ומנווטים כשהקישור מוכן
    const win = window.open('', '_blank');
    void getShareUrl().then((url) => {
      // 🧳 ולא ✈️: המטוס הוא תו Unicode ישן (U+2708+VS16) שחלק מהפלטפורמות
      // מציגות כ-� - המזוודה היא קודפוינט מודרני יחיד שמרונדר בכל מקום
      const text = `שיתפתי איתך את הטיול "${t.name}" שבניתי בטיול+ 🧳\n${url}`;
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      if (win) win.location.href = wa;
      else window.open(wa, '_blank', 'noopener');
    });
  }

  // קישורי שיתוף מאומתים מול הקטלוג האוצר בלבד - טיול עם יעד שנחקר
  // אוטומטית עדיין לא ניתן לשיתוף (שלב הבא: payload v2 עם המקומות עצמם)
  const hasExploredCity = Boolean(t?.days.some((d) => d.citySlug.startsWith('explored-')));

  /**
   * העדפות שהוגדרו בפועל, כטקסט - כדי שהקיפול לא יסתיר מידע. הצ׳יפים
   * עצמם נפתחים בלחיצה; מה שכבר נבחר נשאר קריא גם כשהם מקופלים.
   */
  const prefSummary = t
    ? [
        t.preferences?.kosher === true ? 'כשר' : null,
        t.preferences?.pace === 'packed' ? 'דחוס' : t.preferences?.pace === 'relaxed' ? 'רגוע' : null,
        t.preferences?.party
          ? { couple: 'זוג', family: 'משפחה', friends: 'חברים', solo: 'סולו' }[t.preferences.party]
          : null,
        t.preferences?.shopping
          ? { more: 'שופינג: יותר', normal: 'שופינג: רגיל', less: 'שופינג: פחות' }[
              t.preferences.shopping
            ]
          : null,
        t.preferences?.shabbatAware ? 'שומרי שבת' : null,
        t.preferences?.budget
          ? { low: 'תקציב נמוך', medium: 'תקציב בינוני', high: 'תקציב גבוה' }[t.preferences.budget]
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    // הסרגל הדביק והמגירה חייבים לשבת מחוץ ל-.rise-in: אנימציה עם
    // fill-mode both משאירה transform על האלמנט, וזה יוצר containing block
    // ש"שובר" position:fixed של צאצאים.
    <>
    <div className="rise-in pb-24 lg:pb-0">
      {/* ---------- כותרת הטיול ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {t ? (
            <input
              value={t.name}
              onChange={(e) => trip.renameTrip(t.id, e.target.value)}
              aria-label="שם הטיול"
              className="display w-48 min-w-0 rounded-xl bg-transparent text-2xl text-night outline-none ring-sunset/50 transition focus:ring-2 sm:w-64"
            />
          ) : (
            <span className="display text-2xl text-night">הטיול החדש שלכם</span>
          )}
          <span className="badge shrink-0 rounded-full bg-night/5 px-3 py-1 text-xs font-semibold text-night/60">
            {t ? `${totalStops} עצירות · ${t.days.length} ימים` : 'הסוכן בונה…'}
          </span>
        </div>
        {/*
          שלושה פקדים במקום שבעה. הכל נשאר בהישג יד - שיתוף בתפריט אחד,
          השאר בתפריט "עוד", והמחיקה בתחתיתו ומופרדת בקו: פעולה הרסנית
          לא אמורה לשבת במסך הראשון באותו משקל חזותי כמו שיתוף.
        */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Btn onClick={onNewTrip}>+ טיול חדש</Btn>
          {!t && <Btn onClick={() => setImportOpen(true)}>📍 ייבוא מפה</Btn>}
          {t && !hasExploredCity && (
            <Menu
              ariaLabel="שיתוף הטיול"
              label="שיתוף"
              icon={ICONS.link}
              items={[
                {
                  label: linkCopied ? 'הקישור הועתק ✓' : 'העתקת קישור',
                  onClick: copyShareLink,
                  icon: linkCopied ? ICONS.check : ICONS.link,
                },
                { label: 'שליחה בוואטסאפ', onClick: shareWhatsApp, icon: ICONS.whatsapp },
              ]}
            />
          )}
          {t && (
            <Menu
              ariaLabel="עוד פעולות"
              label="⋯"
              items={[
                {
                  label: 'שכפול הטיול',
                  onClick: () => trip.duplicateTrip(t.id),
                  icon: ICONS.duplicate,
                },
                { label: '📍 ייבוא מפה מ-Google', onClick: () => setImportOpen(true) },
                { label: 'הדפסה / PDF', onClick: () => window.print(), icon: ICONS.printer },
                {
                  label: 'מחיקת הטיול',
                  danger: true,
                  separated: true,
                  icon: ICONS.trash,
                  onClick: () => {
                    if (confirm('למחוק את הטיול הזה?')) {
                      trip.deleteTrip(t.id);
                      setSelectedDayId(null);
                    }
                  },
                },
              ]}
            />
          )}
        </div>
      </div>

      {/* ---------- העדפות: כפתורים, אף פעם לא שאלות בשיחה ---------- */}
      {t && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 print:hidden">
          {/*
            מקופל כברירת מחדל, אבל **הערכים שנבחרו נשארים גלויים כטקסט**
            בתוך הכפתור עצמו - העדפות נקבעות פעם אחת ונקראות שוב לעיתים
            רחוקות, ולכן ארבעה צ׳יפים פתוחים תמיד הם רעש; להסתיר מה שכבר
            נבחר היה כבר שגיאה אחרת.
          */}
          <button
            onClick={() => setPrefsOpen((v) => !v)}
            aria-expanded={prefsOpen}
            className="rounded-full bg-night/5 px-2.5 py-1 text-xs font-semibold text-night/55 transition hover:bg-night/10 hover:text-night"
          >
            העדפות{prefSummary ? `: ${prefSummary}` : ''}{' '}
            <span aria-hidden className={`inline-block transition-transform ${prefsOpen ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
        </div>
      )}
      {t && prefsOpen && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 print:hidden">
          <ToggleChip
            active={t.preferences?.kosher === true}
            label="כשר"
            onClick={() => setPrefs({ kosher: t.preferences?.kosher === true ? undefined : true })}
          />
          <ToggleChip
            active={Boolean(t.preferences?.pace)}
            label={
              t.preferences?.pace === 'packed'
                ? 'קצב: דחוס'
                : t.preferences?.pace === 'relaxed'
                  ? 'קצב: רגוע'
                  : 'קצב'
            }
            onClick={() =>
              setPrefs({
                pace:
                  t.preferences?.pace === undefined
                    ? 'relaxed'
                    : t.preferences.pace === 'relaxed'
                      ? 'packed'
                      : undefined,
              })
            }
          />
          <ToggleChip
            active={Boolean(t.preferences?.party)}
            label={
              t.preferences?.party
                ? { couple: 'זוג', family: 'משפחה', friends: 'חברים', solo: 'סולו' }[
                    t.preferences.party
                  ]
                : 'מי נוסע'
            }
            onClick={() =>
              setPrefs({
                party:
                  t.preferences?.party === undefined
                    ? 'couple'
                    : t.preferences.party === 'couple'
                      ? 'family'
                      : t.preferences.party === 'family'
                        ? 'friends'
                        : t.preferences.party === 'friends'
                          ? 'solo'
                          : undefined,
              })
            }
          />
          <ToggleChip
            active={Boolean(t.preferences?.shopping)}
            label={
              t.preferences?.shopping
                ? { more: 'שופינג: יותר', normal: 'שופינג: רגיל', less: 'שופינג: פחות' }[
                    t.preferences.shopping
                  ]
                : 'שופינג'
            }
            onClick={() =>
              setPrefs({
                shopping:
                  t.preferences?.shopping === undefined
                    ? 'more'
                    : t.preferences.shopping === 'more'
                      ? 'normal'
                      : t.preferences.shopping === 'normal'
                        ? 'less'
                        : undefined,
              })
            }
          />
          {t.preferences?.shabbatAware && <PrefChip label="שומרי שבת" />}
          {t.preferences?.budget && (
            <PrefChip
              label={
                { low: 'תקציב נמוך', medium: 'תקציב בינוני', high: 'תקציב גבוה' }[
                  t.preferences.budget
                ]
              }
            />
          )}
        </div>
      )}

      {/* ---------- טאבי הימים + מעברי ערים ---------- */}
      {t && t.days.length > 0 && (
        <div className="mt-4 -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 print:hidden">
          {t.days.map((d, i) => {
            const dst = destOf(d.citySlug);
            const prev = i > 0 ? t.days[i - 1] : null;
            const cityChanged = prev && prev.citySlug !== d.citySlug;
            return (
              <span key={d.id} className="flex shrink-0 items-center gap-2">
                {cityChanged && (
                  <span
                    title={legOf(prev!.citySlug, d.citySlug).label}
                    className="rounded-full bg-night/5 px-2.5 py-1 text-xs font-medium text-night/50"
                  >
                    {legOf(prev!.citySlug, d.citySlug).emoji}
                  </span>
                )}
                <button
                  onClick={() => setSelectedDayId(d.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    day?.id === d.id
                      ? 'bg-sunset text-cream'
                      : 'bg-shell text-night/60 ring-1 ring-night/10 hover:ring-night/25'
                  }`}
                >
                  <Flag flag={dst?.flag} label={dst?.name} size="sm" className="me-1.5" />
                  יום {i + 1}
                </button>
              </span>
            );
          })}
          <AddDayPicker
            destinations={destinations}
            countries={countries}
            tripCitySlugs={t.citySlugs}
            onAddDay={(slug) => trip.addDay(slug)}
          />
        </div>
      )}

      {/* ---------- המסך המאוחד: מסלול · מפה · שיחה ---------- */}
      {/*
        הסוכן הוא המוצר, והוא היה העמודה הצרה והשקטה ביותר (22rem מול 20
        למסלול). הוא מקבל עכשיו את העמודה הרחבה מהשתיים שלצדי המפה.
      */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,21rem)] xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,25rem)] print:hidden">
        {/* מפה - ראשונה במובייל, עמודה אמצעית מ-lg */}
        <div className="order-first lg:order-none lg:col-start-2 lg:row-start-1">
          <div className="lg:sticky lg:top-20">
            {/* מתג יום נבחר / כל הטיול */}
            {t && t.days.length > 1 && tripGroups.length > 0 && (
              <div className="mb-2 flex justify-center print:hidden">
                <div className="inline-flex rounded-full bg-shell p-1 ring-1 ring-night/10">
                  <button
                    onClick={() => setMapMode('day')}
                    aria-pressed={mapMode === 'day'}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      mapMode === 'day' ? 'bg-sunset text-cream' : 'text-night/60 hover:text-night'
                    }`}
                  >
                    יום {dayIndex + 1}
                  </button>
                  <button
                    onClick={() => setMapMode('trip')}
                    aria-pressed={mapMode === 'trip'}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      mapMode === 'trip' ? 'bg-sunset text-cream' : 'text-night/60 hover:text-night'
                    }`}
                  >
                    🗺️ כל הטיול
                  </button>
                </div>
              </div>
            )}

            {mapMode === 'trip' && tripGroups.length > 0 ? (
              <>
                <div className="h-64 overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-80 lg:h-[30rem]">
                  <PlacesMap
                    center={{
                      lat: tripGroups[0].places[0].lat,
                      lng: tripGroups[0].places[0].lng,
                    }}
                    zoom={12}
                    places={[]}
                    groups={tripGroups}
                    pins={allPins}
                    onPinMove={movePin}
                    placingPinId={placingPinId}
                  />
                </div>
                {/* מקרא הימים - לחיצה קופצת ליום */}
                <div className="mt-2 flex flex-wrap justify-center gap-1.5 print:hidden">
                  {t!.days.map((d, i) => {
                    const g = tripGroups.find((gr) => gr.badge === String(i + 1));
                    if (!g) return null;
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          setSelectedDayId(d.id);
                          setMapMode('day');
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-shell px-2.5 py-1 text-xs font-semibold text-night/70 ring-1 ring-night/10 transition hover:ring-night/25"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: g.color }}
                        />
                        יום {i + 1} · {destOf(d.citySlug)?.name}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : dayDest && places.length > 0 ? (
              <div className="h-64 overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-80 lg:h-[34rem]">
                <PlacesMap
                  center={dayDest.center}
                  zoom={dayDest.zoom}
                  places={places}
                  numbered
                  showRoute
                  pins={dayPins}
                  onPinMove={movePin}
                  placingPinId={placingPinId}
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-night/15 px-6 text-center text-sm font-medium leading-relaxed text-night/50 lg:h-[34rem]">
                {t
                  ? 'אין עדיין עצירות ביום הזה - אפשר להוסיף מהרשימה או לבקש מהסוכן'
                  : 'כאן תופיע המפה של הטיול ברגע שהסוכן יבנה אותו'}
              </div>
            )}
          </div>
        </div>

        {/* מסלול היום */}
        <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-1">
          {t && day && dayDest ? (
            <>
              {/* מעבר בין ערים */}
              {(() => {
                const prev = dayIndex > 0 ? t.days[dayIndex - 1] : null;
                if (prev && prev.citySlug !== day.citySlug) {
                  const leg = legOf(prev.citySlug, day.citySlug);
                  return (
                    <div className="rounded-xl bg-night/5 px-4 py-3 text-sm font-semibold text-night/80">
                      {leg.emoji} {destOf(prev.citySlug)?.name} ← {dayDest.name} · {leg.label}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-night">
                    <Flag flag={dayDest.flag} label={dayDest.name} size="md" className="me-2" />
                    יום {dayIndex + 1} · {dayDest.name}
                  </h2>
                  {t.days.length > 1 && (
                    <Menu
                      compact
                      ariaLabel={`פעולות ליום ${dayIndex + 1}`}
                      label="⋯"
                      items={[
                        {
                          label: 'מחיקת היום',
                          danger: true,
                          icon: ICONS.trash,
                          onClick: () => {
                            trip.removeDay(day.id);
                            setSelectedDayId(null);
                          },
                        },
                      ]}
                    />
                  )}
                </div>
                {/* תיאור היום - נגזר מהעצירות האמיתיות שבו בלבד */}
                <p className="mt-1 text-sm font-medium leading-relaxed text-night/55">
                  {dayDescription(day, dayDest)}
                </p>
                {/*
                  שדה הערות ריק קורא כמו טופס שלא מולא. הוא נפתח בלחיצה -
                  **ותמיד פתוח כשיש בו תוכן**, אחרת מטייל שכתב הערה יחשוב
                  שהיא נמחקה. `noteOpen` מאותחל לפי day.id כדי שהפתיחה לא
                  תיגרר מיום אחד לאחר.
                */}
                {day.notes || noteOpenFor === day.id ? (
                  <textarea
                    value={day.notes ?? ''}
                    onChange={(e) => trip.setDayNotes(day.id, e.target.value)}
                    placeholder="הערות ליום הזה…"
                    rows={2}
                    autoFocus={noteOpenFor === day.id && !day.notes}
                    className="mt-3 w-full resize-none rounded-xl bg-night/5 px-4 py-2.5 text-base sm:text-sm text-night outline-none ring-1 ring-night/10 transition placeholder:text-night/40 focus:ring-2 focus:ring-sunset"
                  />
                ) : (
                  <button
                    onClick={() => setNoteOpenFor(day.id)}
                    className="mt-2 text-xs font-semibold text-night/45 transition hover:text-night"
                  >
                    + הערה ליום
                  </button>
                )}
                {places.length > 1 && (
                  <a
                    href={googleDirectionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    /*
                      היה הכפתור הקורל המלא - ולכן הדבר הבולט ביותר במסך.
                      זו פעולה של יום הנסיעה עצמו, לא של מי שמתכנן מהספה,
                      אז הוא נשאר במקומו ומפסיק להיות הגורם החזק ביותר.
                    */
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-night/5 px-4 py-2.5 text-center text-sm font-bold text-night/75 ring-1 ring-night/10 transition hover:bg-night/10 hover:text-night"
                  >
                    <span aria-hidden>🧭</span> ניווט היום ב-Google Maps
                  </a>
                )}
              </div>

              {/* עצירות */}
              <ol className="space-y-2">
                {places.map((place, i) => {
                  const meta = categoryMeta[place.category];
                  return (
                    <li key={place.id} className="flex gap-3 rounded-2xl bg-shell p-4 ring-1 ring-night/10">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-night">
                            {place.name}
                            <span className="badge ms-2 text-xs font-medium text-night/40">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: meta.color }}
                              />
                              {meta.label}
                            </span>
                          </div>
                          {/*
                            ארבעה פקדים לכל עצירה (הסרה, למעלה, למטה, העברה
                            ליום) היו גלויים תמיד - בטיול של ארבע עצירות זה
                            16 פקדים זעירים שמתחרים בשמות המקומות, שהם התוכן
                            שבאו לקרוא. עכשיו כפתור אחד. הפעולות שאינן
                            רלוונטיות (למעלה בעצירה הראשונה) לא מוצגות בכלל
                            במקום להיות מוצגות ומושבתות.
                          */}
                          <Menu
                            compact
                            ariaLabel={`פעולות ל${place.name}`}
                            label="⋯"
                            items={[
                              {
                                label: 'הזזה למעלה',
                                onClick: () => trip.movePlace(day.id, i, -1),
                                disabled: i === 0,
                              },
                              {
                                label: 'הזזה למטה',
                                onClick: () => trip.movePlace(day.id, i, 1),
                                disabled: i === places.length - 1,
                              },
                              ...t.days
                                .filter((d) => d.id !== day.id && d.citySlug === day.citySlug)
                                .map((d) => ({
                                  label: `העברה ליום ${t.days.findIndex((x) => x.id === d.id) + 1}`,
                                  onClick: () => trip.movePlaceToDay(day.id, place.id, d.id),
                                })),
                              {
                                label: 'הסרה מהיום',
                                danger: true,
                                separated: true,
                                onClick: () => trip.removePlace(day.id, place.id),
                              },
                            ]}
                          />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-night/60">
                          {place.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* הוספת עצירה נעשית בשיחה עם הסוכן (או מדף היעד) - לא ברשימת
                  קטלוג גולמית. זו רק תזכורת קצרה, לא פקד. */}
              <p className="rounded-xl bg-night/[0.03] px-4 py-3 text-sm leading-relaxed text-night/55">
                רוצים להוסיף עצירה? פשוט בקשו מהסוכן - למשל
                <span className="font-semibold text-night/75"> &quot;תוסיף לי את השוק הישן ליום {dayIndex + 1}&quot;</span> -
                או הוסיפו מדף היעד של {dayDest.name}.
              </p>
            </>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-night/15 p-6 text-center">
              <div className="text-2xl">🗺️</div>
              <div className="mt-2 font-bold text-night/70">
                {t ? 'הטיול עוד ריק' : 'הסוכן בונה את הטיול'}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-night/50">
                {t
                  ? 'מוסיפים יום למעלה, או מבקשים מהסוכן בשיחה'
                  : 'ברגע שייבנה מסלול הוא יופיע כאן - ימים, עצירות ומפה - ויתעדכן עם כל בקשה.'}
              </p>
            </div>
          )}
        </div>

        {/* שיחה: עמודה שלישית לצד המפה מ-lg ומעלה - הסוכן תמיד בצד, לא
            מתחת למפה, גם בלפטופים קטנים. במובייל - מגירה למטה. */}
        <ChatPanel
          chat={chat}
          coach={coach}
          onDismissCoach={dismissCoach}
          className="hidden lg:sticky lg:top-20 lg:col-start-3 lg:row-start-1 lg:flex lg:h-[36rem] lg:self-start"
        />
      </div>

      {/* ---------- שכבת ההזמנות: מה עוד חסר לטיול ---------- */}
      {t && t.days.length > 0 && (
        <BookingPanel trip={t} destinations={destinations} onSetPreferences={setPrefs} />
      )}

      {/* ---------- הסיכות של המטייל: מה הוא כבר סגר בעצמו ---------- */}
      {t && (
        <PinsPanel
          trip={t}
          destinations={destinations}
          placingPinId={placingPinId}
          onStartPlacing={setPlacingPinId}
          onRemovePin={removePin}
        />
      )}

      {/* ---------- סקירת כל הימים (עם תיאור לכל יום) ---------- */}
      {t && t.days.length > 0 && (
        <section className="mt-5 print:hidden">
          <button
            onClick={() => setAllDaysOpen((v) => !v)}
            aria-expanded={allDaysOpen}
            /*
              היה פתוח תמיד מ-lg ומעלה. הוא חוזר על טאבי הימים ועל כרטיס
              היום שכבר מוצגים למעלה, ולכן במסך הראשון הוא נטו רעש -
              מקופל עכשיו בכל רוחב, במרחק לחיצה אחת.
            */
            className="flex w-full items-center gap-2 rounded-xl bg-night/[0.03] px-4 py-2.5 text-start text-sm font-bold text-night/70 transition hover:bg-night/[0.06]"
          >
            כל הימים ({t.days.length})
            <span className={`ms-auto text-xs transition-transform ${allDaysOpen ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          <div className={allDaysOpen ? 'mt-2 block' : 'hidden'}>
            <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {t.days.map((d, i) => {
                const dst = destOf(d.citySlug);
                const isCurrent = d.id === day?.id;
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => setSelectedDayId(d.id)}
                      className={`w-full rounded-xl p-3 text-start ring-1 transition ${
                        isCurrent
                          ? 'bg-sunset/5 ring-sunset/40'
                          : 'bg-shell ring-night/10 hover:ring-night/25'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-night">יום {i + 1}</span>
                        <span className="badge truncate text-sm text-night/50">
                          <Flag flag={dst?.flag} label={dst?.name} size="sm" />
                          {dst?.name}
                        </span>
                        <span className="ms-auto shrink-0 text-xs font-medium text-night/40">
                          {d.placeIds.length} עצירות
                        </span>
                      </div>
                      {/* תיאור היום - סיכום כן של מה שיש בו בפועל */}
                      <div className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-night/55">
                        {dayDescription(d, dst)}
                      </div>
                      {d.notes && <div className="mt-1 text-xs text-night/45">💡 {d.notes}</div>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* ---------- ייצוא להדפסה/PDF: שער ממותג + ימים + פוטר ---------- */}
      {t && (
        <div className="hidden print:block">
          {/* עמוד שער */}
          <div className="print-cover">
            <div className="print-cover-rule" aria-hidden />
            <div className="print-cover-center">
              <Logo className="print-logo" />
              <p className="print-brand">
                טיול<span>+</span>
              </p>
              <h1>{t.name}</h1>
              <p className="print-meta">
                {t.days.length} ימים · {totalStops} עצירות
              </p>
              <div className="print-cities">
                {Array.from(new Set(t.days.map((d) => d.citySlug))).map((slug) => {
                  const dst = destOf(slug);
                  return dst ? (
                    <span key={slug} className="print-city-chip">
                      {dst.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            <p className="print-cover-foot">
              סוכן הנסיעות החכם · הופק {new Date().toLocaleDateString('he-IL')}
            </p>
          </div>

          {/* הימים */}
          {t.days.map((d, i) => {
            const dst = destOf(d.citySlug);
            const prev = i > 0 ? t.days[i - 1] : null;
            const dayStops = d.placeIds
              .map((pid) => placeOf(d.citySlug, pid))
              .filter((p): p is Place => Boolean(p));
            return (
              <div key={d.id}>
                {prev && prev.citySlug !== d.citySlug && (
                  <p className="print-leg">
                    {legOf(prev.citySlug, d.citySlug).emoji} מעבר:{' '}
                    {destOf(prev.citySlug)?.name} ← {dst?.name} ·{' '}
                    {legOf(prev.citySlug, d.citySlug).label}
                  </p>
                )}
                <section className="print-day">
                  <header className="print-day-head">
                    <span className="print-day-num">{i + 1}</span>
                    <div>
                      <h2>
                        יום {i + 1} · {dst?.name}
                      </h2>
                      <p className="print-day-desc">{dayDescription(d, dst)}</p>
                    </div>
                  </header>
                  {d.notes && <p className="print-day-notes">💡 {d.notes}</p>}
                  <ol className="print-stops">
                    {dayStops.map((p, j) => (
                      <li key={p.id} className="print-stop">
                        <span className="print-stop-num">{j + 1}</span>
                        <div className="print-stop-body">
                          <p className="print-stop-name">
                            {p.name}
                            {p.mustSee && (
                              <span className="print-stop-star" title="חובה לראות">
                                ★
                              </span>
                            )}
                            <span className="print-stop-local">{p.nameLocal}</span>
                          </p>
                          <p className="print-stop-cat">{categoryMeta[p.category].label}</p>
                          {p.kosherNote && (
                            <p className="print-stop-kosher">✡️ {p.kosherNote}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {dayStops.length === 0 && (
                    <p className="print-day-notes">אין עדיין עצירות ביום הזה</p>
                  )}
                </section>
              </div>
            );
          })}

          {/* פוטר: דיסקליימר + חתימת BlackZ */}
          <div className="print-footer">
            <p className="print-disclaimer">
              הטיול תוכנן בעזרת AI · לוודא כשרות, שעות ומחירים מול המקומות עצמם לפני הנסיעה
              <br />
              הופק ע&quot;י טיול+
            </p>
            <div className="print-signature">
              <blackz-signature></blackz-signature>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* ---------- מובייל: סרגל שיחה דביק + מגירה ---------- */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-3 end-3 start-20 z-40 flex items-center gap-2 rounded-2xl bg-shell px-4 py-3 text-start shadow-[0_10px_30px_-12px_rgba(36,27,77,0.5)] ring-1 ring-night/15 lg:hidden print:hidden"
      >
        <span className="truncate text-sm font-medium text-night/50">
          {chat.loading ? 'הסוכן עונה…' : 'בקשה לסוכן: תוסיף יום, תחליף מקום…'}
        </span>
        <span className="ms-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunset text-cream">
          <span aria-hidden>💬</span>
        </span>
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden print:hidden">
          <button
            aria-label="סגירת השיחה"
            onClick={() => setChatOpen(false)}
            className="absolute inset-0 bg-night/40"
          />
          <div className="absolute inset-x-0 bottom-0 h-[82vh] rounded-t-3xl bg-shell p-2 shadow-[0_-10px_40px_-12px_rgba(36,27,77,0.5)]">
            <ChatPanel
              chat={chat}
              autoFocus
              coach={coach}
              onDismissCoach={dismissCoach}
              onClose={() => setChatOpen(false)}
              className="flex h-full ring-0"
            />
          </div>
        </div>
      )}

      {/* ייבוא מפה מ-Google My Maps → נשמר כיעד explored + טיול חדש */}
      <ImportMapModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(dest, newTrip) => {
          chat.addExplored(dest);
          trip.createTripFrom(newTrip);
          setSelectedDayId(null);
          setMapMode('day');
        }}
      />

    </>
  );
}

/* אייקוני הפעולות - קווי, ירושת currentColor, בסגנון lucide. אין תלות. */
const iconSvg = (paths: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 shrink-0"
    aria-hidden
  >
    {paths}
  </svg>
);

const ICONS = {
  duplicate: iconSvg(
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>,
  ),
  check: iconSvg(<path d="M20 6 9 17l-5-5" />),
  link: iconSvg(
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>,
  ),
  whatsapp: iconSvg(
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.63 7.45L3 20l1.05-5.37A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9 10c.5 2.5 2.5 4.5 5 5l1.5-1.5" />
    </>,
  ),
  printer: iconSvg(
    <>
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </>,
  ),
  trash: iconSvg(
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </>,
  ),
};

function Btn({
  children,
  onClick,
  danger = false,
  icon,
  iconClassName = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
  iconClassName?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
        danger
          ? 'bg-shell text-sunset-deep ring-1 ring-night/10 hover:bg-sunset hover:text-cream'
          : 'bg-shell text-night ring-1 ring-night/15 hover:bg-night/5 hover:ring-night/30'
      }`}
    >
      {icon && <span className={`opacity-80 ${iconClassName}`}>{icon}</span>}
      {children}
    </button>
  );
}

/** רמז הפתיחה מוצג פעם אחת לדפדפן */
const COACH_KEY = 'tiyul-plus:coach:agent';

/**
 * תפריט קטן: כפתור אחד שפותח רשימת פעולות.
 *
 * נבנה כדי לצמצם את מסך הטיול. המדידה שהובילה לזה: 54 פקדים לחיצים
 * במסך הראשון ב-1440 ו-32 ב-390, בלי שום דירוג ביניהם - וזה מה שגרם
 * למייסד לתאר את המסך כ"הטיסת מטוס". התפריט מחזיק את הפעולות שמטייל
 * בפעם הראשונה לא צריך, בלי להסיר אותן.
 *
 * כפתור אמיתי ולא hover: ריחוף לא קיים במגע, וגלישה במקלדת חייבת להגיע
 * לכל פעולה. בלי תלות חדשה - אותה גישה כמו הדרופדאון ב-PromptChips.
 */
function Menu({
  label,
  ariaLabel,
  icon,
  items,
  compact = false,
}: {
  label: string;
  ariaLabel: string;
  icon?: React.ReactNode;
  compact?: boolean;
  items: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
    /** קו מפריד מעליו - לפעולות הרסניות */
    separated?: boolean;
  }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const usable = items.filter((it) => !it.disabled);
  if (usable.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        title={ariaLabel}
        className={
          compact
            ? 'flex h-7 w-7 items-center justify-center rounded-full text-night/35 transition hover:bg-night/5 hover:text-night'
            : 'inline-flex items-center gap-1.5 rounded-xl bg-shell px-3.5 py-2 text-sm font-semibold text-night ring-1 ring-night/15 transition hover:bg-night/5 hover:ring-night/30'
        }
      >
        {icon && <span className="opacity-80">{icon}</span>}
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 z-30 mt-1 min-w-[12rem] overflow-hidden rounded-xl bg-shell py-1 shadow-pop ring-1 ring-night/15"
        >
          {usable.map((it, i) => (
            <div key={it.label}>
              {it.separated && i > 0 && <div className="my-1 border-t border-night/10" />}
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3.5 py-2 text-start text-sm font-semibold transition ${
                  it.danger
                    ? 'text-sunset-deep hover:bg-sunset/10'
                    : 'text-night/80 hover:bg-night/5 hover:text-night'
                }`}
              >
                {it.icon && <span className="opacity-70">{it.icon}</span>}
                {it.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrefChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-night/5 px-2.5 py-1 text-xs font-semibold text-night/60">
      {label}
    </span>
  );
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
        active ? 'bg-sunset text-cream' : 'bg-night/5 text-night/50 hover:bg-night/10'
      }`}
    >
      {label}
    </button>
  );
}
