'use client';

import { useMemo, useState } from 'react';
import { TRAVEL_STYLES, formatRange, tripCost, type CostCity } from '@/lib/trip/cost';
import { formatHebrewDate } from '@/lib/trip/dates';
import type { Trip, TripPreferences } from '@/lib/trip/types';
import type { Destination } from '@/lib/types';
import { OFFLINE_HINT } from '@/lib/offline/online';
import PanelSection, { PanelBody } from '@/components/PanelSection';

/**
 * "How much people spend here per day" - the deterministic side of cost.
 *
 * This component cannot estimate anything. It receives stored data, calls
 * `tripCost` which does addition and multiplication, and paints the result.
 * **The model touches no number here** - it does not generate, correct or
 * describe one; it does not even have a tool that moves the travel style
 * (see `TripPreferences.travelStyle`).
 *
 * Three display decisions worth stating:
 * 1. **With no style selected, no number is shown.** A "mid" default would
 *    be an assumption about the budget of a person who said nothing about it.
 * 2. **A city with no data appears by name and with no number**, and the
 *    total is marked partial. A city dropped silently turns a partial sum
 *    into a false sum.
 * 3. The amounts are in isolated LTR. Two numbers meeting on an RTL line
 *    stick together - exactly the "day 1 / August 10 run together" bug from
 *    the dates feature.
 */
/** A readable name for the source site, from the URL itself - no table that goes stale */
function siteLabel(url: string): string {
  const host = (url.split('/')[2] ?? '').replace(/^www\./, '');
  if (host.includes('budgetyourtrip')) return 'Budget Your Trip';
  if (host.includes('nomadicmatt')) return 'Nomadic Matt';
  return host || 'מקור';
}

