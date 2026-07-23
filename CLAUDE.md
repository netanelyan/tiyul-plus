# tiyul+ (טיול+) - Project Brief

## What this is

An **AI travel agent in Hebrew** for Israeli travelers. The core product is a
conversation: the user tells the agent where, when, with whom and what matters
to them; the agent plans a real trip, modifies it on request, and shows its
work on an interactive map. The site's pages (destination explorer, planner,
wizard) are the agent's workspace and manual controls - supporting cast, not
the star.

Differentiation: built for Israelis by default. Native Hebrew RTL everywhere,
TLV flights/visa/eSIM practicalities per destination, and preference-aware
planning where kosher food, Shabbat-friendly pacing, budget, kids, and
shopping appetite are all **equal options** - none assumed, all respected when
chosen. Kosher/Shabbat are preferences, NOT the product identity.

This is a real business (affiliate revenue planned, premium later). Decisions
favor user trust and repeat usage over tech impressiveness.

## Site walkthrough (as built)

- **`/` - a light landing portal.** Server component + two small client
  islands: `HomeHero` (the big centered input + prompt chips - submitting
  NAVIGATES to `/chat?q=...`, no conversation state or Leaflet on the
  homepage) and `MyTripCard` (shown only when a trip exists). Below the
  hero: quiet portal cards to מתכנן המסלולים, קטלוג היעדים and the
  current trip.
- **`/chat` - the agent, the star.** Renders
  `src/components/AgentWorkspace.tsx`. On mount it auto-sends a `?q=`
  param once (then cleans the URL with `router.replace`); direct visits
  keep the landing state: one massive centered input + prompt chips.
  **Chip system:** a categorized pool in `src/lib/promptChips.ts`
  (situation / capability / question, one emoji per chip, optional
  seasonal `months`, optional `fill` when the pill text is shorter than
  the fill text) - the shared `PromptChips` component picks 6
  client-side after mount (pinned chips always included - currently
  "🎖️ הטיול הגדול אחרי צבא" - rest category-balanced, in-season first,
  out-of-season hidden, shuffled; SSR renders a stable-height
  skeleton). Clicking FILLS the input and focuses it for editing -
  never auto-sends. Categories are invisible to the user. The first message transitions to a split workspace:
  streaming conversation beside a live "canvas" - destination photo header,
  day selector, Leaflet map of the selected day with numbered route, daily
  schedule blocks and a planner link; empty days get an explicit empty
  state. On mobile the canvas collapses to a sticky summary bar. The canvas
  re-renders from every `{trip}` event the agent streams; action chips
  ("✓ הוספתי את...") show under the reply. **Preferences UI:** the canvas
  chips (כשר, קצב, מי נוסע, שופינג) are interactive toggles that write
  `Trip.preferences` directly - sensitive preferences (kashrut, Shabbat)
  are buttons BY DESIGN, the agent never asks about them in conversation
  and silently reads the current values each turn. Non-sensitive
  clarifying questions may carry tappable quick-reply chips
  (`suggest_quick_replies`).
- **`/planner` - manual controls for the same trip.** The new-trip screen is
  a hybrid: prominent city cards plus button-only controls (days stepper,
  מי נוסע, pace, style, shopping, kosher toggle) form hard constraints; an
  optional free-text field refines them via `/api/generate-trip`. The
  workspace view has day tabs with inter-city travel legs, stop reordering,
  per-day notes, a Google Maps navigation link per day, copy/print/PDF, and
  ready-made templates.
- **`/countries` → `/countries/[slug]` → `/destinations/[slug]` - the
  curated catalog** (linked from the nav and a quiet landing link). Country
  cards → country page (visa/currency/sim/payments + city cards) → city page
  (places on a map, day-by-day itinerary, kosher layer, city+country
  practical info merged).
- **One trip, two interfaces.** Chat and planner mutate the same `Trip`
  object (localStorage behind `TripContext`); a trip built in conversation
  opens in the planner and vice versa. `Trip.preferences` (party, pace,
  budget, kosher, shabbatAware, shopping, interests) is collected
  conversationally by the agent.
