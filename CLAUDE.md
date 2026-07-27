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
  neutral placeholder, never an invented theme. **Preferences UI:** the
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
- `src/data/destinations.ts` - curated content: 127 destinations across
  62 countries, ~1,100 places (Hebrew), each referencing its country via
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

### 2026-07-27 (c) - "The AI is very broken. Rethink it." It was boxed in, not malfunctioning

Netanel sent a screenshot where the agent, asked to build days 1-2 around his
Bratislava hotel, replied **"המערכת לא מאפשרת לי להכניס אטרקציות של ברטיסלבה
לתוך ימים אלה"**, offered to wipe and rebuild the whole trip, showed
"✓ עדכנתי הערות ליום 1 / ליום 2" as its accomplishment, and then died on "כן"
with "אופס, משהו השתבש". Two crash fixes had already shipped today and the
product still failed at the same request. He was right to ask for a rethink.

**The agent was telling the truth.** Days are pinned to a city;
`set_day_places` rejects any place that does not belong to that day's city; and
there was **no tool to change a day's city and no tool to reorder days**. So
"days 1-2 in Bratislava instead of the Tatras" had exactly one legal path -
`create_trip_full`, which wipes the trip and rebuilds it, which the prompt
(correctly) gates behind a confirmation. Editing notes was the only legal action
left, so that is what it did. Every symptom in that screenshot follows from one
missing capability.

