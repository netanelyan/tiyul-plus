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

This is a real business. Decisions favor user trust and repeat usage over tech
impressiveness.

**How it earns, as of 2026-09-27** - this line used to say "affiliate revenue
planned, premium later", and both halves have moved:

- **Affiliate revenue is blocked until ~March 2027** (Netanel is not yet 18 and
  cannot join the programmes). All six booking providers therefore stay **regular
  links with no partner id** - do not add tracking parameters, and do not treat
  the free outbound traffic as a bug to fix yet. `npm run revenue` prints the real
  per-provider state; `LAUNCH-CHECKLIST.md` section 1 has the steps for later.
- **So direct sales are the only revenue that can grow right now**, which makes
  them the thing to protect: the pre-departure check (29.90 ILS per trip) and the
  **trip pass** (49 ILS per trip, 60 days, everything) - see `src/lib/tripPass.ts`.
- **The monthly premium plan is retired and no longer sold.** Its code and webhook
  stay so existing subscribers keep working; nothing links to it. It was replaced
  because every thing it gave was per-trip while it billed per-month, and it was
  priced *below* the check it included - so buying a month and cancelling was
  cheaper than buying the check. Pro (89.90 ILS/month) stays, for people who plan
  constantly.

The ladder must never invert again: **check &lt; pass &lt; a month of pro**, with a
test in `tripPass.test.ts` asserting it.

## Site walkthrough (as built)

- **`/` - the storefront homepage.** Server component + two small client
  islands: `HomeHero` (the big centered input + prompt chips - submitting
  NAVIGATES to `/chat?q=...`, no conversation state or Leaflet on the
  homepage) and `MyTripCard` (shown only when a trip exists). Below the
  hero, eight sections in a light/dark rhythm (`src/components/home/*`,
  data from `src/lib/server/homeSections.ts` - every count is computed
  from the catalog, never typed): the eight pinned flagship cities with
  place/route/kosher counts (`FLAGSHIP_SLUGS`), popular countries as flag
  tiles, the shared-trip feature block, a dark CTA band, the collection
  hubs, the service cards, how-it-works, and the current trip.
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
  to the user. The first message transitions to the **unified trip
  view** (`TripWorkspace`) - see below.
- **The unified trip view (`src/components/TripWorkspace.tsx`).** ONE
  screen for a trip: itinerary + map + the agent conversation together,
  no tab switching. Rendered by BOTH `/chat` and `/planner` on the same
  `Trip` object (chat edits mutate the trip in place - never a copy).
  Layout: xl = three columns (itinerary right / map middle / chat left);
  lg = itinerary + map side by side with the chat as a full-width panel
  under them; mobile (~390px) = day tabs (h-scroll) → map → day card →
  stops → collapsible "כל הימים", with the chat in a **fixed bottom bar
  that opens a drawer** (the bar sits beside the a11y button, never over
  it). Also: day tabs with inter-city travel legs, stop reordering,
  move-to-day, per-day notes, Google Maps navigation per day,
  copy/print/PDF, duplicate/delete. Each day carries a one-line
  description generated from its REAL stops (`src/lib/trip/
  dayDescription.ts`) - shown under the day heading, in the all-days
  overview, in the copied summary and in print; empty days get a
  neutral placeholder, never an invented theme. **Dates:** an optional
  start+end range on the trip (`Trip.startDate` / `endDate`, `YYYY-MM-DD`),
  set from a control beside the preference chips or by telling the agent
  (`set_trip_dates`). Day N's date is DERIVED from the start date, so it
  cannot drift from the day order; a range that disagrees with the day count
  is reported, never silently applied - see `src/lib/trip/dates.ts`.
  **Preferences UI:** the
  chips (כשר, קצב, מי נוסע, שופינג) are interactive toggles that write
  `Trip.preferences` directly - sensitive preferences (kashrut, Shabbat)
  are buttons BY DESIGN, the agent never asks about them in conversation
  and silently reads the current values each turn. Non-sensitive
  clarifying questions may carry tappable quick-reply chips
  (`suggest_quick_replies`). Action chips ("✓ הוספתי את...") show under
  the reply; the plan re-renders from every `{trip}` event streamed.
- **`/planner` - the button-driven way into the same trip.** The
  new-trip screen is a hybrid: prominent city cards plus button-only
  controls (days stepper, מי נוסע, pace, style, shopping, kosher toggle)
  form hard constraints; an optional free-text field refines them via
  `/api/generate-trip`; ready-made templates below. Once a trip exists
  it renders the exact same `TripWorkspace` as `/chat`.