- **Two AI endpoints, both keyless-safe.** `/api/chat` runs the tool-use
  agent loop (keyless: rule-based Hebrew responder). `/api/generate-trip`
  is the planner's one-shot constrained builder (keyless: local
  `generateTrip()` scoring). Both ground Claude in the curated data and
  validate every placeId server-side - the AI can never invent places.
- **Cost model.** Model routing by task: `ANTHROPIC_MODEL_AGENT`
  (default claude-sonnet-4-5) drives the chat loop,
  `ANTHROPIC_MODEL_FAST` (default claude-haiku-4-5) drives
  generate-trip - the FAST request sends no thinking/effort params
  (haiku-4-5 rejects them). The grounding block carries `cache_control`
  in both routes; the chat loop reuses the ~20k-token prefix across
  iterations and turns (verified: iter=1 reads the full prefix from
  cache). Output discipline: chat replies cap at 1024 tokens unless
  edit-intent/tool iterations (2048). Dev console logs one usage line
  per model call. **Haiku as the agent** (tested once on the five
  scenarios): builds correct one-turn trips, stores preferences and
  declines unknown places - but skips destructive-change confirmations
  and drifts off-data in follow-up suggestions. Keep Sonnet for the
  agent; Haiku is fine for generate-trip.

## Commands

```bash
npm run dev      # dev server on :3000
npm run build    # MUST pass before every commit
npm run lint
```

## Architecture map

- `src/data/countries.ts` - the country layer (Hebrew). Users browse by
  country ("טסים לאיטליה"), plan by city. Each `Country` carries the
  country-level practical facts (visa, currency, sim, payments) shared by
  all its cities.
- `src/data/destinations.ts` - curated content, 8 cities × 20 places
  (160 total, Hebrew), each referencing its country via `countrySlug`.
  Places carry `photo` (verified URLs - run `node
  scripts/verify-photos.mjs` after any photo change; Wikimedia thumbs
  accept ONLY the allowed widths 250/330/500/960px), `priceLevel`
  (0=חינם..3), `tags` (fixed set: families/nightlife/romantic/history/
  art/foodie/outdoors), `mustSee`, and kosher entries a
  `kosherVerification` object rendered as an honest trust badge
  ("לאמת לפני נסיעה" while lastChecked="pending-review"). City
  `practical` holds only city-level facts: flights, gettingAround,
  kosherOverview. This data is the product's moat; quality > quantity.
- `src/lib/types.ts` - domain types + `PlacesProvider` interface (includes
  `getCountries()`/`getCountry(slug)`; google/tripadvisor delegate these to
  sample - countries are curated content). The app talks ONLY to this
  interface.
- Routes: homepage is a light landing portal (`HomeHero` input + chips →
  navigates to `/chat?q=...`; portal cards + `MyTripCard`); `/chat` is
  the conversation (`AgentWorkspace`: landing → split conversation +
  live trip canvas, auto-sends `?q=` once). Country browsing lives at
  `/countries` (catalog index, linked from the
  nav) → `/countries/[slug]` (country hero, practical cards, city cards)
  → `/destinations/[slug]` (city page with breadcrumb יעדים / מדינה /
  עיר; its practical section merges city fields with the country's
  visa/currency/sim/payments so nothing is lost).
- `src/lib/providers/` - `sample` (default, keyless), `google` (Places API
  New), `tripadvisor` (Content API). Selected via
  `NEXT_PUBLIC_PLACES_PROVIDER`. External APIs ENRICH curated data, never
  replace it.
- `src/lib/trip/` - the Trip domain: types (incl. `TripPreferences`),
  localStorage-backed `storage.ts` (designed to be swapped for a backend
  without touching components), `TripContext.tsx` (React context + all
  mutations incl. `upsertTrip` for agent updates), `generate.ts` (wizard
  scoring + geographic day-packing), `travel.ts` (static inter-city legs),
  `agent.ts` (the agent's tools + strictly-validated executor + trip
  serialization for the model; batch tools `create_trip_full` /
  `set_day_places` are preferred for building so a trip never ends a turn
  with empty days, granular add/remove/move for small edits,
  `suggest_quick_replies` attaches tappable answers to non-sensitive
  questions; the chat loop runs up to 16 tool iterations).