**Two new tools.** `set_day_city` moves an existing day to another city; its
stops belong to the old city so they are cleared, the tool result names exactly
which ones (Netanel's call: clear and say so) and demands `set_day_places` in
the same turn so no day is left empty. `move_day` reorders days, stops
travelling with them, nothing lost. Neither is destructive and neither needs
confirmation.

**`citySlugs` is now derived from day order**, not accumulated in insertion
order. This is not cosmetic: `citySlugs` drives the inter-city travel legs, the
route summary and the booking city picker, so a restructure that fixed the days
while leaving that array stale would have shown a correct itinerary attached to
a wrong route.

**Second bug, on the exact path the old flow forced.** `stop_reason:
'max_tokens'` is not `'tool_use'`, so the loop just broke - **a tool call
truncated mid-JSON was dropped in complete silence**: no error, no retry,
nothing rendered. A whole-trip rebuild is the largest JSON the model ever
emits, against a 2048-token cap, in Hebrew, which is token-expensive. It now
gets one corrective nudge to split the work into smaller calls, with a 4096
ceiling while it does.

**Third bug, and the reason all of this reads as "the AI is broken."**
`useTripChat` threw on any non-ok response into an empty `catch {}`, so **HTTP
429 rendered as "אופס, משהו השתבש. נסו שוב"** - a message that invites another
tap, which extends the rate limit. Free plan is 6 requests/minute and he had
been tapping repeatedly. Failures now name the real cause (rate limit with the
wait time from `Retry-After`, payload too large, server, network) and the error
is logged instead of swallowed - the same `catch {}` sin the server had.

**43 tests**, including his exact scenario end to end: both days move to
Bratislava, get refilled, the trip id is unchanged and Vienna is untouched. One
test earned its keep immediately by catching me inventing place ids in my own
fixture (`hta-` instead of the real `tat-`) - `placeName` had been silently
falling back to the raw id in the message the model reads.

**NOT VERIFIED, and it matters given this session's record.** Whether the model
actually reaches for `set_day_city` rather than offering a rebuild is prompt
behaviour, and the device bridge disconnected before the live replay could run,
so the API key could not be re-staged. Everything deterministic is covered by
tests; the choice is on trust. First real check is the deployed site with his
own Slovakia trip.

**The pattern worth carrying out of today.** Three sessions in a row I fixed
the failure I could see - the error message, then the retry classifier, then
the 400 - and the user's actual request kept failing. The question that would
have short-circuited all of it: *is there any legal sequence of tool calls that
satisfies this request?* When the answer is no, no amount of error handling is
the bug.


### 2026-07-27 (b) - The real crash: a blank user message, and a 400 no retry could survive

Netanel sent three more screenshots from production, timestamped 49 minutes
after this morning's deploy, so they are running the fixed code. Two findings.

**The turn failure was NOT the overload path fixed earlier today.** He tapped
the quick-reply chip "כרגע רק המלון הזה, תבנה את התכניות לפיו" and got
"משהו השתבש" - then tapped again and got the identical failure. Failing twice
identically means deterministic, which rules out 429/529 and rules out the
retry being the answer.

**Root cause, reproduced against the live API rather than inferred.** He
attached the booking screenshot with **no accompanying text**, so that message
was stored with `content: ''`. The client sends an image only on the last two
messages (images are expensive and the entire history is resent every turn),
so two turns later the message went out with no image and no text. Anthropic
rejects the whole request:

    400 invalid_request_error
    "messages.2: user messages must have non-empty content"

400 is correctly classified non-transient, so the retry could never help and
every tap failed the same way. **This is also what killed the original
"amnesia" turn in the first screenshots** - `4f24672` fixed the *message* that
failure produced, and this morning's work fixed a *different* failure path
that was also real. Neither touched this.

Three behaviours were measured against the real API instead of assumed:
- blank or whitespace-only **user** content → 400
- blank **assistant** content → 200, accepted
- **consecutive same-role** messages → 200, no alternation requirement

The third is what makes the fix small: a message carrying neither text nor
image is dropped outright, and the remaining sequence is still legal.

**Dropped, deliberately, rather than back-filled with "צירפתי תמונה".** Once
the image is no longer being sent, telling the model there is an attachment
invites it to discuss a document it cannot see - which is exactly how invented
booking details get produced. The agent's own reply from that turn stays in
history, so whatever it genuinely read off the confirmation survives **in its
own words**, with no pretence of re-reading it.

`sanitizeMessages` moved to `src/lib/server/chatMessages.ts` (a route handler
cannot export helpers, and this needed tests) with 11 tests, including the
exact production message array as a regression. An empty history after
sanitizing now returns a Hebrew message instead of a guaranteed 400.

**A divergence found while writing the tests, worth knowing.** The client
strips images **positionally** (the last two messages, `useTripChat`), while
the server keeps the last two messages **that have images**. The server rule
is the more permissive of the two, and the client strips first, so nothing is
broken - but a fixture written against the server rule does not reproduce what
production actually sends. The test comment records this.

**Verified:** `tsc` clean, `npm run build` clean, 34/34 tests, lint unchanged
at the pre-existing 29 problems / 25 errors with no hits in the touched files.
The failing conversation was replayed end to end through `/api/chat` against
the real model with Netanel's key: before the fix that exact message array is a
guaranteed 400, after it the turn completes and answers sensibly.

**Still not fixed, second finding.** The same screenshots show
"המלון נמצא ממש על גדת הדנובה, במרחק הליכה מהעיר העתיקה" - an uncaveated
location claim plus a walking-distance claim, in a conversation where no pin
existed yet so there were no real distances to quote. The caveat rule and the
air-distance numbers both hold when a located pin exists (verified live four
times this morning); neither engages before `add_pin` has run. Closing that
means having the agent decline to characterise a hotel it has not yet pinned,
or pinning earlier. Left for a decision rather than a fifth prompt round.


### 2026-07-27 (המשך) - כל היעדים מקבלים תמונת נושא, ומסלולים שהיו חסרים

הבאג של התמונות החסרות היה קיים בשתי רמות. הרמה התחתונה (תמונות ממוזערות של
מקומות) תוקנה קודם ב-`PlaceThumb.tsx`. הרמה העליונה התגלתה בביקורת שלמות
תוכן: **84 מתוך 131 יעדים לא היו להם לא `photo` ולא `iconicLandmark`**, כלומר
הכרטיס בעמוד הבית וגם באנר הכותרת נפלו לגרדיאנט אפור. זה נסגר עכשיו והמספר
הוא אפס.

הפתרון לא דרש רשת בכלל, וזה העיקר. לכל אחד מ-84 היעדים כבר היה לפחות מקום אחד
עם תמונת Commons מאומתת, והנתיב של התמונה הממוזערת ב-Commons הוא פונקציה
טהורה של שם הקובץ. לכן גרסת ה-960px של הכותרת נגזרת מה-500px הקיים בהחלפת
מקטע הרוחב בלבד. שום כתובת לא נוחשה ושום עובדה לא הומצאה: ה-`blurb` נלקח
מהמשפט הראשון של התיאור של אותו מקום, שכבר עבר אימות בזמנו.

**הבחירה האוטומטית הייתה "הדירוג הגבוה ביותר מבין mustSee בקטגוריות נוף",
ובשלושה מקרים היא הייתה שגויה עורכית ולא טכנית.** וילנה בחרה את פונאר, אתר
ההנצחה ליהודי וילנה שנרצחו ביערות. פנום פן בחרה את טואול סלנג, מוזיאון רצח
העם. שני המקומות נשארים בקטלוג כי הם חשובים, אבל כרטיס שכותרתו "הפלא המסמל
את העיר" הוא לא המקום שלהם. מרקש בחרה את מדרסת בן יוסף במקום ג׳מאע אל פנא,
שזה פשוט לא הסמל של העיר. שלושתם הוחלפו ידנית. מוסטר נשארה על באשצ׳רשייה כי
לגשר העתיק עצמו אין תמונה בקטלוג, ואני לא מביא תמונה בעיוורון.

**הוולידטור הורחב** ל-`photo` ו-`iconicLandmark.photo` ברמת היעד. עד עכשיו הוא
בדק רישוי ורוחב רק על תמונות של מקומות, מה שהיה סביר כשכמעט אף יעד לא השתמש
בשדות האלה, ומפסיק להיות סביר כש-131 יעדים משתמשים בהם.

**ברטיסלבה ואתונה** נשאו 20 ו-21 מקומות מתוחקרים אבל רק שני ימי מסלול, כך שרוב
המחקר לא הופיע במסלול המוצע. ברטיסלבה עברה לארבעה ימים ואתונה לחמישה, רק מתוך
מקומות שכבר קיימים. הפיצול גם מתקן ערבוב: אתר החת״ם סופר חלק יום עם טירה ועם
אתר טבע, והוא עבר עכשיו ליום עם בית הכנסת ברחוב היידוקובה והמוזיאון לתרבות
יהודית, שזה מה שנשאר מפרסבורג היהודית.

**חמישה מקומות נשלחו בלי `tags` בכלל**, כלומר כל סינון תגיות בממשק הסתיר אותם
בשקט. תוקן. ושוב, בפעם הרביעית: `'shopping'` הוא `PlaceCategory` חוקי אבל
**לא** `PlaceTag` חוקי. לקרוא את `src/lib/types.ts:16-23` לפני כל תג.

**מה נחסם.** dbpedia נפל באמצע הריצה ולא חזר: 502 או read timeout על כל בקשה,
כולל דרך `/sparql`. ניסיתי שני מקורות חלופיים ושניהם חסומים ב-WebFetch עם
"cache-only": `www.wikidata.org/w/api.php` ו-`query.wikidata.org/sparql`. לכן
הבאג היחיד שנשאר בוולידטור, `samarkand/uzb-aral` עם קואורדינטה עגולה 45,60,
עדיין פתוח. **לא לתקן אותו בניחוש.**

**ממצא ביקורת שנבדק ונדחה במכוון.** 134 מקומות עם תיאור מתחת ל-100 תווים סומנו
בביקורת קודמת כפער. קראתי את הארבעים הקצרים ביותר והם צפופים, מדויקים ושימושיים
("תצפית בצורת חללית על גשר SNP מעל הדנובה. הכי יפה בשקיעה."). להאריך אותם זה
להוסיף רעש ולהזמין המצאת עובדות. זה לא פער, וכדאי שהסשן הבא לא יפתח את זה שוב.

היקף אחרי הריצה: 131 יעדים, 64 מדינות, 1,149 מקומות, אינדקס ההשענה 163,889
תווים מול תקרה של ~190,000, כלומר כ-20 יעדים של מרווח.

### 2026-07-27 - מרקש, טורס דל פאינה, והודו נכנסת לקטלוג

שלוש כניסות חדשות לקטלוג בריצה אחת, וכולן נבנו מול אותה מגבלה: אין יציאה
לרשת מה-bash בסביבה הזאת, ו-nominatim, photon ו-wikipedia REST כולם חסומים
ל-WebFetch. המקור היחיד שעובד הוא `https://dbpedia.org/data/<Article>.json`.

**רף הקבלה שנשמר בקפדנות.** קואורדינטה מתקבלת רק בדיוק עשרוני אמיתי. ערך
בשלמות מעלה נדחה - למשל -51/-73 של הפארק עצמו בטורס דל פאינה, או -50/-74 של
ברנרדו אוהיגינס - כי טעות כזאת היא עשרות קילומטרים על המפה. כשאין קואורדינטה
מפורסמת, המקום פשוט לא נכנס. אף ערך לא הוערך בניחוש.

**מה נדחה בפועל.** בצ׳ילה: הפארק עצמו, ברנרדו אוהיגינס, מערת המילודון
וקוארנוס דל פאינה. במרוקו: גני מנארה, מוזיאון מרקש והערך של המלאח. בהודו:
מתחם הצוגלגחנג, מניקרן, מקדש הדימבה דווי, דהרמסלה ונאגר. כל דחייה כתובה
בהודעת הקומיט כדי שהחוסר ייראה כהחלטה ולא כפספוס.

**מלכודת ה-redirect.** `Cordillera_del_Paine` מחזיר רק `wikiPageRedirects`
בלי שום דאטה. מעקב מפורש אחרי היעד `Cordillera_Paine` החזיר
-50.998890/-73.095276, וזה מה שהציל את היעד כולו אחרי שהפארק עצמו נדחה.

**פריז עדיין חסומה, ונבדקה מחדש ולא הונחה.** סנט שאפל, אופרה גרנייה, פר
לשז, פלאס דה ווז׳ והפנתיאון החזירו קואורדינטות טובות. מגדל אייפל, סקרה קר
ומוזיאון ד׳אורסיי עדיין מחזירים NONE כי הערך גדול מדי ונחתך לפני הגאו. לא
נכון לפרסם דף פריז בלי שני סמלי העיר, אז החסימה ב-TODO נשארת בתוקף.

**כפילות שנמנעה.** פריטו מורנו ואל קלפטה נשלפו בהצלחה, ואז grep הראה
ש-`patagonia-south` בארגנטינה כבר מכיל את שניהם. נזרקו במקום להיכפל.

**תמונות בלי רשת.** dbpedia מחזיר `Special:FilePath/<file>?width=300`, וזה גם
לא הקונבנציה של הריפו וגם 300 אינו רוחב מותר (רק 250/330/500/960). ההמרה
נעשית מקומית: MD5 של שם הקובץ ב-UTF-8, ואז
`.../thumb/<h[0]>/<h[0:2]>/<enc>/500px-<enc>`. כך נוצרו כתובות תקינות ל-24
המקומות החדשים בלי אף בקשת רשת.

**מה לא נבדק.** אף אחת מכתובות התמונה החדשות לא אומתה מול השרת, כי אין
יציאה לרשת. `scripts/verify-photos.mjs` יחזיר כאן 403 על הכול עם קאש ריק,
וזה אומר שהסביבה חסומה - לא שהתמונות נשברו. צריך להריץ אותו מרשת רגילה.

**טעות שחזרה על עצמה שלוש פעמים.** כתבתי `'shopping'` כתגית מקום, וזה פשוט
לא קיים. `PlaceTag` הוא איחוד סגור ב-`src/lib/types.ts` שורות 16-23:
families, nightlife, romantic, history, art, foodie, outdoors. אין shopping
ואין family ביחיד. המסקנה המעשית: לקרוא את הטיפוס לפני כתיבת בלוק מקומות,
לא אחרי ש-tsc צועק.

**קנה מידה אחרי הריצה.** 130 יעדים, 63 מדינות, 1,138 מקומות, ואינדקס הביסוס
עומד על 162,304 תווים מול תקרה של כ-190,000. יעד שלם מוסיף רק כ-1,310 תווים
לאינדקס, כי האינדקס נושא תקצירים ולא טקסט מלא, כך שנשארו בערך 20 יעדים של
מרווח. למדוד עם `node /tmp/measure.mjs` כל כמה אצוות.

### 2026-07-27 - Why a live turn died, and why the agent kept inventing distances

Netanel sent three screenshots of one real conversation on tiyul-plus.vercel.app:
he asked to put his hotel on the map, attached the booking confirmation, the
agent added the pin and described where the hotel is as plain fact - and then
the next message ("תערוך את הטיול לפי בית המלון") came back as the first-time
greeting that lists every country. Three separate problems, diagnosed
separately.

**1. The greeting was already fixed; the crash behind it was not.** The
amnesia reply is the keyless rule-based responder, reachable only from the
`runAgent` catch block, and `4f24672` had already stopped that - committed
06:06 UTC, five minutes after the screenshots at 06:01 UTC. But that commit
only changed the message. The reason the turn failed was untouched:
`runClaudeTurn` threw `new Error('anthropic ${status}')`, so the code lived
only inside the message string, and `isTransient` checked `err.status` (absent)
and then a word list containing no digits. **Every 429 and 5xx from Anthropic
was therefore classified as permanent and the single retry never ran once.**
Fixed with an `AnthropicHttpError` carrying `status`; `isTransient` moved to
`src/lib/server/transient.ts` and now reads the status from the object, from
`TimeoutError`/`AbortError`, or from digits in the text.

Also: a turn that failed *after* text had streamed sent nothing at all, so the
reply just stopped mid-sentence. It now appends a short honest note.

**2. Invented proximity - the part that took four live runs.** Netanel's
decision was that orientation about your own hotel is allowed *with* an
unverified caveat, like kosher supervision. The caveat itself landed on the
first try. What would not die was proximity: two rounds of explicit prompt
bans still produced "צמוד לגשר ה-UFO", "הכול במרחק הליכה מהמלון", and wrote
"הכול במרחק הליכה" into the *saved day notes*.

The framing was wrong. The model invented because it wanted to say something
useful and had no real number - **and we have the number.** Pins carry lat/lng,
every catalog place carries lat/lng, and `haversineKm` was already exported
from `travel.ts`. `pinDistances()` (in `agent.ts`, exported and tested) returns
true distances from the pin to that city's stops in the trip, labelled
`אווירי` because straight-line is not walking distance and we have no road
network. They ride in the `add_pin` tool result **and** in `serializeTripForModel`
every turn - that second part matters, because the worst leak happened in a
later turn with no `add_pin` call, where the model had nothing real in hand.
The prompt now says quote these numbers and nothing else. Live result: "350 מ׳
אווירי מהעיר העתיקה" instead of a guess.

**3. A correction I owe the record.** While testing I reported "לדווין תגיעו
באוטובוס 29" to Netanel as a fabrication and wrote a prompt rule using it as
the bad example. It is not a fabrication - Bratislava's own
`practical.gettingAround` says "לדווין - אוטובוס 29". My own test failed and
that is how I found out. The rule was rewritten to say the opposite: transit
numbers in the DATA should be used confidently, and only ones absent from it
are inventions (the "כרבע שעה נסיעה" it added alongside was one). There is now
a regression test asserting bus 29 survives.

`sanitizeDayNote()` enforces this on data rather than prose: a transit line
number in a day note is stripped unless it appears in that destination's
`gettingAround`, and the tool result tells the model why - the same
correct-quietly-and-explain pattern as `filterKosherUnlessOptedIn`. Notes are
trip data: they print, they share, they get re-read.

**Testing infrastructure, because there was none.** `npm test` now runs
`node:test` over `src/**/*.test.ts` with **zero new dependencies** (vitest/jest
would need approval per hard rule 6). Two things blocked it, both
tsconfig-to-bundler contracts Node cannot see: the `@/` alias and
extensionless relative imports. A resolve hook in `scripts/alias-hooks.mjs`
handles both. It is registered *by path*, not as a `data:` URL that imports its
own helper - that first version recursed through itself and blew the call
stack. `allowImportingTsExtensions` added to tsconfig; safe under `noEmit`, and
Next never sees the test files. **23 tests, all passing.** This also unblocks
the `geocode.ts` unit test that has been on the backlog.

**Verified:** `tsc` clean, `npm run build` clean, 23/23 tests, lint unchanged at
the pre-existing 29 problems / 25 errors with zero hits in the touched files.
Four full replays of the hotel conversation against the **real Sonnet** with
Netanel's key (his explicit go-ahead) and Nominatim stubbed via
`GEOCODE_NOMINATIM` - the env override finally earned its keep, since the
sandbox has no OSM egress. No amnesia greeting in any run.

**Not fixed, and worth knowing.** Soft walkability phrasing survives ("ממש
ליד", "התחלה רגלית") - it now sits on top of true numbers rather than
replacing them, so it was left rather than chased with a fifth prompt round.
The retry path itself is covered only by unit tests: the Anthropic base URL is
hardcoded, so there is no way to force a 529 end-to-end without making it
env-overridable, which would be the honest next step. No data files were
touched, so `verify-photos.mjs` was not run (and remains blocked from this
sandbox).


### 2026-07-27 - תמונה חסרה שלא מתחזה לתמונה, וטורס דל פאינה

**הבאג של התמונות החסרות.** נטנאל דיווח על "באג עם תמונות חסרות", וזה
היה יכול להיות שני דברים שונים לגמרי: כתובות שבורות, או כרטיסים בלי
תמונה בכלל. במקום לנחש כתבתי קודם ולידטור אופליין שפירק את כל 1,076
כתובות התמונה בקטלוג ובדק את מקטע ה-thumb, את הרוחב המותר ואת ההתאמה
בין שם הקובץ המקורי לשם התמונה הממוזערת. הוא מצא אפס בעיות, מה שפסל
את האפשרות של דאטה שבורה והצביע על הרינדור. רק אז שאלתי, ונטנאל אישר:
כרטיסים בלי שום תמונה.

התיקון הוא `src/components/PlaceThumb.tsx`, רכיב אחד שמשמש גם את דף
היעד וגם את החלונית במפה. כשיש תמונה הוא מציג אותה, וכשאין, או כשהיא
נכשלת בטעינה דרך `onError`, הוא מציג ריבוע בצבע הקטגוריה עם האימוג׳י
שלה. שתי החלטות ערכיות כאן: לא המצאנו תמונות עבור 117 המקומות
החסרים, כי רובם מסעדות כשרות, בתי חב״ד, שווקים ובתי כנסת קטנים שפשוט
אין להם תצלום ברישיון חופשי בוויקישיתוף, ושם הנגישות של הריבוע הוא
**הקטגוריה ולא שם המקום**, כדי שהוא לא יתחזה לתצלום של המקום.

**טורס דל פאינה.** צ׳ילה החזיקה עד היום יעד אחד בלבד, אטקמה. הוספתי
יעד שני עם שמונה מקומות בפטגוניה הצ׳ילאנית. כל קואורדינטה נלקחה
מ-dbpedia, שהוא המקור היחיד שעדיין נגיש כאן: ויקיפדיה, נומינטים
ופוטון כולם חסומים, ולבאש אין בכלל יציאה לרשת.

מה שנדחה חשוב לא פחות ממה שנכנס. הערך של הפארק הלאומי עצמו מחזיק
-51/-73, מעלות שלמות, שזה טווח שגיאה של עשרות קילומטרים; ברנרדו
או׳היגינס מחזיק -50/-74 באותה בעיה; ל-Cueva del Milodón ול-Cuernos
del Paine אין קואורדינטות בכלל. כולם נשארו בחוץ. **אף קואורדינטה
כאן לא הוערכה.** במקום ערך הפארק השתמשתי ב-Cordillera Paine, שמחזיק
-50.998890/-73.095276 בדיוק אמיתי ומכסה בדיוק את אותו מסיב.

עוד מלכודת: dbpedia מחזיר תמונות בצורת
`Special:FilePath/<file>?width=300`, שזו לא המוסכמה של הריפו ו-300
הוא לא רוחב חוקי. כל אחת הומרה ל-`upload.wikimedia.org/.../thumb/...`
ברוחב 500, כשהתיקייה מחושבת מ-MD5 של שם הקובץ מקומית, בלי רשת.

**מדד ההקשר.** אינדקס ההיצמדות עומד כעת על 159,968 תווים מול תקרה של
כ-190,000. 128 יעדים, 62 מדינות, 1,122 מקומות. נשאר מקום לכ-25 יעדים
נוספים, ואז צריך לחשוב מחדש על המבנה ולא רק להוסיף.

**מה לא נבדק.** התמונות החדשות לא אומתו מול השרת, כי אין יציאה לרשת
מהסביבה הזאת. `verify-photos.mjs` יחזיר 403 על הכל וזה לא אומר כלום.
הכתובות נבנו לפי אלגוריתם ידוע ולא לפי בדיקה חיה. מסלול ה-geocode
עדיין חסר בדיקה אוטומטית ומעולם לא רץ באמת.

### 2026-07-26 (d) - 493 photos filled, and 16 destinations that were rendering in English

**Photos: 610 missing to 117.** The tooling from entry (c) was pointed at
dbpedia instead of the blocked Wikimedia APIs, and that turned out to be the
whole unlock. `https://dbpedia.org/data/<Article>.json` IS reachable from the
sandbox (the Commons and Wikipedia APIs are not, and dbpedia's SPARQL endpoint
is 403 through the proxy - only the per-article JSON works). Each article's
`dbo:thumbnail` is the Wikipedia lead image, which is a far better guarantee of
the right subject than a Commons text search.

**The piece that made it possible without network access to the images:**
`scripts/lib/commons-url.mjs` builds the `upload.wikimedia.org` thumb URL from
the filename alone. The Commons path is `md5(filename_with_underscores)`, first
hex char / first two hex chars. This was validated against the 611 URLs already
in the data, all of which had been verified online in earlier sessions: **609
reproduced byte for byte.** The two misses were SVGs, which need an extra
`.png` suffix and are excluded anyway (an SVG in this data is almost always a
logo, flag or map). Note `encodeURIComponent` alone is not enough - MediaWiki
also percent-encodes `! ' ( ) *`.

**Subject correctness was enforced geographically, not by search rank.** Every
candidate article's own `geo:lat`/`geo:long` was compared against the
coordinates already in `destinations.ts`; 12 km accepts, 60 km rejects. Across
the 493 applied photos the **median distance was 0.0 km and the maximum 0.9
km**, which is about as strong a signal as this method can give. That is the
direct fix for the Abu Dhabi batch-2 lesson (top Commons hit was a recycling
bin, a chocolate counter and a lobby wall).

**Throughput:** six parallel subagents, one per shard of destinations, each
resolving titles and calling WebFetch, writing TSV to `/tmp/outN.tsv`. 455 of
the 571 they attempted resolved. They were told explicitly never to reconstruct
a filename from memory - only to report what WebFetch returned - because a
fabricated filename produces a dead URL that no geo-check can catch.

**The 117 still missing are the honest floor** for this approach: they are
almost entirely restaurants, cafes, Chabad houses, kosher shops and named
beaches, none of which have a Wikipedia article. Filling those needs a
different source, or nothing.

**Do NOT run prettier on `src/data/destinations.ts`.** There is no prettier
config in the repo and the default is double quotes, so a single run rewrote
13,470 lines of single-quoted strings. `apply-photos.mjs` already emits the
exact existing format (`photo:` on its own line, URL indented beneath), so no
formatting pass is needed; the misleading hint has been removed from the
script.

**Second fix, from a screenshot Netanel sent: a card reading "Zanzibar and the
Swahili Coast" in English.** 16 destinations added in the 2026-07-26 overnight
expansions had `name` and `nameLocal` **swapped** - the Latin name sat in
`name`, which is what every card, day tab, map popup and chat reply renders,
and the Hebrew sat in `nameLocal`, whose entire purpose is to be the Latin
string you hand a taxi driver or paste into Google Maps. 122 entries across
finnish-lakeland, west-estonia-islands, kurzeme-zemgale, western-lithuania,
northern-bulgaria, lori-tavush, oaxaca, fergana-valley, lumbini-terai,
zanzibar-swahili-coast, malaysian-borneo, bali-lesser-sunda, western-serbia,
bosanska-krajina, northern-albania and seoul-dmz.

Fixed by **swapping the two fields, not by retranslating** - the original
author's Hebrew wording was already there and correct, it was just in the wrong
field. An initial attempt overwrote `name` with fresh translations and left
`nameLocal` in Hebrew, which would have silently broken the maps/taxi use case;
that was reverted. Also decoded vojvodina's 30 `\uXXXX` string escapes to
literal Hebrew, and retitled one Tasmanian day from `MONA` to `מוזיאון מונה`.

**Audit worth re-running after any bulk content import:** flag any `name`,
`tagline`, `title` or `verdict` with no Hebrew characters, and any `nameLocal`
with no Latin characters. Both directions matter - this bug was only visible
from the second check.

**State:** 127 destinations / 62 countries / 1,114 places, 997 with photos.
`tsc` clean, `npm run build` clean (208 static pages). Grounding index measured
with the real data at **158,905 chars (~44k tokens)** against the ~190,000
stop threshold, so roughly **25 destinations of headroom** remain. Measure with
`node --experimental-strip-types` importing the data directly - a regex
reconstruction under-counts by ~45%.

### 2026-07-26 (c) - Photo tooling split in two, and a handoff for a parallel features session

Netanel asked to fill the missing place photos and then resume catalog
expansion, and separately asked for a handoff so a second chat could work on
features while this one owns the data.

**The blocker, measured rather than assumed.** The cloud sandbox's egress
proxy answers `403` to the CONNECT for every Wikimedia host, and WebFetch
reports `commons.wikimedia.org` as cache-only. The same is true of
OpenStreetMap, Unsplash, Pexels and Google. `WebSearch` and ordinary
`WebFetch` still work, so research is possible but **no image URL can be
verified from here**. Hard rule 2 forbids writing one anyway, so the work was
restructured instead of downgraded.

**Built: `scripts/fetch-photos.mjs` + `scripts/apply-photos.mjs` +
`scripts/lib/parse-places.mjs`.** The split is the point. `fetch-photos`
requires a network, runs on Netanel's machine, and writes only
`photo-report.json` - it never edits data. `apply-photos` requires no network,
runs wherever the repo lives, and is the only thing that writes
`destinations.ts`. `parse-places` is a shared indentation-based parser (no
tsc, no path aliases, no executing the data file).

**How subject correctness is enforced.** Not by search rank - that is exactly
what produced the wrong-subject photos in the Abu Dhabi batch. For each place
the script asks the English Wikipedia for up to 8 candidates, takes each
article's *lead* image, and compares the article's own coordinates against the
coordinates already in `destinations.ts`. Within 12 km is `ok`; 12-60 km is
`review` and is never applied without `--include-review`; beyond that it is
rejected with the distance recorded in the report. Filenames matching
flag/map/logo/coat-of-arms are dropped regardless of distance, and every
surviving URL must return HTTP 200 with an `image/*` content type. Places with
no coordinates in any candidate are accepted only on an exact title match, and
only as `review`.

**Real numbers, and a parser bug worth remembering.** A first crude audit said
1,114 places / 584 missing. The proper parser says **1,114 places, 504 with a
photo, 610 missing, across 110 destinations**. The first parser under-counted
because 23 places store `nameLocal` in double quotes - prettier switches quote
style when the string contains an apostrophe (`"St. Stephen's Cathedral"`) -
and the regex only matched single quotes. Any future script that greps this
data file must handle both quote styles.

**Also written: `HANDOFF-FEATURES.md`** (repo root) for the parallel session.
It fixes the file-ownership split - that session owns components, routes and
`src/lib/**`; this one owns `src/data/*` and the photo scripts - because a
610-photo diff in `destinations.ts` would conflict irrecoverably against
feature work. It also documents the rebase discipline for two sessions on one
`main`, and specifically that the `## Session log` is the one shared file that
will conflict, with "keep both entries" as the standing resolution.

**Correction to a stale handoff.** The summary this session was started from
described the pins feature as ~92% done with uncommitted work in the cloud
container. It had in fact shipped as `dfc7b36` + `a1b92c0`; the summary was
written mid-task. Nothing was rebuilt. `BookingPanel`'s per-city query, listed
there as deferred, had also already landed.

**Deferred / next session should know:** no photos have been applied yet - the
report has not been generated. The `--limit 20` trial is the right first step
before the full 610. This container has **no GitHub write credentials** by
default (anonymous fetch works; the git wrapper rewrites even an explicit
`git@github.com:` URL back to HTTPS, so SSH is not a workaround) - a token has
to be supplied per session, and a token pasted into chat should be rotated
afterwards. Catalog expansion is deliberately paused behind the photo work at
Netanel's instruction; the grounding index was last measured at ~157k of a
~190k character ceiling, leaving roughly 30 destinations of headroom.

### 2026-07-26 (b) - סיכות המטייל על המפה, עם איתור מיקום בשרת

Netanel asked for pins: "add an option to add pins like hotels (the AI
should automatically ask about those, and give affiliates if no
reservations yet). the broad idea is that when people tell the AI about
the hotel, it will be added to the map."

**שלוש החלטות מוצר שנסגרו איתו מראש:** המיקום מגיע מחיפוש בשרת מול
OpenStreetMap (חינם, בלי מפתח); סוגי הסיכות הם לינה, הזמנה (מסעדה או
פעילות) וסיכה חופשית - **שדות תעופה, תחנות ואיסוף רכב נשארו בחוץ
במכוון**; והסוכן שואל על לינה עיר אחת בכל תור, רק אחרי שיש מסלול
אמיתי, בדיוק כמו כללי ההזמנות הקיימים.

**הכנות היא הקו המרכזי של הפיצ׳ר.** `geocodePlace` מחזיר `null` במקום
לזרוק; כישלון איתור אינו כישלון של הכלי - הסיכה נשמרת ומסומנת
"מיקום לא אומת"; `sanitizePins` זורק קואורדינטות פגומות במקום להצמיד
אותן לטווח; `MapInner` מצייר רק סיכות עם מיקום; ו-`PinsPanel` מציג את
התג, את הייחוס ל-OpenStreetMap ואת הדרך להניח ידנית. **ניחוש של מרכז
העיר נפסל במפורש: מיקום שגוי גרוע ממיקום חסר.**

**ההחלטה הארכיטקטונית שנושאת את זה:** `executeAgentTool` סינכרוני,
ולכן האיתור נעשה ב-`route.ts` (הכלי האסינכרוני השני, אחרי
`explore_destination`) והתוצאה עוברת ל-executor **כפרמטר חמישי נפרד,
לא בתוך `input`**. כך אין מסלול שבו המודל מזריק קואורדינטות משלו - זה
מבני, לא סינון.

**מניעת שאלה כפולה בשתי דרכים:** `serializeTripForModel` חושף עכשיו
`pins` עם דגל `locatedOnMap`, ו-`add_pin` עם `kind='stay'` כותב גם
`booking.stay='have'` כך שכללי ההזמנות הקיימים מפסיקים להעלות לינה
לטיול הזה.

**בונוס שהיה חלק מהבקשה המקורית ("affiliates if no reservations
yet"):** `BookingPanel` חיפש עד היום לפי העיר הראשונה בלבד, מה שהחזיר
מלונות בעיר הלא נכונה בטיול רב-ערים. עכשיו יש בורר ערים והחיפוש הוא
לפי העיר שנבחרה.

**אפס תלויות חדשות** (חוק קשיח 6). tsc נקי, build עובר, lint נשאר על
אותן 29 בעיות קיימות מראש.

**מה לא נבדק:** לסביבת הפיתוח כאן אין יציאה לרשת - nominatim, photon,
wikipedia ו-wikimedia כולם מחזירים HTTP 000. הגיאוקודר נכתב עם
`GEOCODE_NOMINATIM` / `GEOCODE_PHOTON` כדי שאפשר יהיה לבדוק אותו מול
stub, אבל **אימות אמיתי יקרה רק בפרודקשן**. אין לו כרגע טסט אוטומטי.

### 2026-07-26 - Image attachments in the agent chat

Netanel asked for the ability to send an image to the AI on the site, with a
cap of a few per day: "i have booked a hotel. i want to send it to the AI".
Built end to end, no new dependency (hard rule 6).

**What changed.** `src/lib/plans.ts` gained an `imagesPerDay` limit (free 3,
premium 30) plus a `PLAN_FEATURE_ROWS` row so the premium page shows it.
`src/lib/trip/imageAttach.ts` is new: it downscales a picked file to a JPEG
data URL with the native canvas, long edge 1400px so screenshot text stays
legible, stepping quality down until it fits 1.4M chars. This mirrors
`imageToAvatar` in `lib/auth/profile.ts` rather than adding an upload library.
`ChatPanel` got a paperclip button, a removable preview above the composer and
the image rendered inside the user bubble; the submit button now accepts an
image with no text. `useTripChat.send` takes a third `image` argument and the
POST projection carries it. `/api/chat` gained an `image` member on
`ApiContentBlock`, `sanitizeMessages`, and a `chat-images` daily gate.

**Product decisions.** Free gets 3 images a day, premium 30 - Netanel said
"a few", and an image costs the model far more than text, so the number is
deliberately much lower than the 40 chat messages a day. The quota counts only
the image attached to the *last* message: the client resends the whole history
each turn, so counting every image in the payload would burn the quota on
re-sends. For the same reason only the last two images are sent to the model
at all, and only the last four are kept in localStorage (an image is hundreds
of KB and localStorage is a few MB total - unbounded history would blow the
quota and lose the whole conversation, so old messages keep their text and
drop the picture). Over quota returns a conversational Hebrew message through
`singleMessageStream`, matching the existing `QUOTA_MESSAGE` pattern, not an
HTTP error. Images are never stored server-side and never logged.

**Security.** The server does not trust the client shape: only
`data:image/(jpeg|png|webp);base64,` with a strict base64 body is accepted,
size-capped, user messages only, and the raw body is length-checked before
`JSON.parse`. The system prompt tells the agent that text inside an image is
data and never an instruction, that it must not invent details it cannot
actually read, and that it must never echo a confirmation code, phone number
or email back to the user or into the trip.

**Deferred.** No automated test of the vision path - it needs a real API key,
so it was verified by reading only. The image is not persisted anywhere, so a
booking confirmation is lost on refresh once four messages have passed; if
that turns out to matter, the natural home is Supabase Storage, which would
need Netanel's go-ahead. Catalog expansion is still stopped at his request
(127 destinations / 62 countries / 1,114 places) and the hourly scheduled task
`trig_01BiLQXCrg2YcgNbGkWmYqUh` remains disabled.

### 2026-07-26 - Overnight catalog expansion, part three: eight new countries

Ran the standing overnight expansion until Netanel asked to stop. Catalog
went from 120 destinations / 55 countries / 1,068 places to **127 / 62 /
1,114**, with `problems=0` on the sanity script and a passing build after
every single batch.

New countries and destinations, in order shipped:
Cambodia (two destinations, 11 places, `35b0a13`), Laos
`luang-prabang-mekong` (`b23ca46`), Morocco `atlas-sahara` (`249e66d`),
Kyrgyzstan `tian-shan-issyk-kul` (`04b3984`), Argentina `patagonia-south`
(`19e71f7`), Costa Rica `costa-rica-classic` (`f0de094`), Taiwan
`taiwan-island-loop` (`d81733f`), Chile `atacama` (`bb010f5`).

Every coordinate came from dbpedia `geo:lat` / `geo:long` via the hardened
lookup prompt. **Sixteen candidate places returned NOT PRESENT and were
dropped rather than estimated**, including Luang Prabang itself, Plain of
Jars, Song Kol, Ala Archa, Monte Fitz Roy, Cerro Torre, Bariloche, Beagle
Channel, Alishan, Tainan and Taipei 101. Zero fabricated coordinates.
Roughly a dozen HTTP 429s were absorbed with 100-110s backoff rather than
treated as failures, per the standing "do not stop on errors" instruction.

Decisions worth carrying forward:
- **Regional-hub strategy confirmed again.** dbpedia truncates or omits
  coordinates on very famous articles, so prefer the secondary region over
  the headline landmark. Two consecutive failures on a theme means pivot the
  whole destination.
- **Chile split deliberately.** Torres del Paine (-51, -73) and San Pedro de
  Atacama (-22.9, -68.2) are ~3,100 km apart, far past the 700 km FAR
  threshold, so they cannot share a destination. Only Atacama was built;
  a separate Chilean Patagonia destination is still open.
- **`npx tsc --noEmit` silently printed help text** instead of typechecking
  when run without an explicit `cd` into the repo. Always prefix with
  `cd /home/claude/repo-tiyul &&`. Note that the sanity script and
  `npm run build` can both pass while tsc fails, so read tsc separately.
- **Grounding-index guardrail:** measured 157,269 chars at 125 destinations
  against a ~190,000 ceiling, at roughly 900-1,000 chars per destination.
  About 30 destinations of headroom remain. Re-run `/tmp/measure.mjs` every
  few batches before adding more.

Deferred / still open:
- All 8 new countries and their places are on the TODO.md "Photos pending"
  list. The sandbox has zero egress to Wikimedia, so no image URL can be
  HTTP-verified; every entry was written with no `photo` field and no
  `iconicLandmark`.
- Blocked, do not estimate: France/Paris, Athens to Delphi, Kazakhstan's
  Kolsai and Kaindy lakes.
- The hourly "tiyul+ catalog expansion" scheduled task was disabled at
  Netanel's request when he asked to pause the database work.
- Cosmetic only: the `vojvodina` destination's Hebrew strings are stored as
  `\u05d5`-style escapes rather than raw Hebrew. Renders correctly, but is
  inconsistent with every other entry.

### 2026-07-26 - Overnight catalog expansion, part two: the Balkans and the long-haul gaps

Continuation of the same unattended run, same standing instruction. Seven
further data commits, each shipped only after a standalone `npx tsc --noEmit`,
`/tmp/sanity.mjs` problems=0 and a passing `npm run build`.

New countries and destinations, in order: Bosnia and Herzegovina with
`mostar-sarajevo` (5 places), Serbia with `vojvodina` (7), Mexico with
`yucatan` (7), South Korea with `gyeongju-busan` (7), Australia with
`tasmania` (7), Indonesia with `java` (7), Malaysia with `penang-perak` (6).
That closes every net-new country gap that was listed as outstanding at the
top of the run. State at the end: 53 countries, 72 destinations, 751 places,
grounding index 104,895 chars (~26-33k tokens), still far under the ~190,000
char stop threshold.

Coordinate discipline held. Every place was verified through
`https://dbpedia.org/data/<Article>.json` with the hardened prompt, and
anything that came back NOT PRESENT was dropped rather than estimated:
Novi Sad, Subotica, Krusedol Monastery, George Town Penang, Ipoh. Five HTTP
429s were absorbed with an 85-100s pause and a single retry, which is normal
pacing on this proxy and not a failure. Zero fabricated coordinates.

Two things worth remembering for next time. First, the regional-hub strategy
keeps paying: the famous-city articles (Novi Sad, George Town, Ipoh) are the
ones that come back without coordinates, while the surrounding sites almost
always have them, so building the destination around the region rather than
the capital routes around the problem entirely. Second, two Python gotchas
recurred: a `\\u{...}` emoji escape inside a non-raw triple-quoted string
raises `unicodeescape` inconsistently, so write flags as literal emoji
characters; and `DayPlan` has a `notes` field, not `summary`, which cost one
tsc round-trip on the Serbia batch.

Editorially, three destinations carry entry warnings that are more prominent
than usual and should not be softened: Indonesia and Malaysia both state
plainly that there are no diplomatic relations with Israel and that entry
must be verified before any booking, and Australia states that an advance
entry authorisation is mandatory. None of them names a specific visa rule,
per the no-fabrication rule.

### 2026-07-26 - Overnight catalog expansion: Jordan through the Baltics

One long unattended run under the standing instruction "add new countries,
and new places in existing countries; don't stop when encountering an error,
just go on to the next destination". Fourteen data commits, each one shipped
only after `npx tsc --noEmit` clean, `/tmp/sanity.mjs` problems=0 and
`npm run build` passing.

**Built/changed:**
- New destinations inside countries that already existed: `amman-north`
  (Jordan, 9 places), `shaki-caucasus` (Azerbaijan second destination,
  6 places), the UAE mountains-and-desert destination (5 places), and
  day-trip places bolted onto Barcelona (Costa Brava), Budapest (Danube
  Bend) and Bratislava (Devin).
- Ten net-new countries, each with one destination: `romania` /
  `transylvania` (6 places), `turkey` / `cappadocia` (6), `ireland` /
  `west-ireland` (6), `bulgaria` / `rila-pirin` (5), `sweden` / `stockholm`
  (8), `denmark` / `north-zealand` (7), `finland` / `finnish-lapland` (8),
  `lithuania` / `vilnius` (7), `estonia` / `tallinn` (6), `latvia` / `riga`
  (7).
- `TODO.md` - every new slug appended to the photos-pending bullet.

**Decisions:**
- Every single coordinate was literally read out of dbpedia
  `/data/<Article>.json`. Nothing was estimated. Sixteen candidate places
  were dropped outright because the fetched data had no `geo:lat`/`geo:long`:
  Kaymakli, Ihlara Valley, Zelve, Mustafapasa, the Burren, Sky Road, Plovdiv,
  Pirin NP, Blagoevgrad, the Stob Pyramids, Kronborg, the Karen Blixen
  Museum, the Choral Synagogue of Vilnius, Rundale Palace, Jurmala, and
  Tallinn Town Hall / Seaplane Harbour (persistent 429).
- Regional hubs beat famous capitals as destination choices, because the
  very-famous-city dbpedia articles truncate before their coordinates.
  Cappadocia over Istanbul, the west of Ireland over Dublin, Rila-Pirin over
  Sofia, North Zealand over Copenhagen. This turned four blocked countries
  into shipped ones.
- Vilnius includes `vln-paneriai` and gives it its own itinerary day, with
  an explicit note not to schedule anything after it. The Jewish-heritage
  layer in Lithuania is the reason many Israelis go, and it should not be
  buried between a castle and a cafe.
- Every `editorialRating.verdict` names real drawbacks, and every
  `kosherOverview` names no unverified venue - it points at the community or
  Chabad in the nearest major city and says to confirm by phone.
- No `photo` and no `iconicLandmark` anywhere: the sandbox still has no
  egress to Wikimedia, so no image URL can be HTTP-verified.

**State:** 45 countries, 64 destinations, 699 places. Grounding index
~98,000 chars, roughly 25-31k tokens, still well under the ~190,000-char
stop threshold.

**Next session:** remaining net-new country gaps are Albania, Serbia,
Bosnia, Mexico, Australia, South Korea, Indonesia and Malaysia.
France/Paris, Athens->Delphi and Kazakhstan->Kolsai & Kaindy all stay
blocked on coordinates - do not estimate. Expect constant WebFetch 429s:
batch 2-3 lookups, sleep 85-100s, and retry once rather than treating a 429
as a failure.

### 2026-07-25 - Netherlands + Amsterdam (overnight catalog expansion)

**Built/changed:**
- `src/data/countries.ts` - new country `netherlands` (35 countries total).
  The `payments` note carries a real gotcha: many Dutch businesses take only
  local debit/Maestro, not Visa/Mastercard credit.
- `src/data/destinations.ts` - new destination `amsterdam` (51 destinations,
  609 places), 9 places, all coordinates literally read from dbpedia
  `/data/*.json` and none estimated: Anne Frank House, Portuguese Synagogue,
  Rembrandt House, Begijnhof, Vondelpark, Zaanse Schans, Volendam,
  Keukenhof, Kinderdijk. 4-day itinerary; day 4 says explicitly that
  Keukenhof and Kinderdijk are opposite directions and are a choose-one.
- `TODO.md` - ticked Cyprus/Paphos (it shipped at `9cd6578` but the box was
  never ticked), and added the Paphos + Amsterdam slugs to photos-pending.

**Decisions:**
- Dropped for lack of coordinates in the fetched data, per hard rule 2:
  Rijksmuseum, Van Gogh Museum, Dam Square, Haarlem. For Rijksmuseum and
  Van Gogh the WebFetch summarizer volunteered coordinates from its own
  training knowledge; those were refused. Nothing was estimated.
- The Amsterdam `center` is the mean of the verified inner-city cluster,
  used only as a map viewport, because `Amsterdam.json` itself has no
  `geo:lat`/`geo:long`.
- `kosherOverview` names no venue and no supervision: it points the reader
  at the community/Chabad and at packaged hechshered goods, and says to
  confirm by phone before travelling.
- No `photo` and no `iconicLandmark` on anything - the sandbox still has no
  egress to Wikimedia, so no image URL can be HTTP-verified.

**State:** `npx tsc --noEmit` clean, `/tmp/sanity.mjs` problems=0,
`npm run build` passing. Grounding index 85,588 chars ~21-27k tokens,
comfortably under the ~50k guideline (stop threshold ~190,000 chars).

**Next session:** the open TODO queue is UAE->Hatta/Jebel Jais, Azerbaijan->
Sheki/Qabala, Kazakhstan->Kolsai & Kaindy, Jordan->Dead Sea/Jerash,
Athens->Delphi, Barcelona->Costa Brava, Budapest->Danube Bend,
Bratislava->Devin. Net-new country gaps: Turkey, Ireland, Romania,
Bulgaria, the Nordics. France/Paris stays blocked on coordinates - do not
estimate. Expect constant WebFetch 429s: batch <=4 lookups and sleep 60-90s
between batches rather than treating them as failures.

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

### 2026-07-24 (j) - Destinations cont.: Budva, Jordan (Petra), Cyprus (Larnaca)

Continued expansion (one verified city per commit). Also promoted the
"שאלון מהיר" questionnaire: it now runs a real 5-step guided flow that
builds a trip via generateTrip() and drops into the planner (QuizWizard),
and its hero entry was consolidated into one uniform pill row.

- **Budva, Montenegro** (2nd Montenegro city) - 9 places, rating 4.4.
  Landmark: Budva Old Town. Nature: Lake Skadar + Pavlova Strana bend,
  Lovćen, Mogren/Bečići beaches, Sveti Nikola island. No kosher (honest).
- **Petra & Wadi Rum, Jordan** (new `jordan` country) - 8 places, rating
  4.7. Landmark: the Treasury (Al-Khazneh). Wonders: Treasury+Siq, the
  Monastery, High Place viewpoint, Wadi Rum desert, Aqaba, Little Petra.
  Modeled as a LAND crossing (Wadi Araba/Eilat + Jordan Pass), not a
  flight. **No kosher** in southern Jordan - stated plainly.
- **Cyprus (Larnaca hub)** (new `cyprus` country, visa-free 90d) - 9
  places, rating 4.3. Landmark: Aphrodite's Rock. Nature: Cape Greco sea
  caves, Troodos Mountains, Salt Lake flamingos, Nissi Beach + Kourion/
  Kykkos. Kosher REAL: Chabad Larnaca "Shemayim" café + delivery, Chabad
  Ayia Napa (summer). Most-served TLV route, dozens daily <1h.

All: build clean, verify-photos.mjs all OK, hero/nature photos eyeballed.

**Catalog now 18 destinations / 16 countries.** Kosher-honesty maintained:
real where it exists (Cyprus, Georgia, Thailand, UAE, Baku, Almaty),
NONE-and-said-so where it doesn't (Montenegro, Jordan).

**Next candidates if resuming:** Marrakech (re-verify Morocco flights),
Batumi (2nd Georgia), Sri Lanka, Zanzibar (thin - probably skip).

### 2026-07-24 (k) - Batumi added; Marrakech skipped (unverifiable flights)

- **Batumi, Georgia** (2nd Georgian city) - 7 places, rating 4.3. Landmark:
  Batumi Boulevard. Nature: Mtirala rainforest NP, Makhuntseti waterfall,
  clifftop Botanical Garden; + Piazza old town, Gonio fortress. Kosher
  REAL: Mendi's (Chabad Batumi meat restaurant). Flights confirmed (Arkia
  ~9/wk, El Al ~8/wk, ~2h20).
- **Marrakech SKIPPED (not built):** Royal Air Maroc suspended TLV flights
  through Feb 2025 and there's no confirmed 2026 resumption - a direct-
  flight claim can't be verified, so per the no-fabrication rule it was not
  added. Revisit if/when TLV-RAK service is confirmed operating.

**Catalog now 19 destinations / 16 countries.** Next candidates if
resuming: Sri Lanka (verify charters), a 2nd Thai island, Zanzibar (thin),
or re-check Marrakech.

### 2026-07-24 (l) - Second-city / nature program: Crete + Munich

Kicked off mapping countries beyond their one big city, nature-forward
(hiking/lakes/nature), per Netanel. Audit at start: 13/16 countries had
only ONE city.

- **Crete, Greece** (2nd Greek city) - 9 places, rating 4.6. Landmark:
  Balos Lagoon. Nature: Samaria Gorge (16km hike), Balos, Elafonissi,
  Lake Kournas, Preveli palm beach + Chania/Rethymno/Knossos/Spinalonga.
  No kosher (Etz Hayyim synagogue = heritage only). Direct HER ~29/wk.
- **Munich + Bavarian Alps, Germany** (2nd German city) - 8 places, rating
  4.5. Landmark: Neuschwanstein. Nature: Zugspitze+Eibsee, Königssee,
  Partnach Gorge + Marienplatz/English Garden/Nymphenburg. Kosher REAL
  (Restaurant Einstein Glatt + Chabad). Year-round direct MUC.

Catalog now **21 destinations / 16 countries.** Countries with 2 cities:
thailand, georgia (3 incl. batumi... georgia=tbilisi+batumi=2), montenegro,
greece, germany. Still ONE city each: austria, slovakia, czechia, hungary,
italy, spain, uae, azerbaijan, kazakhstan, jordan, cyprus.

**Next nature-forward second cities to add:** Italy→Dolomites/Lake Como,
Austria→Salzburg+Hallstatt lakes, Spain→Mallorca (Serra de Tramuntana),
Czechia→Bohemian Switzerland/Český Krumlov, Hungary→Lake Balaton.

### 2026-07-25 - Second-city nature program cont.: Dolomites, Salzburg, Mallorca; TODO.md added

Continued mapping countries beyond one city (nature-forward). Added:
- **Dolomites, Italy** (2nd) - Lago di Braies, Tre Cime, Sorapis, Alpe di
  Siusi, Val di Funes, Carezza + Bolzano. No kosher (Venice/Milan have it).
- **Salzburg + Salzkammergut, Austria** (2nd) - Hallstatt, Wolfgangsee,
  Gosausee, Krimml Waterfalls, Zell am See + Salzburg city. No kosher
  (Vienna has it). No direct flight (via VIE/MUC + drive).
- **Mallorca, Spain** (2nd) - Serra de Tramuntana, Sa Calobra, Cap de
  Formentor, Coves del Drac + Palma/Valldemossa/Sóller. No kosher. Direct
  flight seasonal (Jul-Oct).

All: build clean, verify-photos all OK, hero/nature photos eyeballed.

**Catalog now 25 destinations / 16 countries.** Countries with 2+ cities:
thailand, georgia, montenegro, greece, germany, italy, austria, spain.
Still ONE city: slovakia, czechia, hungary, uae, azerbaijan, kazakhstan,
jordan, cyprus.

**Remaining work moved to TODO.md** (new file at repo root): next
second-cities (Czechia→Bohemian Switzerland, Hungary→Balaton, Slovakia→High
Tatras, UAE→Hatta, Azerbaijan→Sheki, Cyprus→Paphos, Jordan→Dead Sea/Amman),
enriching the 8 European cities with nature day-trips, plus the deferred
product items (affiliate wiring, a11y statement placeholders + gaps,
link-extraction decision) and content follow-ups (real kosher verification
dates). Marrakech still skipped (flights unverifiable).

### 2026-07-25 (b) - Unified trip view (itinerary + map + chat on one screen) + honest day descriptions

**Built/changed:**
- `src/components/TripWorkspace.tsx` (new) - THE unified trip view.
  Merges what used to be two separate screens (the `/chat` split
  conversation+read-only canvas, and the `/planner` itinerary+map
  workspace) into one. Same `Trip` object, mutated in place - a chat
  edit and a manual edit write through the same `TripContext`.
  Layout: xl → 3 columns (itinerary / map / chat), lg → itinerary+map
  with chat as a full-width panel below, mobile → stacked (day tabs →
  map → day card → stops → collapsible "כל הימים") with the chat in a
  fixed bottom bar that opens an 82vh drawer.
- `src/lib/trip/useTripChat.ts` (new) - the whole conversation state
  extracted out of `AgentWorkspace`: streaming, per-trip history
  (`chatStorage`), the `selfUpsertRef`/`lastSyncedIdRef` tab-switch
  dance, kosher hint. One hook instance per view; `ChatPanel` renders
  it twice (desktop column + mobile drawer) so both surfaces are the
  same conversation.
- `src/components/ChatPanel.tsx` (new) - presentational chat (messages,
  action chips, quick replies, per-message map, starter suggestions).
- `src/lib/trip/dayDescription.ts` (new) - one-line day summary built
  ONLY from the day's actual stops: top 1-2 categories ("אתרים
  ותצפיות"), then the mustSee stop (or the first stop) + how many more
  ("טירת ברטיסלבה ועוד 2 עצירות"). Empty day → "עדיין אין עצירות ביום
  הזה". No invented themes/events - hard rule 2. Rendered under the day
  heading, in the all-days overview, in the copied summary and in print.
- `src/components/AgentWorkspace.tsx` - now just the landing hero +
  `TripWorkspace`; URL params (`?q=`, `?kosher=1`, `?trip=`) handled
  here and passed down (`?trip=` applied only after TripProvider
  hydration). An existing current trip goes straight to the unified
  view - no landing screen on top of a real trip.
- `src/app/planner/PlannerClient.tsx` - keeps the button-driven
  onboarding + the AI-understood banner; its ~400-line `Workspace` was
  deleted and replaced by `<TripWorkspace destinations={…} />` (still
  passes the provider's destinations, so the `PlacesProvider`
  abstraction is intact).
- `src/components/SiteNav.tsx` - nav is now יעדים · תכנון טיול · כשרות;
  the separate "צ׳אט טיולים" tab is gone. `TripChip`/`MyTripCard` point
  at `/chat` ("פתיחת הטיול"); the mobile current-trip row opens the
  trip like the other tabs.

**Product decisions:**
- Both `/chat` and `/planner` render the SAME component instead of
  redirecting one to the other: `/chat` must keep streaming the first
  reply without a navigation, and `/planner` keeps a genuinely
  different empty state (buttons, not a prompt). One view, two doors.
- Mobile chat = bottom bar + drawer (not an inline panel): at 390px the
  plan must stay the page, and a sticky input is the only way to keep
  "edit by talking" one tap away. The bar is inset (`start-20`) so it
  never collides with the accessibility button.
- Day descriptions are derived, not generated by the model - the data
  already knows the categories and names, and derivation can't
  hallucinate.

**Gotcha found + fixed (worth remembering):** `.rise-in` uses
`animation … both`, so its final `transform: translateY(0)` sticks
around forever - which makes the element a containing block and breaks
`position: fixed` for ANY descendant. The mobile chat bar rendered
mid-document until it was moved outside the `.rise-in` wrapper.

**Verification:** `npm run build` clean; a dependency-free CDP harness
(Node 24 global WebSocket → headless Edge, scripts in the session
scratchpad) ran 17 end-to-end checks against a PRODUCTION build at 1440
and 390: plan+map+chat visible together, live edit through the chat
(mocked SSE `{trip}` event) growing the plan to 4 days with only ONE
trip in storage (no copy), day descriptions correct incl. the empty-day
placeholder, kosher toggle reflecting `Trip.preferences`, drawer
open/close, zero horizontal overflow at both widths, and `/planner`
rendering the identical view. NOTE: the dev server (`next dev`,
Turbopack) does NOT hydrate in this headless Edge - React loads but no
fibers attach; test against `next build && next start` instead.

**Broken/deferred:** nothing known broken. `npm run lint` still reports
the repo's pre-existing `react-hooks/set-state-in-effect` errors
(TripContext, HeroPrompt, PromptChips, AccessibilityWidget…); the two
new ones in `useTripChat`/`AgentWorkspace` are the same pattern as the
code they replaced. Deferred: the chat panel has no unread/updated
badge on mobile after the drawer closes.

### 2026-07-25 (c) - Overnight expansion: Switzerland (Interlaken + Jungfrau region)

Branch `data/overnight-expansion` (off the merged main). First entry of
the overnight run.

- **Switzerland** (new country) - Schengen visa-free 90 days, CHF (not
  euro), eSIM caveat (Switzerland is outside the EU roaming zone),
  card-friendly but expensive.
- **Interlaken & Jungfrau region** (new destination) - 14 places, rating
  4.7. Landmark: Jungfraujoch (Top of Europe). Nature-heavy: Lauterbrunnen
  valley, Staubbach + Truemmelbach falls, Schilthorn, Bachalpsee,
  Grindelwald, Harder Kulm, Lakes Brienz + Thun, Muerren, Aare Gorge,
  Reichenbach Falls. 4-day itinerary.
- Flights verified: SWISS resumed nonstop ZRH-TLV on 1 July 2026; with
  El Al ~12-13 weekly, ~4h, then ~2h by train to Interlaken.
- **Kosher: none in the region, stated plainly** - Swiss kosher
  infrastructure is in Zurich/Geneva/Basel, mountain hotels offer only
  seasonal kosher service. No venue invented.
- Every coordinate from the Wikipedia API; every photo is the article
  lead image (Commons 500px thumb), hero/landmark images eyeballed.
  build clean, verify-photos 302/302 OK.

### 2026-07-25 (d) - Overnight expansion: Japan (Tokyo + Mount Fuji)

- **Japan** (new country, first East-Asian destination) - visa-free 90
  days for Israelis, JPY, cash-friendly, IC cards (Suica/Pasmo).
- **Tokyo & Mount Fuji** - 16 places, rating 4.8. Landmark: Mount Fuji.
  Nature/day trips: Lake Kawaguchi, Chureito Pagoda viewpoint, Hakone,
  Lake Ashi, Owakudani volcanic valley, Kegon Falls (Nikko). City:
  Sensoji, Shibuya Crossing, Meiji Shrine, Skytree, Ueno Park, Shinjuku
  Gyoen, Kamakura + the Great Buddha. 5-day itinerary.
- Flights verified: El Al is the only nonstop TLV-NRT, ~3 weekly on a
  787-9, ~11.5h, route resumed April 2026.
- **Kosher REAL but small:** Chabad House Tokyo in Takanawa with Chana s
  Place (the city first kosher restaurant) + Kosher Delica delivery under
  rabbinical supervision - both by advance order; pending-review like every
  kosher entry. Overview warns that regular Japanese food uses dashi/mirin
  and must never be assumed kosher.
- Coordinates: English Wikipedia API, and Japanese Wikipedia for the five
  articles without coordinates (Owakudani, Kegon Falls, Lake Ashi, Shibuya,
  Arakurayama Sengen Park); the Chabad pin is the Takanawa
  neighbourhood centroid via Nominatim, with the exact street address in
  the description. build clean, verify-photos 318/318 OK.

### 2026-07-25 (e) - Overnight expansion: Tanzania (Serengeti, Ngorongoro, Kilimanjaro)

- **Tanzania** (new country, first African destination in the catalog) -
  e-Visa/visa-on-arrival, 50 USD, 90 days, passport valid 6 months;
  TZS + USD for park fees; local SIM; cash-first economy.
- **Serengeti & Kilimanjaro** (northern safari circuit) - 9 places,
  rating 4.8. Landmark: Mount Kilimanjaro. Nature: Serengeti, Ngorongoro
  Crater, Tarangire, Lake Manyara, Arusha NP + Mount Meru, Olduvai Gorge.
  6-day itinerary built around a real safari flow (Arusha base first).
- Flights verified: no nonstop from TLV; Ethiopian via Addis to JRO,
  ~4 weekly, ~10h total.
- **Kosher REAL:** Chabad House Arusha (Mawandammo 9) with a kosher
  kitchen, meals by ~24h advance order - the only kosher address found in
  the region; pending-review. Overview is explicit that lodges and parks
  have nothing, and that safari operators offering kosher meals must be
  verified directly.
- Coordinates from the Wikipedia API (Kilimanjaro summit via German
  Wikipedia); the Chabad pin is the Arusha city location with the street
  address in the description and an explicit note that it is approximate.
  Photos are article lead images. build clean, verify-photos 327/327 OK.

### 2026-07-25 (f) - Overnight expansion: Peru (Cusco + Machu Picchu)

- **Peru** (new country, first South-American destination) - visa-free
  for Israelis up to 183 days, PEN, local SIM, cash outside the cities.
- **Cusco & Machu Picchu** - 12 places, rating 4.8. Landmark: Machu
  Picchu. Nature/altitude hikes: Laguna Humantay, Vinicunca (Rainbow
  Mountain), the Sacred Valley, Maras salt ponds, Lake Titicaca. Inca
  sites: Sacsayhuaman, Ollantaytambo, Pisac, Moray. 6-day itinerary that
  starts with two acclimatisation days (Cusco is ~3,400 m).
- Flights: no nonstop from TLV - one or two connections (Madrid /
  Frankfurt / Amsterdam / New York / Panama) to Lima, then ~1.5h to CUZ.
- **Kosher REAL and strong:** Chabad House Cusco (Calle Vitoque 631) runs
  separate meat and dairy restaurants - a major hub for Israeli
  travellers; pending-review, pin at city centre with the address in the
  description. Outside Cusco: nothing, stated plainly.
- Coordinates from the Wikipedia API (Spanish Wikipedia for Moray) and
  Nominatim for the Maras salt ponds and Humantay lake; their photos came
  from the Commons API and were eyeballed (the first Maras hit was a
  close-up of one pan - replaced with the panorama; the Vinicunca lead
  image download was broken, replaced with a verified alternative).
  build clean, verify-photos 339/339 OK.

### 2026-07-25 (g) - Overnight expansion: New Zealand (Queenstown + South Island)

- **New Zealand** (new country, first Oceania destination) - visa waiver
  but NZeTA + IVL required in advance (verified on immigration.govt.nz
  terms: ~17-23 NZD + 35 NZD, valid 2 years, 90 days per visit), NZD,
  strict biosecurity noted.
- **Queenstown & the South Island** - 13 places, rating 4.8. Landmark:
  Milford Sound. All-nature: Fiordland NP, Doubtful Sound, Routeburn
  Track (Great Walk), Lake Wakatipu, Wanaka, Mount Aspiring NP, Aoraki /
  Mount Cook, Lakes Pukaki and Tekapo (dark-sky reserve), Franz Josef
  Glacier. 6-day itinerary.
- Flights: no nonstop from TLV (the longest trip for Israelis) - two
  connections, ~28-32h, then a domestic hop to ZQN.
- **Kosher:** Chabad Queenstown serves South Island travellers with
  Shabbat meals and food by advance order; no verified street address was
  found, so the pin is the town centre and the entry says so explicitly.
  pending-review.
- Coordinates from the Wikipedia API (German Wikipedia for lakes Pukaki
  and Tekapo, which lack coordinates in the English articles); photos are
  article lead images. build clean, verify-photos 352/352 OK.

### 2026-07-25 (h) - Overnight expansion: USA (Grand Canyon + the Southwest)

- **USA** (new country, first North-American destination) - ESTA under
  the Visa Waiver Program (Israel joined in 2023; ~21 USD, valid 2 years,
  90 days), USD, tipping and pre-tax pricing noted for Israelis.
- **Grand Canyon & the American Southwest** - 13 places, rating 4.8.
  Landmark: the Grand Canyon. All-nature road trip: Zion, Bryce Canyon,
  Arches, Canyonlands, Antelope Canyon, Horseshoe Bend, Lake Powell,
  Monument Valley, Sedona, Death Valley, with Las Vegas as the base.
  7-day itinerary following the real driving loop.
- Flights: nonstop TLV to New York / Miami / Boston / Los Angeles; no
  nonstop to Las Vegas - one US connection, ~17-20h.
- **Kosher REAL in Las Vegas:** kosher market on S Rainbow Blvd (with the
  city kosher restaurants clustered in the same western area) under the
  local Vaad (Chabad of Southern Nevada); pending-review. Overview is
  explicit that the parks themselves have nothing and that stocking up in
  Vegas is the practical answer.
- Coordinates from the Wikipedia API (German Wikipedia for Zion and
  Arches, whose English articles carry no coordinates); the kosher pin is
  the street location from Nominatim. build clean, verify-photos
  365/365 OK.

### 2026-07-25 (i) - Overnight expansion: High Tatras (Slovakia 2nd city)

- **High Tatras** - 10 places, rating 4.5, Slovakia second destination
  (first non-Bratislava). Landmark: Strbske Pleso. All-nature: Popradske
  Pleso, Lomnicky Stit cable car, Hrebienok + the Cold Stream waterfalls,
  Slovak Paradise NP ladder trails, Demanovska Cave of Liberty, the Tatra
  ridge itself + Spis Castle and Poprad as the base. 5-day itinerary.
- Access stated honestly: no flight to the region - Bratislava or Vienna
  (~4h drive), or Krakow (~2.5h); Poprad has only a small regional airport.
- **Kosher: none in the region**, and said so - nearest is Bratislava
  Chabad or Krakow, hours away.
- All coordinates and photos from the Wikipedia API; Spis Castle has no
  lead image, so its photo came from the Commons API and was eyeballed.
  build clean, verify-photos 375/375 OK.

### 2026-07-25 (j) - Overnight expansion: Bohemian Switzerland (Czechia 2nd city)

- **Bohemian Switzerland** - 8 places, rating 4.5, Czechia second
  destination. Landmark: Pravcicka brana (Europe largest natural rock
  arch). Nature: the national park, the Kamenice gorges with the boat
  section, Hrensko, the Jetrichovice rock viewpoints, Tisa rock maze,
  Decin, plus Bastei across the German border. 4-day itinerary.
- Honest caveat carried into the rating and the park entry: the 2022
  wildfire closed and changed trails - visitors are told to check current
  trail status.
- **Kosher: none in the region** - nearest is Prague (~1.5h), stated
  plainly.
- All coordinates and photos from the Wikipedia API. build clean,
  verify-photos 383/383 OK.

### 2026-07-25 (k) - Overnight expansion: Lake Balaton (Hungary 2nd city)

- **Lake Balaton** - 9 places, rating 4.3, Hungary second destination.
  Landmark: the Tihany peninsula and its 11th-century abbey. Nature/water:
  the lake itself, Badacsony basalt hill and its vineyards, Lake Heviz
  (the world largest biologically active thermal lake), Szigliget castle
  hill, Tapolca cave lake (rowing boats underground), Balaton Uplands NP,
  plus Balatonfured and Keszthely/Festetics Palace. 4-day itinerary.
- Access: direct TLV-Budapest, then ~1.5h by car or direct train.
- **Kosher: none at the lake** - nearest is Budapest, stated plainly.
- All coordinates and photos from the Wikipedia API. build clean,
  verify-photos all OK (392).

### 2026-07-25 (l) - Overnight expansion: Iceland (Reykjavik + South Coast)

- **Iceland** (new country) - Schengen visa-free, ISK, near-cashless
  (PIN needed at automated fuel pumps), eSIM caveat (European bundles
  often exclude Iceland).
- **Reykjavik & the South Coast** - 12 places, rating 4.7. Landmark:
  Jokulsarlon glacier lagoon. Nature: Golden Circle (Thingvellir, Geysir,
  Gullfoss), Seljalandsfoss and Skogafoss, Reynisfjara black beach (with
  the sneaker-wave warning), Vatnajokull, Blue Lagoon, Kirkjufell.
  5-day itinerary.
- Flights stated honestly: Icelandair has run a SEASONAL nonstop TLV-KEF
  (~3 weekly, ~7h) since 2023 but it varies year to year - travellers are
  told to verify it is operating for their dates, with easy one-stop
  European connections as the fallback.
- **Kosher - a real 2026 change:** the Beit Shvidler Jewish Center of
  Iceland opened in downtown Reykjavik on 7 July 2026 (Chabad) with a
  synagogue, kosher shop and community kitchen - the only kosher point in
  the country; pending-review, pin at city centre. Overview also notes
  ritual slaughter is banned locally so meat is imported.
- Coordinates from the Wikipedia API (German Wikipedia for Kirkjufell);
  photos are article lead images. build clean, verify-photos all OK.

### 2026-07-25 (m) - Overnight expansion: Slovenia (Lake Bled + Julian Alps)

- **Slovenia** (new country) - Schengen visa-free, euro, e-vinjeta
  motorway sticker flagged for rental cars.
- **Lake Bled & the Julian Alps** - 10 places, rating 4.6. Landmark: Lake
  Bled and its island. Nature: Vintgar Gorge, Lake Bohinj, Triglav NP,
  the turquoise Soca valley, Kranjska Gora + Vrsic pass, Postojna Cave,
  Predjama Castle, plus Ljubljana and Piran. 5-day itinerary.
- Flights: Israir runs a SEASONAL nonstop TLV-LJU (about July-October);
  outside that window - connections, or land in Trieste/Venice and drive
  ~2h. Stated as seasonal, not as a year-round route.
- **Kosher: no verified address in Slovenia** - small Jewish community in
  Ljubljana, nearest kosher infrastructure Trieste or Vienna. Nothing
  invented.
- Coordinates and photos from the Wikipedia API (Slovenian Wikipedia for
  Triglav). Savica waterfall and the Tolmin gorges were DROPPED rather
  than guessed: the English article has no coordinates and the Slovenian
  article lead image was the wrong subject. build clean, verify-photos
  all OK.

### 2026-07-25 (n) - Overnight expansion: Croatia (Plitvice + Dalmatian coast)

- **Croatia** (new country) - EU/Schengen visa-free, euro since 2023.
- **Plitvice Lakes & the Dalmatian Coast** - 11 places, rating 4.7.
  Landmark: Plitvice Lakes. Nature: Krka waterfalls, Rastoke, Paklenica
  canyon, Kornati islands; cities: Zadar, Split + Diocletian Palace,
  Dubrovnik, Zagreb. 6-day itinerary.
- Flights: El Al nonstop TLV-Zagreb (about weekly, ~3.5h, some operated
  by Israir), Croatia Airlines seasonal; no regular nonstop to Split or
  Dubrovnik - said explicitly.
- **Kosher:** verified that Croatia has NO public kosher restaurant;
  Chabad of Croatia in Zagreb (Rokova 4) supplies Shabbat meals, kosher
  meat/dairy and catering shipped to other cities by advance order
  (~a week). pending-review.
- All coordinates and photos from the Wikipedia API. build clean,
  verify-photos all OK.

### 2026-07-25 (o) - Overnight expansion: Nepal (Kathmandu + Himalayas)

- **Nepal** (new country) - visa on arrival / e-Visa with 2026 fees
  (30/50/125 USD for 15/30/90 days, cash), NPR, cash-first, local SIM.
- **Kathmandu & the Himalayas** - 13 places, rating 4.7. Landmark: Mount
  Everest. Nature/trekking: Sagarmatha NP (Everest region), the Annapurna
  massif, Poon Hill, Pokhara + Phewa Lake, Chitwan NP. Heritage: Durbar
  Square, Boudhanath, Swayambhunath, Bhaktapur, Nagarkot sunrise ridge.
  6-day itinerary that treats treks as multi-day add-ons, not day trips.
- Flights: no nonstop TLV-KTM; one connection (Gulf hubs / India / Sri
  Lanka), ~13h+; domestic flights weather-dependent, buffer day advised.
- **Kosher REAL and strong:** Chabad House Kathmandu in Thamel
  (Pushpalal Path) with meat and dairy kosher restaurants and the famous
  Seder; pending-review. Pokhara Chabad presence is described as seasonal
  and to be verified - not asserted. Nothing on the treks, said plainly.
- Coordinates and photos from the Wikipedia API. Annapurna Base Camp and
  Everest Base Camp had no coordinates - used the massif/mountain
  articles instead of guessing camp coordinates. build clean,
  verify-photos all OK.

### 2026-07-25 (p) - Overnight expansion: Vietnam (Hanoi + Ha Long Bay)

- **Vietnam** (new country) - e-Visa up to 90 days (25/50 USD single/
  multiple), VND, cash-first outside cities, Grab for transport.
- **Hanoi & Ha Long Bay** - 10 places, rating 4.6. Landmark: Ha Long Bay.
  Nature: Cat Ba island, Ninh Binh (Tam Coc/Trang An), Sa Pa rice
  terraces, Fansipan, the Ha Giang loop, Phong Nha caves; city: Hanoi and
  Hoan Kiem lake. 5-day itinerary.
- Flights - a real 2026 change, verified: Arkia opened a nonstop
  TLV-Hanoi on 5 Jan 2026 (1-3 weekly) and El Al announced a nonstop from
  24 Oct 2026 (3 weekly, 787). Entry notes that new routes shift and
  should be reconfirmed.
- **Kosher REAL:** Chabad of Hanoi (To Ngoc Van area) with a kosher
  restaurant, Shabbat meals and delivery, under Kosher Vietnam
  supervision; Chabad HCMC also has a kosher restaurant. Nothing outside
  the two cities, and the fish-sauce caveat is spelled out.
  pending-review.
- Coordinates and photos from the Wikipedia API. Hoi An and the Trang An
  complex had no coordinates in the API - Hoi An was dropped (wrong
  region for this hub) and Trang An is covered through the Ninh Binh
  province entry rather than guessed. build clean, verify-photos all OK.

### 2026-07-25 (q) - Overnight expansion: Norway (Lofoten + fjords)

- **Norway** (new country) - Schengen visa-free, NOK, near-cashless,
  eSIM caveat (Norway often excluded from European bundles).
- **Lofoten & the Norwegian Fjords** - 11 places, rating 4.7. Landmark:
  the Lofoten islands. Nature: Reine, Geirangerfjord, Naeroyfjord,
  Preikestolen, Trolltunga, Jotunheimen, Lyngen Alps; cities Bergen,
  Tromso, Oslo. 7-day itinerary spanning west fjords and the Arctic.
- Flights: verified there is NO nonstop TLV-Oslo - one European
  connection, then domestic flights north (distances make them close to
  mandatory).
- **Kosher: nothing in the fjords or Lofoten** - communities exist in
  Oslo and Trondheim and food can be arranged in advance through the Oslo
  community, but no public kosher restaurant. Stated plainly.
- Coordinates and photos from the Wikipedia API (German Wikipedia for
  Trolltunga, Nominatim for Reine). The Atlantic Ocean Road was dropped -
  its only lead image is an SVG map, not a photo. build clean,
  verify-photos all OK.

### 2026-07-25 (r) - Overnight expansion: South Africa (Cape Town + Kruger)

- **South Africa** (new country, 2nd African destination) - visa-free 90
  days for Israelis (passport valid 6 months + onward ticket verified),
  ZAR, RICA SIM registration, and an explicit personal-safety note.
- **Cape Town & Kruger** - 12 places, rating 4.7. Landmark: Table
  Mountain. Nature: Cape of Good Hope, Boulders Beach penguins, Chapman
  Peak drive, Kirstenbosch, Tsitsikamma/Garden Route, Kruger NP, Blyde
  River Canyon; plus Robben Island, Stellenbosch and the Sea Point kosher
  area. 6-day itinerary.
- Flights: no current regular nonstop from TLV - one connection (Addis,
  Dubai, Istanbul, Doha, Nairobi), ~14-17h, with a note that direct-route
  status has changed in recent years.
- **Kosher - the strongest in the catalog so far:** Sea Point in Cape
  Town has restaurants, bakeries and shops under the Cape Beth Din, and
  Johannesburg has more; nothing in Kruger or on the Garden Route.
  pending-review, pin at neighbourhood level (stated in the entry).
- Coordinates from the Wikipedia API, plus German Wikipedia (Tsitsikamma)
  and Nominatim (Blyde River Canyon) where the English articles had none.
  build clean, verify-photos all OK.

### 2026-07-25 (s) - Overnight expansion: Armenia (Yerevan + highlands)

- **Armenia** (new country) - visa-free for Israelis (allowed stay
  length phrased as "check current rules" rather than asserting a
  number), AMD, cash outside Yerevan.
- **Yerevan & the Armenian Highlands** - 11 places, rating 4.4.
  Landmark: Khor Virap with Ararat behind it. Nature: Lake Sevan,
  Dilijan NP, Mount Aragats, Jermuk waterfall; heritage: Geghard,
  Garni, Sevanavank, Noravank, Tatev + the world longest reversible
  cableway. 5-day itinerary.
- Flights: FlyOne Armenia nonstop TLV-EVN, ~1-3 weekly depending on
  direction and season, ~2.5h - frequency described as variable.
- **Kosher: no verified address in Armenia** - small community and a
  synagogue in Yerevan, nearest infrastructure Tbilisi. Nothing invented.
- Coordinates and photos from the Wikipedia API (German Wikipedia for
  Khor Virap). Wings of Tatev has no coordinates of its own - folded into
  the Tatev entry instead of guessing. build clean, verify-photos all OK.

### 2026-07-25 (t) - Overnight expansion: Uzbekistan (Samarkand + Bukhara)

- **Uzbekistan** (new country) - visa-free short tourist stay for
  Israelis (phrased as "verify current terms"), UZS, cash-heavy.
- **Samarkand & Bukhara** - 10 places, rating 4.6. Landmark: Registan
  Square. Silk Road heritage: Shah-i-Zinda, Gur-e-Amir, Po-i-Kalyan,
  Khiva/Ichan Kala; nature: Lake Charvak + Chimgan mountains, and the
  Aral Sea / Moynaq ship cemetery as a remote multi-day extension.
  6-day itinerary built around the Afrosiyob fast train.
- Flights verified: nonstop TLV-Tashkent, Uzbekistan Airways ~7 weekly
  plus Centrum Air, FlyOne Asia and Qanot Sharq, ~4h50.
- **Kosher:** Bukharian Jewish heritage is real - the Jewish quarter and
  an active synagogue in Bukhara, community and synagogues in Tashkent -
  but NO permanent public kosher restaurant was found, and the entry says
  exactly that rather than implying kosher dining exists.
- Coordinates and photos from the Wikipedia API. Chimgan (no coordinates)
  was folded into the Charvak entry, and Ichan Kala into the Khiva entry,
  instead of guessing. build clean, verify-photos all OK.

### 2026-07-25 (u) - Consolidation onto main + pre-live data audit

- Merged `data/overnight-expansion` into `main` (no-ff). ZERO conflicts:
  the branch was cut from the current main and is additive only
  (CLAUDE.md, countries.ts, destinations.ts; 5,635 insertions, 0
  deletions). No review branch existed - the polish+data merge had
  already landed on main the night before.
- **Catalog on main: 42 destinations / 31 countries / 530 places**
  (was 24/16). Build: 86 static pages, clean. verify-photos: 496/496 OK.
  `tsc --noEmit`: clean.
- **New pre-live audit script** (kept in the session scratchpad, worth
  re-creating when needed): loads the two data files via Node 24 TS
  type-stripping and checks duplicate slugs/place ids, missing or
  out-of-range coordinates, itinerary placeIds that do not exist,
  photo host + allowed thumb widths, kosher category without a
  verification badge, empty required fields, and TODO/placeholder text.
  Result: 0 real problems (the single hit was a false positive - the
  Wikimedia filename `Tatry_Panorama01xxx.jpg` contains "xxx").
- **Spot-check of 12 new places against the Wikipedia API:** 11 matched
  the article coordinates to 0.0 km (Boudhanath resolved under a
  redirect title and was not re-compared); all 12 photos returned
  HTTP 200. Three new photos were re-eyeballed (Tashkent, Ngorongoro,
  Serengeti) - correct subjects.
- TODO.md updated: the three second-city items completed overnight are
  ticked, and four review items are recorded - the 37 pending-review
  kosher entries, the 8 original European cities without an
  editorialRating, the two country-scale hubs (lofoten, cape-town), and
  the kotor/budva shared places.

### 2026-07-25 (x) - Cleanup-1: kosher honesty, editorial ratings, compact hubs

Branch `data/cleanup-1` (off main), acting on the flagged TODO items.

1. **Kosher pending-review (37 entries) - kept, but never look verified.**
   New `src/components/KosherBadge.tsx` is the only renderer of kosher
   status: pending-review shows an amber warning badge with a ring -
   "not verified - check with the venue" in Hebrew - plus the supervision
   as *reported* and an explicit "tiyul+ has not checked this yet"; a real
   check date shows the green verified badge. Wired into the destination
   page, /kosher and the Leaflet popup (three previously-separate inline
   implementations). /kosher also states up front how many entries are
   unverified, and its intro no longer calls the catalog verified.
2. **Editorial ratings for the 8 original European cities** - Vienna 4.6,
   Bratislava 4.0, Prague 4.7, Budapest 4.6, Rome 4.7, Athens 4.3,
   Barcelona 4.6, Berlin 4.5. Verdicts are grounded in each entry's own
   facts (direct flights, how many kosher entries it really has, itinerary
   length) and each states a real drawback. All destinations now rated.
3. **Photoless places (57)** - no change, as intended. Verified live that
   a card without a photo renders normally (no broken image, no empty
   frame) on /destinations/serengeti.
4. **Over-spread destinations split into compact hubs:**
   - Norway: `lofoten` now = Lofoten + Reine + Tromso + Lyngen (Arctic
     north). New `bergen-fjords` = Bergen, Naeroyfjord, Geiranger,
     Preikestolen, Trolltunga, Jotunheimen, Oslo.
   - South Africa: `cape-town` now = city + peninsula + winelands +
     Sea Point. New `kruger` = Kruger NP + Blyde River Canyon. New
     `garden-route` = Tsitsikamma (moved out of cape-town rather than
     dropped) + 9 newly verified places: Knysna, Plettenberg Bay,
     Robberg, Wilderness NP, Cango Caves, Oudtshoorn, Bloukrans Bridge,
     Addo Elephant NP, Mossel Bay.
   The split script regenerates the TS from the already-verified place
   objects, so coordinates and photo URLs are byte-identical; only
   grouping, metadata, itineraries and practical blocks are new.
   **Catalog: 45 destinations / 31 countries / 539 places.** Audit
   geographic warnings cleared. build clean; verify-photos all OK.

### 2026-07-25 (y) - /kosher redesigned as a directory (branch feat/kosher-directory)

The page used to be a heading, a paragraph and a lone search box in a lot
of empty space - nothing to look at before searching.

- **Default (pre-search) state is now a populated directory:** a card per
  city that genuinely has kosher entries in the data (27 today), sorted by
  how many it has. Each card = destination photo with a night gradient,
  the flag, city name, country, a teal count badge and an honest breakdown
  read from the categories ("2 מסעדות · חנות אחת"). Clicking a card opens
  that city's kosher list + PlacesMap, with a "חזרה לכל הערים" link back.
- **Live filtering:** typing filters the same grid (name / local name /
  slug / country / alias), so search and browse are one surface. A search
  with no match keeps the honest empty state, and if the city IS in the
  catalog but has no kosher data, it says so and links to that destination.
- **Real stats, no padding:** three chips computed from the data - 37
  kosher places, 27 cities, and the verification chip which currently
  reads "אף רשומה עדיין לא אומתה על ידינו" (it will switch to a
  verified/pending split the moment any entry gets a real check date). The
  section header also notes that 18 further destinations have no kosher
  data, which is stated on their own pages.
- Trust rules unchanged: every entry still renders through KosherBadge,
  so pending-review shows the amber "לא מאומת - לוודא מול המקום" and
  nothing is presented as verified.
- Layout tightened: intro trimmed to two lines, stats + search moved up;
  the first row of cards starts ~370px down on desktop and ~460px on
  mobile (was an empty screen).
- Verified live on a production build: 13/13 CDP checks at 1400px and
  390px (27 cards, live filter incl. country match, honest empty state,
  city view with map, two-up mobile grid, zero horizontal overflow).
### 2026-07-25 (v) - Expansion-2: Kyoto & Kansai (Japan 2nd city)

Branch `data/expansion-2`, cut from the consolidated main.

- **Kyoto & Kansai** - 11 places, rating 4.7. Landmark: Fushimi Inari.
  Nature: Arashiyama bamboo grove, Lake Biwa, Amanohashidate sand spit,
  Nachi Falls + Kumano Kodo pilgrimage trails. Heritage: Kiyomizu-dera,
  Kinkaku-ji, Ginkaku-ji, Todai-ji + Nara Park deer. 5-day itinerary.
- Flights stated honestly: no nonstop to Kansai - either El Al to Tokyo
  and a 2h15 shinkansen, or one connection into Osaka.
- **Kosher REAL:** Chabad of Kyoto in Okazaki (Sakyo-ku) - synagogue and
  kosher kitchen, meals by advance order only (~3 days, cooked to order);
  pending-review, pin at neighbourhood level. Dashi/mirin warning kept.
- Coordinates and photos from the Wikipedia API; Mount Kurama and the
  Nara Park article have no coordinates - Kurama was dropped and Nara
  Park folded into the Todai-ji entry rather than guessed. Chabad pin
  geocoded from its published address via Nominatim.
  build clean, verify-photos all OK.

### 2026-07-25 (w) - Expansion-2: Canada (Banff + the Canadian Rockies)

- **Canada** (new country) - visa-exempt but eTA required before boarding
  (valid up to 5 years, stay up to 6 months), CAD, pre-tax pricing and
  tipping noted.
- **Banff & the Canadian Rockies** - 12 places, rating 4.8. Landmark:
  Moraine Lake. All-nature: Lake Louise, Peyto Lake, the Icefields
  Parkway, Athabasca Glacier, Jasper NP, Maligne Lake, Johnston Canyon,
  Yoho NP, Emerald Lake, with Calgary as the gateway. 5-day itinerary.
- Flights verified precisely: no nonstop to Calgary; the only nonstop
  Israel-Canada route is Air Canada TLV-Toronto (weekly as of July 2026,
  ~10.5h), then ~4h domestic to Calgary.
- **Kosher: none in the Rockies** - stated plainly, with Toronto (COR)
  and Calgary named as the places to stock up.
- Coordinates and photos from the Wikipedia API (German Wikipedia for
  Lake Louise). Entry flags the Moraine Lake shuttle-only access.
  build clean, verify-photos all OK.
### 2026-07-25 (z) - Fix: kosher is opt-in only (branch fix/kosher-opt-in-only)

Kosher places were reaching itineraries without the user ever choosing
kosher, which contradicts the project rule ("none assumed, all respected
when chosen"). Audit of every injection path and what changed:

- **`tripFromTemplate()` - the actual bug.** The planner's ready-made
  templates copy a destination's curated itinerary verbatim, and **27 of
  42 curated itineraries contain a kosher stop**. Now takes
  `{ kosher }` and filters kosher places out unless opted in; when opted
  in it also stamps `preferences.kosher = true` on the trip. The planner
  passes its kosher toggle.
- **`generateTrip()` (local wizard)** - already correct (score 0 +
  `kosherOnly` gate); left as is, covered by tests.
- **`/api/generate-trip` (AI refine)** - the prompt only *asked* for
  kosher when kosherOnly was true but nothing stopped the model adding it
  anyway. Now the prompt forbids it explicitly AND `validateDayPlans`
  strips kosher-category ids server-side when kosherOnly is false.
- **`/api/chat` (agent)** - the system prompt literally allowed "kosher
  places may be included among them" when the preference was unset; that
  line now forbids putting kosher places in the plan unless the user asks
  or the preference is set. Enforcement is deterministic in
  `agent.ts`: `filterKosherUnlessOptedIn()` strips kosher ids from
  `create_trip_full` and `set_day_places` unless
  `trip.preferences.kosher === true`, and tells the model why so it does
  not retry.
- **Deliberate exception:** the granular `add_place` is NOT filtered -
  there the user named a specific place ("תוסיף את בית חב"ד ליום 2"),
  which is itself an explicit request. Same for the /kosher page and the
  per-destination kosher filter (explicit user actions, untouched).
- Kosher data itself is unchanged - this is purely about injection.

Tested with a type-stripping harness against the real data: 26/26 checks
- templates (tbilisi/bangkok/vienna/cusco) carry zero kosher stops by
default and the exact original set once opted in, non-kosher stops
untouched; wizard both ways; agent bulk tools stripped/kept correctly;
`add_place` still works; `set_preferences {kosher:true}` then planning
honors it. build clean.
### 2026-07-25 (aa) - Removed the raw catalog dropdown from the day view

The "+ הוספת עצירה מהקטלוג" `<select>` in `TripWorkspace` dumped every
unused place of the city into a native dropdown (with the placeholder
option repeated at top and bottom on some platforms) - cramped and
off-brand for an agent-first product.

- **Removed** the select and its `availableToAdd` memo. In its place a
  single quiet line: "רוצים להוסיף עצירה? פשוט בקשו מהסוכן - למשל
  'תוסיף לי את השוק הישן ליום 1' - או הוסיפו מדף היעד".
- **No gap left, so no replacement control was added.** Two non-dropdown
  paths already exist: the agent (`add_place` tool, verified working -
  it adds a catalog place to a specific day and is NOT affected by the
  kosher gating since it is an explicit named request), and the
  "+ הוספה לטיול" button on every destination page (`AddToTripButton`,
  which calls the same `trip.addPlace`).
- The underlying logic is untouched: `TripContext.addPlace`, the agent
  tool and `AddToTripButton` all still work; only this one UI control is
  gone.
- Verified live at 1400px and 390px: no catalog select remains (the day
  view still has its legitimate "הוספת יום" and "העברה ליום אחר"
  selects), the hint renders, zero horizontal overflow. build clean.
### 2026-07-25 (bb) - Basemap: CARTO Positron -> Voyager

Positron was so pale it dissolved into the cream page and read as an
empty canvas.

- `MapInner.tsx`: tile URL swapped to
  `{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` -
  still free, still keyless, same `subdomains="abcd"` + `detectRetina`,
  and the same dual OSM/CARTO attribution (unchanged).
- `globals.css`: the tile-pane filter was tuned in the opposite direction
  from before. Positron needed toning down
  (`saturate(0.85) brightness(1.02) sepia(0.06)`); Voyager needs a light
  lift to sit on cream: `saturate(1.04) contrast(1.06) brightness(0.99)
  sepia(0.05)`. Still applied ONLY to `.leaflet-tile-pane`, so pins,
  route lines and popups are untouched.
- Result (verified at city zoom, +4 zoom levels in, and at 390px): the
  Danube reads blue, parks green, motorways amber and street labels stay
  crisp - while the category pins remain the strongest thing on screen.
- Everything else (custom teardrop pins, restyled zoom control,
  attribution chip) unchanged.
### 2026-07-25 (cc) - Hero pill relabelled: "שאלון במקום צ׳אט"

The pill said "שאלון מהיר", which did not tell people what it replaces.

- Label -> **"📋 שאלון במקום צ׳אט"** (the fuller "מילוי שאלון במקום
  התכתבות" was too wide for the pill row at 390px, so it lives in the
  `title` tooltip: "מילוי שאלון במקום התכתבות עם ה-AI - עונים על כמה
  שאלות והטיול נבנה לבד"), matching how the kosher pill explains itself.
- Added `whitespace-nowrap` so the pill can never split across two lines
  and the row stays tidy.
- Function unchanged - still links to `/start`.
- Verified at 1400px and 390px: single line (169x40), inside the
  viewport, row wraps cleanly to a second line on mobile, no overflow.

### 2026-07-25 (dd) - Flags render as images, not Unicode (branch fix/flag-images)

Flag emoji are pairs of regional-indicator codepoints; Windows deliberately
does not draw national flags (Segoe UI Emoji has no glyphs for them), so
users saw literal "CZ" / "SK" / "AT". This is an OS composition refusal,
not a font-fallback problem - CSS cannot fix it.

- **New `src/components/Flag.tsx`** - renders `<img>` from flagcdn.com
  (keyless, no rate concerns at this scale), with 1x/2x srcSet, three
  sizes matched to the old emoji footprint (sm 16x12, md 20x15, lg 28x21),
  `alt="דגל <name>"` for accessibility, `loading="lazy"`, and a rounded
  1px hairline so a white flag (Japan) still reads as an object.
- **No data migration.** `countryCodeFromFlag()` decodes the existing
  emoji ('🇦🇹' -> 'at') at render time, so the 32 country and 47
  destination entries keep their `flag` field untouched. A non-national
  flag (no valid pair) falls back to rendering the original character.
- **Replaced every UI render site:** countries index cards, country page
  hero, destination hero, kosher directory (city cards + selected city),
  planner city cards + template cards, trip workspace (day tabs, day
  heading, all-days list). Also the hardcoded 🇮🇱 badge on /countries.
- **Text-only surfaces cannot carry an image**, so the flag character was
  dropped there instead of leaving a "CZ": the keyless chat replies
  (country list, destination intro, practical info), the clipboard trip
  summary and the `<option>` labels in the add-day select. Names are
  unchanged - no information lost.
- Non-flag emoji (✈️ 🛍️ ✡️ etc. in travel.ts/categories.ts) are untouched -
  those render fine and were a separate, already-shipped fix.
- Verified on a production build: 34/35 automated checks across
  /countries, a country page, a destination, /kosher, /planner and the
  trip view at 1400px and 390px - flag images present, alt text correct,
  zero raw regional-indicator characters in visible text, no layout shift
  or horizontal overflow. The one "failure" was the probe counting
  below-the-fold `loading="lazy"` images as broken; stepped scrolling on
  mobile confirms all 33 load (33/33, 0 broken).

### 2026-07-25 (ee) - Premium print/PDF export: cover, per-day sections, footer

The print output was a single flat block (title + days run together, no
page-break control). Rebuilt as a real export in `TripWorkspace.tsx`'s
existing `hidden print:block` section:

- **Cover page** - the plane `Logo`, trip name, a meta line (day count,
  stop count, generation date - all real, nothing invented), and the
  trip's cities as chips. `break-after: page` puts it alone on page 1.
- **Per-day sections** (`.print-day`) - `break-inside: avoid` so a day's
  content doesn't split awkwardly across a page boundary; a coral
  `border-inline-start` accent on the heading matches the on-screen
  design language.
- **Travel-leg dividers** (`.print-leg`) - a bordered box between two
  days when the city changes, same info as the on-screen version (emoji,
  cities, transit label).
- **Footer** - the AI-planning disclaimer plus a print-only
  `<blackz-signature>` (the real footer is `print:hidden` since it's a
  dark band that wouldn't print well, so this is its print-specific
  counterpart, scaled down).
- `globals.css` - `@page { size: A4; margin: 16mm 14mm; }` and
  `print-color-adjust: exact` (+ `-webkit-` twin) so the accent
  borders/backgrounds survive export instead of being stripped by
  default print rendering.

**Verification:** headless Chromium (`playwright`, used standalone for
this check only - not added as a project dependency) against a
production build (`next start`), trip seeded directly via
`tiyul-plus:trips:v1` in localStorage, `page.pdf()` exported and read
back with `pypdf`: page 1 is the cover alone, page 2 has all three
seeded days plus the Vienna→Bratislava travel-leg divider and the
footer/signature at the end. `npm run build` and `tsc --noEmit` clean.

**Broken/deferred:** nothing broken. Only tested with empty-day
placeholder text (no real place data seeded) - the structural
page-break/section behavior is verified, but a very long real
itinerary (many stops in one day) hasn't been checked for whether a
single day's content can itself overflow a page (break-inside: avoid
can't prevent that, only browsers vary in how they handle an
over-length avoided block). Revisit if a user reports an oddly-split
day in a real export.

**Next session should know:** the print-only `<blackz-signature>`
instance is a second mount of the same custom element already loaded
sitewide via `public/blackz-signature.js` in `layout.tsx` - no new
script tag was needed. This sandbox does NOT have `ANTHROPIC_API_KEY`
set - the roadmap's remaining items (streaming/thinking-state, booking/
affiliate layer) both touch `/api/chat` and can only be verified
against the keyless rule-based fallback here; live-model behavior
needs a real key, either added to this session's `.env.local` or
checked against the deployed site.
### 2026-07-25 (ee) - Searchable city pickers replace two long native lists

Branch `feat/searchable-city-pickers` (stacked on `fix/flag-images`, so the
new rows use the Flag component rather than reintroducing flag emoji).

The catalog outgrew both pickers - 47 destinations rendered as a wall of
cards in the planner and as a 47-option native `<select>` in the trip view.

- **New `src/lib/citySearch.ts`** - one shared search used by both:
  builds options from destinations + countries and matches on Hebrew name,
  local name, slug, country name and the alias list (same approach the
  kosher search already used).
- **`src/app/planner/CityCombobox.tsx`** - the "לאן?" grid is now a single
  search input with a dropdown (flag + city + country). Selected cities
  sit above it as removable chips; multi-select is unchanged, and
  `toggleCity`/`prefs.citySlugs` are untouched. Keyboard: arrows move,
  Enter picks, Escape closes, Backspace on an empty field removes the last
  chip. Already-selected cities sink to the bottom of the list instead of
  disappearing.
- **`src/components/AddDayPicker.tsx`** - the "+ יום…" `<select>` in
  `TripWorkspace` is now a small trigger that opens a searchable list, with
  the trip's own cities grouped first ("כבר בטיול" -> "עוד יום ב-") and the
  rest of the catalog under "עיר חדשה". `trip.addDay(slug)` wiring
  unchanged.
- **Deliberately left alone:** the "העברה ליום אחר" `<select>` in the same
  file - it is a short list scoped to the current city's days (and only
  renders when that city has 2+ days), so a native select is right there.
- Verified on a production build at 1400px and 390px: planner 16/16
  (filter by country name, chips add/remove, multi-city hint, honest empty
  state), add-day 18/20 - the two "failures" were the fixture having a
  single day per city, so the move-day select legitimately was not
  rendered; re-checked with a 2-day trip and it renders untouched.

### 2026-07-25 (ff) - Kosher policy change: no per-entry verification, one disclaimer

Per Netanel's decision ("if the AI adds it, I trust it - just leave a
disclaimer"), the verified/pending-review system was removed from the UI:

- `KosherBadge.tsx` - single neutral badge: "השגחה: {supervision} ·
  לוודא מול המקום". No amber warning tier, no green verified tier.
- `MapInner.tsx` popup - same single line replaces the two-tier block.
- `KosherSearch.tsx` - the "אף רשומה עדיין לא אומתה" stats chip is now a
  neutral "המידע נאסף ממקורות ציבוריים · לוודא מול המקום" chip; the
  per-city amber count block is a single quiet disclaimer box; empty
  states say "אין מידע כשרות" instead of "אין כשרות מאומתת".
- `/kosher/page.tsx` intro + meta description rewritten accordingly.
- `types.ts` comment updated: `lastChecked` stays in the data (all 37
  entries untouched) but is not rendered anywhere.
- Architecture-map paragraph in this file updated to the new policy.

Data unchanged; only presentation. Hard rule 2 still holds: supervision
is shown only as reported, nothing invented. Verified live at /kosher
(directory + Vienna city view): no warning badges remain, disclaimer
renders in both places. build + tsc clean.

### 2026-07-25 (gg) - WhatsApp trip share + clearer action buttons

- `TripWorkspace.tsx`: the copy-summary text builder was extracted to
  `buildSummary()` and a new "שיתוף בוואטסאפ" action opens
  `https://wa.me/?text=<encoded summary>` (same text the clipboard
  copy produces), placed next to הדפסה / PDF. Verified the generated
  URL decodes back to the full Hebrew summary (headless check stubs
  window.open - wa.me itself is blocked in the sandbox, expected).
- Action buttons got lucide-style inline SVG icons (duplicate /
  clipboard / WhatsApp bubble in brand green / printer / trash) via an
  `icon` prop on `Btn`, text darkened night/70 → night and ring
  strengthened for clarity. No new dependency - icons are hand-inlined
  paths like PromptChips did.
- The copied state now shows a check icon instead of the "✓" char.

### 2026-07-25 (hh) - Shareable trip URLs (/t/<code>) + WhatsApp format v2

Phase 4's viral-loop item, without a backend:

- `src/lib/trip/share.ts` - the trip encodes into the URL itself:
  `[1, name, [[citySlug, [placeIds], notes?], ...]]` → JSON → UTF-8
  base64url. Only IDs travel (the curated data is already in the app),
  so links stay short (~270 chars for a 2-city trip). `decodeTripShare`
  validates everything against the curated data - unknown cities are
  dropped, unknown placeIds filtered, name/notes length-capped: a
  tampered link can never render invented places (hard rule 2 applies
  to links too). Payload is versioned (v1) so future account-backed
  short codes can share the same route.
- `src/app/t/[code]/page.tsx` - server component, decodes + validates
  server-side, `generateMetadata` gives each shared trip a real
  title/description (WhatsApp/OG previews). Invalid code → orderly
  Hebrew error page, no crash.
- `SharedTripView.tsx` (client) - read-only view: header card with
  trip name/flags/counts, one map with all stops, day cards with
  numbered stops + mustSee stars + notes, travel-leg pills, and TWO
  "שמירה אצלי" CTAs (top + bottom night band) that import a fresh-id
  copy via `TripContext.createTripFrom` and route to /chat. The
  sender's original is never affected.
- `TripWorkspace.tsx` - new "קישור לשיתוף" button (link icon, copied
  state); WhatsApp text rebuilt: *bold* title/day headers (WhatsApp
  markup), day+stop count line, ★ on mustSee, localName dropped for
  readability, and the share link at the end. The clipboard summary
  keeps localNames and also ends with the link now.

E2E-verified against a production build (playwright, two isolated
browser contexts): built a Rome+Vienna trip → copied the link (270
chars) → opened it in a clean context (page title = trip name, both
days render) → "שמירה אצלי" imported exactly one copy into the clean
context's storage and routed to /chat → /t/broken-code-123 shows the
orderly error. WhatsApp URL decodes to the new format and ends with
the link. build + tsc clean.

**Next session should know:** when accounts land (Phase 4 tail), keep
/t/<code> as the share surface - server codes just become another
branch in `decodeTripShare` (v2). The share payload deliberately
excludes preferences (kosher etc.) - a shared link shows the plan, not
the sender's personal preferences.

### 2026-07-25 (ii) - Short share links (Supabase) + minimal WhatsApp message

- **Short codes.** `src/lib/trip/shareStore.ts` (server-only by
  convention - do NOT import from client components) talks to Supabase
  via plain REST fetch (no new dependency, per hard rule 6). Table
  `shared_trips` (code PK → the v1 base64url payload) - setup SQL in
  `supabase-setup.sql` at the repo root, env keys documented in
  `.env.example` (SUPABASE_URL + SUPABASE_ANON_KEY). `/api/share` POST
  encodes the trip, round-trip-validates it (decode must succeed) and
  stores it under an 8-char code (no-ambiguity alphabet, 409-retry).
- **/t/[code] resolves both kinds:** 6-12 alphanumeric → store lookup
  (react cache() dedupes metadata+page); anything longer → the v1
  inline decode. Old long links keep working forever; storing the SAME
  encoded payload keeps decodeTripShare the single validation point.
- **Graceful degradation:** without the env keys the API returns
  {code:null} and the client silently falls back to the long inline
  link - verified both modes E2E (mock Supabase REST server on :9999:
  short /t/Gua5eKq9 stored+resolved+rendered cold; env removed: long
  link generated and still renders).
- **WhatsApp message is now just an invitation** (per Netanel):
  `שיתפתי איתך את הטיול "X" שבניתי בטיול+ ✈️` + the link - no itinerary
  text. The window opens synchronously and navigates when the short
  link resolves (survives popup blockers).
- **העתקת סיכום removed** (per Netanel) along with buildSummary()/the
  copied state/the clipboard icon - the share link replaces the text
  dump. Action row: שכפול · קישור לשיתוף · וואטסאפ · הדפסה/PDF · מחיקה.
- Share-URL results are cached per trip content (useRef signature), so
  copy-link + WhatsApp on the same trip reuse one stored code.

**For Netanel to activate short links:** create a free project at
supabase.com → SQL Editor → run supabase-setup.sql → Settings/API →
copy URL + anon key into .env.local (dev) and Vercel env (prod). Until
then links are long but fully functional. **Accounts decision made:**
Supabase is also the chosen auth provider - when accounts are built,
shared_trips gains user_id (comment in the SQL) and /t/ codes can hang
off the user's saved trips.
### 2026-07-25 - Latency: two-tier grounding, real progress events, wizard scoped

Branch `perf/trip-build-progress`. Measured with a real API key against a
production build (`npx next start`), not dev.

**The diagnosis (measured, not guessed):** a full trip build sent the SAME
~145k-token grounding block on EVERY iteration of the tool loop - 5
sequential Sonnet calls, `cached=144863` each, outputs of only 191-537
tokens. The block carried every city's descriptions (22.8k tokens),
itineraries (18.8k), city practical info (13.5k), place ids/names (11.3k),
country block (9.7k) and summaries (6k) - for all 47 destinations, on a
question about one city. The planner's `/api/generate-trip` did the same:
it shipped all 47 cities although `prefs.citySlugs` is a hard constraint
the server itself enforces.

**Built/changed:**
- `src/app/api/chat/route.ts` - `buildGrounding()` split in two.
  `buildGroundingIndex()` is the static catalog (every city + place
  id/name/category/tags/priceLevel/mustSee/durationMin + country names)
  and is the ONLY block carrying `cache_control` - identical across all
  users and turns, so it stays a cache hit. `buildGroundingDetail(slugs)`
  adds summaries/practical/itineraries/descriptions only for cities the
  conversation actually touches, picked by `relevantCitySlugs()` (the
  trip's own cities + city/country names mentioned in the last 6
  messages; falls back to a 6-city sample when nothing matches). Computed
  once per request, not per iteration.
- `src/app/api/generate-trip/route.ts` - `buildGrounding(citySlugs)` now
  sends only the chosen cities; `cache_control` moved onto the (constant)
  system prompt, since the data block is now per-request.
- Progress is now REAL, not a rotating fake: new `{type:'status'}` SSE
  event. One is sent immediately on request (`קורא את הבקשה…`), one when
  the model's first tool block starts streaming (name known before the
  long input JSON - `בונה את המסלול…`), and one per tool actually
  executed with its real arguments (`בונה מסלול של 4 ימים…`,
  `מסדר את העצירות ביום 2…`). `toolStatusText()` maps tool → Hebrew.
