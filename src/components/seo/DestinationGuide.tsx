import Link from 'next/link';
import type { Country, Destination, Place } from '@/lib/types';
import { categoryMeta } from '@/lib/categories';
import { daysHe, formatDurationHe } from '@/lib/duration';
import { hePrefix } from '@/lib/hebrew';
import { formatAmount } from '@/lib/trip/cost';
import KosherBadge from '@/components/KosherBadge';
import KosherNote from '@/components/KosherNote';
import {
  MIN_FAMILY_PLACES,
  calendarForDestination,
  familyPlaces,
  guideGroups,
  itineraryDays,
  kosherPlaces,
  plannerHref,
} from '@/lib/seo/guide';

/**
 * The long-form, statically rendered guide under a destination's catalog page.
 *
 * ## Why it lives on the existing route rather than a new one
 *
 * The obvious alternative was a separate `/guides/<slug>` route. It was
 * rejected: a second page per city puts two URLs in competition for the same
 * Hebrew query on a domain with no authority yet, and duplicates content that
 * already exists. This is a **server component appended below** the existing
 * interactive catalog UI, so `DestinationClient` is untouched and the app
 * experience above it is exactly as it was.
 *
 * ## Everything here is catalog prose
 *
 * No copy is written in this file and nothing calls a model - not at build time
 * and not at request time. Every sentence a reader sees is a `description`,
 * `summary`, `bestSeason`, `verdict`, `kosherOverview` or calendar `note` that a
 * data session sourced. Where the catalog has nothing, **the section is
 * omitted** rather than filled: that is why almost every block below is behind a
 * length check.
 *
 * ## Headings
 *
 * Phrased the way Hebrew speakers actually type a travel query - "what to do
 * in", "how many days in", "family trip to", "route for" - and every one of them
 * runs the city name through `hePrefix`, because a one-letter Hebrew prefix
 * doubles a word-initial vav and three of the promoted thirty (Vienna, Venice,
 * Warsaw) begin with one.
 */