- `src/app/api/chat/route.ts` - chat backend. With `ANTHROPIC_API_KEY` it
  runs a server-side tool-use loop over the user's trip: the client sends
  its current trip, tools in `src/lib/trip/agent.ts` mutate an in-memory
  copy with strict validation, and the stream returns text + the updated
  trip + Hebrew action chips. Falls back to a rule-based Hebrew responder
  without a key.
- `src/app/api/generate-trip/route.ts` - the planner's one-shot builder.
  POST { prefs, party, notes? }: button prefs are hard constraints
  (validated server-side); with notes + a key Claude only refines within
  them (structured outputs, cached grounding); otherwise `generateTrip()`.
- `src/components/` - `AgentWorkspace` (landing → split chat + canvas, used
  by `/` and `/chat`), `PlacesMap`/`MapInner` (Leaflet, client-only),
  `AddToTripButton`, `TripChip` (truncated, hidden on phones).
- `src/app/layout.tsx` - RTL shell, fonts, TripProvider, BlackZ trademark
  footer (web component in `public/blackz-signature.js` - must appear on
  every page).
- Design system: Tailwind 4 `@theme` tokens in `src/app/globals.css`
  (night/sunset/zest/cream palette, calm & credible: cream background, night
  text, sunset as the single accent for primary buttons/active states, zest
  only as a rare small highlight). Reuse these tokens; do not invent new
  palettes.

## Adding a new country (single data edit, no UI work)

1. `src/data/countries.ts` - add a `Country`: slug, Hebrew name, nameLocal,
   flag, tagline, summary, photo (verified Unsplash URL), and `practical`
   (visa, currency, sim, payments) written for Israelis.
2. `src/data/destinations.ts` - add one `Destination` per city with
   `countrySlug` pointing at the new country, places (with kosher notes
   where relevant), a day-by-day itinerary, and city-level `practical`
   (flights from TLV, gettingAround, kosherOverview).
3. Done. The `/countries` catalog, the country page, the city page, the
   planner's city cards, and the grounding of both AI endpoints all pick it
   up automatically. Optional: add inter-city legs in
   `src/lib/trip/travel.ts` if the new cities pair with existing ones, and
   consider refreshing the hand-picked prompt chips in `AgentWorkspace`
   if the new destination is a flagship.

## Hard rules

1. Full Hebrew RTL. Never regress it. UI copy is Hebrew.
2. The agent/chat never fabricates places, hours, prices, or kashrut status.
   Uncertainty is stated honestly ("לוודא מול המקום").
3. Kosher data carries caveats by design - keep them.
4. Keep the `PlacesProvider` abstraction intact.
5. API keys only in `.env.local` / Vercel env vars (see `.env.example`).
   Never in the repo.
6. No new heavy dependencies without explicit approval from Netanel.
7. Every work session ends with: `npm run build` passing, visual check of
   changed pages (RTL + design consistency), commit + push with a clear
   message.
8. Every work session ALSO ends by appending a dated entry to
   "## Session log" (bottom of this file) with: (a) what was built/
   changed and in which files, (b) product decisions made and why,
   (c) anything left broken or deferred, (d) what the next session
   should know. No exceptions - docs-only sessions included.

## Roadmap (execute one phase per session, in order)

- **Phase 1 - Agent Core** ✅ DONE: chat runs a server-side tool loop
  (create/edit trip + `Trip.preferences` set conversationally; live trip
  panel beside the chat; keyless rule-based fallback intact). Note for
  Phase 2: agent quality is now capped by content depth (8-12 places per
  city) - and the wizard does not yet read `Trip.preferences`, only the
  agent honors them.
- **Phase 2 - Content Engine** ✅ DONE: all 8 cities at 20 places (160
  total) - photos verified end-to-end (`scripts/verify-photos.mjs` must
  pass before content commits), priceLevel, audience tags, mustSee, and
  kosherVerification trust badges (honest "לאמת לפני נסיעה" pending
  state; no new kosher venues invented). `generateTrip()` and
  `/api/generate-trip` now score by `Trip.preferences` (party+interests
  → tag boosts, budget → priceLevel penalties, mustSee boost); both AI
  groundings carry tags/priceLevel/mustSee with truncated descriptions.
  Note for Phase 3: search/collections can lean on tags+mustSee; kosher
  entries still need real verification dates to replace pending-review.