- The trip is streamed after EVERY mutating tool, not only at end of
  turn - the canvas fills mid-build instead of staying empty.
- `src/lib/trip/useTripChat.ts` exposes `status`; `ChatPanel.tsx` feeds it
  to `ThinkingIndicator` (`label={status ?? 'חושב'}`).
- `src/app/planner/PlannerClient.tsx` - `AI_STATUSES` no longer loops
  (`% length`, every 1.5s, forever); it advances monotonically every 2.5s
  and stops on the last stage, so it can't claim progress that didn't
  happen.

**Measured before → after (production build, same prompt):**
| | before | after |
|---|---|---|
| agent: TTFB | 3.2s | **0.1s** (status) |
| agent: first trip on canvas | 37.6s | **10.2s** |
| agent: total | 37.6s | **22.2s** |
| agent: cached prefix / call | 144,863 | **34,005** |
| agent: model calls | 5 | 2 |
| wizard (free text, haiku) | 13.3s / ~45k in | **8.8s / 3,293 in** |

**Quality checks (not just speed):** country-only prompt ("5 ימים ביפן")
still builds tokyo+kyoto, 5 days / 12 stops; a follow-up edit on that trip
still works (5→6 days with a nature stop); an uncovered city (דובאי) is
still declined honestly with real alternatives. This is safe because the
index keeps EVERY place id/name in context - the model can still name and
add any place in the catalog; the detail block only enriches prose for
cities in play, and the server-side validator is unchanged.

