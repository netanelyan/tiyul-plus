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
  seasonal `months`, optional `fill` when the row text is shorter than
  the fill text). The shared `PromptChips` component renders one
  "💡 רעיונות לטיול" trigger under the input that opens a custom
  RTL dropdown (rows = emoji + text; closes on select/outside/Escape;
  arrow-key navigable; no library). Selection is picked client-side
  after mount (pinned chips always included - currently
  "🎖️ הטיול הגדול אחרי צבא" - rest category-balanced, in-season first,
  out-of-season hidden, shuffled). Choosing a row FILLS the input and
  focuses it for editing - never auto-sends. Categories are invisible
  to the user. The first message transitions to a split workspace:
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

### 2026-07-23 (f) - Hero image blend fix + chips become a dropdown

**Built/changed:**
- `src/components/HomeHero.tsx` - the hero photo no longer ends in a
  hard horizontal cut: the backdrop wrapper carries a CSS
  mask-image/-webkit-mask-image linear-gradient (opaque→transparent
  over the lower ~45%) so the image dissolves into the cream; height
  is now `clamp(260px,45vh,400px)`. `.photo-bg` already guarantees
  cover+center, so the image crops (no stretch) at 390px; opacity
  stays 0.22 so the night heading is crisp.
- `src/components/PromptChips.tsx` - rewritten as a custom dropdown:
  one deterministic "💡 רעיונות לטיול ▾" trigger (SSR-safe, no more
  skeleton needed), panel with emoji+text rows (full container width,
  max-h + scroll, comfortable py-3 taps), closes on select / outside
  click / Escape, aria-expanded + role=listbox, ArrowUp/ArrowDown move
  focus between rows. Selection fills the input (chip.fill ?? text)
  and closes - fill-not-send unchanged. Pool logic untouched.
- CLAUDE.md walkthrough chip-system paragraph updated.

**Product decisions:** trigger is centered and deterministic so SSR
renders it directly (the random pick still runs after mount, inside
the panel). Kept 6 rows (pool logic unchanged; spec allows ~8).

**Broken/deferred:** nothing broken.

**Next session should know:** verified via CDP at 390 - open (6 rows,
pinned army row present), arrow-key focus nav, fill + auto-close,
aria-expanded toggling, no horizontal overflow; hero fade confirmed
at 390 + 1280. The dropdown panel z-30 floats over the destinations
band - if a future section needs a higher z, coordinate.

### 2026-07-23 (g) - Dropdown centering + the edge-tab bug finally closed

**Built/changed:**
- `src/components/PromptChips.tsx` - the trigger is now truly centered:
  `badge` is inline-flex so `mx-auto` never centered it; it is wrapped
  in a `flex justify-center` row and the root carries `mx-auto`. The
  open panel already spans `inset-x-0` of the max-w-2xl root, i.e.
  exactly the input width - verified centered and flush (<6px delta)
  at 390 and 1280.

**THE CULPRIT of the recurring edge tab, definitively:** a full grep of
`src/` + `public/` found ZERO `position:fixed` elements and zero ‹/›
chevron glyphs in product code. The dark rounded panel with the
chevron docked to the viewport edge is the **Next.js 16 dev-tools
indicator (`nextjs-portal`)** - its collapsed state is exactly that
tab. `devIndicators: false` was committed two sessions ago but the
long-running dev server predated the config change, so it kept
showing (config is not hot-reloaded) - which is why the bug "survived"
two fixes. This session the stale dev server on :3000 was killed and
relaunched; verified post-restart: `nextjs-portal` mounts but renders
0 visible elements, and a shadow-DOM-inclusive audit at 390/1280 finds
nothing off any viewport edge. Production builds never had it.

**Broken/deferred:** the dev server on :3000 now runs as a background
process of this session (the user's original terminal command was
terminated to apply the config) - if it stops, `npm run dev` brings it
back, and the indicator stays gone.

**Next session should know:** if a floating UI element ever appears in
dev again, check `nextjs-portal` FIRST before auditing product code -
and remember config changes require a dev-server restart.

### 2026-07-23 (h) - Clean typographic hero + kosher toggle that rides into the trip

**Built/changed:**
- `src/components/HomeHero.tsx` - the stock flatlay hero photo is gone;
  back to a calm cream hero with only the soft sunset→zest radial wash
  (tokens). The destinations night-band below is the page's visual
  anchor. Submit now appends `&kosher=1` when the toggle is on.
- `src/components/HeroPrompt.tsx` - new quiet "🍽️ אוכל כשר" toggle
  pill (aria-pressed, sunset when on) sitting in the same centered row
  as the רעיונות dropdown trigger via a new `trailing` slot on
  `PromptChips`. State persists in localStorage
  (`tiyul-plus:kosher-pref`), default OFF. onSubmit signature is now
  `(text, kosher)`.
- `src/components/AgentWorkspace.tsx` - reads `?kosher=1` on mount and
  keeps a `kosherHint` that rides in the /api/chat body until the
  returned trip carries `preferences.kosher` (then the canvas toggle is
  the source of truth). The /chat landing HeroPrompt passes its toggle
  the same way.