- **`/countries` → `/countries/[slug]` → `/destinations/[slug]` - the
  curated catalog** (linked from the nav and a quiet landing link). Country
  cards → country page (visa/currency/sim/payments + city cards) → city page
  (places on a map, day-by-day itinerary, kosher layer, city+country
  practical info merged).
- **One trip, one view, two entry points.** `/chat` (agent landing) and
  `/planner` (button builder) both open the same `TripWorkspace` on the
  same `Trip` object (localStorage behind `TripContext`); the nav has a
  single "תכנון טיול" tab (the old separate "צ׳אט טיולים" tab is gone). `Trip.preferences` (party, pace,
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
- `src/data/destinations.ts` - curated content: 166 destinations across
  83 countries, ~3,116 places (Hebrew), each referencing its country via
  `countrySlug`. Re-count with a grep before quoting these numbers.
  Places carry `photo` (verified URLs - run `node
  scripts/verify-photos.mjs` after any photo change; Wikimedia thumbs
  accept ONLY the allowed widths 250/330/500/960px), `priceLevel`
  (0=חינם..3), `tags` (fixed set: families/nightlife/romantic/history/
  art/foodie/outdoors), `mustSee`, and kosher entries a
  `kosherVerification` object rendered ONLY through
  `src/components/KosherBadge.tsx`. Policy per Netanel (2026-07-25):
  NO per-entry verified/pending system in the UI - the badge shows the
  supervision as reported ("השגחה: ...") plus a quiet "לוודא מול המקום"
  tail, and /kosher carries one general disclaimer that the data is
  AI-collected from public sources. `lastChecked` stays in the data but
  is not rendered. Never invent supervision that wasn't reported. City
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
  questions; `add_pin` / `remove_pin` manage the traveler's own places;
  the chat loop runs up to 16 tool iterations).
- `src/lib/server/geocode.ts` - server-only OpenStreetMap lookup for
  `add_pin` (Nominatim first, Photon as fallback, both overridable via
  `GEOCODE_NOMINATIM` / `GEOCODE_PHOTON` so the path is unit-testable).
  Serial 1-req/sec throttle honoring Nominatim's policy, 500-entry
  in-memory cache, 8s timeout, and it NEVER throws: a miss returns
  `null`. Zero new dependencies. **Untested live** - sandbox egress is
  blocked, so first real verification happens in production.
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
- `src/components/` - `TripWorkspace` (THE unified trip view: itinerary +
  map + chat, used by `/chat` and `/planner`), `ChatPanel` (presentational
  chat UI - rendered twice, desktop column + mobile drawer, sharing one
  state), `AgentWorkspace` (landing hero → `TripWorkspace`, handles
  `?q=`/`?kosher=1`/`?trip=`), `PlacesMap`/`MapInner` (Leaflet,
  client-only), `BookingPanel` ("מה עוד חסר לטיול", per-city provider
  search), `PinsPanel` (the traveler's own pins: fix an unverified
  location, remove), `AddToTripButton`, `TripChip`.
- `src/lib/trip/useTripChat.ts` - the conversation state hook (streaming
  `/api/chat`, per-trip history in `chatStorage`, `upsertTrip` on every
  `{trip}` event). One instance per trip view feeds both chat surfaces.
- `src/lib/trip/dayDescription.ts` - honest one-line day summaries derived
  ONLY from the day's real stops (top categories + mustSee/first stop +
  stop count); empty days return an explicit neutral string.
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
7a. **Merging a batch of branches:** merge them one at a time and run
   only `npx tsc --noEmit` after each (cheap early warning). Run the
   expensive checks - `npm run build` and `node scripts/verify-photos.mjs` -
   ONCE for the whole batch, right before pushing main. Never per-branch.
   Do NOT put the session-log entry inside a feature branch: it conflicts
   on every single merge. Append it as a separate commit on main after the
   merge lands.
7. Every work session ends with: `npm run build` passing, visual check of
   changed pages (RTL + design consistency), commit + push with a clear
   message.
8. Every work session ALSO ends by appending a dated entry to the current
   month's file in `docs/session-log/` (create it if the month is new) with:
   (a) what was built/changed and in which files, (b) product decisions made
   and why, (c) anything left broken or deferred, (d) what the next session
   should know. No exceptions - docs-only sessions included.
   **Do NOT append it to this file.** CLAUDE.md is loaded into context every
   session; the log used to live here and reached ~404k tokens, twice the
   context window, which meant these instructions could no longer be read in
   full. Keep this file the brief; the log is the record.
