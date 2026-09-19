import Link from 'next/link';
import type { ReactNode } from 'react';
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
import { faqPairs } from '@/lib/seo/jsonLd';
import { hubsForDestination } from '@/lib/seo/hubs';
import { promotedMembers } from '@/lib/seo/hubData';

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
  // The card carries the derived attributes (continent, vibes) the hub
  // predicates read; `promotedMembers` is the same source the hub pages use.
  const card = promotedMembers().find((m) => m.card.slug === dest.slug)?.card;
  const hubs = card ? hubsForDestination(card, dest) : [];
  const faq = faqPairs(dest, country);

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
          <SectionHeading icon="📍">מה לעשות {inCity}</SectionHeading>
          <p className="mt-2 text-sm text-night/60">
            {dest.places.length} מקומות שנאספו ונבדקו על ידי הצוות.
          </p>
          {groups.map((g) => (
            <div key={g.category} className="mt-6">
              {/*
                The category's own colour, which the map pins and the filter
                chips above this guide already use. It was grey here, so nine
                group headers in a row were indistinguishable from the body text
                between them. This is the lowest-effort place on the page to put
                colour, because the value is already in `categoryMeta`.
              */}
              <h4
                className="flex items-center gap-2 text-sm font-black"
                style={{ color: categoryMeta[g.category].color }}
              >
                <span aria-hidden="true">{categoryMeta[g.category].emoji}</span>
                {categoryMeta[g.category].label}
                <span className="text-xs font-bold opacity-60">{g.places.length}</span>
              </h4>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.places.map((p) => (
                  <PlaceCard key={p.id} place={p}>
                    <PlaceMeta place={p} />
                  </PlaceCard>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ---- How many days: answered from the curated itinerary, not a guess ---- */}
      {days.length > 0 && (
        <div className="mt-10">
          <SectionHeading icon="🗓️">כמה ימים {inCity}</SectionHeading>
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
          <SectionHeading icon="🧭">מסלול {toCity} - יום אחרי יום</SectionHeading>
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
          <SectionHeading icon="👨‍👩‍👧">טיול משפחתי {toCity}</SectionHeading>
          <p className="mt-2 text-sm text-night/60">
            {family.length} מקומות בקטלוג מסומנים כמתאימים למשפחות עם ילדים.
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {family.map((p) => (
              <PlaceCard key={p.id} place={p}>
                <PlaceMeta place={p} />
              </PlaceCard>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Kosher and Shabbat: the differentiator ---- */}
      <div className="mt-10">
        <SectionHeading icon="🍽️">אוכל כשר ושבת {inCity}</SectionHeading>
        <p className="mt-2 max-w-3xl leading-relaxed text-night/75">
          {dest.practical.kosherOverview}
        </p>
        {kosher.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {kosher.map((p) => (
              <PlaceCard key={p.id} place={p}>
                <KosherNote note={p.kosherNote} className="mt-2" />
                <KosherBadge kashrut={p.kashrut} className="mt-2" />
              </PlaceCard>
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
        <SectionHeading icon="☀️">מתי כדאי לנסוע {toCity}</SectionHeading>
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
          <SectionHeading icon="💰">כמה זה עולה {inCity}</SectionHeading>
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
        <SectionHeading icon="✈️">איך מגיעים {toCity} ואיך מסתובבים</SectionHeading>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Fact title="טיסות מתל אביב" text={dest.practical.flights} />
          <Fact title="תחבורה בעיר" text={dest.practical.gettingAround} />
          <Fact title={`ויזה ל${country.name}`} text={country.practical.visa} />
          <Fact title="מטבע" text={country.practical.currency} />
          <Fact title="סים וגלישה" text={country.practical.sim} />
          <Fact title="תשלומים" text={country.practical.payments} />
        </dl>
      </div>

      {/* ---- FAQ ----
          Rendered from `faqPairs`, which is the SAME function that builds the
          FAQPage JSON-LD on this route. That is not a tidiness preference:
          structured data must describe content the page actually shows, and two
          separate sources would drift into markup describing answers no reader
          can see. One function, so they cannot. */}
      {faq.length >= 2 && (
        <div className="mt-10">
          <SectionHeading icon="❓">שאלות נפוצות על {toCity}</SectionHeading>
          <dl className="mt-4 space-y-4">
            {faq.map((qa) => (
              <div key={qa.question} className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
                <dt className="font-bold text-night">{qa.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-night/75">{qa.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

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

      {/*
        Back-links to the hubs this destination belongs to. This is the half of
        the internal linking that is easy to skip: hubs link down to
        destinations naturally, and without this the graph is a one-way fan-out.
        Membership is computed from the same predicates the hub pages use, so a
        destination can never appear on a hub that does not link back to it.
      */}
      {hubs.length > 0 && (
        <div className="mt-10 border-t border-night/10 pt-6">
          <h3 className="text-sm font-bold text-night/70">
            {dest.name} נמצאת גם באוספים האלה
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {hubs.map((h) => (
              <li key={h.slug}>
                <Link
                  href={`/collections/${h.slug}`}
                  className="inline-block rounded-full bg-shell px-4 py-2 text-sm text-night/80 ring-1 ring-night/10 transition hover:ring-night/30"
                >
                  <span aria-hidden="true">{h.emoji}</span> {h.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-night/50">
        המידע בעמוד נאסף ונערך על ידי צוות טיול+. שעות פתיחה, מחירים וכשרות משתנים -
        כדאי לוודא מול המקום עצמו לפני שיוצאים.
      </p>
    </section>
  );
}

/** A place's name plus its local name, which is what you hand a taxi driver. */
/**
 * A section heading.
 *
 * There are nine sections in this guide and they were nine `<h3>` with one
 * identical class, which is the same drift entry (ss) fixed for the trip
 * screen's panel bars - inverted. There, five sibling blocks had each invented
 * their own header; here, nine had exactly one, so nothing told a reader where
 * they were and the page read as continuous text.
 *
 * A marker and a rule are enough to make it scannable, and `icon` is required
 * for the same reason `PanelSection`'s is: one emoji out of nine is what an
 * optional field produces.
 */
function SectionHeading({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 border-b border-night/10 pb-2 display text-xl text-night">
      <span aria-hidden>{icon}</span>
      {children}
    </h3>
  );
}

/**
 * A place's photo, WITHOUT the client component.
 *
 * `PlaceThumb` does the same job above this guide, but it carries `useState` to
 * catch a broken image, so it is a client component. This guide is the one part
 * of the destination page that ships no client JS at all - `KosherBadge`,
 * `KosherNote` and everything else here render on the server - and a client
 * island per place would undo that on a page whose whole point is being static.
 *
 * So the fallback is done in CSS instead of in JS: the category tile is the
 * container's own background with the emoji centred in it, and the photo sits
 * on top. A photo that fails to load simply reveals the tile underneath, which
 * is the same outcome `PlaceThumb` reaches with state.
 *
 * `alt=""` on purpose, twice over: the place name is the adjacent heading, so
 * announcing it again is noise - and an `alt` string is what a browser paints
 * over the tile when the image 404s, which is the one thing this arrangement is
 * built to avoid.
 */
function GuideThumb({ place }: { place: Place }) {
  const meta = categoryMeta[place.category];
  return (
    <div
      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-night/10"
      style={{ backgroundColor: `${meta.color}1a` }}
      role="img"
      aria-label={meta.label}
    >
      <span aria-hidden className="absolute inset-0 flex items-center justify-center text-2xl opacity-80">
        {meta.emoji}
      </span>
      {place.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={place.photo}
          alt=""
          loading="lazy"
          decoding="async"
          className="relative h-full w-full object-cover"
        />
      )}
    </div>
  );
}

/**
 * One place in the guide: picture, name, description, meta.
 *
 * The three lists in this file - what to do, family, kosher - had the same card
 * written out three times, which is how the picture came to be missing from all
 * of them at once. One component now, so a change reaches every list.
 */
function PlaceCard({ place, children }: { place: Place; children?: ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl bg-shell p-4 ring-1 ring-night/10">
      <GuideThumb place={place} />
      <div className="min-w-0 flex-1">
        <PlaceHeading place={place} />
        <p className="mt-1 text-sm leading-relaxed text-night/75">{place.description}</p>
        {children}
      </div>
    </li>
  );
}

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
