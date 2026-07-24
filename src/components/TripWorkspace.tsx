'use client';

import { useMemo, useState } from 'react';
import type { Destination, Place } from '@/lib/types';
import type { TripPreferences } from '@/lib/trip/types';
import { destinations as curatedDestinations } from '@/data/destinations';
import { categoryMeta } from '@/lib/categories';
import { useTrip } from '@/lib/trip/TripContext';
import { travelLeg } from '@/lib/trip/travel';
import { useTripChat } from '@/lib/trip/useTripChat';
import { dayDescription, dayPlaces } from '@/lib/trip/dayDescription';
import PlacesMap from '@/components/PlacesMap';
import ChatPanel from '@/components/ChatPanel';
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
  const [chatOpen, setChatOpen] = useState(false);
  const [allDaysOpen, setAllDaysOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addCity, setAddCity] = useState('');

  const t = trip.currentTrip;
  const destOf = (slug: string) => destinations.find((d) => d.slug === slug);
  const placeOf = (slug: string, id: string): Place | undefined =>
    destOf(slug)?.places.find((p) => p.id === id);

  const day = t ? (t.days.find((d) => d.id === selectedDayId) ?? t.days[0] ?? null) : null;
  const dayDest = day ? destOf(day.citySlug) : null;
  const dayIndex = t && day ? t.days.findIndex((d) => d.id === day.id) : -1;

  const places: Place[] = useMemo(
    () => (day ? dayPlaces(day, dayDest) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day, dayDest, t],
  );

  const availableToAdd: Place[] = useMemo(() => {
    if (!t || !day || !dayDest) return [];
    const usedInTrip = new Set(t.days.flatMap((d) => d.placeIds));
    return dayDest.places.filter((p) => !usedInTrip.has(p.id));
  }, [day, dayDest, t]);

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

  function copySummary() {
    if (!t) return;
    const lines: string[] = [`🧳 ${t.name} | טיול+`, ''];
    t.days.forEach((d, i) => {
      const dst = destOf(d.citySlug);
      if (i > 0 && t.days[i - 1].citySlug !== d.citySlug) {
        const leg = travelLeg(t.days[i - 1].citySlug, d.citySlug);
        lines.push(
          `${leg.emoji} מעבר: ${destOf(t.days[i - 1].citySlug)?.name} ← ${dst?.name} (${leg.label})`,
          '',
        );
      }
      lines.push(`📅 יום ${i + 1} - ${dst?.flag} ${dst?.name}:`);
      lines.push(`   ${dayDescription(d, dst)}`);
      d.placeIds.forEach((pid, j) => {
        const p = placeOf(d.citySlug, pid);
        if (p) lines.push(`  ${j + 1}. ${p.name} (${p.nameLocal})`);
      });
      if (d.notes) lines.push(`  💡 ${d.notes}`);
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /* ---------- כפתורי הפעולות (משותפים לשורה בדסקטופ ולתפריט במובייל) ---------- */
  const actionButtons = t ? (
    <>
      <Btn onClick={() => trip.duplicateTrip(t.id)}>שכפול</Btn>
      <Btn onClick={copySummary}>{copied ? '✓ הועתק' : 'העתקת סיכום'}</Btn>
      <Btn onClick={() => window.print()}>הדפסה / PDF</Btn>
      <Btn
        danger
        onClick={() => {
          if (confirm('למחוק את הטיול הזה?')) {
            trip.deleteTrip(t.id);
            setSelectedDayId(null);
          }
        }}
      >
        מחיקה
      </Btn>
    </>
  ) : null;

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
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Btn onClick={onNewTrip}>+ טיול חדש</Btn>
          <div className="hidden flex-wrap gap-2 sm:flex">{actionButtons}</div>
          {t && (
            <button
              onClick={() => setActionsOpen((v) => !v)}
              aria-expanded={actionsOpen}
              className="rounded-xl bg-shell px-3.5 py-2 font-semibold text-night/70 ring-1 ring-night/10 sm:hidden"
            >
              פעולות ▾
            </button>
          )}
        </div>
      </div>
      {actionsOpen && t && (
        <div className="mt-2 flex flex-wrap gap-2 text-sm sm:hidden print:hidden">{actionButtons}</div>
      )}

      {/* ---------- העדפות: כפתורים, אף פעם לא שאלות בשיחה ---------- */}
      {t && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 print:hidden">
          <span className="text-xs font-bold text-night/40">העדפות ·</span>
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
                    title={travelLeg(prev!.citySlug, d.citySlug).label}
                    className="rounded-full bg-night/5 px-2.5 py-1 text-xs font-medium text-night/50"
                  >
                    {travelLeg(prev!.citySlug, d.citySlug).emoji}
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
                  {dst?.flag} יום {i + 1}
                </button>
              </span>
            );
          })}
          <select
            value={addCity}
            aria-label="הוספת יום"
            onChange={(e) => {
              if (e.target.value) {
                trip.addDay(e.target.value);
                setAddCity('');
              }
            }}
            className="shrink-0 rounded-full bg-shell px-3 py-2 text-sm font-semibold text-night/70 ring-1 ring-night/10"
          >
            <option value="">+ יום…</option>
            {t.citySlugs.map((c) => (
              <option key={c} value={c}>
                עוד יום ב{destOf(c)?.name}
              </option>
            ))}
            {destinations
              .filter((d) => !t.citySlugs.includes(d.slug))
              .map((d) => (
                <option key={d.slug} value={d.slug}>
                  עיר חדשה: {d.flag} {d.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* ---------- המסך המאוחד: מסלול · מפה · שיחה ---------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,22rem)] print:hidden">
        {/* מפה - ראשונה במובייל, עמודה אמצעית מ-lg */}
        <div className="order-first lg:order-none lg:col-start-2 lg:row-start-1">
          {dayDest && places.length > 0 ? (
            <div className="h-64 overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-80 lg:sticky lg:top-20 lg:h-[34rem]">
              <PlacesMap
                center={dayDest.center}
                zoom={dayDest.zoom}
                places={places}
                numbered
                showRoute
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

        {/* מסלול היום */}
        <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-1">
          {t && day && dayDest ? (
            <>
              {/* מעבר בין ערים */}
              {(() => {
                const prev = dayIndex > 0 ? t.days[dayIndex - 1] : null;
                if (prev && prev.citySlug !== day.citySlug) {
                  const leg = travelLeg(prev.citySlug, day.citySlug);
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
                    {dayDest.flag} יום {dayIndex + 1} · {dayDest.name}
                  </h2>
                  {t.days.length > 1 && (
                    <button
                      onClick={() => {
                        trip.removeDay(day.id);
                        setSelectedDayId(null);
                      }}
                      className="shrink-0 rounded-full bg-night/5 px-2.5 py-1 text-xs font-semibold text-night/60 transition hover:bg-night/10"
                    >
                      מחיקת יום
                    </button>
                  )}
                </div>
                {/* תיאור היום - נגזר מהעצירות האמיתיות שבו בלבד */}
                <p className="mt-1 text-sm font-medium leading-relaxed text-night/55">
                  {dayDescription(day, dayDest)}
                </p>
                <textarea
                  value={day.notes ?? ''}
                  onChange={(e) => trip.setDayNotes(day.id, e.target.value)}
                  placeholder="הערות ליום הזה…"
                  rows={2}
                  className="mt-3 w-full resize-none rounded-xl bg-night/5 px-4 py-2.5 text-sm text-night outline-none ring-1 ring-night/10 transition placeholder:text-night/40 focus:ring-2 focus:ring-sunset"
                />
                {places.length > 1 && (
                  <a
                    href={googleDirectionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block rounded-xl bg-sunset px-4 py-3 text-center text-sm font-bold text-cream transition hover:bg-sunset-deep"
                  >
                    פתיחת ניווט היום ב-Google Maps
                  </a>
                )}
              </div>

              {/* עצירות */}
              <ol className="space-y-2">
                {places.map((place, i) => {
                  const meta = categoryMeta[place.category];
                  return (
                    <li key={place.id} className="flex gap-3 rounded-2xl bg-shell p-4 ring-1 ring-night/10">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          {i + 1}
                        </div>
                        <button
                          onClick={() => trip.movePlace(day.id, i, -1)}
                          disabled={i === 0}
                          className="text-night/40 transition hover:text-night disabled:opacity-20"
                          aria-label="הזז למעלה"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => trip.movePlace(day.id, i, 1)}
                          disabled={i === places.length - 1}
                          className="text-night/40 transition hover:text-night disabled:opacity-20"
                          aria-label="הזז למטה"
                        >
                          ▼
                        </button>
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
                          <button
                            onClick={() => trip.removePlace(day.id, place.id)}
                            className="text-night/30 transition hover:text-sunset-deep"
                            aria-label="הסרה"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-night/60">
                          {place.description}
                        </p>
                        {t.days.filter((d) => d.citySlug === day.citySlug).length > 1 && (
                          <select
                            value=""
                            aria-label="העברה ליום אחר"
                            onChange={(e) => {
                              if (e.target.value)
                                trip.movePlaceToDay(day.id, place.id, e.target.value);
                            }}
                            className="mt-1.5 rounded-lg bg-night/5 px-2 py-1 text-xs font-medium text-night/50"
                          >
                            <option value="">העבר ליום…</option>
                            {t.days
                              .filter((d) => d.id !== day.id && d.citySlug === day.citySlug)
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  יום {t.days.findIndex((x) => x.id === d.id) + 1}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {availableToAdd.length > 0 && (
                <select
                  value=""
                  aria-label="הוספת עצירה"
                  onChange={(e) => {
                    const p = availableToAdd.find((x) => x.id === e.target.value);
                    if (p) trip.addPlace(day.citySlug, p.id);
                  }}
                  className="w-full rounded-xl bg-shell px-4 py-3 font-semibold text-night/70 ring-1 ring-night/10"
                >
                  <option value="">+ הוספת עצירה מהקטלוג של {dayDest.name}…</option>
                  {availableToAdd.map((p) => (
                    <option key={p.id} value={p.id}>
                      {categoryMeta[p.category].label} · {p.name}
                    </option>
                  ))}
                </select>
              )}
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

        {/* שיחה: עמודה שלישית מ-xl, פאנל רוחב-מלא ב-lg. במובייל - מגירה למטה. */}
        <ChatPanel
          chat={chat}
          className="hidden h-[24rem] lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:flex xl:sticky xl:top-20 xl:col-span-1 xl:col-start-3 xl:row-start-1 xl:h-[34rem] xl:self-start"
        />
      </div>

      {/* ---------- סקירת כל הימים (עם תיאור לכל יום) ---------- */}
      {t && t.days.length > 0 && (
        <section className="mt-5 print:hidden">
          <button
            onClick={() => setAllDaysOpen((v) => !v)}
            aria-expanded={allDaysOpen}
            className="flex w-full items-center gap-2 rounded-xl bg-night/[0.03] px-4 py-2.5 text-start text-sm font-bold text-night/70 transition hover:bg-night/[0.06] lg:hidden"
          >
            כל הימים ({t.days.length})
            <span className={`ms-auto text-xs transition-transform ${allDaysOpen ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          <div className={`${allDaysOpen ? 'mt-2 block' : 'hidden'} lg:mt-0 lg:block`}>
            <h2 className="mb-2 hidden text-sm font-bold text-night/40 lg:block">כל הימים</h2>
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
                        <span className="truncate text-sm text-night/50">
                          {dst?.flag} {dst?.name}
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

      {/* ---------- סיכום להדפסה ---------- */}
      {t && (
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">🧳 {t.name} - טיול+</h1>
          {t.days.map((d, i) => {
            const dst = destOf(d.citySlug);
            const prev = i > 0 ? t.days[i - 1] : null;
            return (
              <div key={d.id} className="mt-4">
                {prev && prev.citySlug !== d.citySlug && (
                  <p className="font-bold">
                    {travelLeg(prev.citySlug, d.citySlug).emoji} מעבר:{' '}
                    {destOf(prev.citySlug)?.name} ← {dst?.name} ·{' '}
                    {travelLeg(prev.citySlug, d.citySlug).label}
                  </p>
                )}
                <h2 className="mt-2 text-lg font-bold">
                  📅 יום {i + 1} - {dst?.name}
                </h2>
                <p className="text-sm">{dayDescription(d, dst)}</p>
                {d.notes && <p className="text-sm">💡 {d.notes}</p>}
                <ol className="mt-1 list-decimal ps-6 text-sm">
                  {d.placeIds.map((pid) => {
                    const p = placeOf(d.citySlug, pid);
                    return p ? (
                      <li key={pid}>
                        <strong>{p.name}</strong> ({p.nameLocal})
                        {p.kosherNote ? ` · ✡️ ${p.kosherNote}` : ''}
                      </li>
                    ) : null;
                  })}
                </ol>
              </div>
            );
          })}
          <p className="mt-6 text-xs">
            הופק ע&quot;י טיול+ · לוודא כשרות, שעות ומחירים מול המקומות עצמם
          </p>
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
              onClose={() => setChatOpen(false)}
              className="flex h-full ring-0"
            />
          </div>
        </div>
      )}

    </>
  );
}

function Btn({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
        danger
          ? 'bg-shell text-sunset-deep ring-1 ring-night/10 hover:bg-sunset hover:text-cream'
          : 'bg-shell text-night/70 ring-1 ring-night/10 hover:ring-night/25'
      }`}
    >
      {children}
    </button>
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
