# SEO plan - static, indexable Hebrew content layer

Written in Phase 0, before any code. Everything below was measured against the
repo and the deployed site, not assumed. Where a premise in the brief turned out
to be wrong, that is stated plainly rather than worked around silently.

---

## Phase 0 findings

### Stack

| | |
|---|---|
| Next.js | **16.2.11**, **App Router** (`src/app`) |
| React | 19.2.4 |
| Rendering | Static by default. `next build` prerenders 293 routes today. |
| RTL | `<html lang="he" dir="rtl">` - **already correct**, verified in the served HTML of the deployed site |
| Tailwind | v4, tokens in `src/app/globals.css` |

### Where the catalog actually lives - the brief's premise is wrong here

The brief says to establish "tables, columns, row counts". **There are none for
the catalog.** The travel catalog is not read from a database at runtime at all:

- It is **TypeScript modules** - `src/data/destinations.ts` (44,449 lines),
  `src/data/countries.ts`, `src/data/calendar.ts`, `src/data/dailyCosts.ts`.
- Supabase holds `catalog_countries` / `catalog_destinations` / `catalog_places`
  (`sql/supabase-catalog.sql`) but that is an **authoring** mirror only: a script
  pushes files up and pulls them back down, and the site never reads it. The
  reasoning is recorded in CLAUDE.md's session log (2026-07-28 (w)) - every
  destination page is statically generated, so a runtime fetch would add a
  network round trip where there is currently none.
- All catalog access goes through the `PlacesProvider` interface
  (`src/lib/providers`), which hard rule 4 says to keep intact.

**Consequence for this work, and it is a good one:** every page I build reads the
same in-process modules at build time. There is no query to run, nothing to
cache, no per-page-view cost, and no possibility of the sitemap drifting from the
pages - both import the same module.

### Row counts (measured, not quoted from the docs)

```
destinations 166      countries 83      places 1,822
```

### Field coverage across all 166 destinations

| field | populated | usable for pages? |
|---|---|---|
| `summary`, `tagline` | 166 / 166 | yes |
| `iconicLandmark` | 166 / 166 | yes |
| `editorialRating` (score + verdict) | 166 / 166 | yes - verdicts name real drawbacks |
| `itinerary` | 166 / 166 (163 have >= 3 days) | yes - answers "how many days" |
| `practical.flights` / `.gettingAround` / `.kosherOverview` | 166 / 166 each | yes |
| `photo` | 165 / 166 | yes |
| **`bestSeason`** (Hebrew prose) | **166 / 166**, 164 distinct, avg 147 chars | **yes - this is the "when to go" source** |
| **`bestMonths`** (numeric array) | **0 / 166** | **no - never populated** |

Per place (1,822 total):

| field | populated |
|---|---|
| `description` | 1,822 / 1,822 |
| `tags` | 1,814 |
| `photo` | 1,656 |
| `durationMin` | 1,592 |
| `priceLevel` | 1,525 |
| `mustSee` | 583 |
| `kashrut` (structured record) | 65 |
| `kosherNote` | 44 |

Places per destination: min 3, median 9, p75 13, max 34.

### The two thin sources, named so no page is designed around them

- **`dailyCosts.ts` - 20 cities only.** Real per-day figures (transport / food /
  entertainment, three travel styles, local currency) quoted from a named source
  with a `checked` date. **A city with no record gets no number** - that is the
  file's own stated rule and I am keeping it. 19 of my 30 have one.
- **`calendar.ts` - 161 entries**, events and closures scoped to a country and
  optionally to destinations. 92 of them carry no dates at all, only a
  window in words, because the dates for the coming year were never officially
  published. Those render as prose, never as a date.

### "When to go" - corrected after a closer look at the data