**Verification:** `npm run build` clean (92 static pages), `npx tsc
--noEmit` clean, `verify-photos.mjs` 526/526 (all cached, no data
touched), the unified-trip-view CDP suite 17/17, and a new CDP run
confirming the live status text appears in the chat and day tabs + map
pins appear at t≈10s while the reply is still streaming.

**Broken/deferred:** the remaining ~12s after the trip exists is the model
writing its summary - it streams, so it isn't dead time. `relevantCitySlugs`
matches by substring on Hebrew names; a request that references a city only
obliquely gets the 6-city fallback detail (still correct, just less
flavorful prose). The booking/affiliate layer is still not started.

### 2026-07-25 (jj) - AI Explorer phase 1: on-demand destinations from real sources

The answer to "the catalog can't map the whole world": when a user asks
about a city outside the curated data, we now build an ephemeral
destination from REAL public sources at runtime instead of shrugging.
New files only - deliberately NO touches to api/chat/agent.ts/
TripWorkspace, which the parallel session is rewriting (streaming/
booking); agent wiring is the explicit next phase after that merge.

- `src/lib/explore/resolver.ts` (server-only by convention) -
  city query → Wikipedia search (Hebrew first, English fallback) →
  city coordinates → geosearch (10km, 50 candidates) → one batch call
  for extracts/thumbnails/urls → up to 12 places. Filters:
  disambiguation pages out, extracts under 40 chars out, ranked by
  has-image + article length (transparent proxies, not invented
  ratings). Category via keyword heuristic (guessCategory). Every
  field traces to the article: description=extract, photo=lead thumb,
  coords=article coords. Test override: EXPLORE_WIKI_HE/_EN env vars.