export default function TripCost({
  trip,
  destinations,
  onSetPreferences,
  offline = false,
}: {
  trip: Trip;
  destinations: Destination[];
  onSetPreferences: (patch: Partial<TripPreferences>) => void;
  /**
   * The numbers themselves are stored on the device (they are part of the
   * build), so they are **readable even without a network** - which is
   * exactly the situation where you want to know what a day here costs.
   * What is blocked: choosing a travel style (a write to the trip) and
   * navigating to the source site. The check date is shown as usual - it
   * is what turns a stored number into an old number rather than a false one.
   */
  offline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const style = trip.preferences?.travelStyle;

  const cities = useMemo(() => {
    const map: Record<string, CostCity> = {};
    for (const d of destinations)
      map[d.slug] = {
        name: d.name,
        dailyCost: d.dailyCost,
        dailyBudget: d.dailyBudget,
      };
    return map;
  }, [destinations]);

  // Always computed on 'mid' when nothing is chosen, only to know whether there
  // is anything to display at all.
  const result = useMemo(() => tripCost(trip, style ?? 'mid', cities), [trip, style, cities]);

  // Not even one city with data - the component does not appear at all.
  // Nothing beats a "no information" message.
  if (result.lines.length === 0) return null;

  const checkedLabel =
    result.checked.length === 1
      ? formatHebrewDate(result.checked[0], { year: true })
      : `${formatHebrewDate(result.checked[0])} - ${formatHebrewDate(result.checked[result.checked.length - 1], { year: true })}`;

  // One source per site in use, linking to the page of the first city that
  // came from it. Two sources in one trip is a normal situation here, so a
  // single link must not be presented as if it covers all the rows.
  const sources = (() => {
    const out: { url: string; label: string }[] = [];
    for (const line of result.lines) {
      const label = siteLabel(line.source.url);
      if (!out.some((s) => s.label === label)) out.push({ url: line.source.url, label });
    }
    return out;
  })();

  const headline = style
    ? result.totals.map((c) => formatRange(c.low, c.high, c.currency)).join(' · ')
    : 'בחירת סגנון נסיעה';

  return (
    <PanelSection
      panelKey="cost"
      icon="💰"
      title="כמה מוציאים ביום"
      open={open}
      onToggle={() => setOpen((v) => !v)}
      meta={
        <>
          {style ? (
            <span dir="ltr" className="inline-block">
              {headline}
            </span>
          ) : (
            headline
          )}
          {style && !result.complete && ' · חלקי'}
        </>
      }
    >
      <PanelBody>
        <div>
          {/* ---------- Travel style: chosen once, manually ---------- */}
          <div className="flex gap-2">
            {TRAVEL_STYLES.map((s) => {
              const active = style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  title={offline ? OFFLINE_HINT : s.hint}
                  disabled={offline}
                  onClick={() => onSetPreferences({ travelStyle: active ? undefined : s.id })}
                  className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-xs font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    active
                      ? 'bg-sunset text-cream ring-sunset'
                      : 'bg-cream text-night/70 ring-night/15 enabled:hover:ring-night/30'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* The style's explanation appears only for the one selected: three
              explanations side by side made this quiet block noisier than the
              itinerary itself. */}
          <p className="mt-2 text-xs leading-relaxed text-night/55">
            {style
              ? TRAVEL_STYLES.find((s) => s.id === style)?.hint
              : offline
                ? 'בלי חיבור אי אפשר לבחור סגנון נסיעה. הסכומים יופיעו כשהחיבור יחזור.'
                : 'בוחרים סגנון אחד, ורואים כמה מוציאים מטיילים בערים של הטיול הזה ביום רגיל.'}
          </p>

          {style && (
            <>
              <ul className="mt-4 space-y-1.5">
                {result.lines.map((line) => (
                  <li
                    key={line.citySlug}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                  >
                    <span className="font-semibold text-night/80">{line.cityName}</span>
                    <span className="text-xs text-night/40">
                      {line.days === 1 ? 'יום אחד' : `${line.days} ימים`}
                    </span>
                    {/* Country-level data is stated on the row itself - it is
                        coarser than the destination, and must not read like a
                        measurement of that specific city. */}
                    {line.scope === 'country' && (
                      <span className="text-xs text-night/40">נתון ברמת המדינה</span>
                    )}
                    <span className="ms-auto text-night/70">
                      {line.upperBoundOnly && <span className="text-xs text-night/40">עד </span>}
                      <span dir="ltr" className="inline-block">
                        {formatRange(line.perDayLow, line.perDayHigh, line.currency)}
                      </span>
                      <span className="text-xs text-night/40"> ליום</span>
                    </span>
                  </li>
                ))}

                {/* A city with no data: named, with no number and no estimate */}
                {result.missing.map((m) => (
                  <li
                    key={m.citySlug}
                    className="flex flex-wrap items-baseline gap-x-2 text-sm text-night/45"
                  >
                    <span className="font-semibold">{m.cityName}</span>
                    <span className="text-xs">{m.days === 1 ? 'יום אחד' : `${m.days} ימים`}</span>
                    <span className="ms-auto text-xs">אין לנו נתון</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 border-t border-night/10 pt-3">
                {/* One label, then a total per currency - not a whole repeated row */}
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold text-night">
                    {result.complete ? 'לכל הטיול' : 'לערים שיש להן נתון'}
                  </span>
                  <span className="ms-auto font-semibold text-night" dir="ltr">
                    {result.totals.map((c) => formatRange(c.low, c.high, c.currency)).join(' · ')}
                  </span>
                </div>
                {result.totals.length > 1 && (
                  <p className="mt-1 text-xs text-night/45">
                    הטיול עובר בין מטבעות, ולכן יש סכום לכל מטבע בנפרד.
                  </p>
                )}
                {!result.complete && (
                  <p className="mt-1 text-xs text-night/55">
                    הסכום חלקי: {result.missing.map((m) => m.cityName).join(', ')} לא נכלל בו.
                  </p>
                )}
                {/* Why the "comfort" style specifically is missing in many cities -
                    otherwise it looks like a malfunction */}
                {style === 'comfort' && result.missing.length > 0 && (
                  <p className="mt-1 text-xs text-night/45">
                    לסגנון "בנוח" יש נתון רק בחלק מהערים: המקור הרחב יותר מפרסם מדרגה עליונה פתוחה,
                    ואי אפשר לגזור ממנה מספר בלי לינה.
                  </p>
                )}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-night/55">
                כך מוציאים מטיילים בערים האלה בדרך כלל, לאדם ליום. זו לא תחזית להוצאות שלכם.{' '}
                <span className="font-semibold text-night/70">בלי טיסות ובלי לינה.</span>
                {/* The explanation of what the range means is correct only for
                    rows built by summing the category rows. For a row whose
                    source published a ready-made range, that sentence is simply
                    wrong - hence it is conditional. */}
                {result.bases.length === 1 && result.bases[0] === 'components'
                  ? ' הקצה התחתון הוא תחבורה מקומית ואוכל; העליון מוסיף גם כניסות ואטרקציות.'
                  : ' הטווח הוא כפי שהמקור מוסר אותו לכל עיר.'}
                {result.hasUpperBound && ' בעיר אחת לפחות הנתון הוא חסם עליון ("עד"), לא טווח.'}
              </p>
              <p className="mt-1 text-xs text-night/40">
                נבדק ב־{checkedLabel} · {/* A source per city, not one link pretending to cover them all */}
                {/* Offline, the source is named rather than linked: a link that
                    is clicked and does not open looks like a broken site, and
                    the source's name is the important information. */}
                {sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && ' · '}
                    {offline ? (
                      <span className="text-night/45">{s.label}</span>
                    ) : (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="underline decoration-night/20 underline-offset-2 hover:text-night/60"
                      >
                        {s.label}
                      </a>
                    )}
                  </span>
                ))}
              </p>
            </>
          )}
        </div>
      </PanelBody>
    </PanelSection>
  );
}