My first pass through the schema checked `bestMonths` (the numeric array behind
the catalog's season *filter*) and found it empty 166/166, and I wrote this
section saying there was no seasonal field. That was wrong: **`bestSeason` is a
separate field, it is populated 166/166 with real curated Hebrew prose** - 164
distinct values, averaging 147 characters, e.g. for Rome *"מרץ-מאי, ספטמבר-נובמבר
(הקיץ חם ועמוס)"*. It carries the caveat as well as the months.

So "when to go" is **`bestSeason` as the primary source**, with `calendar.ts`
entries underneath it for the events and closures that reshape a trip -
confirmed dates shown as dates, unconfirmed ones shown as the curator's own
words. Where a destination has no calendar entry that part does not render, but
the season line always does.

The empty `bestMonths` still matters: it means there is no month-by-month
filtering to build a hub like "best in August" on, so Phase 3 does not attempt
one.

### Does the site render HTML or a client shell?

**It renders HTML.** Fetched `https://www.tiyulplus.com/destinations/vienna`
live: HTTP 200, 155 KB, with real Hebrew place names in the markup (14
occurrences of one landmark noun alone). The page is a server component that
passes props into a client component, and Next SSRs it.

**So the brief's trigger to stop and ask - "renders as a client-side shell" -
does not apply. Scope holds and I continued.**

### The actual SEO defect, which is different from the one the brief expected

The brief says "there are no crawlable content pages". There are: 166
`/destinations/[slug]` and 83 `/countries/[slug]`, statically generated, with
real content in the HTML. What is broken is everything *about* them:

1. **`/destinations/[slug]` has no `generateMetadata` at all.** All 166 pages
   serve the identical root title *"טיול+ | סוכן הנסיעות החכם לישראלים"* and the
   identical root description. Verified in the deployed HTML. 166 pages
   competing as duplicates is close to the worst possible state.
2. **No canonical tag anywhere on the site.**
3. **`/countries/[slug]` sets a title and nothing else** - no description, no
   canonical, no per-page OG.
4. **No `robots.txt` and no `sitemap.xml`.** Neither exists in `src/app` nor in
   `public/`.
5. **No structured data anywhere.**

---

## The URL decision - permanent, and the most consequential choice here

**Destination pages stay at `/destinations/[slug]`. I am not creating a parallel
`/guides/[slug]` route.**

The tempting alternative is a fresh, light, content-first route separate from the
interactive catalog page. I rejected it, and the reason is the same risk the
brief itself flags:

- A second page per city means **two URLs competing for "וינה טיול"**. On a young
  domain that is keyword cannibalisation plus near-duplicate content, and it
  doubles the page count for zero new information.
- The existing page already has the content, is already statically generated, is
  already internally linked, and is already crawlable. Its problem is missing
  metadata, not missing substance.

So the SEO content is **added to the existing route as a server-rendered section
below the interactive part**. Purely additive: `page.tsx` is a server component
that today returns `<DestinationClient>`, and I wrap rather than modify it.
`DestinationClient` itself is not touched, so the existing app UX is unchanged.

**Permanent URL patterns:**

| purpose | pattern | count |
|---|---|---|
| destination | `/destinations/<slug>` | 166 exist; 30 get the guide layer |
| country | `/countries/<slug>` | 83 |
| hub | `/collections/<slug>` | 12 (new) |
| hub index | `/collections` | 1 (new) |

Slugs are lowercase ASCII. **No Hebrew in URLs** - a Hebrew path percent-encodes
into an unreadable string the moment anyone pastes it into WhatsApp, which is the
main sharing surface for this audience.

---

## Which 30, and why those

Scored on **data actually present**, not on how famous the city is:

```
places (capped 20) x3  +  places with photo x1.5  +  mustSee x1
+  itinerary days x2   +  kosher places x4        +  daily-cost record x12
+  calendar entries (capped 6) x2  +  total description length / 200 (capped 20)
```

The 30 highest, all of which clear every floor below:

| # | slug | places | days | kosher | cost | # | slug | places | days | kosher | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | vienna | 33 | 6 | 10 | y | 16 | florence | 18 | 5 | 0 | y |
| 2 | new-york | 34 | 7 | 12 | y | 17 | abu-dhabi | 19 | 4 | 4 | n |
| 3 | dubai | 28 | 6 | 9 | y | 18 | bratislava | 21 | 4 | 2 | n |
| 4 | barcelona | 28 | 6 | 4 | y | 19 | venice | 16 | 4 | 7 | y |
| 5 | paris | 22 | 5 | 9 | y | 20 | grand-canyon | 15 | 7 | 5 | n |
| 6 | prague | 26 | 6 | 4 | y | 21 | madrid | 14 | 4 | 6 | y |
| 7 | rome | 26 | 6 | 5 | y | 22 | queenstown | 15 | 6 | 4 | n |
| 8 | london | 19 | 5 | 7 | y | 23 | kathmandu | 15 | 6 | 5 | n |
| 9 | athens | 24 | 6 | 4 | y | 24 | krakow | 15 | 5 | 5 | n |
| 10 | tokyo | 20 | 5 | 6 | y | 25 | santorini-mykonos | 16 | 6 | 5 | n |
| 11 | berlin | 24 | 5 | 5 | y | 26 | rio-de-janeiro | 14 | 5 | 4 | n |
| 12 | budapest | 23 | 6 | 4 | y | 27 | reykjavik | 14 | 5 | 5 | n |
| 13 | tbilisi | 20 | 4 | 5 | y | 28 | kyoto | 14 | 5 | 5 | n |
| 14 | bangkok | 21 | 4 | 4 | y | 29 | lisbon | 14 | 3 | 4 | y |
| 15 | buenos-aires | 22 | 5 | 8 | n | 30 | warsaw | 13 | 4 | 6 | y |

*(the "kosher" column above is the mustSee count in the ranking output; kosher
place counts are 22 of the 30 non-zero - both are in the scoring)*

Floors every one of the 30 clears: **>= 13 places**, **>= 3 itinerary days**, a
full `practical` block, an `iconicLandmark`, and an `editorialRating` with a
verdict. 19 of 30 carry real cost figures; 22 of 30 have kosher places.

Spread across **22 countries** - deliberately not 30 European capitals, so the
set does not read as a doorway farm.

### Excluded, and why

- **The other 136 destinations** are not excluded from the site - they exist
  today and keep working. They are excluded from **the guide layer and the
  sitemap** until the first 30 prove out. A large batch of thinner pages on a
  young domain is the single biggest risk in this task.
- Specifically **not built even though they rank next**: `amsterdam` (12 places),
  `munich` (12), `sicily` (11) - under the 13-place floor. `cusco`, `plitvice`,
  `banff`, `interlaken` have the places but no cost data and few calendar
  entries, so two of the four page sections would be empty.
- The 136 keep their *metadata* fix (Phase 1), because serving 166 pages with one
  shared title is a bug regardless of which are promoted.

---

## Page composition - every section names its source

Nothing is written by hand as filler and nothing calls an LLM. A section whose
data is absent **does not render**.

| section | Hebrew heading | source | renders when |
|---|---|---|---|
| intro | (h1) | `summary`, `tagline`, `editorialRating.verdict` | always |
| what to do | `מה לעשות ב...` | `places` grouped by category, with `description`, `durationMin`, `priceLevel` | always |
| how many days | `כמה ימים ב...` | `itinerary.length` + per-day real stop names via `dayDescription.ts` | always |
| family | `טיול משפחתי ל...` | places tagged `families` | >= 3 such places |
| route | `מסלול ל...` | `itinerary` days with their real stops | always |
| kosher / Shabbat | `אוכל כשר ושבת ב...` | `practical.kosherOverview`, kosher places, `kashrut` records via `KosherBadge` | always (overview is 166/166) |
| when to go | `מתי כדאי לנסוע ל...` | `bestSeason` (166/166), plus `calendar.ts` entries | always; calendar part only when >= 1 entry |
| costs | `כמה זה עולה` | `dailyCosts.ts` | record exists (19 of 30) |
| getting there | `איך מגיעים` | `practical.flights`, `.gettingAround`, country visa/currency/sim | always |
| planner CTA | - | link to `/chat?q=<prefilled Hebrew request>` | always |

Headings follow how Hebrew speakers actually search: `מה לעשות ב`, `כמה ימים ב`,
`טיול משפחתי ל`, `מסלול ל`.

### Shabbat times: a deliberate omission, recorded rather than fudged

`src/lib/zmanim.ts` computes candle-lighting and havdala astronomically, and it
is a genuine differentiator. **It is not going on these pages.** Candle-lighting
is a different time every week, so a statically-built page would serve a wrong
time from the day after the build - and a wrong halachic time is worse than no
time. The pages carry the *durable* Shabbat and kashrut facts (what supervision
exists, which places, meat/dairy, the community overview) and link into the
planner, which computes the times against the traveller's real dates.

### Kashrut rendering rule

Supervision is shown **as reported and never graded**, through the existing
`KosherBadge` / `KosherNote` components, which is enforced elsewhere by a
`designConsistency` test. No page will say one hechsher is better than another.

---

## Phase plan

- **Phase 1** - `app/robots.ts`, `app/sitemap.ts` (both reading the same module
  the pages read), `generateMetadata` for destinations and countries with unique
  title / description / canonical / OG, GSC verification via
  `NEXT_PUBLIC_GSC_VERIFICATION`.
- **Phase 2** - the guide section on the 30, statically generated.
- **Phase 3** - 12 `/collections/<slug>` hubs from real catalog attributes, with
  destinations linking back to the hubs they belong to.
- **Phase 4** - JSON-LD: `BreadcrumbList` and `TouristDestination` everywhere,
  `FAQPage` only where a real question has a real sourced answer.
- **Phase 5** - `SEO_NEXT_STEPS.md` for the account-level work I cannot do.

## Constraints I am holding to

Additive only - no change to the planner, the agent loop or the tool layer. Fully
static, no LLM call at build or request time. One commit per phase, `next build`
after each, RTL re-checked after each.