9. **Developer notes are English-only (Netanel, 2026-08-17).** Code
   comments, SQL comments, script comments, commit messages, and NEW
   session-log entries are written in English - never Hebrew. Hebrew stays
   only where it is the product (UI copy, catalog data, test names/strings).
   Enforced for comments by `src/lib/englishComments.test.ts`; pre-existing
   Hebrew session-log entries below are historical record and stay as
   written.

## Grounding index budget (authoritative - read this before trusting a session log)

**The ceiling is 280,000 chars.** Netanel raised it from ~190,000 to 260,000 on
2026-07-27, and to 280,000 on 2026-07-29.

Older session-log entries below quote ~190,000 and 260,000. They are kept as written
because they are a historical record, but **do not act on those numbers**, and above all
do not trim the catalog because the index now measures above them.

What the number actually is, measured rather than assumed:

- The ceiling is a **self-imposed guardrail. It appears nowhere in the code** - grep
  for it and you will find nothing. There is no API limit at this value.
- The real constraint is the 200k context window, shared by the grounding index +
  the detail block + the history budget (50,000 chars, see entry 2026-07-27 (e)) +
  system prompt and tools.
- **The detail block is capped at 45,000 CHARS (`MAX_DETAIL_CHARS`), not at six
  cities.** This line used to say "capped at 6 cities, ~39,000 chars worst case",
  which was true when written and then silently stopped being true: the catalog
  roughly doubled and a city is not a fixed amount of text. Measured 2026-09-20,
  Vienna alone is 20,126 chars and the six largest together were **86,633**.
- Measured 2026-07-27: index 191,951 chars at 1,336 places, **90% ASCII / 10% Hebrew**,
  which is roughly 61k-67k tokens. An earlier entry's "~45k tokens" understates it.
- Cost per place is **~144 chars catalog-wide**, but only **110 chars** for a
  food/market/shopping entry, which carries no description - see entry (dd).

**Latest measurement: 255,516 chars (2026-09-20)**, which includes the
`byCharacter` directory and the per-continent/per-character and per-country counts
handed to the model so it stops inventing figures about our own coverage.

**Read this before trusting the chars-to-tokens arithmetic below.** On
2026-09-20 the whole worst-case prompt was counted with **Anthropic's own
tokenizer** (`/v1/messages/count_tokens`) rather than estimated, and the estimate
was optimistic by a wide margin:

| | chars | real tokens |
|---|---|---|
| index (kosher on) | 255,516 | ~124,000 |
| detail block, before the char cap | 86,633 | ~42,000 |
| **whole worst-case prompt, before** | 430,510 | **207,822 - OVER the 200k window** |
| **whole worst-case prompt, after** | 381,128 | **181,967 (91.0%)** |

Measured ratio on the real mix: **0.48 tokens/char**, not the ~0.35 the older
arithmetic assumes. So the index at 255,516 chars is ~124k tokens on its own,
where the table below would predict ~85k.

**The practical consequence: there is about 18,000 tokens of slack in total, and
the ceiling that matters is no longer the 280,000-char guardrail but the window.**
`src/lib/server/groundingBudget.test.ts` asserts the sum and fails if it is
crossed; when it fails, lower `MAX_DETAIL_CHARS` or shrink the index - **do not
raise the number in the test.** The index-format lever below has already been
spent (the tuple form shipped 2026-09-18).

**280,000 is close to the real limit, and the arithmetic is why.** The table below
is the 2026-07-29 estimate and is kept because its conclusion still holds - but it
under-counts, per the measured figures above. Treat it as the shape of the argument
and `groundingBudget.test.ts` as the number. Measured 2026-07-29 at 241,002 chars,
the index is ~78k-89k tokens. Adding the other blocks at their own worst case -
detail ~28k, history ~45k, trip ~6k, system and tools ~6k - puts a worst-case
request at roughly **165k-177k of the 200k window**. Scaling that:

| ceiling | worst-case prompt | headroom |
|---|---|---|
| 260,000 | ~165k-177k | ~23k |
| **280,000** | ~171k-185k | **~15k** |
| 300,000 | ~178k-192k | ~8k |
| 340,000 | ~191k-206k | **negative** |

So **do not raise this past 300,000 without changing something structural.** The
failure mode is not gradual: entry (e) records a real 408k-token request that failed
identically on every subsequent turn forever, because history only grows.