- **Phase 3 - Agent-First UX** (homepage part DONE): homepage now leads
  with the conversation (`AgentWorkspace` landing → split chat + canvas;
  catalog moved to `/countries`). Still open: site-wide search (Hebrew +
  local names), top-10 collections, audience filters, mobile-first
  polish pass.
- **Phase 4 - Shareable Trip**: trip URLs that open read-only for anyone
  (viral loop), WhatsApp share cards, print/PDF polish, then lightweight
  accounts for cross-device sync.
- **Phase 5 - Revenue**: affiliate actions (GetYourGuide/Viator, Booking,
  Airalo, insurance) in the data model, offered conversationally by the agent
  and as booking buttons in the planner, with click tracking.

## Gotchas

- Next.js 16: `params`/`searchParams` are async (await them). `ssr: false`
  dynamic imports only inside client components (see `PlacesMap.tsx`).
- Leaflet touches `window` - keep it client-only; map internals are LTR by
  design (`.leaflet-container`), popups RTL.
- Windows + npm: if install fails with `@tailwindcss/oxide-win32-x64-msvc`
  missing, delete `node_modules` + `package-lock.json` and reinstall (npm
  optional-deps bug with cross-platform lockfiles).
- Sandboxed environments may block image/tile hosts - grey map tiles and
  gradient photo fallbacks there are expected, not bugs.
- `<blackz-signature>` is a custom element; TS declaration lives in
  `src/types/custom-elements.d.ts`.

## Success metrics to design toward

First-time visitor is in conversation within a minute, has a believable
mapped itinerary within five. The agent honors any preference combination
using only real data. A trip built in chat and a trip built in the planner
are the same object - one trip, two interfaces. Every recommendation can
eventually carry a booking action that feels like help, not advertising.

## Session log

### 2026-07-23 - Homepage hero usability + warmth; session-log rule added

**Built/changed:**
- `src/components/HeroPrompt.tsx` (new) - the shared hero input+chips
  block used by both the homepage (`HomeHero`) and the `/chat` landing
  (`AgentWorkspace`). Owns the input state; submit callback per host
  (homepage → `router.push('/chat?q=...')`, chat → `send()`).