- `/api/explore?q=` - in-memory cache 12h for hits, 5min for nulls (a
  transient wiki failure must not poison a city for half a day).
- `/explore` page + ExploreClient - search → honest "נחקר אוטומטית ·
  לא נבדק על ידי הצוות" badge, city summary + wiki source link, map
  (PlacesMap - explored places are regular Place objects with xp-
  prefixed ids), photo cards with category labels and wiki links.
  A city that IS in the catalog short-circuits to its curated page
  (curated always wins). Honest empty state when resolution fails.
  Explored destinations persist client-side (lib/explore/storage.ts,
  20 most recent) ready for trip integration.
- Nav gained a "חקירה" tab.

Verified E2E against a mock MediaWiki server (Wikipedia is BLOCKED
from this sandbox - one live check on a real network is still owed):
full explore flow renders 6/8 mock POIs (both junk filters proven),
localStorage persistence, curated-city redirect card, honest
not-found. build + tsc clean.

**Next session should know:** phase 2 = agent integration (an
explore_destination tool + destOf() fallback to the explored store in
the trip domain + share-link v2 for explored trips) - do it AFTER the
streaming/booking merge lands, it touches the same files. Also run one
live smoke test of /api/explore on a machine with Wikipedia access
(the E2E only proves the pipeline against the mock's response shapes).

### 2026-07-25 (kk) - AI Explorer phase 2: wired into the agent (the /explore page is gone)

Per Netanel: no standalone page - exploration happens inside the chat
when a user asks for a destination that is not in the DATA.

- **Removed**: /explore page, ExploreClient, /api/explore, the "חקירה"
  nav tab. Kept: resolver.ts (unchanged), storage.ts (rewritten - now
  stores adapted Destination objects, key tiyul-plus:explored:v2, cap 6).
- **New `lib/explore/adapter.ts`**: exploredToDestination() fills a full
  Destination (countrySlug 'explored', flag 🧭, honest practical texts)
  so every trip surface works with no special cases;
  sanitizeExploredDestinations() validates the client-echoed list
  server-side (slug ^explored-, place ids ^xp-\d+$, finite coords,
  length caps, max 6×15) - the server never trusts client shapes.
- **agent.ts**: new `explore_destination` tool (model calls it when the
  user asks about an uncovered destination); executeAgentTool takes an
  optional exploredDestinations param - destOf()/validSlugs() fall back
  to it (curated always wins; the function is synchronous so the
  module-level registry is race-free).
- **route.ts**: the tool is intercepted in the agent loop (it is the
  only async tool - wiki fetch): curated-name queries short-circuit
  ("already in DATA"); success pushes the adapted Destination into the
  request's explored list, streams {type:'explored'}, and returns the
  id list to the model so it can build immediately; failure returns an
  honest is_error. Explored grounding rides as a separate
  clearly-labeled block appended to groundingDetail each iteration
  (exploration in iter N is groundable in N+1). System prompt's
  "not covered" rule now routes through the tool, with a hard
  requirement to present results as auto-explored/unverified and never
  claim flight/visa/kosher facts for them.
- **useTripChat**: sends the stored explored list with every request
  (so the agent validates old explored trips), handles {explored}
  events (saveExplored + state), exposes chat.explored.
- **TripWorkspace**: destOf() falls back to chat.explored - canvas,
  map, print, day descriptions all render explored trips. Share/
  WhatsApp buttons are hidden for trips containing an explored city
  (share links validate against curated only; v2 payload embedding the
  places is the follow-up if wanted).

**Verified** (no ANTHROPIC_API_KEY in this sandbox - the model side of
the loop is the untested link): 12/12 node harness checks (adapter,
sanitizer junk/caps, create_trip_full & add_day on an explored city
with real validation, curated precedence, unknown-without-extras) and
a client E2E with a mocked SSE stream (explored+trip events → canvas
renders the Lisbon trip, stops + pins + derived day description, share
hidden, print kept, localStorage v2 saved, full render survives
reload). Wikipedia is also blocked here - the resolver still needs one
live smoke test, now doable only through a real chat conversation on a
keyed deployment ("טיול לפורטו" should trigger חוקר את היעד…).

### 2026-07-25 (jj) - Continuous expansion run (branch data/expansion-3): stopped immediately on the scale guardrail

Prompt asked for continuous catalog expansion "until told to stop," with an
explicit pre-flight instruction to check the three scale guardrails every
~10 destinations and stop cold if any tripped - measured them BEFORE writing
any content, as a sanity check. One is already tripped, with zero new
destinations added this session:

- Static pages: 93 (limit ~250) - fine.
- Largest client JS chunk: ~572 KB (limit ~1.5 MB) - fine.
- **Chat grounding is already over budget.** `buildGrounding()` in
  `src/app/api/chat/route.ts` serializes all 47 destinations / 562 places
  (truncated descriptions, tags, priceLevel, mustSee, full itineraries and
  practical blocks) to 258,544 JSON chars. Two independent char-count
  heuristics (÷4, ÷3.2 - no real tokenizer available offline) put that at
  roughly 65,000-80,000 tokens, i.e. 30-60% past the ~50k-token guideline
  in the brief - and this is the ORIGINAL pre-session catalog, before this
  run added anything.

Per the brief's own stop condition, did not add any destinations this
session. Wrote the measurement up in TODO.md (new "BLOCKED" section at the
top) with the three architectural options that would unblock further
growth (per-destination retrieval instead of whole-catalog grounding,
region-split data files, or moving the catalog behind a DB/PlacesProvider
fetch) - none attempted here, all are refactors out of scope for an
additive data-only branch. `data/expansion-3` therefore carries only the
TODO.md note and this log entry, no data changes.

**Next session should know:** the grounding-size problem almost certainly
predates this run by several batches - it likely crossed 50k tokens
somewhere in the 2026-07-25 overnight expansion (24→47 destinations in one
night) without anyone measuring it, since no earlier session log entry
records a grounding-size check. Whoever picks up content work next should
NOT add destinations until the grounding fix lands; whoever picks up the
grounding fix should re-measure with the real Anthropic tokenizer/actual
API usage logs (the dev console already logs one usage line per model
call - a single live `/api/chat` request would give an exact
`input_tokens` number more trustworthy than this session's char-count
estimate).
### 2026-07-25 - Booking/affiliate layer: the agent raises it, the app links it

Branch `feat/booking-layer`. The split is the whole point: the model
decides WHAT to bring up and records the answer; it never produces a URL,
price or availability claim. Every link is composed deterministically from
one config.

**Built/changed:**
- `src/lib/booking.ts` (new) - the single source of truth for providers
  and links. Six kinds: flights / stay / activities / esim / insurance /
  car. Each carries Hebrew copy, the agent's one-line question, an
  `affiliate` slot (`{ template, idKey }`, all null today) and a
  `publicUrl`. `buildBookingUrl(kind, query)` prefers a real affiliate
  link when its ID exists, otherwise the provider's public site, and
  returns null when no provider is chosen (the card renders "בקרוב").
  Affiliate IDs are read as STATIC `process.env.NEXT_PUBLIC_AFFILIATE_*`
  properties so Next can inline them client-side - a dynamic `env[key]`
  lookup silently returns undefined in the browser.
- `src/lib/services.ts` - no longer its own config; the homepage services
  grid is now derived from `bookingProviders`, so one ID change updates
  both surfaces. `QuickServices.tsx` untouched.
- `src/lib/trip/types.ts` - `BookingKind`, `BookingStatus`
  ('have' | 'need' | 'not_needed') and `TripPreferences.booking`
  (a partial record). A missing key means "never asked" - distinct from
  "not needed".
- `src/lib/trip/agent.ts` - new `set_booking_status` tool. Validates
  every field against the enum, merges instead of replacing, ignores
  unknown keys entirely (a URL passed as an extra field cannot land on
  the trip), and its tool result reminds the model that the buttons are
  rendered by the app and it must not write links.
- `src/app/api/chat/route.ts` - a BOOKING section in the system prompt:
  raise it only AFTER a real itinerary exists and the user seems happy,
  one topic per turn, one short line, with `suggest_quick_replies`;
  choose the topic from the trip (activities when the plan has must-see
  attractions, car when days leave the city); record the answer with
  `set_booking_status` IN THE SAME TURN; never re-ask a topic that
  already has a value; drop the subject if the user is uninterested.
  BOUNDARIES was updated - the agent may mention the buttons exist but
  never writes a link, price or availability itself.
- `src/components/BookingPanel.tsx` (new) - "מה עוד חסר לטיול", a
  collapsible section under the itinerary in `TripWorkspace` with a
  card per kind: status chip, three manual toggles writing the same
  `Trip.preferences.booking` field the agent writes, and the outbound
  button (or "בקרוב"). `rel` carries `sponsored` ONLY when the link is
  genuinely an affiliate one. A quiet disclosure line states we don't
  book, charge or hold card details.

**Provider status - what is a placeholder and what needs a real ID:**
| kind | provider | link today | needs |
|---|---|---|---|
| flights | Skyscanner | public homepage (no deep link - would need IATA codes we don't store) | affiliate ID + route URL format |
| stay | Booking.com | real public search `?ss=<city>` | affiliate ID (aid/label) |
| activities | GetYourGuide | real public search `?q=<city>` | partner ID |
| esim | Airalo | public homepage (country slugs not in our data) | affiliate ID |
| insurance | none chosen | "בקרוב" | pick a provider first |
| car | none chosen | "בקרוב" | pick a provider first |

No tracking parameter is invented anywhere; a test asserts that.

**Verification:** 18/18 logic checks against the real modules (link
building, URL-encoding, empty-query fallback to the site root, enum
validation, merge-not-replace, unknown fields dropped, no-trip failure,
`set_preferences` leaving booking intact); 24/24 CDP checks at 1400px and
390px (six cards, four real outbound links, nofollow+noopener and no fake
`sponsored`, "בקרוב" for the two providerless kinds, agent-set status
rendering, manual toggle writing storage, open-count badge, no horizontal
overflow); and live agent runs with a real key - turn 1 builds without
pitching anything, no URL ever appears in a reply, and 3/3 phrasings of a
user answer are recorded in the same turn.

**One fix worth remembering:** the first live run had the model reply
"רשמתי..." without calling the tool - the answer was silently lost. The
prompt now states that saying it without the call is a hard error, and
that a partly-vague sentence should still record the explicit part
("הכל סגור חוץ מהכרטיסים" → activities=need only). That took 3/3 runs
from 2/3.

**Broken/deferred:** the search query uses the first city's Latin name
(`nameLocal` split on "/"); a multi-city trip searches only the first
city. Insurance and car are deliberately dead cards until Netanel picks
providers.

### 2026-07-25 - Consolidation: booking layer + expansion-3 docs merged to main

Two branches merged (one at a time, `tsc` after each; one build + one
photo verification for the whole batch, per hard rule 7a):
- `data/expansion-3` - docs only (the chat-grounding size guardrail note
  in CLAUDE.md + TODO.md). Session-log conflict, union-resolved.
- `feat/booking-layer` - the booking/affiliate layer.

**Two real code conflicts, both pure additions from two parallel
sessions, both union-resolved (nothing dropped):**
- `src/lib/trip/agent.ts` import line - the AI-Explorer session added
  `Destination`, this one added `BookingKind`/`BookingStatus`. Kept both.
- `src/app/api/chat/route.ts` `toolStatusText()` - one session added the
  `explore_destination` case, the other `set_booking_status`. Kept both.

Verified after merging: `AGENT_TOOLS` carries BOTH new tools, the system
prompt carries BOTH new sections (the explore rule at GROUNDING and the
BOOKING section), `npm run build` clean (93 static pages - the AI Explorer
route added one), `tsc --noEmit` clean, `verify-photos` 526/526 from
cache, and the two CDP suites re-run against the MERGED main: booking
panel 24/24 at 1400px and 390px, unified trip view 17/17.

**State of main:** no unmerged branches remain.

### 2026-07-25 - Site-wide search: one overlay, entry points everywhere it belongs

The Phase-3 leftover ("site-wide search, Hebrew + local names"). ONE
implementation, several triggers - not a different search per page.

**Built/changed:**
- `src/lib/siteSearch.ts` (new) - a flat index over the whole catalog:
  every country, every city and every PLACE (562 of them), each with a
  Hebrew title, a context subtitle, a flag and an href. Matches on Hebrew
  name, local/Latin name, slug and country, reusing `normalizeQuery` from
  `citySearch.ts` so quoting quirks behave the same everywhere. Ranking is
  deliberately plain and predictable: title-prefix > word-start >
  contains, then countries → cities → places.
- `src/components/SiteSearch.tsx` (new) - the overlay plus three trigger
  shapes: `icon` (nav), `field` (the catalog, where search is the primary
  action) and `menu-row` (mobile hamburger). Ctrl/Cmd+K opens, Escape and
  backdrop-click close, arrows move, Enter picks. Results are grouped by
  kind with Hebrew headings.
- **The catalog is loaded by dynamic `import()` on first open.** This is
  load-bearing: `siteSearch.ts` pulls all of `destinations.ts`, and a
  nav-level static import would have put the entire catalog into every
  page's bundle. For the same reason the component does NOT statically
  import anything by value from `siteSearch` - only types (erased) - and
  keeps its own copy of the group labels; `searchSite` arrives through the
  dynamic module. Largest chunk stayed 560 KB.
- `src/components/SiteNav.tsx` - icon trigger in the md+ row, search row
  at the top of the mobile menu (closes the menu on navigate). Present on
  every page since the nav is in the layout.
- `src/app/countries/page.tsx` - a full-width field trigger under the
  catalog heading.
- `src/app/destinations/[slug]/DestinationClient.tsx` - a free-text filter
  over that city's own places (name / local name / description), sitting
  above the existing category chips and composing with them; the map
  follows the filter because it already renders `visiblePlaces`. Also
  `?place=<id>` support: the page scrolls to that place and ring-highlights
  it, which is what a place result from the global search links to.
  The param is read from `window.location.search` in an effect, NOT via
  `useSearchParams` - the latter opts the route out of static prerender
  (the build failed on `/destinations/bangkok` before this change).

**A real finding from testing, fixed:** searching "דובאי" is not empty -
it substring-matches "נקיק אולדובאי" (Olduvai Gorge, Tanzania), so the
user got one irrelevant hit and no way forward. Every result list now ends
with a persistent "לא מצאתם? לשאול את הסוכן על X ←" row (and a true
no-match still shows the honest "אין X בקטלוג שלנו"). Both routes hand off
to `/chat?q=`, where the agent can auto-explore and say honestly what it
does and doesn't know.

**Verification:** 26/26 CDP checks against a production build - the nav
button on /, /countries, /kosher, /destinations/*, /chat; the catalog
field; Hebrew, Latin, country and PLACE queries all resolving correctly
("אקרופוליס" → האקרופוליס והפרתנון · אתונה); the weak-match and true-empty
escape hatches; clicking a place landing on
`/destinations/athens?place=ath-acropolis` with the card highlighted;
the in-city filter cutting Vienna 20 → 4 with the map pins following;
mobile menu row opening the same overlay; and zero horizontal overflow at
1400px and 390px. build clean (93 pages), tsc clean, verify-photos
526/526 cached.

**Deferred:** matching is substring-based (hence the Olduvai case) - a
word-boundary-aware matcher would be sharper, but it would also stop
finding "אקרופוליס" inside "האקרופוליס והפרתנון", so plain substring +
the escape hatch is the honest trade for Hebrew.
### 2026-07-25 (ll) - User accounts: email-OTP login + cross-device trip sync

Phase 4's accounts item, on the Supabase project Netanel created
(TiyulPlus / srnaxnracdw...). New dependency @supabase/supabase-js
(the official client - session persistence + token refresh; approved
via the Supabase decision).

- **Auth**: `lib/auth/client.ts` (browser singleton off
  NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY - both unset ⇒ feature silently
  off, no login UI, site unchanged), `lib/auth/AuthContext.tsx`
  (email OTP: sendCode/verifyCode/signOut, GoTrue errors translated to
  Hebrew). No passwords, no OAuth yet (Google needs a Google Cloud
  setup - follow-up if wanted).
- **UI**: `AccountButton.tsx` in SiteNav (both breakpoints) -
  "התחברות" opens an email→6-digit-code modal; logged in shows an
  initial-letter avatar with a small menu (email, sync note, logout).
- **Sync**: `lib/trip/sync.ts` + invisible `AccountSync.tsx` in
  layout (inside Auth+Trip providers, zero changes to other
  components). Model: localStorage stays the offline-first working
  copy; on login - pull + merge (latest-wins by the new
  Trip.updatedAt, stamped in TripContext's mutation points) and local
  trips push up automatically (= first-login migration); on every
  local change - debounced (1.5s) upsert; local deletions delete
  remote rows. The client never sends user_id on reads - RLS derives
  identity from the JWT.
- **DB**: `supabase-accounts.sql` - user_trips (user_id+id PK, data
  jsonb) with per-user RLS on all four verbs. NETANEL MUST RUN THIS
  in the SQL Editor + verify Email provider is on in Authentication,
  and add NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY to .env.local and Vercel
  (same values as the server pair; documented in .env.example).

**Verified** against a full local GoTrue+PostgREST mock (Supabase is
network-blocked from this sandbox; mock enforces per-uid isolation
like RLS and accepts OTP 123456): device1 local trip + login →
migrated up; clean device2 same account → trip pulled and rendered;
device2 rename → device3 login sees the new name; a different account
sees 0 trips; deletion synced; logout restores the login button.
build + tsc clean. Live smoke test on the real project still owed
(login → trip appears in Table Editor → second browser sees it).

**Next session should know:** chatStorage (conversations) and the
explored store are still local-only by design - candidates for the
same sync pattern later. Supabase free tier pauses after ~a week idle
- wake it in the dashboard if logins suddenly fail pre-launch.

### 2026-07-25 (mm) - User hub: /account - פרופיל, דרכון מדינות, טיולים, הגדרות

The logged-in home. New route /account (linked from the avatar menu -
"האזור האישי"), everything auto-saves.

- **DB**: supabase-profiles.sql (NETANEL MUST RUN) - profiles table
  (display_name, phone, avatar as a client-side-compressed 192px JPEG
  data-URL ~20KB so no Storage bucket is needed yet, visited jsonb of
  ISO2 codes, prefs jsonb) with own-row RLS.
- **lib/auth/profile.ts** - fetch/upsert + imageToAvatar (canvas
  square-crop+resize). **AuthContext** now loads the profile after
  login and exposes profile/saveProfile (optimistic).
- **/account (AccountClient)** - four cards:
  · Profile: night banner, avatar upload with hover-camera overlay,
    display name + phone (debounced autosave, "נשמר ✓" flash).
  · דרכון המדינות - the fun one: ~85-country Hebrew list
    (data/worldCountries.ts, ISO2+continent), searchable toggle chips
    with flags, big X/195 counter, traveler levels (7 tiers from
    "עוד לא יצאנו לדרך" to "אגדת נסיעות") with a gradient progress
    bar to the next tier, per-continent breakdown, "בקטלוג" badge on
    covered countries + CTA back to /countries.
  · Trips: synced list (opens via setCurrentId → /chat), empty state.
  · Settings: account-default kosher toggle (also mirrors into the
    homepage toggle's localStorage key), sign out, delete-all-trips
    (cascades to remote via the existing AccountSync deletion sync).
- **Nav**: avatar button shows the real profile picture when set;
  menu gained the hub link.
- codeToFlagEmoji/flagToCode helpers bridge ISO2 ↔ the emoji-based
  Flag component in both directions.

E2E vs the extended mock (profiles endpoints added, maybeSingle
handled): logged-out gate, autosave indicator, avatar upload renders
in card+nav, 4 countries toggled → counter/level/continents correct,
FULL cross-device sync (second context sees name/phone/4 visited),
menu link present. build + tsc clean.

### 2026-07-25 (nn) - קהילת מטיילים: חיפוש משתמשים, פרטיות תחילה

- **DB**: supabase-community.sql (NETANEL MUST RUN) - עמודת is_public
  (ברירת מחדל false) + view בשם public_profiles בהרשאות בעלים שחושף
  אך ורק user_id/display_name/avatar/visited של מי שבחר להיות ציבורי
  ויש לו שם תצוגה. מייל, טלפון וטיולים לא נחשפים לעולם.
- **profile.ts**: isPublic על הפרופיל; searchPublicProfiles (ilike על
  השם, עד 20) ו-fetchPublicProfile מול ה-view.
- **/account**: כרטיס "קהילת המטיילים" - חיפוש חי (debounce) עם
  תוצאות: תמונה, שם, דרגת מטייל ומספר מדינות, קישור לפרופיל; טוגל
  "פרופיל ציבורי" בהגדרות עם הסבר מה נחשף + התראה כשאין שם תצוגה
  (ה-view מסתיר חסרי-שם). ה-switch חולץ לקומפוננטת Toggle משותפת.
- **/u/[id]**: עמוד מטייל ציבורי - באנר לילה, תמונה, שם, דרגה,
  פירוק יבשות, "🤝 ביקרתם שניכם ב-X מדינות" (חיתוך מול הדרכון שלי
  כשמחוברים), דרכון מלא עם הדגשת המשותפות, ומצב כן לפרופיל פרטי/לא
  קיים. תוקן קליפינג של השם אל תוך הבאנר (השם ירד מתחת לאווטאר).
- **באג אמיתי שנתפס בבדיקות**: saveProfile חישב את המיזוג בתוך
  ה-state updater של React (לא מובטח סינכרוני) - שני saveProfile
  רצופים (סימון מדינות ואז טוגל) דרסו שדות עם פרופיל ריק. תוקן עם
  profileRef שמתעדכן סינכרונית. זה היה פוגע גם בשמירות מהירות בהאב.

E2E מול המוק (view + ilike): דנה ציבורית עם 3 מדינות נמצאת בחיפוש של
יוסי (דרגה+מונה בתוצאה), עמוד הפרופיל שלה מציג דרכון + "ביקרתם שניכם"
(יוון המשותפת), משתמש פרטי לא מופיע בחיפוש ועמוד הפרופיל שלו חסום.
build + tsc נקיים.

### 2026-07-25 (oo) - חיפוש מטיילים גם לפי מייל (מדויק בלבד)

- supabase-community.sql הורחב (NETANEL: להריץ את הקובץ המעודכן - ה-
  alter/view הקיימים אידמפוטנטיים): פונקציית find_traveler_by_email -
  SECURITY DEFINER (המיילים ב-auth.users), התאמה מדויקת בלבד כדי שאי
  אפשר לסרוק כתובות, authenticated בלבד, מחזירה רק את עמודות הפרופיל
  הציבורי (המייל לא מוחזר לעולם) ורק למי שציבורי.
- searchPublicProfiles: קלט שנראה כמו מייל → RPC; אחרת ilike על שם.
  ה-UI מסביר שחיפוש מייל דורש כתובת מלאה. E2E: מייל מדויק מוצא את
  דנה הציבורית; מייל של משתמש פרטי מחזיר מצב ריק.

### 2026-07-25 (pp) - Car-aware legs, whole-trip map view, route order, quiz city search

Branch feat/quiz-city-search-and-car-range, from three user reports on a
real Slovakia trip (car, arrive Bratislava) plus the /start card wall.

**1. The airplane bug (travel.ts rewritten).** The old catch-all returned
"✈️ טיסה פנימית" for every city pair outside the 10-entry curated table -
so Bratislava→High Tatras (~330km, same country, user has a car) rendered
as a flight. Now two honest layers: curated pairs first (better Hebrew),
otherwise computed from the cities' real coordinates - haversine ×1.25
road factor, ISLAND_GROUP for sea crossings, >900km = honest "טיסה פנימית
או נסיעה ארוכה", and `hasCar` (from preferences.booking.car =
'have'|'need') → "🚗 כ-X ק"מ · כ-Y שעות נסיעה". TripWorkspace passes the
car flag everywhere legs render (day-tab strip, day banner, print);
SharedTripView passes coordinates but no car flag BY DESIGN - the share
payload deliberately excludes preferences.

**2. Whole-trip viewer (the "important feature").** New
`lib/trip/dayColors.ts` (10-color palette, brand sunset first).
`MapInner.tsx` gains an optional `groups: MapGroup[]` prop - when passed,
it drives FitBounds, a thinner/fainter route line and the pins (day color
in the teardrop, day NUMBER inside, popups prefixed "יום N · "); one
shared PlacePopup now serves both marker branches. `TripWorkspace` gains a
day/כל-הטיול segmented toggle above the map (renders only when >1 day
with stops), a tripGroups memo (above the hydration early-return - hook
rules), and a clickable legend under the trip map (color dot + יום N +
city) that jumps back to that day in day mode.

**3. Route order (the zigzag complaint).** Deterministic aid in agent.ts:
create_trip_full's tool result now appends "מסלול בפועל" - the actual
city sequence with computed road distances - plus a ⚠️ זגזוג warning when
a city is revisited mid-trip (returning to the FIRST city at the END is
allowed - that's a legitimate loop). travel.ts exports haversineKm for
this. System prompt: new ROUTE ORDER rule - day 1 = the arrival city, end
at departure, one contiguous block per city, fix a warned zigzag with
set_day_places in the same turn.

**4. /start quiz + car-range explore (carried from earlier).** Quiz
destination step uses the shared searchable CityCombobox (promoted
app/planner → components) instead of 47 cards; resolver.ts gains
ExploreScope 'city'(10km)/'area'(45km) with ring sampling (center + 8
offsets) around MediaWiki's hard 10km ggsradius cap, 60% near-quota so
area mode adds day trips without scattering the trip, honest computed
distance labels. Chat prompt: "DISTANCE IS NOT A LIMIT" rule (explore
scope 'area' when the user has a car).

**Verification:** tsc + build clean (94 pages). Trip-view E2E (playwright
global install, production build, seeded 4-day Bratislava+Tatras trip
with car): 18/20 at 1400px+390px - both "fails" were the test's click
being intercepted by the divIcon; popups confirmed manually carrying
"יום N · " prefixes. In-country leg renders 🚗 (~314 ק"מ · 3.5 שעות), no
✈️ anywhere. Route-summary harness 4/4 (good order / zigzag warned /
loop-to-start allowed / single city = no route line). Resolver E2E vs
mock wiki 9/9 (city keeps 8 near POIs, junk filtered; area adds
Pena/Cabo da Roca/Cascais). /start quiz E2E 11/12 (the miss: the test
clicked "המשך" through the open dropdown; closing it first advances fine).

**Environment note - verify-photos:** this run showed 526/526 photo URLs
returning 403 with an EMPTY cache - upload.wikimedia.org is blocking this
sandbox wholesale (the CLAUDE.md gotcha about sandboxes blocking image
hosts, now hitting the verifier itself). ZERO data files changed in this
branch, so nothing regressed; the next session on a normal network should
re-run verify-photos to repopulate the cache before trusting it.

**Broken/deferred:** route summary only rides on create_trip_full -
set_day_places/add_day edits don't re-report the route (the model sees
CURRENT TRIP anyway). The zigzag rule + prompt are enforced
deterministically but the live-model behavior (does it actually reorder
after the warning?) is untested here - no ANTHROPIC_API_KEY in this
sandbox; test on the deployed site with the user's Slovakia prompt.
Still owed from earlier sessions: Netanel must run supabase-community.sql
(profile saving broken live without it), live smoke of the Explorer.

### 2026-07-25 (qq) - Photo pins at city zoom (+ trip-map zoom-snap bug fixed)

Per Netanel's zoomed-in screenshot request: "when zoomed in, small
pictures can be showed above the pins".

- `MapInner.tsx`: PHOTO_PIN_ZOOM = 13. A ZoomTracker component
  (useMapEvents zoomend) keeps the current zoom in state; at 13+ every
  pin renders the place's photo (44x40, rounded, cream ring) above the
  teardrop - in day mode AND on whole-trip group pins. Below 13 the
  pins stay clean (country view would turn into photo soup). A photo
  that fails to load removes itself via inline onerror, leaving the
  plain pin - no broken-image icons.
- `globals.css`: .pin-stack flex column (the highlight scale transform
  moved here from .pin) + .pin-photo.
- **Real pre-existing bug caught by the E2E and fixed:** in grouped
  (whole-trip) mode `flat` was built with `groups.flatMap()` on every
  render, so ANY re-render re-triggered FitBounds and snapped the map
  back to the fitted view - zooming into the whole-trip map was
  literally impossible (each zoomend re-rendered and instantly
  un-zoomed). `flat` is now useMemo'd. Day mode never hit it because
  `places` was already a stable memo from TripWorkspace.
- Debug trick worth keeping: read the real Leaflet zoom in headless
  tests from the tile URL (`voyager/{z}/` in .leaflet-tile-pane img
  src) - no map handle needed.

Verified on a production build with a playwright route serving a valid
generated PNG for upload.wikimedia.org (blocked wholesale from this
sandbox - and NOTE: a malformed mock PNG makes onerror remove the pins,
which looks exactly like the feature failing; generate a real PNG):
6/6 checks - day mode 3/3 photo pins at city zoom, photos removed after
zooming below 13, trip mode clean at country zoom, group pins gain
photos zoomed in, mobile 390px fine, no overflow.

### 2026-07-25 (rr) - Chat beside the map at lg; TripChip removed (nav duplication)

Two fixes from Netanel's laptop screenshot:

- **The agent panel is now a side column from lg (1024px) up**, not a
  full-width panel under the map. The grid gained a third column at lg
  with narrower side columns than xl (16rem itinerary / flexible map /
  19rem chat; xl keeps 20/1fr/22), and ChatPanel is sticky at lg too.
  Mobile (<lg) keeps the bottom bar + drawer. Verified 1024/1280/1440:
  three columns, no overflow.
- **One nav button per trip.** The nav rendered BOTH the trip tabs
  (tripLabel = city names) AND the old TripChip (trip.name + stop
  count) - a single trip showed as two different-looking buttons.
  TripChip is deleted (was only used in SiteNav); the mobile hamburger
  had the same duplication (a current-trip row above the "הטיולים
  שלי" list) - also removed. The trips list/tabs are now the single
  way trips appear in the nav, on both breakpoints.

Note: the walkthrough sections above still mention TripChip in a few
places - historical descriptions, the component no longer exists.

### 2026-07-25 (ss) - מכסות ותקציבי AI, מנוי פרימיום, ייבוא Google My Maps

סשן ארוך אוטונומי לפי בקשת נתנאל: "rate limiting לכל מה שאפשר לנצל
לרעה, הגבלת טוקנים, מנוי פרימיום, וכפתור ייבוא מפה מ-My Maps".

**1. מכסות (בלי תלות חדשה).** `lib/server/limits.ts` - חלונות קבועים
בזיכרון (checkLimit) + תקציב "יחידות AI" יומי (קלט לא-מקאש + כתיבות
מטמון + פלט×4; קריאות מהמטמון חינם). עם SUPABASE_SERVICE_ROLE_KEY
התקציב נשמר גם ב-usage_daily (RPC אטומי bump_usage) - עמיד ל-cold
start ולריבוי instances; בלעדיו הזיכרון המקומי עדיין עוצר הצפות.
`lib/server/identity.ts` - זיהוי קורא: טוקן Supabase מאומת מול GoTrue
+ תוכנית משורת הפרופיל (מטמון 5 דק׳), אנונימי לפי IP.
`lib/plans.ts` - קונפיג התוכניות המשותף לאכיפה ול-UI (free: 40 צ׳אט/
יום, פרץ 6/דקה, 300k יחידות; premium פי 10).

**2. חיווט לכל endpoint שאפשר לנצל:** /api/chat (פרץ→429; מכסה יומית/
תקציב→הודעת סטרים מנומסת בעברית עם הפניה ל-/premium; רישום usage מכל
קריאת מודל, גם כשהתור נופל באמצע), /api/generate-trip (מעל המכסה יורד
ל-generateTrip המקומי החינמי במקום עידון AI - הפיצ׳ר לא נשבר),
/api/share (הלקוח נופל בשקט לקישור הארוך), /api/import-map,
/api/billing/checkout. useTripChat/PlannerClient שולחים את טוקן
ה-Supabase (authHeader ב-lib/auth/client) - מחוברים נמדדים לפי חשבון.

**3. פרימיום.** supabase-premium.sql: עמודת plan עם הרשאות ברמת
עמודה - authenticated לא יכול לכתוב plan/stripe_customer_id (רק
ה-service role, כלומר ה-webhook); usage_daily חסומה לגמרי ל-anon/
authenticated. Stripe בלי SDK: checkout session ב-REST form-encoded;
webhook עם אימות חתימה ידני (HMAC-SHA256 על t.body, סבילות 5 דק׳,
timingSafeEqual) - completed→premium, ביטול/לא-פעיל→free לפי חיפוש
customer id. עמוד /premium (השוואה שנגזרת מהקונפיג האמיתי, לא מועתקת)
+ צ׳יפ תוכנית ושדרוג ב-/account. fetchProfile קורא plan עם נפילה
לבחירה בלי העמודה אם ה-SQL עוד לא רץ - פרופילים לא נשברים בינתיים.

**4. ייבוא Google My Maps.** lib/import/mymaps.ts: חילוץ mid בלבד
מהקלט (לא מושכים כתובות משתמש - SSRF; קישור מקוצר נפתח עם
redirect:manual וקוראים רק את Location), משיכת ה-KML הציבורי, פרסר
Placemarks עמיד ל-CDATA/HTML (נקודות בלבד - קווים/פוליגונים מדולגים),
המרה ליעד בסגנון explored ששורד את sanitizeExploredDestinations
(התקרה הועלתה 15→40 מקומות). שני פתחים: כפתור "📍 ייבוא מפה" + מודל
בסדנת הטיול, וטאב הקישור ב-/start (נקרא עכשיו "ייבוא מקישור") שמייבא
באמת - מפה→טיול של עד 4 עצירות ליום לפי סדר המפה. TripAdvisor נאמר
בכנות כלא-נתמך (אין לו ייצוא ציבורי). יוטיוב/אינסטגרם נשארו בהודעות
הכנות הקיימות.

**אימות:** 30/30 יחידה (מגביל, יחידות, חתימת Stripe כולל replay,
פרסר KML, round-trip דרך הסניטייזר); 17/17 E2E מול מוקים (429 בכל
ארבעת ה-endpoints מבודד לפי IP, ה-webhook כותב plan=premium + מוריד
plan=free דרך חיפוש customer); 19/19 בדפדפן (ייבוא מלא מ-/start →
טיול 2 ימים עם סיכות, שרידות ריענון, המודל בסדנה, עמוד הפרימיום
בדסקטופ ומובייל). tsc + build נקיים.

**מה מחכה לנתנאל (גם ב-TODO.md):** להריץ supabase-premium.sql; להוסיף
SUPABASE_SERVICE_ROLE_KEY; להקים מוצר+Price ב-Stripe ולמלא את שלושת
מפתחות ה-STRIPE_*; **לאשר את המחיר 19.90 ₪/חודש** (הצעת הסשן,
PREMIUM_PRICE_ILS ב-lib/plans.ts - חייב לתאום ל-Price ב-Stripe);
בדיקה חיה של ייבוא מפה אמיתית (גוגל חסום מהסנדבוקס - נבדק מול מוק).

**ידע לסשן הבא:** מגביל הפרץ הוא בזיכרון per-instance - על Vercel זה
מספיק נגד הצפות אמיתיות אבל לא ספירה גלובלית מדויקת; אם יידרש דיוק
מלא, usage_daily כבר קיימת כתשתית. הודעת המכסה בצ׳אט היא סטרים רגיל
(לא 429) בכוונה - חוויית שיחה, והלקוח לא צריך טיפול חדש.

### 2026-07-25 - הרחבת קטלוג (פורטוגל/ליסבון + טיולי יום לווינה ופראג) + משימה לילית

**הבקשה:** להמשיך למלא את מסד הנתונים בלילות - מדינות חדשות וגם
מקומות חדשים במדינות קיימות - עד שנתנאל יגיד לעצור.

**מדד הסקייל לפני כתיבה (הכלל הקשיח):** נמדד `buildGroundingIndex()`
אופליין - 78,790 תווים ≈ 20-25k טוקנים מול הנחיית ה-50k. יש מרווח
של כ-20-30 יעדים נוספים, ולכן ההרחבה מאושרת. אחרי הסשן: 80,370 תווים.

**מדינה חדשה: פורטוגל + ליסבון.** 11 מקומות, כל קואורדינטה אומתה מול
dbpedia (WGS84) בסשן הזה, מסלול 3 ימים, דירוג מערכת 4.5 עם חסרונות
אמיתיים (עליות תלולות ואבן חלקה, מרכז היסטורי צפוף, תשתית כשרות
דלה מאוד). שישה מועמדים (קינטה דה רגלירה, פדראו דוש דשקוברימנטוש,
גולבנקיאן, מוזיאון האריחים, קשקאיש, פארק אדוארד השביעי) **הוסרו**
כי dbpedia לא מחזיקה להם קואורדינטות - לא הומצאו הערכות.
`kosherOverview` מציין את הקהילה בכנות ואומר שצריך לתאם טלפונית
מראש; לא הומצא אף בית עסק כשר.

**מקומות חדשים במדינות קיימות:** ווינה → `vie-melk` (מנזר מלק)
ו-`vie-durnstein` (ואכאו); פראג → `prg-karlstejn`, `prg-kutna-hora`,
`prg-sedlec`. באדן ליד ווינה הוסרה - אין לה קואורדינטות ב-dbpedia.

**מדיניות תמונות (חדש):** לסנדבוקס אין יותר יציאה ל-Wikimedia
(HTTP 000 ב-curl; commons ו-api.php הם cache-only ב-WebFetch;
nominatim חסום ב-robots). לכן **כל מה שנוסף בסשן נכתב בלי שדה
`photo` בכלל** - ה-UI נופל חזרה לגרדיאנט - במקום לשלוח URL לא
מאומת. הרשימה לתיקון עתידי נמצאת ב-TODO.md תחת "Photos pending".
צינור המחקר שעובד בסנדבוקס הזה: dbpedia JSON לקואורדינטות, דפי
ויקיפדיה רגילים לתיאורים, WebSearch לבדיקות טיסות/כשרות.

**מצב הקטלוג:** 48 יעדים, 33 מדינות, 578 מקומות. tsc + build נקיים,
בדיקת שפיות אוטומטית (כפילויות id/slug, טווחי lat/lng, מרחק מקום
ממרכז היעד, הפניות itinerary) עברה 0 בעיות.

**משימה מתוזמנת לילית:** `trig_01BiLQXCrg2YcgNbGkWmYqUh` - "tiyul+
nightly catalog expansion", רצה ב-23:30 / 01:30 / 03:30 / 05:30
שעון ישראל. הפרומפט עצמאי לגמרי (כל הרצה היא סשן חדש): קלון של
הריפו הציבורי, קריאת CLAUDE.md ו-TODO.md, מדידת הסקייל **לפני**
כתיבה עם תנאי עצירה ב-~48k, אותם כללים קשיחים (בלי המצאות, בלי
`photo`), ו-tsc+build+commit+push עם fallback ל-git format-patch אם
אין הרשאות דחיפה. **לעצור = לבטל או למחוק את הטריגר הזה.**

### 2026-07-25 (המשך) - פולין/קרקוב + טיולי יום לרומא, אתונה וברצלונה

**מדידת סקייל לפני כתיבה:** 81,018 תווים ≈ 20-25k טוקנים. אחרי: 82,517.

**מדינה חדשה: פולין + קרקוב.** 10 מקומות, כל הקואורדינטות אומתו מול
dbpedia: הכיכר הראשית, כנסיית מריה, ואוול, קז׳ימייז׳, מפעל שינדלר,
אושוויץ-בירקנאו, מכרה המלח ויליצ׳קה, תל קושצ׳ושקו, פארק לאומי אויצוב
וזקופנה. מסלול 5 ימים שבו **אושוויץ מקבל יום שלם ונפרד** עם הערה
מפורשת שזה יום קשה רגשית, שצריך להזמין כרטיס מראש גם כשהכניסה
חופשית, ושהאתר עצמו לא ממליץ על ילדים מתחת לגיל 14. דירוג 4.6 עם
חסרונות אמיתיים (כיכר מסחרית ועמוסה, חורף קודר).
`practical.flights` מציין ויז אייר על הקו TLV-KRK (אומת מול אתר
החברה ב-WebSearch) ואומר במפורש לבדוק תדירויות בזמן ההזמנה.
`kosherOverview` מתאר את הקהילה בקז׳ימייז׳ בכנות ומחייב תיאום
טלפוני מראש; לא הומצא אף בית עסק כשר.

**מקומות חדשים במדינות קיימות:** רומא → `rom-villa-deste`,
`rom-villa-adriana` (טיבולי); אתונה → `ath-sounion` (מקדש פוסידון);
ברצלונה → `bcn-montserrat`.

**חסימה חדשה שתועדה ב-TODO: צרפת/פריז.** הפער הגדול ביותר בקטלוג,
אבל אין מקור קואורדינטות עובד: ב-dbpedia הערכים המפורסמים מאוד
(מגדל אייפל, לובר, נוטרדאם) גדולים מדי וה-JSON נחתך לפני
הקואורדינטות; ה-SPARQL endpoint מחזיר 403 דרך הפרוקסי; wikidata
ו-commons הם cache-only; nominatim חסום ב-robots; ול-fr.dbpedia
אין קואורדינטות בכלל. פריז תיבנה רק כשיהיה מקור אמיתי - **לא
להעריך קואורדינטות**.

**מצב הקטלוג:** 49 יעדים, 34 מדינות, 592 מקומות. tsc + build נקיים,
בדיקת השפיות עברה 0 בעיות. כל מה שנוסף - בלי `photo`, ורשום
ב-TODO תחת Photos pending.