- `src/app/api/chat/route.ts` - accepts `kosher` in the body: with an
  existing trip it merges `preferences.kosher=true` into the working
  copy BEFORE the loop (so the model reads it in CURRENT TRIP); with no
  trip it appends a silent UI-TOGGLE note to the state block; and a
  deterministic post-loop safety net stamps the preference onto the
  returned trip even when the model forgets set_preferences (observed
  once in testing - restaurants scheduled but flag missing).

**Product decisions:** kosher stays a button, never a question -
consistent with the canvas toggles; the homepage pill is the earliest
possible point to say it once and never be asked. Deterministic server
stamping beats trusting the model to call set_preferences.

**Broken/deferred:** Shabbat/other sensitive prefs not yet on the
homepage (kosher only, per scope). The localStorage key only feeds the
toggle's visual state; the ride-along is per-submit.

**Next session should know:** verified end-to-end - toggle ON + build
request from null trip → reply schedules kosher restaurants without
asking AND returned trip has preferences.kosher=true; toggle state
persists across loads; hero photo fully removed (no
photo-1488646953014 references). clear-storage.js in the scratchpad
clears only the trips key - the kosher key persists between CDP runs.

### 2026-07-24 - Full-bleed hero texture: flight-trail pattern, fades before the night band

**Built/changed:**
- `public/patterns/flight-trails.svg` (new) - a hand-authored, locally
  hosted decorative SVG: a faint dot-grid "map texture" plus a few
  dashed flight-path arcs with destination dots and tiny plane glyphs,
  colored with the night/sunset tokens directly in the SVG (no new
  dependency, no external image host - avoids the sandboxed-environment
  image-blocking gotcha entirely since it's a same-origin static file).
- `src/components/HomeHero.tsx` - new full-bleed background layer
  (`-z-20`, behind the existing radial wash) sized `h-[460px]
  sm:h-[560px]`, breaking out of `main`'s `max-w-6xl` container with the
  margin technique (`ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]` +
  `w-screen overflow-hidden`, paired with `absolute top-0` and no
  left/right - deliberately NOT `left-1/2 + -translate-x-1/2`, which
  overflows when nested inside a centered, padded parent). Base
  `opacity-[0.12]` (texture, not photo) plus a straight top-to-bottom
  `mask-image: linear-gradient(to bottom, black 0%, transparent 100%)`
  (+ `-webkit-` twin) so it dissolves to nothing before the dark
  "יעדים פופולריים" band - no hard edge.

**Product decisions:** built the pattern as a local SVG instead of
sourcing a stock photo - keeps it low-opacity texture rather than
competing imagery, keeps the palette exactly on-token, and sidesteps
any external-host reliability concern for decorative chrome. Combined
"low base opacity" + "gradient mask fade" as two separate mechanisms
(opacity = how visible the texture ever gets, mask = where it
disappears) rather than baking the fade into the SVG itself, so either
can be retuned independently later.

**Broken/deferred:** nothing broken. The background layer's height is
approximate (460/560px) rather than measured against actual hero
height per breakpoint - safe because the mask reaches full transparency
well before the layer's own bottom edge, so any overlap into the night
band is already invisible.

**Next session should know:** verified via CDP - no horizontal overflow
at 390px or 1280px (`document.documentElement.scrollWidth ===
clientWidth` at both), texture visible but subtle near the top, fully
faded by the night band, search bar/pills fully legible on top. The
`cdp-shot.mjs` recipe now also supports a `CDP_EVAL` env var for
one-off metric checks (e.g. scrollWidth/clientWidth) alongside the
screenshot in a single CDP session.

### 2026-07-24 (b) - Agent build-loop safety net, live "thinking" indicator, multi-trip nav tabs, landmark-first homepage panel

Four independent tasks in one session (details per task below). All
verified with `npm run build`, live CDP tests against the real Claude
loop, and `scripts/verify-photos.mjs` (139/139 OK - no photo URLs
changed, only reused).

**1. Trip panel staying empty despite the chat "confirming" a full
itinerary** - diagnosed, not a band-aid. The tool-use pipeline (system
prompt → `agent.ts` tools → strict validator → SSE `{type:'trip'}` →
`AgentWorkspace`'s `trip.upsertTrip` → `TripCanvas`) is correctly wired
end-to-end - confirmed live (direct `/api/chat` POSTs built real,
validated multi-city trips). The actual bug: occasionally the model
narrates a day-by-day plan in prose (the `**יום N**` format the system
prompt teaches for non-edit answers) without ever calling
`create_trip_full`/`set_day_places` - so `touched` stays false, no
`trip` event ships, and the canvas is honestly empty because nothing
was ever built. Fixed in `src/app/api/chat/route.ts` `runAgent()`: when
edit/build intent is detected, no tool actually mutated the trip
(`toolBuiltSomething`, tracked separately from `touched` so a
kosher-hint-only merge can't mask this), no `quickReplies` were
offered instead, and the reply matches the day-formatted-itinerary
pattern - push ONE corrective system-nudge message and let the
existing tool_use loop mechanics run again (no hand-authored trip data
from parsed prose - the model still builds it for real, off the
grounded data). Also broadened `editIntent` (now `hasVerbIntent ||
mentionsDaysAndDest`) so phrasings like "טיול של 8 ימים בברטיסלבה
ווינה" with no imperative verb still count. Verified: an informational
question with no day count/tool intent correctly does NOT trigger the
retry.

**2. `ThinkingIndicator` component** - replaces every static "loading"
label site-wide: the chat "חושב…" bubble (`AgentWorkspace.tsx`), the
planner's "טוען את הטיולים שלך…" hydration state, and the Leaflet
"טוען מפה…" skeleton (`PlacesMap.tsx`). Three `bg-current` dots with a
new `thinking-bounce` keyframe in `globals.css`, folded into the
existing `prefers-reduced-motion` block (falls back to a static
`opacity: 0.6`, no motion). `AI_STATUSES` rotating-text + spinner on
the planner's generate button was left alone - it already animates,
wasn't in scope.

**3. Multi-trip nav tabs** - the trip store already supported multiple
trips (`TripState { trips: Trip[]; currentId }`, `TripContext`
already had `upsertTrip`/`duplicateTrip`/`deleteTrip`); the gap was UI
only. Added: `src/lib/trip/label.ts` (`tripLabel()` - city name(s) from
`citySlugs`, e.g. "וינה" or "ברטיסלבה + וינה"), `src/lib/trip/chatStorage.ts`
(per-trip-id chat history in localStorage, `tiyul-plus:chat:<id>`),
`currentId` exposed on `TripApi`. `SiteNav.tsx`: md+ shows up to 2
trip pills inline + an "עוד (N)" overflow dropdown for the rest; the
mobile hamburger always lists all trips under "הטיולים שלי". Clicking
a tab calls `setCurrentId` directly (same-page switch, handled
reactively) AND navigates `/chat?trip=<id>` (cross-page entry, handled
by a one-time post-hydration effect in `AgentWorkspace` - mirrors the
existing `?q=`/`?kosher=1` pattern). `AgentWorkspace` now persists/
restores chat history per trip id, distinguishing "a trip the agent
just built THIS conversation" (`selfUpsertRef` - keep local messages,
don't reload) from "an external tab switch" (`lastSyncedIdRef` +
`suppressSaveRef` - load that trip's stored chat, don't re-save stale
messages over it on the same tick). Added a "+ טיול חדש" button in the
workspace header (clears local chat + `currentId`, no explicit "start
new trip" affordance existed before - needed for the feature to be
usable at all, since one active trip was always sent to `/api/chat`
otherwise). Verified fully live via CDP: built a Vienna trip, clicked
"+ טיול חדש", built a Rome trip, both appeared as correctly-labeled
tabs ("וינה"/"רומא") on desktop AND in the mobile hamburger, and
clicking back to the Vienna tab restored its exact chat transcript,
map pins and itinerary with no reload.

**4. Homepage "יעדים פופולריים" → "פלאים שמחכים לכם"** - each of the 8
destination cards now leads with one real, already-`mustSee`-flagged,
already-photo-verified landmark instead of the city name (no new data
invented - see `HERO_LANDMARK` map in `src/app/page.tsx`: Vienna→St.
Stephen's Cathedral, Bratislava→the castle, Prague→Charles Bridge,
Budapest→Parliament, Rome→Colosseum, Athens→Acropolis,
Barcelona→Sagrada Família, Berlin→Brandenburg Gate). City+country+day-
count demoted to the secondary line under the landmark name. Section
title/subtitle rewritten to reference the landmarks directly. Same 8
destinations, same click-through, same dark panel/tokens/RTL, same
"כל הקטלוג" link - only the card content and framing copy changed.

**Broken/deferred:** none of the four. The multi-trip feature's
`selfUpsertRef`/`lastSyncedIdRef` dance is the one genuinely delicate
piece of new code in this session - re-read the comments in
`AgentWorkspace.tsx` carefully before touching the trip-switch
effects, the ordering (ref mutations are synchronous, state updates
aren't) is load-bearing. `HERO_LANDMARK` is a hand-picked map, not
derived automatically - if a new city is added per the "adding a new
country" recipe, also add its landmark entry or the card silently
falls back to the city photo/name (graceful, not broken, but not
landmark-first).

**Next session should know:** the build-loop fix reduces but doesn't
mathematically eliminate the narrate-without-building failure mode
(it's a single bounded retry, by design, to avoid loops) - if it recurs
after a second corrective nudge would also fail, that's expected and
matches "if it can't be done honestly, say so" rather than force
inventing a trip. Photo verification (139/139) confirms no existing
destination photo regressed - the landmark redesign reused photos
already shipped, no `verify-photos.mjs` risk was introduced.

### 2026-07-24 (c) - iconicLandmark moved from a page.tsx lookup into the data model

**Built/changed:**
- `src/lib/types.ts` - new `IconicLandmark` interface (`name`,
  `nameLocal`, `photo`, `blurb`) and an optional `iconicLandmark` field
  on `Destination`.
- `src/data/destinations.ts` - all 8 destinations now carry
  `iconicLandmark`, filled from the SAME already-verified `Place`
  entries the old `HERO_LANDMARK` map in `page.tsx` pointed to (photo
  URLs copied byte-for-byte, not re-sourced) plus a new factual
  1-sentence Hebrew blurb per landmark (no hours/price/kashrut
  claims): Vienna→St. Stephen's Cathedral (קתדרלת סנט סטפן),
  Bratislava→Bratislava Castle (טירת ברטיסלבה), Prague→Charles Bridge
  (גשר קרל), Budapest→Hungarian Parliament (בניין הפרלמנט ההונגרי),
  Rome→Colosseum (הקולוסיאום), Athens→Acropolis (האקרופוליס
  והפרתנון), Barcelona→Sagrada Família (סגרדה פמיליה),
  Berlin→Brandenburg Gate (שער ברנדנבורג).
- `src/app/page.tsx` - the hand-picked `HERO_LANDMARK: Record<string,
  string>` place-ID lookup is gone; the "פלאים שמחכים לכם" panel now
  reads `dest.iconicLandmark` directly.

**Product decisions:** reused the exact places the previous session had
already hand-picked and shipped (same landmark per city) instead of
re-researching new ones - they're globally unambiguous, real,
verifiable landmarks, and reusing already-verified `Place.photo` URLs
means zero new photo-hosting risk. This also collapses a duplicated
lookup (place-ID map in `page.tsx` + place array search) into one typed
field on the destination itself, so a new consumer (e.g. a future
`/destinations/[slug]` hero) doesn't need to reinvent the lookup.

**Broken/deferred:** none. `verify-photos.mjs` still reports 139/139 -
it walks `Place.photo`, not the new `iconicLandmark.photo`, but since
every landmark photo is a literal copy of an already-checked `Place`
URL there's nothing unverified in the new field.

### 2026-07-24 (d) - Planner/destination map: CARTO Positron basemap + on-brand Leaflet chrome

**Built/changed:**
- `src/components/MapInner.tsx` - `TileLayer` swapped from raw
  `tile.openstreetmap.org` (stock OSM colors, no CDN) to CARTO's free,
  keyless Positron basemap (`{s}.basemaps.cartocdn.com/light_all/...`,
  `subdomains="abcd"`, `detectRetina`) with correct dual attribution
  (`© OpenStreetMap contributors © CARTO`, both linked per CARTO's
  attribution policy). No API key, no new dependency.
- `src/app/globals.css` - `.leaflet-tile-pane` gets a subtle
  `saturate(0.85) brightness(1.02) sepia(0.06)` filter (tile pane only -
  Leaflet keeps markers/popups in separate panes, so `.pin-marker` and
  the popup styling are untouched) to warm Positron's cool gray toward
  the site's cream/night palette. `.leaflet-control-zoom` restyled as a
  small rounded `shadow-pop` pill (cream bg, night text, sunset hover)
  replacing the default white-square Leaflet buttons;
  `.leaflet-control-attribution` restyled to a small translucent-cream
  rounded chip instead of the default white box.

**Product decisions:** CARTO Positron over Voyager - Positron's
near-monochrome base makes the site's colorful category pins (already
themed per `categoryMeta`) the visual focus, which fits "keep the pins/
popups as-is, fix the basemap" from the ask. Filter applied only to
`.leaflet-tile-pane` (not `.leaflet-container`) specifically so it can
never wash out the pins/popups - verified visually that street labels
stay legible at both a city-wide fit-bounds zoom and 5 clicks zoomed
in.

**Broken/deferred:** nothing broken. The planner's new-trip screen has
no map (only the workspace view with an active trip does) - verified
the redesign via `/destinations/vienna` instead, which renders the same
`PlacesMap`/`MapInner` component the planner uses, so the fix applies
identically once a trip exists.

**Next session should know:** if a future map surface adds a scale
control or layer switcher, style it in `globals.css` next to the
zoom-control block - same token pattern (`--color-cream`/`--color-night`/
`--shadow-pop`) so it doesn't regress back to stock Leaflet chrome.

### 2026-07-24 (e) - Homepage wonders panel: client-side random N-of-pool shuffle, no hydration mismatch

**Built/changed:**
- `src/components/DestinationHighlights.tsx` (new, client component) -
  takes the full pool of destination cards as props, renders a fixed
  8-tile pulsing skeleton on first render (identical on server and
  client - no randomness before mount, so no hydration mismatch), then
  in `useEffect` runs a Fisher-Yates shuffle of the WHOLE pool and slices
  the first 8 into state. Every destination has equal odds regardless of
  its position in `destinations.ts`.
- `src/app/page.tsx` - `Home()` now just resolves each destination's
  card view-model (name/photo/iconicLandmark fallback/country/days) and
  hands the full array to `<DestinationHighlights cards={cards} />`;
  the inline grid JSX that used to live here moved into the new
  component. Route stays static (`○ /` in the build output, unchanged)
  - only the client component re-randomizes per real page load, so no
  `force-dynamic` and no loss of prerendering.
- Panel subtitle ("מהקולוסיאום ועד שער ברנדנבורג...") hardcoded two
  specific landmarks that are no longer guaranteed to be in the visible
  8 once selection is random - genericized to "לכל פלא יש מסלול מוכן,
  מפה ושכבת כשרות. לוחצים ונכנסים." so the copy never overpromises which
  cities are showing.

**Product decisions:** followed the exact pattern already established by
`PromptChips`' `pickChips()` (skeleton during SSR/first paint, real
random state only after mount) instead of forcing the route dynamic -
keeps `/` prerendered, and is the least invasive fix consistent with
how this codebase already solves "random content on a static page."

**Broken/deferred:** none. Verified via 5 fresh CDP navigations against
a production build (`npm start`, not dev - dev always dynamically
renders so it wouldn't have caught a real static/hydration bug): card
order differed every load, zero console errors/warnings/exceptions in
any run. Selection (not just order) will only become visibly different
once the destinations pool exceeds 8 - not observable yet with exactly
8 destinations, but the slice-from-shuffled-full-pool logic already
handles a larger pool correctly by construction.

**Next session should know:** once the non-Europe destinations land,
re-verify with the same CDP recipe (`shuffle-check.mjs` pattern in the
scratchpad) that the selected SET also varies, not just the order -
should be automatic given the implementation, but worth a real check
with >8 destinations in the data.

**Next session should know:** `iconicLandmark` is now the source of
truth for "the one photo that represents this city" - if a new country
is added per the "adding a new country" recipe, also set its
`iconicLandmark` (a real, verifiable landmark with a working photo) or
the homepage card falls back to the destination's generic hero photo
(graceful, not broken, but not landmark-first). `HERO_LANDMARK` no
longer exists anywhere in the code.

### 2026-07-24 (f) - Non-Europe expansion batch 1/5: Bangkok + Thailand, plus the editorial-rating system

Scope approved by Netanel before any content was written: 5 new
destinations (Bangkok, Abu Dhabi, Marrakech, New York, Miami) across 3
new continents, one destination per batch, verified via web research
(not memory) per destination - TLV direct-flight status, visa rules,
and real kosher/Jewish infrastructure checked per candidate city before
committing to the list. Rejected from scope: Dubai (Emirates route
suspended since Oct 2023, resume date unconfirmed - can't claim "direct
flights" as current fact), Istanbul (no current nonstop TLV service,
strained relations), Zanzibar (real but thin - 1x/week charter, zero
kosher infrastructure found).

**Built/changed (ratings system, ships before any new destination):**
- `src/lib/types.ts` - new `EditorialRating { score: number; verdict:
  string }`, added as `Destination.editorialRating?` and
  `DestinationSummary.editorialRating?`.
- `src/lib/providers/sample.ts` - `getDestinations()` now passes
  `editorialRating` through (google/tripadvisor providers delegate to
  sample for this call already, so both inherit it for free).
- `src/app/destinations/[slug]/DestinationClient.tsx` - hero shows a
  cream/10 pill: "המלצת הצוות: X/5" + the one-line verdict + a small
  always-visible (not hover-only) disclosure line "דירוג עריכתי של
  צוות טיול+ - לא ממוצע של ביקורות משתמשים".
- `src/app/countries/[slug]/page.tsx` - same copy as a compact sunset/10
  chip on each city card, with the disclosure as a `title` tooltip.
- Deliberately did NOT touch the existing per-place `rating` (⭐ 4.x,
  still unlabeled in the UI) - out of scope for this ask, flagged to
  Netanel as a possible separate follow-up, not fixed here.

**Built/changed (Bangkok content):**
- `src/data/countries.ts` - new `thailand` entry (visa incl. the TDAC
  online pre-registration required since 2025, currency, eSIM/SIM,
  payments).
- `src/data/destinations.ts` - new `bangkok` destination: 17 places
  (Grand Palace/Wat Phra Kaew, Wat Arun, Wat Pho as `mustSee`, Wat
  Traimit Golden Buddha, Yaowarat/Chinatown, On Lok Yun breakfast diner,
  Chatuchak Weekend Market, Jim Thompson House, Lumphini Park, Mahanakhon
  SkyWalk, ICONSIAM, Asiatique, Erawan Shrine, Khao San Road, the Chao
  Phraya Express Boat, and 2 real kosher entries), a 4-day itinerary,
  `iconicLandmark` (Grand Palace), `editorialRating` (4.6/5), and
  `practical`.
- Every coordinate either came from Wikipedia's `prop=coordinates` API
  (Grand Palace, Wat Arun, Wat Pho, Wat Traimit, Jim Thompson House,
  Lumphini Park, Mahanakhon, Erawan Shrine - all confirmed, not
  eyeballed) or a commonly-cited figure for landmarks without a
  geo-tagged Wikipedia infobox (Chatuchak, Khao San, ICONSIAM,
  Asiatique, the two kosher venues). Every photo URL was resolved via
  the Wikimedia Commons `imageinfo` API (real `File:` title →
  `iiurlwidth=500` → actual working `thumburl`, not a guessed path) and
  re-checked with a standalone HTTP GET before use - 3 places (On Lok
  Yun, the river-boat entry, both kosher venues) intentionally ship with
  no `photo` rather than a guessed/wrong one.
- **Kosher honesty check (hard rule 3/CLAUDE.md):** exactly 2 real
  kosher entries, both `pending-review` verification like every other
  kosher entry in the app - Chabad House Bangkok - Ohr Menachem
  (meat restaurant + dairy café, Khao San area, Shabbat meals) and J
  Cafe Kosher Shoppe (grocery, Sukhumvit Soi 20). `kosherOverview`
  explicitly says these are the ONLY two verified kosher points in the
  city and warns not to assume regular Thai restaurants are kosher -
  no padding to look more complete than the research supports.

**Verification:** `npm run build` clean (Bangkok/Thailand now generate
their own static pages), `node scripts/verify-photos.mjs` → 153/153 OK
(was 139 before this batch). Live-rendered `/destinations/bangkok` and
`/countries/thailand` via headless Edge - 17 places filter correctly (2
kosher), map pins cluster realistically across the city (CARTO basemap
from the same session's earlier map redesign), editorial-rating pill
renders with visible disclosure text, RTL intact throughout.

**Wikimedia rate-limiting note for next session:** both
`commons.wikimedia.org/w/api.php` and `upload.wikimedia.org` throttle
aggressively under rapid sequential requests from this environment (429
after ~2-4 requests in quick succession). Fix that worked: a real
contact-style `User-Agent` string, 1.5-2.5s delay between requests, and
exponential backoff (parse-JSON-fails → wait 8-10s × attempt, retry) on
429 rather than treating it as a hard failure - scripts left in the
scratchpad (`commons-search.mjs`, `check-urls.mjs`, `wiki-coords.mjs`)
if the pattern is useful again for the remaining 4 destinations.

**Next session should know:** batch 2/5 (Abu Dhabi) is next, same
process - web-verify places/coords/kosher status/flights before
writing, Wikimedia API via the scratchpad scripts for coordinates and
photos, `verify-photos.mjs` after. Netanel wants a short landmarks-style
summary table after each batch for spot-check before the next one
starts, not a silent multi-batch dump.

### 2026-07-24 (g) - Map pins redesign; brand→"סוכן הנסיעות החכם"; standalone kosher search; Abu Dhabi (batch 2/5)

Four independent tasks this session; all verified with `npm run build`,
CDP screenshots, and (for content) `verify-photos.mjs`.

**1. Map pins - from "gamey" badge to a professional teardrop.**
`src/lib/categories.ts` colors deepened/desaturated (still 8
distinguishable hues, less toy-bright). `src/components/MapInner.tsx`
`makeIcon()` now builds a classic teardrop: a rotated rounded-square
`.pin-drop` + a centered `.pin-content`; route-stop numbers render
INSIDE the pin (replacing the emoji) rather than as a detached corner
medallion. `src/app/globals.css` `.pin-marker` rewritten - soft
`drop-shadow` not a heavy box-shadow, thin 1.5px cream ring, 28×36
iconSize/anchor. Verified on dense Bangkok (17) + seeded Vienna planner.

**2. Brand repositioning to "סוכן הנסיעות החכם" (copy only).**
`layout.tsx` meta title/description reframed from "תכנון טיולים חכם"
(reads like a directory) to an agent that builds the trip; a small
"· סוכן הנסיעות החכם" tagline sits next to the logo (hidden < sm).
`HomeHero.tsx` gains a sunset kicker badge "🧭 סוכן הנסיעות החכם שלכם"
and the subhead now opens "לא עוד מדריך לגלול בו". No chat/planner
logic touched.

**3. Standalone kosher search - new `/kosher` + nav tab.**
`src/app/kosher/page.tsx` (server: pulls kosher places per city from
the same curated `destinations.ts` via the provider) + `KosherSearch.tsx`
(client: city search over name/nameLocal/slug + a small hard-coded
Hebrew ALIASES map for common misspellings; results list reuses the
existing trust-badge pattern; `PlacesMap` of just the kosher pins).
Cities outside the catalog get an explicit honest empty state
("עדיין אין לנו מידע כשרות מאומת ל...") - never a fake-empty result.
`SiteNav.tsx` NAV_LINKS gains `{ /kosher, כשרות }`. Verified live:
"וינה" → real venues + map; "דובאי" → honest empty state.

**Bonus (same session, small):** the homepage "אוכל כשר" toggle pill
swapped its 🍽️ plate emoji for an inline check-in-circle SVG so it
reads as "kosher, verified" not generic food (`HeroPrompt.tsx`).

**4. Content: Abu Dhabi (UAE) - batch 2/5 of the non-Europe expansion.**
- `src/data/countries.ts` - new `uae` country (mutual visa-waiver up to
  90 days, dirham, eSIM/Etisalat, cards+cash; note: extension-sticker or
  laissez-passer passports are NOT admissible - real UAE entry rule).
- `src/data/destinations.ts` - new `abu-dhabi`: 17 places, 4-day
  itinerary, iconicLandmark (Sheikh Zayed Grand Mosque), editorialRating
  4.5/5 with an honest heat/cost caveat, `practical` (Etihad's resumed
  daily TLV-AUH service, kosherOverview). 2 real kosher venues - The
  Kosher Place (Ritz-Carlton Venetian Village) and Sababa (Mushrif Mall
  food court), both under Rabbi Levi Duchman's Emirates Agency for
  Kosher Certification, both `pending-review` like every kosher entry;
  kosherOverview states these are the ONLY certified spots in the city.
- **Photo-verification caveat worth remembering:** the Wikimedia
  Commons `list=search` top hit is NOT reliably the landmark's exterior.
  Three first-pick photos were wrong-subject INTERIOR shots that only
  surfaced on eyeballing the actual bytes: the "mosque" was a recycling
  bin in the visitor centre, "Emirates Palace" was a hotel chocolate
  counter, "Qasr Al Watan" was a dark media-wall lobby. All three were
  replaced with verified exteriors (mosque silhouette, aerial palace,
  presidential-palace dome). LESSON: for a landmark hero photo, actually
  download and LOOK at the image, don't trust the search title.
  `verify-photos.mjs` only checks HTTP 200, not that the subject is right.
- Coordinates: Wikipedia coordinates API where available, else
  Nominatim (`nominatim.mjs` added to scratchpad) or a cited figure.
- `verify-photos.mjs` → 168/168 OK (was 153 before this batch).

**Abu Dhabi spot-check table (for Netanel before batch 3):**
| # | Place | Category | mustSee | Photo |
|---|-------|----------|---------|-------|
| 1 | מסגד שיח׳ זאיד הגדול | attraction | ✓ | ✓ silhouette |
| 2 | The Kosher Place | kosher-food | | (no photo) |
| 3 | קצר אל-וואטן | attraction | ✓ | ✓ dome |
| 4 | אנדרטת המייסד | attraction | | ✓ |
| 5 | ארמון האמירויות | viewpoint | | ✓ aerial |
| 6 | הלובר אבו דאבי | museum | ✓ | ✓ |
| 7 | בית המשפחה האברהמית | attraction | | ✓ synagogue interior |
| 8 | חוף סעדיאת | nature | | ✓ |
| 9 | פארק מנגרובים ג׳ובייל | nature | | ✓ |
| 10 | פרארי וורלד | attraction | ✓ | ✓ |
| 11 | וורנר ברדרס וורלד | attraction | | ✓ |
| 12 | יאס ווטרוורלד | attraction | | ✓ |
| 13 | קצר אל-חוסן | museum | | ✓ |
| 14 | הקורניש | nature | | ✓ |
| 15 | השוק האיראני | shopping | | (no photo) |
| 16 | הגלריה - אל מריה | shopping | | ✓ |
| 17 | סבבה (כשר) | kosher-food | | (no photo) |

Rating 4.5/5. iconicLandmark: Sheikh Zayed Grand Mosque.

**Deferred / not built this session (user asked, still open):** a
homepage quick-access services grid (flights/stay/tickets/car), an
accessibility widget + audit + statement page, a paste-a-Reel/TikTok
link-extraction feature (Phase-1 feasibility assessment owed first),
and removing the destination-list scroll "chevron sidebar" (which is
actually the native RTL scrollbar of the `overflow-y-auto` places list
in `DestinationClient.tsx` line ~120, rendered with classic arrow
buttons only in headless Edge - NOT a custom component).

**Next session should know:** batch 3/5 is Marrakech (then New York,
Miami). Same process. The Wikimedia photo-subject caveat above is the
single most important lesson from this batch - budget time to visually
check every landmark hero image, not just its HTTP status.

### 2026-07-24 (h) - Autonomous run: quick-services, a11y, /start, overflow fix, logo; + destinations Tbilisi/Phuket/Baku

Long autonomous session. All UI work committed+pushed per task; then an
open-ended destinations expansion (one verified city per commit).

**UI / product tasks (each its own commit):**
- **Map pins redesigned** (`categories.ts`, `MapInner.tsx`, `globals.css`):
  classic teardrop instead of the "achievement badge" - softer shadow,
  thin ring, route numbers INSIDE the pin, colors deepened/desaturated.
- **Brand → "סוכן הנסיעות החכם"** (`layout.tsx` meta + header tagline,
  `HomeHero.tsx` kicker/subhead) - copy only, agent-not-directory framing.
- **Standalone kosher search** `/kosher` (`app/kosher/*`, nav tab in
  `SiteNav`): city search (name/local/alias) over the curated data, map +
  trust badges, honest empty state for uncovered cities.
- **Kosher pill icon** 🍽️→check-in-circle (`HeroPrompt.tsx`).
- **Homepage quick-access services grid** (`lib/services.ts` +
  `QuickServices.tsx`): 4 cards (flights/stay/tickets/car), 2×2 on mobile /
  4-across desktop. NO affiliate exists in the codebase - config-driven
  (`affiliateUrl` null → `publicUrl`), so a real partner link drops in
  later without touching the component. flights/stay/tickets link to the
  provider's public site (Skyscanner/Booking/GetYourGuide, rel nofollow
  sponsored); car rental is an honest "בקרוב". **TODO(Netanel): real
  affiliate IDs/links for all four.**
- **Accessibility widget + statement** (`AccessibilityWidget.tsx`,
  `lib/a11y.ts`, `app/accessibility/page.tsx`, boot script in `layout`):
  floating 44/48px button → panel with text-size, high-contrast (overrides
  the Tailwind v4 tokens), grayscale, underline/highlight links, spacing,
  big cursor, stop-animations, reset. Persists in localStorage, applies
  pre-paint. **TODO(Netanel): fill the [למילוי] placeholders in the
  statement (coordinator name, contact, tested date) - not invented.**
- **/start three-way entry** (`app/start/*`): free-text chat / structured
  quiz / paste-link. Quiz → Hebrew prompt → existing `/chat?q=` (feeds
  Trip.preferences, no new shape). **Link extraction NOT built** - Phase-1
  verdict: only YouTube is realistically extractable and it needs a paid
  API / dependency decision; Instagram/TikTok/Facebook block external-URL
  content reads per ToS. The link tab detects the platform and says so
  honestly (no fake extractor).
- **Plane logo + favicon** (`Logo.tsx`, `public/logo.svg`, `app/icon.svg`):
  replaced the compass emoji; cream-reversed variant in the footer.
- **Footer disclaimer** reframed from "sample data" to "AI-planned, verify
  before travel."
- **Live bug fixes:** killed site-wide horizontal overflow (the HomeHero
  `w-screen` flight-trails layer overran by the scrollbar width; added
  `overflow-x: clip` on html+body - clip, not hidden, so the sticky header
  survives; verified scrollWidth===clientWidth at 390/768/1280). Shrank the
  oversized a11y button to 44/48px.

**Accessibility audit (flagged, not all fixed):** default muted text
(`text-night/40-45` on cream) and white-on-sunset small text fall below
WCAG AA 4.5:1 (the high-contrast mode mitigates on demand); Leaflet markers
aren't keyboard-reachable; no global visible focus ring (only the a11y
button). Alt text, heading structure, and ARIA are otherwise reasonable.

**Destinations added (one commit each, full depth, all verified):**
- **Tbilisi, Georgia** (new `georgia` country) - 16 places, rating 4.6.
  Landmark: Narikala Fortress. Nature: Gergeti Trinity Church on Mt Kazbek,
  Turtle Lake, Botanical Garden gorge, Jvari Monastery. Kosher: real &
  strong (Mendi's/Chabad pinned; King David/Shalom Aleichem/La Casa/Hummus
  Jerusalem named in overview). Visa-free ≤1yr; El Al/Georgian/Israir/Arkia
  ~24/wk.
- **Phuket, Thailand** (reuses `thailand`) - 12 places, rating 4.5.
  Landmark: Big Buddha. Nature: Phi Phi/Maya Bay, James Bond Island (Phang
  Nga), Promthep Cape, Karon Viewpoint, beaches. Kosher: Chabad House
  Phuket (kosher meat restaurant) - the island's one verified address.
  El Al direct ~4/wk.
- **Baku, Azerbaijan** (new `azerbaijan` country) - 11 places, rating 4.4.
  Landmark: Flame Towers. Nature/"land of fire": Yanar Dag (perpetual
  fire), Gobustan (rock art + mud volcanoes), Ateshgah fire temple, Caspian
  boulevard. Heritage: the Red Village (Qırmızı Qəsəbə), a rare all-Jewish
  town. Kosher: Chabad of Baku (catering) only - stated honestly. Israelis
  need an e-visa/ASAN (NOT visa-free); AZAL/Arkia/Israir ~18/wk.

`verify-photos.mjs` after each: 183 → 192 → 202, all OK. Photo-subject
lesson from batch 2 applied throughout - hero/landmark/nature/heritage
images were eyeballed, and several first-pick photos were swapped when they
turned out to be the wrong subject (a dark night Gergeti, a
view-from-monument Chronicle, a wrong far-south Yanar Dag coord from
Nominatim).

**Next session:** more verified destinations (Almaty was next in the queue;
also candidates: Petra/Wadi Rum with a land-crossing note, Marrakech
pending flight-status re-check, Sri Lanka). Keep the "verify or leave a
TODO, never guess" rule. The three homepage service cards + a11y statement
placeholders are the only things waiting on Netanel.

### 2026-07-24 (i) - Destinations expansion cont.: Almaty + Montenegro (nature-forward)

Continued the autonomous expansion (one verified city per commit).

- **Almaty, Kazakhstan** (new `kazakhstan` country, visa-free 30 days) -
  10 places, rating 4.4. Landmark: Zenkov wooden cathedral. Heavy nature:
  Charyn Canyon, Big Almaty Lake, Shymbulak + Medeu (Tian Shan), First
  President Park. Kosher: Chabad Lubavitch Almaty (synagogue + kosher
  store) only. Air Astana direct ~2/wk (low frequency - noted in rating).
- **Montenegro** (new `montenegro` country, visa-free 90 days, uses euro) -
  modeled as one **Kotor-hub** destination (assumption: Budva + northern
  nature as day-trips, not separate city pages - matches how Tbilisi/Almaty
  handle far day-trips). 10 places, rating 4.6. Landmark: Bay of Kotor.
  Per Netanel's mid-run steer ("nature/hiking/mountains/lakes outside
  cities"): Kotor walls hike, Lovćen NP, Lake Biograd (Biogradska Gora
  virgin forest, near Kolašin), Durmitor Black Lake, Tara Canyon - plus
  Kotor/Budva/Perast/Sveti Stefan on the coast. **Kosher: none** - Montenegro
  has no kosher infrastructure; not forced (kosher filter shows 0), stated
  honestly. Direct Tivat flight is **summer-only** (El Al/Israir).

Both: build clean, verify-photos.mjs all OK, hero/nature photos eyeballed.

**Destinations now in the catalog (13):** vienna, bratislava, prague,
budapest, rome, athens, barcelona, berlin, bangkok, abu-dhabi, tbilisi,
phuket, baku, almaty, kotor. (Countries: austria, slovakia, czechia,
hungary, italy, greece, spain, germany, thailand, uae, georgia, azerbaijan,
kazakhstan, montenegro.)

**Stopped here at Netanel's request** ("stop when you finish with
montenegro"). Candidates not yet built if resuming: Petra/Wadi Rum (Jordan,
land-crossing note), Marrakech (re-verify Morocco flight status first),
Sri Lanka, a second Georgian city (Batumi).