export default function DestinationGuide({
  dest,
  country,
}: {
  dest: Destination;
  country: Country;
}) {
  const inCity = hePrefix('ב', dest.name);
  const toCity = hePrefix('ל', dest.name);
  const groups = guideGroups(dest);
  const kosher = kosherPlaces(dest);
  const family = familyPlaces(dest);
  const days = itineraryDays(dest);
  const events = calendarForDestination(dest);
  const cost = dest.dailyCost;

  return (
    <section
      id="guide"
      aria-label={`מדריך ${dest.name}`}
      className="mt-10 border-t border-night/10 pt-10"
    >
      <h2 className="display text-2xl text-night sm:text-3xl">
        המדריך של טיול+ {toCity}
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-night/75">{dest.summary}</p>

      {dest.editorialRating && (
        <p className="mt-4 max-w-3xl rounded-2xl bg-shell p-4 text-sm leading-relaxed text-night/80 ring-1 ring-night/10">
          <span className="font-bold text-night">
            המלצת הצוות: {dest.editorialRating.score}/5
          </span>{' '}
          {dest.editorialRating.verdict}
          <span className="mt-1 block text-xs text-night/50">
            דירוג עריכתי של צוות טיול+ - לא ממוצע של ביקורות משתמשים.
          </span>
        </p>
      )}

      {/* ---- What to do: the catalog's real places, grouped ---- */}
      {groups.length > 0 && (
        <div className="mt-10">
          <h3 className="display text-xl text-night">מה לעשות {inCity}</h3>
          <p className="mt-2 text-sm text-night/60">
            {dest.places.length} מקומות שנאספו ונבדקו על ידי הצוות.
          </p>
          {groups.map((g) => (
            <div key={g.category} className="mt-6">
              <h4 className="text-sm font-bold text-night/70">
                <span aria-hidden="true">{categoryMeta[g.category].emoji}</span>{' '}
                {categoryMeta[g.category].label}
              </h4>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.places.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-2xl bg-shell p-4 ring-1 ring-night/10"
                  >
                    <PlaceHeading place={p} />
                    <p className="mt-1 text-sm leading-relaxed text-night/75">
                      {p.description}
                    </p>
                    <PlaceMeta place={p} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ---- How many days: answered from the curated itinerary, not a guess ---- */}
      {days.length > 0 && (
        <div className="mt-10">
          <h3 className="display text-xl text-night">כמה ימים {inCity}</h3>
          <p className="mt-2 max-w-3xl leading-relaxed text-night/75">
            המסלול המוכן שלנו {toCity} הוא{' '}
            <strong className="text-night">{daysHe(days.length)}</strong>, והוא מכסה{' '}
            {days.reduce((n, d) => n + d.places.length, 0)} עצירות. אפשר לקצר או להאריך
            אותו - הסוכן יבנה מחדש לפי מספר הימים שיש לכם.
          </p>
        </div>
      )}

      {/* ---- The route itself, day by day ---- */}
      {days.length > 0 && (
        <div className="mt-8">
          <h3 className="display text-xl text-night">מסלול {toCity} - יום אחרי יום</h3>
          <ol className="mt-4 space-y-4">
            {days.map((d) => (
              <li key={d.day} className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
                <h4 className="font-bold text-night">
                  יום {d.day} · {d.title}
                </h4>
                {d.places.length > 0 && (
                  <p className="mt-2 text-sm leading-relaxed text-night/75">
                    {d.places.map((p) => p.name).join(' · ')}
                  </p>
                )}
                {d.notes && <p className="mt-2 text-sm text-night/60">{d.notes}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ---- Family: only when there is enough tagged to be worth a heading ---- */}
      {family.length >= MIN_FAMILY_PLACES && (
        <div className="mt-10">
          <h3 className="display text-xl text-night">טיול משפחתי {toCity}</h3>
          <p className="mt-2 text-sm text-night/60">
            {family.length} מקומות בקטלוג מסומנים כמתאימים למשפחות עם ילדים.
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {family.map((p) => (
              <li key={p.id} className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
                <PlaceHeading place={p} />
                <p className="mt-1 text-sm leading-relaxed text-night/75">{p.description}</p>
                <PlaceMeta place={p} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Kosher and Shabbat: the differentiator ---- */}
      <div className="mt-10">
        <h3 className="display text-xl text-night">אוכל כשר ושבת {inCity}</h3>
        <p className="mt-2 max-w-3xl leading-relaxed text-night/75">
          {dest.practical.kosherOverview}
        </p>
        {kosher.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {kosher.map((p) => (
              <li key={p.id} className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
                <PlaceHeading place={p} />
                <p className="mt-1 text-sm leading-relaxed text-night/75">{p.description}</p>
                <KosherNote note={p.kosherNote} className="mt-2" />
                <KosherBadge kashrut={p.kashrut} className="mt-2" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-night/60">
            אין בקטלוג שלנו מקום כשר מאומת {inCity}. זה לא אומר שאין - זה אומר שעדיין לא
            בדקנו, ובכל מקרה כדאי לוודא מול המקום עצמו.
          </p>
        )}
        {/*
          Candle-lighting and havdala times are deliberately NOT here. They are a
          different time every week and this page is built once, so a static page
          would serve a stale halachic time from the day after the build - worse
          than no time at all. The planner computes them against the traveller's
          real dates.
        */}
        <p className="mt-3 text-sm text-night/60">
          זמני כניסת שבת ויציאתה משתנים משבוע לשבוע, ולכן הם לא מופיעים בעמוד הזה -
          הסוכן מחשב אותם לפי התאריכים של הטיול שלכם.
        </p>
      </div>

      {/* ---- When to go: bestSeason (166/166) + sourced calendar entries ---- */}
      <div className="mt-10">
        <h3 className="display text-xl text-night">מתי כדאי לנסוע {toCity}</h3>
        <p className="mt-2 max-w-3xl leading-relaxed text-night/75">{dest.bestSeason}</p>
        {events.length > 0 && (
          <>
            <h4 className="mt-5 text-sm font-bold text-night/70">
              מה עוד קורה שם - אירועים וסגירות ששווה להכיר
            </h4>
            <ul className="mt-3 space-y-3">
              {events.map((e) => (
                <li key={e.id} className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
                  <h5 className="font-bold text-night">{e.name}</h5>
                  <p className="mt-1 text-sm leading-relaxed text-night/75">{e.note}</p>
                  {/*
                    An entry whose dates were never officially published carries
                    only a window in words, and it is printed verbatim. We never
                    turn a window into a date.
                  */}
                  {!e.datesConfirmed && e.window && (
                    <p className="mt-1 text-xs text-night/55">
                      {e.window} · התאריכים לשנה הזו עדיין לא פורסמו רשמית.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ---- Costs: only the 19 cities that have a sourced figure ---- */}
      {cost && (
        <div className="mt-10">
          <h3 className="display text-xl text-night">כמה זה עולה {inCity}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-night/70">
            הוצאה יומית טיפוסית לאדם על תחבורה מקומית, אוכל וכניסות -{' '}
            <strong className="text-night">בלי טיסות ובלי לינה</strong>.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {(
              [
                ['חסכוני', cost.budget],
                ['ממוצע', cost.mid],
                ['בנוח', cost.comfort],
              ] as const
            ).map(([label, tier]) => (
              <li
                key={label}
                className="rounded-2xl bg-shell p-4 text-center ring-1 ring-night/10"
              >
                <div className="text-xs font-bold text-night/60">{label}</div>
                <div className="mt-1 text-lg font-bold text-night">
                  {formatAmount(tier.transport + tier.food + tier.activities, cost.currency)}
                </div>
                <div className="text-xs text-night/50">ליום, לאדם</div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-night/50">
            מקור: {cost.source.title} · נבדק ב-{cost.source.checked}
          </p>
        </div>
      )}

      {/* ---- Getting there: city facts plus the country's own practical block ---- */}
      <div className="mt-10">
        <h3 className="display text-xl text-night">איך מגיעים {toCity} ואיך מסתובבים</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Fact title="טיסות מתל אביב" text={dest.practical.flights} />
          <Fact title="תחבורה בעיר" text={dest.practical.gettingAround} />
          <Fact title={`ויזה ל${country.name}`} text={country.practical.visa} />
          <Fact title="מטבע" text={country.practical.currency} />
          <Fact title="סים וגלישה" text={country.practical.sim} />
          <Fact title="תשלומים" text={country.practical.payments} />
        </dl>
      </div>

      {/* ---- Into the planner ----
          rel="nofollow" is not decoration. AgentWorkspace auto-sends a ?q= on
          mount and Googlebot executes JavaScript, so a followed link here is a
          paid Anthropic call once per crawl. robots.txt disallows /chat as the
          backstop; this is the first line. */}
      <div className="mt-10 rounded-2xl bg-night p-6 text-center sm:p-8">
        <h3 className="display text-xl text-cream">
          רוצים את זה כמסלול אמיתי, מותאם לכם?
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-cream/75">
          ספרו לסוכן מתי אתם נוסעים, עם מי, ומה חשוב לכם - והוא יבנה מסלול יום-אחרי-יום
          על מפה, מתוך אותם מקומות שבעמוד הזה.
        </p>
        <Link
          href={plannerHref(dest)}
          rel="nofollow"
          className="mt-5 inline-block rounded-full bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep"
        >
          לתכנון טיול {toCity} עם הסוכן
        </Link>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-night/50">
        המידע בעמוד נאסף ונערך על ידי צוות טיול+. שעות פתיחה, מחירים וכשרות משתנים -
        כדאי לוודא מול המקום עצמו לפני שיוצאים.
      </p>
    </section>
  );
}

/** A place's name plus its local name, which is what you hand a taxi driver. */
function PlaceHeading({ place }: { place: Place }) {
  return (
    <h5 className="font-bold text-night">
      {place.mustSee && (
        <span className="text-zest" aria-label="חובה לראות">
          ★{' '}
        </span>
      )}
      {place.name}
      {place.nameLocal && (
        <span className="ms-2 text-xs font-medium text-night/45">{place.nameLocal}</span>
      )}
    </h5>
  );
}

/**
 * Visit length and price band, each rendered only where the catalog has it -
 * `durationMin` is present on 1,592 of 1,822 places and `priceLevel` on 1,525.
 *
 * `formatDurationHe` returns null rather than a string when there is nothing
 * real to say, and it is what keeps "about 1 hours" off the page: Hebrew has a
 * dual form, so the correct rendering of 120 minutes is a word, not a number.
 */
function PlaceMeta({ place }: { place: Place }) {
  const duration = formatDurationHe(place.durationMin);
  const price = priceLabel(place.priceLevel);
  if (!duration && !price) return null;
  return (
    <p className="mt-2 text-xs text-night/55">
      {[duration, price].filter(Boolean).join(' · ')}
    </p>
  );
}

/**
 * The catalog's 0-3 band as words.
 *
 * Deliberately not a number or a currency: `priceLevel` is a band, and printing
 * it as a price would be inventing a figure the catalog does not hold. The only
 * real money on this page is the sourced daily-cost block.
 */
function priceLabel(level: Place['priceLevel']): string | null {
  switch (level) {
    case 0:
      return 'כניסה חופשית';
    case 1:
      return 'מחיר נמוך';
    case 2:
      return 'מחיר בינוני';
    case 3:
      return 'יקר';
    default:
      return null;
  }
}

function Fact({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
      <dt className="text-sm font-bold text-night">{title}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-night/75">{text}</dd>
    </div>
  );
}