- Input usability: visible placeholder ("ספרו לי על החופשה שאתם
  מדמיינים… למשל: שבוע באיטליה עם ילדים", `placeholder:text-night/45`),
  1px `border-night/15` + subtle inset shadow so the field reads as
  typeable against the cream page, soft coral focus ring
  (`focus:ring-4 ring-sunset/15`). CTA is never disabled-gray: full
  sunset when there's text, `bg-sunset/60` (still coral) when empty -
  the old `disabled:opacity-40` was what read as "broken pale pink".
- `src/components/PromptChips.tsx` - chips redesigned as single-line
  suggestion pills (`rounded-full`, `whitespace-nowrap`, flex-wrap
  centered) with a small inline SVG icon per category (heart /
  sliders / help-circle, lucide-style paths, no dependency) and a warm
  hover (`hover:bg-sunset/5 hover:ring-sunset/30`, icon turns
  sunset-deep). Skeleton is now pill-shaped with varied widths.
- `src/lib/promptChips.ts` - shortened two capability texts that
  wrapped at desktop width ("שבוע בשתי מדינות, טבע ושופינג",
  "4 ימים, היסטוריה ואוכל כשר").
- `src/components/HomeHero.tsx` - warm radial gradient wash behind the
  hero (sunset→zest token rgba at 5-9% opacity), vertical spacing
  tightened (content-height hero, `py-12/16`, no more viewport-height
  min-h dead space).
- `src/app/page.tsx` - now async: fetches countries and renders a
  "postcard strip" of 4 real destination photos (h-16 rounded, 4th
  hidden on mobile) between the hero and the portal cards, linking to
  `/countries`. Portal section pulled up (`mt-10`).
- CLAUDE.md - hard rule 8 (this session log) added.

**Product decisions:**
- One shared `HeroPrompt` instead of duplicated input markup - the two
  surfaces had already drifted (placeholder/focus styles differed).
- CTA stays colored when empty rather than disabled-gray: an empty
  input is the DEFAULT state of the homepage; it must not look broken.
- Warmth via one gradient wash + one small photo strip (real, verified
  destination photos) - deliberately not a hero poster, to keep the
  matured/calm language and text crispness.
- Chips as nowrap pills: single-line height cannot be guaranteed in a
  fixed grid with Hebrew texts of varying length, so the layout is
  content-sized pills in a centered flex-wrap; over-long pool texts
  were shortened instead of truncated mid-word.

**Broken/deferred:** nothing known broken. Deferred: the /chat landing
kept its old vertical-centering (no gradient/postcards there - homepage
only per the task); kosher `lastChecked` dates are still all
"pending-review"; Phase 3 leftovers (search, collections, filters)
unchanged.

**Next session should know:** visual checks must use the CDP script
recipe (headless Edge `--window-size` clamps at ~500px CSS; see the
project memory note) - plain `--screenshot` flags lie about mobile.
`pickChips()` is client-only (random - SSR renders the skeleton). The
chip pool is category-balanced (2×3) and hides out-of-season chips;
if you add chips keep the pool ≥3 per category so selection never runs
short. Session log entries for work before 2026-07-23 live in git
history (`git log --oneline`).

### 2026-07-23 (b) - Chips: emoji, pinned "הטיול הגדול", post-army agent note

**Built/changed:**
- `src/lib/promptChips.ts` - `PromptChip` gained `emoji` (required,
  rendered as the pill's leading element), `pinned` (always included in
  the 6) and `fill` (input text when longer than the pill label). New
  pinned situation chip: 🎖️ "הטיול הגדול אחרי צבא" whose fill is a
  catalog-friendly prompt ("סיימתי צבא... כמה שבועות באירופה, תקציב
  קטן, כמה מדינות"). `pickChips()` now: pinned first, then fills each
  category to a quota of 2 counting pinned, in-season priority and
  shuffle unchanged.
- `src/components/PromptChips.tsx` - category SVG icons replaced by
  the chip's emoji; `onPick` sends `chip.fill ?? chip.text`.
- `src/app/api/chat/route.ts` - system prompt HOW-YOU-WORK note: on
  הטיול הגדול/אחרי צבא, embrace it, build a long multi-country budget
  route from covered countries (cheap first: בודפשט/ברטיסלבה/אתונה,
  פראג/ברלין budget-friendly), prefer create_trip_full, and be honest
  that דרום אמריקה/המזרח aren't covered - offer the European version
  proudly.

**Product decisions:** the army chip is pinned because it's a flagship
Israeli life-moment the catalog can genuinely serve; its pill label is
short but the fill is deliberately verbose so the agent gets budget +
duration + multi-country in one shot. Emoji replaced the SVG category
icons - warmer, and category remains invisible.

**Broken/deferred:** nothing broken. Emoji render as monochrome
letter-codes in headless-Edge screenshots (artifact only).

**Next session should know:** verified live - army chip present in
every draw, click fills the long text, all pills single-line at 390px
(incl. the wide 👨‍👩‍👧‍👦 chip), agent responds to the army prompt with
cheap-first covered-countries routing. If you add pinned chips, the
per-category quota logic counts them - keep total pinned ≤ 2 or the
draw loses balance.

### 2026-07-23 (c) - Mobile hero fixes from a real iPhone report

**Built/changed:**
- `src/components/HeroPrompt.tsx` - responsive input layout: below
  `sm` the field is full-width with a full-width לתכנן button stacked
  under it (`mt-2 w-full`, `sm:absolute sm:end-3...` restores the
  inline button-in-field at sm+); mobile also drops to `text-base` and
  swaps to a shorter placeholder ("ספרו לי על החופשה שאתם מדמיינים…",
  set post-mount via matchMedia - the long "למשל" example only fits at
  sm+).
- `next.config.ts` - `devIndicators: false`.

**Product decisions / findings:** the "floating chevron tab bleeding
off the LEFT edge" from the iPhone screenshot is NOT product UI - a
CDP audit at 390px found zero positioned elements outside the
viewport and no horizontal scroll (scrollW=390/360 exactly). It is the
Next.js dev-tools indicator (`nextjs-portal`), visible because the
phone was browsing the LAN dev server. Disabled via `devIndicators:
false` so phone-testing against dev is clean; production never had it.

**Broken/deferred:** the running dev server must be RESTARTED to pick
up the devIndicators config change (config isn't hot-reloaded) - until
then the indicator still shows on the phone.

**Next session should know:** nav wrapping at 360px is fine (labels
wrap to two lines inside the header, no overflow). The placeholder is
now stateful - if you change the copy, update both the long (desktop)
and short (mobile) variants in HeroPrompt.

### 2026-07-23 (d) - Homepage polish round 2: hamburger nav, hero photo, footer fix

**Built/changed:**
- `src/components/SiteNav.tsx` (new) - client nav: md+ keeps inline
  links + TripChip; below md a hamburger (SVG, aria-expanded, closes on
  link click / outside tap) opens a dropdown with the three links plus
  the current trip when one exists. `layout.tsx` uses it; navLinks
  moved into the component.
- `src/app/layout.tsx` - footer bug fix: body is now
  `flex min-h-screen flex-col` with `main flex-1 w-full` - on tall
  desktop screens the footer previously ended mid-viewport with a
  cream band below it (content shorter than 100vh); now it's always
  flush with the bottom (verified bandBelowFooter=0 at a 1500px-tall
  viewport).
- `src/components/HomeHero.tsx` - the radial wash was replaced with a
  real hero visual: the travel flat-lay photo (the site's original
  verified Unsplash hero) behind the heading at 22% opacity, masked
  with a cream gradient so the night text stays crisp. Visible above
  the fold at 390px.
- `src/components/PromptChips.tsx` + `promptChips.ts` - 4 chips by
  default with a subtle "עוד רעיונות +" / "פחות רעיונות" text toggle
  revealing all 6; `pickChips()` swaps pinned chips into the first 4
  so הטיול הגדול stays visible by default.

**Product decisions:** hamburger under md (not sm) because three Hebrew
labels + chip genuinely need the room; the dropdown lists the trip as
a full-width row instead of squeezing the chip. Hero warmth via ONE
masked photo (not new imagery) - reuses the already-verified original
hero photo.

**Findings:** the "chevron off the right edge" on the reviewer's phone
is still the Next dev-tools indicator - a deep 390px audit INCLUDING
shadow roots found zero product elements beyond the viewport edge.
`devIndicators: false` is already in next.config.ts; it takes effect
once the long-running dev server is restarted.

**Broken/deferred:** nothing broken. On very tall screens the homepage
has generous cream space between the portal cards and the pinned
footer - acceptable; revisit if more homepage sections arrive.

**Next session should know:** TripChip renders only inside SiteNav's
md+ nav now (mobile gets the dropdown row instead). The chip visible
count is 4 - `pickChips()` still returns 6 and the component slices;
pinned-into-first-4 logic lives in pickChips.

### 2026-07-23 (e) - Homepage redesign: destination grid as the emotional core

**Built/changed:**
- `src/app/page.tsx` - the decorative 4-photo strip and the two big
  portal cards are gone. New structure: hero → chips → "יעדים
  פופולריים" (a rounded night-colored band with all 8 cities as photo
  cards - verified city photos as backgrounds, night bottom-gradient,
  Hebrew city + country + "מסלול מוכן ל-X ימים", hover scale, link to
  /destinations/[slug]; 2 cols mobile, 4 desktop; "כל הקטלוג ←" in
  zest) → slim centered secondary row: MyTripCard as a highlighted
  sunset bar + two small pills (מתכנן/קטלוג).
- `src/components/MyTripCard.tsx` - redesigned from a portal card to a
  full-width highlighted bar (sunset/10 + ring, truncating name,
  "פתיחה במתכנן ←").
- `src/components/HomeHero.tsx` - hero vertical padding tightened so
  the night band starts near the fold.

**Product decisions:** the destination photos ARE the color of the
page - the night band is the single section accent (tokens only) and
makes the photos pop while echoing the footer. Functional entries are
demoted to pills because the destination cards now serve discovery.

**Broken/deferred:** nothing broken. Bratislava's card shows the
travel-flatlay photo (that's its verified photo in countries data) -
consider shooting a real Bratislava skyline URL in a content pass.

**Next session should know:** the grid uses provider.getDestinations()
(DestinationSummary: name/country/days/photo) - a new city in the data
appears on the homepage automatically. Card day-count copy is
"מסלול מוכן ל-X ימים"; keep it in sync if itinerary lengths change.