**The lever that actually creates room is the index FORMAT, not the ceiling.**
`buildGroundingIndex()` serialises each place as a JSON object, so the keys
`"id":"name":"category":"tags":"priceLevel":"mustSee":"durationMin":` repeat 1,768
times. Measured 2026-07-29: re-encoding the identical information as tuples with a
one-line legend gives **132,184 chars instead of 241,002 - a 45% saving, about
107,000 chars, room for ~975 more entries at zero cost to the context window.**
That is four times what any safe ceiling raise buys.

It was NOT shipped, deliberately: the index is the single most load-bearing block in
the prompt, the change alters how the model reads every place id, and there is no
`ANTHROPIC_API_KEY` in the authoring sandbox to verify the model still uses it
correctly. Losing that would break the core product silently. It is offline-provable
that no information is lost (assert every id and name survives); what cannot be
proven from here is the model's behaviour. **Whoever has a live key should do this
before raising the ceiling again.**

**The compaction SHIPPED on 2026-09-18** (`buildGroundingIndex`, format `tuple`,
rollback `GROUNDING_INDEX_FORMAT=json`): the object index measured 278,944 chars
at 2,086 places, the tuple index 158,055 - a 43% saving, lossless by test
(`groundingIndexFormat.test.ts`). The ceiling stays 280,000 chars **of the tuple
form**, i.e. roughly 3,700 places. What was NOT verified is the model reading the
tuple layout live; the first real chat after deploy is that check, and the env
switch is the answer if it fails. Itinerary days and photos stay outside the index.
Measured 2026-09-18 at close, 3,116 places: **236,463 chars (kosher on) - headroom
~44,000, about 550 places at the measured ~78 chars per tuple.**

The index does NOT serialize photo URLs, so **photo work costs zero budget**. Verify
with `/tmp/measure.mjs`-style measurement before quoting any new figure.

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
- **Never hand-build a PostgREST query string.** Every filter goes through
  `src/lib/server/pgrest.ts` (`eq`/`gte`/`pgIn`/`pgSelect`/`pgQuery`), which
  encodes values and validates identifiers; table, function and uuid names that
  land in a URL path go through `pgIdent`/`pgUuid`. A test scans the whole of
  `src/` and fails on a raw `col=eq.${...}`, so a reintroduction cannot ship
  quietly. Note `encodeURIComponent` alone is NOT enough - it leaves `!'()*`,
  and `(`, `)` and `*` are syntax to PostgREST.
- **Any new SQL function must be `security definer` + `set search_path = public`
  and must never build SQL by concatenation** (no `EXECUTE ... || param`; use
  `format` with `%I`/`%L` if dynamic SQL ever becomes unavoidable). The three
  existing functions - `redeem_promo`, `find_traveler_by_email`, `bump_usage` -
  follow this and are parameterised throughout.
- **Anything `position: fixed` rendered inside the `<header>` must be
  portalled to `document.body`.** The header carries `backdrop-blur`, and
  `backdrop-filter` creates a containing block, so `fixed inset-0` is
  measured against the header instead of the screen (measured: 360x74
  instead of 360x740). The same trap comes from `transform`, `filter` and
  `contain` - `.rise-in` keeps its final transform forever, which is how
  `TripWorkspace`'s mobile chat bar first hit it. `AccountButton` and
  `SiteSearch` both use `createPortal`; copy that, don't re-derive it.

## Success metrics to design toward

First-time visitor is in conversation within a minute, has a believable
mapped itinerary within five. The agent honors any preference combination
using only real data. A trip built in chat and a trip built in the planner
are the same object - one trip, two interfaces. Every recommendation can
eventually carry a booking action that feels like help, not advertising.

## Session log

The log lives in `docs/session-log/<year-month>.md` - it is the record of what
was built and why, and it is **not** loaded into context automatically. Read a
month's file when you need the history of a decision; append to the current
month's file at the end of every session (hard rule 8).

- `docs/session-log/2026-07.md` - 142 entries
- `docs/session-log/2026-08.md` - 38 entries
- `docs/session-log/2026-09.md` - 25 entries

205 entries total, moved out of this file on 2026-09-27.

**A caveat worth keeping**, because the log contradicts itself in places: an
entry records what was true when it was written. Several were superseded by a
later entry (the photo-width diagnosis, the premium quota arithmetic, the
index-format ceiling). The `## Grounding index budget` section above is
authoritative over any session-log figure, and a number in an old entry should
be re-measured rather than trusted.
