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
- `src/data/destinations.ts` - curated content: 150 destinations across
  83 countries, ~1,313 places (Hebrew), each referencing its country via
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
   "## Session log

### 2026-07-31 (xx) - The dashboard, and the sentence "must get nothing at all"

Netanel asked for an owner dashboard: an aggregate main view, a narrow lookup for
one trip, real access control, a hostile search box, read-only, and a log of when
an admin opens somebody's trip.

**The aggregate view has no person in it, and that is enforced by the payload
rather than by the layout.** `/api/admin/overview` returns counts, medians and
slugs - no email, no display name, no trip id. The harness asserts it by
searching the whole response for `@`, because a field added later would slip past
a visual check.

**It also says what it cannot see.** Only signed-in users' trips reach
`user_trips`; an anonymous visitor's trip lives in their browser. So every number
ships with `scope` text saying so. Without it "37 trips" reads as *all* trips,
and that is a business decision made on a wrong number.

**Typical length is a median, not a mean** - one 90-day outlier moves a mean to
25 and there is a test named after exactly that.

---

**The search box: the claim is not that the string is escaped. It is that the
string does not travel.**

| typed | what reaches the database |
|---|---|
| email | a uuid from GoTrue, after an **exact** match |
| destination | a slug from our own catalog - a closed list in code |
| trip name | **nothing** - the filter runs in memory on rows already fetched |

So even if `pgrest.ts` broke tomorrow there is no channel here, because no
user string is in a query. `pgrest` stays the second layer, not the first. Length,
control characters and LIKE wildcards are rejected on top of that - the wildcards
are technically unnecessary and go anyway, so search behaviour is predictable
rather than a pattern the user can run.

**A partial email returns nothing, deliberately.** Exact match only is what stops
the box from being an address scanner.

**Read-only is structural.** The route has no POST, PATCH or DELETE - editing
somebody else's trip is absent from the code, not blocked in it. The harness
fires all four verbs and gets 405.

**The log records opening a trip, not searching.** A search returns names and no
content; a log that fills with noise is a log nobody reads. The write happens
**before** the content is returned, and there is an assertion on that ordering.

---

**Two real bugs the aggregation tests caught, both in my own new code.**

`typeof [] === 'object'`, so a row whose `data` was an array passed the guard and
was counted as a real trip with zero days - inflating the count and dragging the
median down at the same time. And a Rome+Venice trip counted **twice** for Italy,
which would have turned "which countries people plan for" into a measure of how
many cities each country has in the catalog.

**And a third, older one, found by looking at the screen.** The new card rendered
**"אורך טיפוסי: 1 ימים"**. That is the `כ-1 שעות` species from entry (kk), and it
turned out not to be new: the nav, the homepage trip card, the summary chip, the
account list, the shared-trip page and the OG description all print `${n} ימים`,
so every one-day and two-day trip has been showing it. `daysHe` now returns
יום אחד / יומיים / N ימים, exactly as `formatDurationHe` already did for hours,
and a test sweeps 1..60 asserting the broken form cannot come back.

---

**Verified.** 96/96 in a new access harness against a Supabase stand-in that
**logs every request the server makes**, which is what turns "gets nothing" from a
UI claim into a measured one: an anonymous caller, a forged token and an ordinary
signed-in user each get 404 from all thirteen admin endpoints, and for the
non-admin the only calls that ever leave the server are token verification and the
role read - **no trip row is fetched at all**. Plus 27 hostile payloads across the
three modes returning nobody else's trip. 32/32 in a real browser at 1440 and 390:
the cards render RTL with zero overflow, the search finds and opens a trip with
place *names* rather than ids, and an ordinary user's `/admin` shows the same
"not found" screen an anonymous visitor gets, with no trip name anywhere in the
DOM. 385 unit tests (16 new), build and tsc clean, lint at the pre-existing 34.

---

**What now has to go in the privacy policy, plainly.** This is the list Netanel
asked for; the wording is his.

1. **Trips saved to an account are stored on our servers** (Supabase), not only in
   the browser, and are readable by us. Anonymous trips are not - they stay on the
   device. That distinction is worth stating because it is also the honest answer
   to "what do you have on me".
2. **Designated staff can open an individual trip** to give support or investigate
   a problem: its name, days, stops, notes, the traveller's own pins and the
   preferences they set, together with the account's email address. Say that it is
   read-only and that nobody can edit or delete a traveller's trip.
3. **Every such opening is logged** - who opened it, whose trip, and when - and the
   log is retained. A right stated without its record reads worse than the record.
4. **Aggregate statistics are produced** from all trips (counts, destinations,
   typical length) and contain no personal data.
5. **A counter of exports** (print, WhatsApp, share link, navigation) is kept per
   day and per type, with no user, trip or time-of-day attached.
6. **A local browser identifier** is stored on the device for abuse protection and
   quotas (from the previous session's work); it holds no personal data and clearing
   site data removes it.
7. **AI usage and cost are recorded per request** - model, tokens, cost, and
   whether the caller was signed in - without message content.
8. **IP addresses are processed** for rate limiting and abuse protection.
9. If you list processors, **Supabase** (database and authentication) and
   **Anthropic** (the AI model) belong there, alongside Vercel and Stripe.

**Waiting on Netanel:** run `supabase-admin-dash.sql`. Without it everything works
except the export counter, and the card says so explicitly instead of showing a
zero that looks like a real measurement. `supabase-ai-spend.sql` is still pending
from the previous session.

**One thing deliberately not built,** because he named it: no bulk export, no
editing, no deleting, and nothing that emails a traveller. Also no impersonation -
that remains refused since entry (o).

### 2026-07-31 (ww) - One wallet was the bug: a cost control that could cause an outage

Netanel, on the ceiling shipped an hour earlier: **a single abuser can switch the
AI off for everyone.** One anonymous visitor can spend a large share of the day,
so a handful of them locks out every real user until midnight. That converts a
cost problem into an outage, which is worse than the thing being prevented.

He is right, and the fix is structural rather than a number change.

---

**Two wallets.** Anonymous traffic gets **30% of the day ($1.50 of $5)**.
Signed-in users draw from *everything anonymous traffic has not spent*, so they
always have **at least 70%** and on a quiet day they get the whole budget.

Two hard wallets would have created the mirror of the reported bug - signed-in
users blocked at 70% while 30% sits unused - so the signed-in side is a floor,
not a cap. There is a test named after that, because it is the kind of thing a
later "simplification" would undo.

**A per-caller cap: 15% of the day** ($0.75), and for an anonymous caller 15% of
*their* wallet ($0.225, i.e. 4.5% of the day). It takes seven heavy signed-in
users or twenty-two anonymous ones to exhaust a day. 15% leans generous
deliberately: a real long session measures around $0.3-$0.5, and blocking that
person is precisely the outage this is meant to prevent.

**A real bug the test caught.** The ceiling is checked *before* a call, so an
anonymous caller can overshoot their wallet slightly. In the first version that
overshoot was subtracted from the signed-in floor - $1.65 spent against a $1.50
wallet dropped signed-in users from $3.50 to $3.35. A `min` on the anonymous draw
made the floor absolute. **A guarantee that erodes is not a guarantee**, and the
assertion that caught it was the one asserting the floor rather than the block.

---

**The anonymous quota now keys on the browser, not the address.** Israeli mobile
carriers put enormous numbers of devices behind a handful of addresses, so an
IP-keyed quota counts them as one person and blocks people who have never
visited. `lib/clientId.ts` generates a local identifier - no personal data, resets
with storage - and the IP stays as a **backstop 25x wider**, which only a machine
cycling identifiers in a loop can reach. When the two disagree the browser wins,
per his instruction that blocking a real user costs more than one extra request.
Deleting the identifier gains nothing: you fall back to the IP, which is the
stricter of the two.

**The alerts split in two**, because one threshold cannot answer the question he
actually has. The general one moved to **90%** and now classifies: traffic spread
across many identities ("a busy day") versus concentrated, where the heaviest
source took over a quarter of the day. And separately, an **immediate** alert the
moment one identity crosses 60% of its own cap - i.e. **before** it gets blocked,
which is the only moment anything can be done about it.

---

**How spending is measured, since he asked directly: from Anthropic's own
reported `usage`, not an estimate.** `message_start` carries input and cache
counts, `message_delta` the final output. Three paths drift low, all handled:

1. **A turn cut off before `message_delta`** has no `output_tokens` and those
   tokens were already billed - it now gets a conservative estimate from the
   streamed text instead of zero.
2. **A call reporting nothing at all** is charged a conservative flat cost rather
   than counted free.
3. **The database being unreachable** is the real hole: without a shared total,
   each instance counts alone and the effective ceiling multiplies by the number
   of instances. **This now fails closed** - five minutes without a successful
   read and the agent stops accepting requests. Being down for a few minutes
   beats spending without knowing how much.

**Verified:** 35/35 in the harness, including two different browser identifiers
behind one shared address both getting through - the carrier-NAT case - and a
malformed identifier falling back to the IP rather than being accepted as a key.
360 unit tests, every existing suite re-run, lint at baseline.

### 2026-07-31 (vv) - A ceiling on the bill, and the requirement that shaped every number

Netanel asked for protection against runaway AI cost, with one constraint stated
twice: *"Do not make the normal experience worse - a real person planning a trip
should never notice any of this."* That is the sentence that set every value
below, and it is why most of the new tests assert that a gate **does not** fire.

**The ceiling is $5/day across everyone.** Not a guess: a measured turn costs
$0.01-$0.13, and the light-routed edits land near $0.011, so $5 is roughly
100-400 real planning turns a day. It is deliberately low for launch - his own
framing was *"I'd rather be down for a few hours than wake up to a bill I can't
pay"* - and it is the one number he is most likely to raise, so raising it takes
a text field and no deploy.

Three sources in order: `app_flags.ai_daily_budget_usd` (the admin page, applies
within 30s), `AI_DAILY_BUDGET_USD`, then the code default. **0 turns the agent
off entirely** - the same effect as the existing kill switch, through a second
door.

**Cost is now real dollars, not "units".** `aiCost.ts` prices all four token
kinds per model. An unrecognised model is priced at **the most expensive rate we
know**, because on a spending ceiling the safe direction to be wrong is upward -
under-pricing means finding out from the invoice.

**The per-trip number is the one he actually asked for.** *"I need to know what a
normal trip actually costs before I set any real limits, and right now I'm
guessing."* `/admin` reports a **median** rather than a mean: one runaway trip
moves a mean, and the question is what a typical traveller costs.

---

**The caps, and why each is where it is.** 8,000 chars per message (a pasted
booking confirmation is ~1,500). 80 user messages per conversation (a real
planning session is 10-25, and message 80 costs more than message 3 because the
whole history is resent). 4,096 output tokens. And **$0.60 per turn** - the real
danger is not a long answer but a loop, since a turn can run 16 iterations and
each resends the prefix.

**The topic gate refuses only when three things are true at once:** a clear
non-travel signal, no travel signal at all (including any city or country name
from the catalog), and **no active trip**. That third condition removes most of
the risk on its own - with a trip on screen, "translate this menu" is a travel
request. It costs zero: no model call is spent deciding whether to spend a model
call.

**Anonymous is now its own tier**, separate from `Plan`, because `Plan` is a
billing state and `Tier` is an allowance. 15 chats a day is enough to build a
real trip and be convinced; what it cuts is somebody settling in on the endpoint.
Bots calling the route directly get 403 before anything is spent - a browser
sends `Origin` on every POST.

---

**A bug the harness caught that two green tests had been hiding.** The message-
length and conversation-length gates ran **after** `sanitizeMessages`, which
truncates each message to 8,000 chars and keeps the last 40. So they were
measuring the output of the truncation, not the input, and a 9,000-character
message sailed through while the assertion passed. Both moved to the raw body.

**The lesson is the same one as entry (r):** when a number is surprising, suspect
the fixture - but its twin is that when a guard passes on its first run, check
what it is actually looking at. A gate placed downstream of a sanitiser measures
the sanitiser.

**And the harness got blocked by the feature it was testing** - the new anonymous
burst limit is 4/min and the suite fired six requests from one address. A
distinct `x-forwarded-for` per scenario fixed it, and it was a fair test of the
limit.

**Verified:** 33/33 in a new harness - 403 with no Origin, a 9,000-char message
declined politely, a 90-message conversation winding down to the "ניקוי" button
with an explicit promise that the trip is intact, and **zero occurrences of
"מכסה" / "תקציב" / "עלות" / "$" anywhere on the chat screen** at 1440 and 390,
with a real conversation answering normally throughout. 347 unit tests (13 new,
most of them asserting the gates stay open), plus every existing suite re-run.

**Waiting on Netanel:** run `supabase-ai-spend.sql`. Without it the ceiling still
works - enforced per instance from memory - but there is no shared total and no
history, and the admin card says so rather than showing a misleading zero.

**One thing deliberately not built:** email alerting. There is no mailer in this
project and choosing one is a decision, not a task. The alert POSTs to
`AI_BUDGET_ALERT_WEBHOOK` with both `text` and `content` keys so Slack, Discord
or any request-to-email service works without a dependency, and it always lands
in the log and on the admin card.

### 2026-07-31 (uu) - "One hotel is listed for all the places" - and a Hebrew bug the fix walked into

Netanel, from the booking panel: *"1 hotel is listed for all the places, esim and
other things should be trip-wide, hotels is per place"*.

He is describing a data-model error, not a layout one. **"יש לנו לינה" is a
sentence you cannot answer correctly on a Bratislava + Vienna trip** - it is true
of one and false of the other, and `preferences.booking.stay` had exactly one
slot for it.

**The city picker above the cards was actively hiding this.** It switched the
*search target* while the status stayed trip-wide, so pressing "כבר סגור" while
Bratislava was selected also marked Vienna. The picker now lives inside the card
it belongs to and switches the status too, and each city carries a dot saying
whether it has been answered - otherwise the picker re-hides the same thing at a
smaller scale.

**The split is derived, not invented.** Lodging and tickets are precisely the two
providers whose search URL takes `{QUERY}` - i.e. searches *a place*. Flights,
eSIM, insurance and car do not, and are genuinely trip-wide. `perCity` is marked
explicitly in the config, and a test pins it to `bookingSearchTakesPlace` so the
flag and its meaning cannot drift apart. It also had to be added to the
"no field a provider could be ranked by" guard, with a note saying why it is not
a commercial signal - that guard firing on a new field is it working.

**Back-compat is the delicate part.** Live trips in localStorage and in accounts
carry a single `booking.stay`. It is read as the default for every city, and on
the **first write it is spread across all the trip's cities** and then deleted.
Without the spread, clearing one city would fall back to the legacy value and
read as a click that did not register - there is a test named after exactly that.
The spread happens on write, not on load, so merely opening a trip never rewrites
stored data.

**A bug that had been there since day one and only now could be fixed:** pinning
a hotel set `stay: have` for the whole trip. The comment in that code said *"no
point offering a hotel search for a city that already has one"* - the storage
simply could not express "a city", so a hotel pinned in Vienna silenced the
suggestion for Bratislava too.

**The agent requires the city rather than defaulting to one.** `set_booking_status`
takes a `citySlug`, demands it for lodging and tickets, and rejects a city that is
not in the trip. Falling back to the first city would mean recording "we have a
hotel" against the wrong one, and that is the kind of quiet error that ends with
somebody arriving without a bed.

---

**And then the new button surfaced a Hebrew bug that predates all of it.**

`` `ב${city.name}` `` renders **"בוינה"**. The correct unpointed spelling is
**"בווינה"** - a prefix letter doubles a word-initial vav. Seven names in the
catalog start with one (וינה, ונציה, ורשה, וילנה, וויוודינה, ואלה וזרמאט,
וייטנאם) and Vienna is a flagship city. The construction appears in **14 places**:
accessibility labels, a search placeholder, the agent's action chips, page
descriptions.

This is the same species as *"כ-1 שעות"* from entry (kk) - the value is right and
the Hebrew is wrong, and no type check, validator or test can see it. The
difference is that this one was caught before it shipped, in the CTA of the card
I had just built. `hePrefix` is now the only place that does it, and its test runs
against the real catalog, so a new city checks itself.

**Verified:** a new 40/40 harness at 1440 and 390 - a picker only on the per-city
cards and on none of the other four, no global picker left, marking Bratislava
leaves Vienna unanswered, the outgoing link changes with the selected city
(`ss=Bratislava` → `ss=Vienna`), the open counter counts cities separately (two
open hotels are two things to do, not one), and a legacy trip still shows its
status on both cities. 334 tests (25 new), plus the existing suites re-run -
panels 40/40, sweep 28/28, date notes 26/26, booking search 30/30. tsc, build,
lint at the pre-existing baseline.

**One judgement recorded rather than smoothed over:** tickets were made per-city
too, which is one step past what he wrote. The GetYourGuide search already takes a
city name, and "we have tickets" is as unanswerable across two cities as the hotel
was - so leaving it trip-wide would have preserved the reported bug in the card
next door.

### 2026-07-31 (tt) - Routing by task: 11x cheaper, and the measurement that redesigned it

Netanel: a simple request like moving a block to a different day should not run
on the strongest model. He picked, from the clarifying questions, a deterministic
router with escalation, scoped to mechanical edits - and left the second half
open: *"1, maybe even 2 (not sure, you will have to check)"*. He staged his API
key so the answer could be measured rather than argued.

**Measured live, six scenarios, the same request run twice** - once with
`CHAT_MODEL_ROUTING=off` and once on:

| | calls | input | cached | cost | latency |
|---|---|---|---|---|---|
| before (sonnet) | 2.0 | 20,054 | 202,134 | **$0.1225** | 5,742ms |
| after (haiku) | 1.0 | 10,339 | 0 | **$0.0108** | 1,304ms |

**91.2% cheaper, 11.4x, and 4.4x faster.**

**The model swap is the smaller half of that.** The grounding index is ~240,000
characters, sent so the model can find a place it does not already have. A
mechanical edit operates on what is already in the trip, so there is nothing in
it to search. `buildLightGrounding` sends `id|name` for the trip's own cities and
nothing else - that is what took input from 34k tokens to 10k. And the light turn
is **one** call: once the tool has run there is nothing left for the model to do,
where the heavy path spends a second full-prefix call just to write a sentence.

**The decision is code, not a prompt**, which is the third time this file records
that choice paying off (`priceGuard`, `filterKosherUnlessOptedIn`, now this). The
cheap model is handed **ten tools**; build, delete, explore, booking search and
the events calendar are not sent to it at all. A tool that is not sent does not
exist. The bias is deliberate: misrouting upward costs fractions of a cent,
misrouting downward costs a wrong edit on a traveller's screen.

---

**The finding that changed the design, and it would not have come from
reasoning.** In the first live run **all six edits were performed correctly and
three of the six sentences describing them were wrong**:

> renamed the trip, then said *"the name is already איטליה ואוסטריה, no change
> needed"* · added the note, then said *"that note already exists on day 2"* ·
> added the Pantheon, then said *"I cannot add it"* **and then** *"I added the
> Pantheon"* in the same reply.

The tool calls were flawless. The prose was not. And the traveller reads the
prose.

The conclusion is not "the cheap model is unsuitable" - it is **do not let it
write**. The sentence already exists in the codebase: `out.action` is built on
the server from the edit that actually executed ("הזזתי את רומא מיום 5 ליום 1").
Light turns now discard the model's text entirely and reply with that. Same
pattern as `pinDistances`: hand over the computed fact instead of asking the
model not to get it wrong. It also made the turn cheaper, because the reply no
longer needs generating.

---

**The open question, answered with evidence: no, questions stay on the strong
model.** Eight questions whose answers are entirely inside the trip object -
the easiest possible case - scored 7/8, and the failures are the interesting
part:

- *"how many stops in total"* → **"8 stops: 4 in Vienna and 4 in Rome"**, in
  bold. The trip has 7. A confident wrong number about the traveller's own data.
- Four of eight drifted past the question. The worst: *"that is a combined
  ticket, worth booking ahead"* - an availability claim invented by the model,
  which `priceGuard` does not catch because it contains no number.

The mechanical path is safe precisely **because** there is a deterministic
sentence to swap in. A question has nothing but prose, so there is nothing to
swap. That asymmetry is the whole answer.

---

**Escalation: anything that is not a clean success.** A failed tool, a truncated
reply, or a turn where no edit happened - the trip, history and text are restored
to the pre-attempt state and the strong model runs from scratch, so it never
inherits half an edit. Verified live: "add the Eiffel Tower to day 2" and "move
day 9 to day 1" both escalated and got good honest answers, including an offer to
auto-explore Paris, which the light path cannot do.

**An escalated turn costs 8.8% more than not routing at all**, so the break-even
escalation rate is 91%. That number is the reason the classifier can afford to be
conservative.

**Nothing streams during a light attempt** except `status`. If the turn escalates
the whole thing is rerun, and text or trip state already on screen would read as
an edit that then un-happened.

**Two things worth knowing for the next session.** (1) The daily AI-unit budget
is real and it bit during measurement - eight scenarios burned the 300,000-unit
free-plan budget, because a cold cache write on Sonnet is ~101,000 units in one
turn. The harness now sends a distinct `x-forwarded-for` per scenario, which is
how anonymous identity is keyed. (2) `CHAT_USAGE_LOG=on` exposes the per-call
token line in production, and `[chat] turn route=... escalated=...` gives the
escalation ratio on real traffic - if it comes back high, the classifier is too
wide and that log will say so rather than a hunch.

**The key was staged from `.env.local` for the measurement and deleted
afterwards**, along with the staged upload copy.

313 tests (18 new), tsc, build, lint at exactly the pre-existing baseline.

### 2026-07-31 (ss) - One emoji out of five, and what that turned out to be a symptom of

Netanel sent a screenshot of the bottom of the trip screen: three collapsible
boxes stacked, and only one of them carrying an emoji. *"go over the website and
make sure the design is consistent - for example, if there is 1 emoji, the
similar boxes should also contain emojis."*

**The emoji was the visible half of a bigger thing.** Five blocks sit in that
stack - dates, booking, cost, pins, all-days - written across five different
sessions, and each one had invented its own header. Measured in the browser
before touching anything:

| | radius | background | ring | label | margin | caret |
|---|---|---|---|---|---|---|
| dates | (bare heading) | none | none | `text-xs font-bold /45` | mt-5 | - |
| booking | 2xl | shell | yes | `text-sm font-bold night` | mt-5 | `text-xs`, dark |
| cost | 2xl | shell | yes | `text-sm font-semibold /80` | **mt-4** | **no size class**, muted |
| pins | 2xl | shell | yes | `text-base font-black` | mt-5 | - |
| all-days | **xl** | **night/3%** | **none** | `text-sm font-bold /70` | mt-5 | `text-xs`, dark |

Not one of them is wrong on its own. **The difference between siblings is the
bug**, and that reframing is what decided the fix: hand-aligning three headers
holds until the next session adds a sixth block, so the header moved into
`PanelSection` and there is now nothing left to drift from.

**`icon` is a required prop, deliberately.** One emoji out of five is exactly
what an optional field produces over five sessions.

**The body stays outside the bar, and that is not laziness.** `bg-shell` is
`#fffdf8` on a `#fdf6ec` page - three colour values apart. A card nested inside
the bar would have smeared into one block, so the bar is the object that must be
identical and each block keeps its own body underneath.

---

**Then the audit found the same species twice more, and both are worse than
cosmetic.**

**One green, written by hand nine times.** `#00a896` appears across the kosher
directory, the destination page, the account page, the traveler page and the
country page - and the map popup renders the *same* `kosherNote` field in
`#0d9488`, a different green, with no pill. So an identical sentence looked like
two different things depending on whether you read it in the card or in the
popup two centimetres away.

The fix is a token, `--color-lagoon`, and **it closes an accessibility hole
rather than just tidying up**: `html.a11y-contrast` overrides the colour tokens,
so every hardcoded hex silently ignores high-contrast mode. Nine places were
opting out of an accessibility feature by being written in hex. `KosherNote` is
now the only renderer of `kosherNote`, the way `KosherBadge` was already the
only renderer of supervision.

**And the star.** `mustSee` renders as `text-zest` on the destination page and
as `#e0a400` - a different gold - on the shared-trip page, which is the page
people actually send each other.

---

**Three tests guard the class, not the instance.** No arbitrary colour value in
a `className`; no `▾` outside the shared component or the three agreed
exceptions; no hand-rolled kosher rendering. **Two of the three failed on their
first run** and found the star and a `✡️` I had not noticed - so they are not
decorative, they had already caught something before they were committed.

The `▾` test carries an allowlist rather than banning the glyph, because three
of the callers are genuinely not panels (a preferences chip, a nav menu, the
ideas dropdown). An allowlist makes the next addition a decision instead of an
accident.

**A wrong turn worth recording.** My first read was that the teal was an
un-tokenised stray and the map popup was right. It was the opposite: the teal
was the established treatment on two surfaces and the popup was the outlier. Had
I "fixed" it in the direction I first assumed, I would have broken the two pages
that were already consistent. **Count the instances before deciding which one is
the deviation.**

**Also: do not run `npx prettier` in this repo without `--single-quote
--print-width 100`.** There is no prettier config, so the defaults rewrote every
string in five components to double quotes. Caught in the diff, reverted by
re-running with the flags - the same trap entry (d) recorded for the data file,
now confirmed for components too.

**Verified:** a new 40/40 harness that compares the five blocks **to each other**
in a real browser at 1440 and 390 - radius, background, ring, padding, margin,
icon presence and size, label weight/size/colour, caret size and colour, and
that all five occupy the same left and right edge - plus a 28/28 sweep over six
pages asserting every `▾` on a page matches every other and that the kosher
badges render identically. Existing suites re-run: seal 55/55, footer 36/36,
date notes 26/26, booking search 30/30, offline 39/39. 296 unit tests, tsc,
build, and lint at exactly the pre-existing baseline (34 problems, none new).

**Deliberately not done, and it is a real remainder.** The heading scale outside
the trip screen is still inconsistent - `/account` uses `display text-xl` and
`text-2xl`, the destination page has `text-lg font-bold` and `display text-2xl`
one screen apart, and `QuickServices` has its own. That is a typographic scale
decision, not a drift fix, and it wants Netanel to say which of the three he
wants before anything is normalised to it. `MapInner` also still styles its
popup with inline hexes (`#6b6394`, `#ffc531`) - the second of those is the zest
token written by hand - which the className guard cannot see.

### 2026-07-31 (rr) - The footer's signature row, and the seal that should have been a hover

Netanel, from a screenshot of the bottom of the page: *"all of this should be
centered, and the 'Part of BlacZ' card should be hover, not when clicked"*.

**The centring is a judgement about what each block IS, not a global switch.**
The columns above the divider stay right-aligned because they are lists you read
- a heading with links under it wants a consistent starting edge. Everything
below the divider is a signature: coverage counts, copyright, social, the
affiliate line, the seal. Right-aligned, it read as one more column that ran out
halfway. `text-center` on that block plus `justify-center` on the copyright row
was the whole change.

**The test is the one worth copying.** It measures **rectangle centre against
container centre**, not the presence of `text-center`. That class can be on the
element and be overridden by a parent's flex or by `dir`, which is exactly the
kind of thing that ships looking fixed. Four widths, all landing on the nose:
720/720, 512/512, 195/195, 160/160.

---

**Hover was not a one-line swap, and the reason is the previous session's fix.**
The seal card is now `position: fixed` and centred on the screen (that is what
stopped it overflowing on narrow phones), while its trigger sits at the bottom of
the footer. So the pointer's route from trigger to card **crosses ground that
belongs to neither**. Two consequences, each needing its own answer:

1. **`mouseleave` cannot close immediately.** It fires the moment the pointer
   leaves the trigger, i.e. halfway to the card, so the card vanished before you
   could reach the Instagram link inside it. There is a 400ms grace period,
   cancelled the instant the pointer enters the card - which works without extra
   listeners because the card is a DOM descendant of the same wrapper, so
   re-entering it fires `mouseenter` on the wrapper again.
2. **The backdrop stays `pointer-events: none` even when open.** Otherwise the
   pointer crossing it lands on an element outside the wrapper, hover drops, the
   card closes, the pointer is now over the trigger area again, and it reopens -
   a flicker loop. Closing on a backdrop click is handled by the existing
   `document` listener, so nothing was lost by making it inert.

**Hover is gated behind `(hover: hover) and (pointer: fine)`.** On touch there is
no hover and the standard prevents a tap from counting as one, so the click path
stays the only way in there - and it still works on desktop too, alongside
hover. Escape and outside-click are unchanged.

**One small thing that would have shipped as a visible defect:** `setOpen` now
returns early when the state is unchanged. In hover you enter the wrapper
repeatedly (trigger, then card), and every call ran `clamp()`, which zeroes the
offset and re-measures on the next frame - a small jump each time. An open card
that stays open should not move.

**The trap in this file bit for the second time in one session.** A backtick
inside a CSS comment inside the JS template literal terminates the string, and
the custom element simply never registers - no error in the page, just a missing
seal. `node --check` catches it in a second; reading the diff does not. It is
now in the file twice as a comment, and it is worth remembering that the hazard
is *any* backtick in that ~230-line string, including inside comments nobody
reads.

**Verified:** 57/57 on the new harness (centring at 1440/1024/390/320; hover at
1440 and 1024 including the walk from trigger to card, the link inside being
hit-testable, the grace period actually delaying the close, and click plus
Escape still working; touch at 390 confirming no hover and click still opening),
plus the existing seal suite 55/55 - which is what proves the accessibility
button still clears the badge and the grayscale-mode clamp still holds - the
footer suite 36/36, 293 unit tests, tsc and build clean.

**A false alarm worth recording so the next session does not chase it.** The
stop hook reported the branch as unpushed when it was already on GitHub at the
same SHA. Cause: the push went through a full URL rather than the `origin`
remote, so no `origin/<branch>` tracking ref was created and the branch had no
upstream. The commit was fine; the local bookkeeping was not. Fetching the ref
and setting the upstream cleared it.

### 2026-07-30 (qq) - Three features landed on main, and two sessions had built the same one

Netanel asked whether every branch was merged so that main is the live site.
It was not: 18 of 20 were in, and the answer needed a measurement rather than a
memory - `git merge-base --is-ancestor` per branch, which took one loop and
settled it.

**`feat/catalog-supabase` turned out to have nothing to review.** The Supabase
catalog work shipped long ago; the only thing left on that branch was a single
**docs commit** - the 76-line session-log entry - stranded exactly the way hard
rule 7a warns about. Cherry-picked onto main, both sides of the CLAUDE.md
conflict kept, branch closed. Worth noting the rule caught its own violation:
the reason the entry conflicted is the reason it should never have been in a
feature branch.

**Two sessions had independently built the same feature.** A data session pushed
`src/data/calendar.ts` - 161 events and closures, 69 with confirmed dates and 92
as windows in words, with a validator - about thirty minutes before this session
finished a trip-dates panel over its own 11-entry dataset. Neither knew about the
other. The overlap was invisible from either side until someone asked a question
that forced a look at the remote.

**The merge is the interesting part, because the two schemas disagreed in a way
that mattered.** Their entries scope to a **country or a list of destinations**;
mine scoped to one city. Their dates are **explicit ranges per year**; mine had an
`annual` kind with month-day wrap-around. Their unconfirmed entries carry **no
dates at all**, only Hebrew prose.

That last one forced a real design change rather than a rename. With no dates,
92 of 161 entries **cannot be date-matched**, so the panel now has two lists:
what actually overlaps the traveler's days, with its dates; and separately, under
its own heading, the windows that merely fall near the trip - labelled
"התאריכים לשנה הזו עדיין לא פורסמו", with the prose printed verbatim. Collapsing
those into one list would have meant either dropping 57% of the data or
manufacturing dates for it.

Deciding *which* windows are near enough needed `monthsInWindow`, which reads
Hebrew month names out of the prose ("ינואר עד מרץ" is three months, because
"עד" is a range; "מאמצע נובמבר עד ינואר" wraps the year). **It decides only
whether to show an entry, never what to display** - the text shown is always the
curator's own words. When no month can be parsed the entry is hidden, which is
the safe direction: missing a vague window costs less than showing every
national entry on every trip.

**One thing kept from the discarded side**, because it is the part that matters:
overlap is measured against **the days in that city**, not the trip's range. A
ten-day Munich-and-Rome trip starting 15 September "overlaps" Oktoberfest on a
range comparison, and the traveler has left Munich before it opens. Day-by-day,
with the city checked per day, is the only version that is not misleading, and it
is what the tests are mostly about.

**Also merged: the booking search feature** (`feat/booking-search`) - ready since
earlier in the day and simply never merged.

**The panel takes the trip's cities as a prop** rather than importing the catalog,
so the country lookup costs nothing in the client bundle - the same rule entry
(hh) established.

**Numbers:** 286 tests, 26/26 in a real browser at 1440 and 390 against the real
calendar, `validate-calendar` 0 errors on 161 entries, tsc, build and lint at
baseline.

**Two things the next session should know.** (1) The GitHub token stopped
accepting writes mid-session while still authenticating for reads - the branch
was delivered as a patch until a new token arrived, and that is the failure mode
to recognise (`Invalid username or token` on push, `ls-remote` succeeding
anonymously because the repo is public). (2) Several calendar notes state price
movements as fact ("מחירי המלונות מזנקים פי 3-5"). They are human-written and
sourced, so nothing was changed - but the agent is forbidden from saying exactly
that by `priceGuard`, and the asymmetry is worth a decision rather than a drift.

### 2026-07-30 (oo) - "Does it really work? When people are offline they get the dino game" - the honest split, and the one real gap it exposed

Netanel, after the offline feature merged. The right answer is not reassurance,
it is a list of what was actually proven and what was not, so this entry leads
with that.

**Proven, in a real browser against a real production build:** 39/39 on the
offline suite - load a trip, kill the network completely, close the browser,
reopen it, walk every day of the trip, then restore the network and watch it
recover without a reload. Plus the case his screenshot actually describes, which
is the interesting one: **after exactly ONE page load ever**, offline entry still
opens the app (3 shell documents, 15 build assets cached). And the degraded-
storage case: with the city cache wiped, or with every local key wiped, the screen
is honest - no dino, no raw error, no infinite spinner.

**Not proven, and this is the part that matters to his question:** none of it ran
on **iOS Safari**, and none of it ran against **tiyulplus.com**. This sandbox
cannot reach the deployed site, and headless Chromium is not WebKit. So the
mechanism is verified and the symptom on his phone is not. What was verified about
production specifically is narrow and worth stating exactly: `/sw.js` is served
`Cache-Control: public, max-age=0`, so a service-worker update will actually land
rather than being pinned by a CDN.

**The gap the question exposed, and it is a real one.** A service worker cannot
help if the browser has thrown its storage away, and Safari's ITP **deletes
script-writable storage - localStorage AND the Cache API - after about seven days
without interaction with the site.** That is precisely this feature's user: opened
the trip at home, opens it again abroad. A **web app installed to the home screen
is treated differently**, so the fix is not more caching, it is making the app
installable:

- `public/manifest.webmanifest` - `display: standalone`, `dir: rtl`, `lang: he`,
  brand colors, and **`start_url: /chat`**, the screen a trip opens from, not the
  homepage.
- Four PNG icons built from the brand mark. The maskable one carries wider
  padding on purpose so a circular crop cannot clip the plane's wing.
- `metadata` in `layout.tsx`: `manifest`, `appleWebApp`, and an explicit
  `apple-touch-icon` (Apple has no file convention here and ignores the manifest's
  own icons).

**Two things measured rather than assumed, both of which would have shipped
broken.** The moment `icons` exists in `metadata`, Next **drops the `icon.svg`
link derived from the file convention** and leaves only the `.ico` - caught by
reading the served HTML, not the source, and fixed by declaring it explicitly.
And Next emits only the unprefixed `mobile-web-app-capable`, so the Apple-prefixed
one was added through `other` for older iOS.

**Verification worth copying: the browser's own parser, not mine.** CDP
`Page.getAppManifest` returns **zero errors** and resolves the scope, all three
icons serve 200 `image/png` at their declared sizes, and the eight head tags were
read out of the HTML the server actually serves. Then the whole offline suite was
re-run to prove nothing regressed: 39/39, one-load-ever still 3 shell documents,
both degraded-storage states still honest. 216 tests, tsc, build clean, lint at
the main baseline.

**Storage cost of a typical trip, measured** (one-city trip, since he asked): 62.2
kB of city data plus 1.1 kB of trip data in localStorage, and 1.59 MB of service
worker caches - of which 1.2 MB is build assets shared by every trip and 374 kB is
the three shell documents. So the marginal cost of a second trip is tens of kB,
not megabytes.

**Left open, deliberately.** Photo caching in the SW is written and still
unverified here, because the image hosts are blocked from this sandbox - a trip
walked offline shows category tiles instead of photographs in this environment,
which is the documented sandbox behaviour and not the product. And **the honest
bottom line for him: the next real test is his own iPhone.** Add the site to the
home screen, open it once online, turn the phone fully offline, and open it from
the home-screen icon. If that shows the trip, the feature works where it was
always going to be decided.

### 2026-07-30 (pp) - The trip calendar: 142 entries, and a date rule that caught three of my own

Netanel asked for a calendar of things that reshape a trip - **not** an events
listing. Two kinds: big recurring events that take over a city, and periods when
things are shut or unusual. He was explicit that **the closure half is the more
useful one**, and the shipped split is **106 closures to 36 events**.

**The date rule is the whole feature, and it is enforced in a script rather than
by care.** Either the exact dates for a coming year are officially published and
were read at the cited URL - `datesConfirmed: true` with ISO ranges - or they are
not, and the entry carries **only** a window in plain words and is marked
unconfirmed. `scripts/validate-calendar.mjs` errors on every crossing of that
line: confirmed without dates, unconfirmed *with* dates, a window shorter than a
sentence, and anything date-shaped smuggled into the window text. It was verified
by injecting its founding bug (a `dates` array on an unconfirmed Obon entry) and
watching it fail - and the injection then had to be removed by hand, because
`git checkout` silently does nothing on an untracked file.

**Scale: 18 entries in the first pass, 142 after six regional research passes,
covering 77 of the 83 countries.** New data file `src/data/calendar.ts`, new
types (`CalendarEntry`, `CalendarKind`, `CalendarImpact`, `CalendarDateRange`)
in `src/lib/types.ts`. **Nothing was added to the places data** - this is its own
separate set of entries, as instructed.

---

**The part worth keeping: an adversarial pass was run over all 63 confirmed
entries, told to REFUTE rather than to check. Three did not survive.**

| entry | what was wrong |
|---|---|
| `ge-new-year-christmas` | claimed one continuous block from New Year to Orthodox Christmas. The official Georgian holidays are **two separate ranges**; the days between are ordinary working days. The block was a merge nobody had read anywhere. |
| `tw-lunar-new-year` | a seven-day 2027 range that **could only have been back-calculated** from the lunar date. The cited government report states the *number* of days off and never the dates. |
| `mx-dia-de-muertos` | cited a ministry **homepage** that says nothing about dates at all. |

All three were the exact failure mode the rule exists to stop: a date nobody
actually read, wearing the confirmed flag. Two were demoted to windows, one was
corrected to its real two ranges. **A guard that has never caught anything has
not been tested; this one has now caught three.**

**What the research pipeline rejected, and why that is the deliverable too.**
Sources had to be governmental, an organiser's own site, a park or transport
authority. Reference aggregators were accepted for a *window* and refused for a
*confirmed date* - which is what killed Mongolia's Naadam range (fixed in law,
but only an aggregator states it, so it is a window that says "fixed in law")
and Portugal's Carnival (only a calendar-blog source). One researcher returned an
Ecuador entry carrying a **Serengeti URL** as its source and said so honestly;
it was dropped rather than re-sourced from memory.

**The lunar and Julian calendars are the recurring trap and they are handled the
same way everywhere:** Ramadan, both Eids, Nyepi, Lunar New Year, Seollal,
Tsagaan Sar, Khmer and Lao New Year, Orthodox Easter in Serbia, Montenegro,
Cyprus, Georgia and Armenia, Char Dham's opening, Bhutan's tshechus - all
windows, every one, with the note saying *why* it is a window. **Albania is the
single best example in the file:** the Bank of Albania's own official holiday
calendar carries a standing disclaimer that its Islamic-holiday dates may still
move with the moon. When the central bank will not treat its own published date
as final, neither should we.

**Reported to Netanel as asked:** 142 entries, 61 confirmed and 81 windows, 77
of 83 countries covered, and the six with nothing - **Tanzania, Peru, Argentina,
Moldova, Bolivia and Ecuador** - are a research gap and not a decision: the
South America and Africa researcher hit its web-search quota partway through and
stopped rather than guess. It had already surfaced real leads (the Inca Trail's
annual February closure, Oruro's carnival, South African school terms) that a
next pass should pick up from `scripts/` sources, not from memory.

**Numbers:** 142 calendar entries / 0 validator errors, catalog unchanged at
1814 places / 166 destinations / 83 countries / 0 errors, 170 tests, tsc and
build clean.

**NOT PUSHED.** Two commits sit on local `main` - the schema plus validator, and
the scale-up plus the three corrections. This session has no GitHub credentials
(`git push` fails on a credential prompt), so they need a token supplied. And the
standing item is unchanged and now overdue: **both GitHub PATs still need
revoking at https://github.com/settings/tokens.**

**What the next session should know.** (1) The six empty countries above are
scoped and cheap - the blocker was a quota, not the world. (2) The calendar is
data with no UI yet: nothing reads `src/data/calendar.ts` outside the validator,
so the next natural step is surfacing it on the destination and country pages,
and deciding whether the agent should be grounded in it (it would cost index
budget, which is at 246,646 of the 280,000 ceiling). (3) `recheckFrom` is
deliberately English and machine-oriented - it says *where next year's dates get
published*, so a future refresh pass has a worklist rather than a re-derivation.
(4) Standing: 17 dead photo URLs, the Philippines still has no food or market
venue inside El Nido or Coron, the 2.5MB client bundle, and
`feat/catalog-supabase` unmerged.

### 2026-07-29 (nn) - The countdown was floating in the gap between the chip and the buttons

Netanel: "the עוד 4 ימים לטיול is not placed correctly." It was an
`absolute -bottom-4` span hanging below the summary chip - which put it in the
dead space between the chip and the action-buttons row, reading as a stray line
that drifts into another control's territory rather than belonging to anything.

Folded it **into the summary chip** as a small filled sunset pill, right after
the dates it describes: "12 עצירות · 8 ימים · 2-9 באוגוסט [עוד 4 ימים לטיול]".
Now it is attached to what it means, cannot overlap a neighbour, and the chip
gained `flex-wrap` so a long countdown wraps inside the chip instead of pushing
width. It also removed a row: the map moved up because the countdown no longer
needs its own vertical slot. The a11y name of the chip carries the countdown
too. 30/30 dates + 170 unit tests, tsc/lint/build clean.

### 2026-07-29 (mm) - The date fields were blank boxes on iOS, and the day switcher needed to look like the trip

Two more phone screenshots from Netanel, both real. The first: the open date
panel shows **two empty rounded boxes** with no hint at all - `<input
type="date">` with no value renders as a featureless box in iOS Safari (no
placeholder, no skeleton, nothing), so it reads as broken. The second: the
day switcher, still not right - number chips floating in rows with the train
emoji orphaned between them.

**The date field now looks like a field when empty.** A `DateField` wrapper
paints the input's own text transparent while it is empty (and hides Chrome's
`::-webkit-calendar-picker-indicator`, which is redundant with our own icon and
would collide) and lays a "📅 בחירת תאריך" hint over it, identical in every
browser. On focus the input becomes visible again and the hint disappears -
otherwise a manually typed date would be invisible, transparent for the typist
too. On desktop a click calls `showPicker()` so the calendar still opens now
that Chrome's indicator is gone. The panel's on-screen clamp from entry (ll)
is unchanged and still holds.

**The day switcher is now a card per city.** Three glgullim, three complaints:
"🇸🇰 יום N" pills were the same flag eight times over three rows; bare number
chips read like a calculator; and the city-change emoji floated between chips
like a leftover. A trip has real structure - runs of days in one city - so the
control finally draws exactly that: a card per city with the flag and name
**once**, the days as plain numbers inside it, and the row break falls between
cards (a meaningful boundary) instead of mid-strip. The transition emoji is
gone; the gap between cards already says "here the city changes". Bratislava
[1-2] · High Tatras [3-6] · Vienna [7-8], each self-labelled. Accessible names
still carry the full "יום 5 בהרי הטטרה, 14 באוגוסט".

**Verified 16/16** in a real browser at 402px DPR3 and 1440px (three groups,
each city named once, clicking day 5 in the middle group opens day 5, the
add-day button still reachable, the date fields show a hint rather than blank
boxes, the panel stays on screen, no overflow, no console errors), plus the
30/30 dates and 31/31 trip-screen suites re-run. 165 unit tests, validator 0
errors, tsc/lint/build clean.

### 2026-07-29 (ll) - "This looks very ugly, not simple or appealing" - he was right, and one screenshot was a bug

Two screenshots from his phone, both of the trip screen. The second one showed
the date panel **half outside the viewport**, with the "יוצאים" field cut off
the edge - that is a defect, not taste. The first one was the taste complaint,
and measuring it made it concrete: at 402px (iPhone 16 Pro) the map started at
**y=417 of an 874px viewport**. Almost half the screen was controls before any
of his trip appeared: title row, three action buttons, a preferences row, and
**three rows of day pills**, then a map-mode toggle on its own row.

**I made it worse the day before.** The dates feature added its own pill
("הוספת תאריכים") and with it a whole row, to a screen that entry (l) had
already been through once for exactly this reason. Adding a control to a
crowded screen and calling the feature done is how a screen becomes a cockpit.

**Four changes, all measured:**

- **The dates moved into the summary chip that was already there.**
  "22 עצירות · 8 ימים" was inert; it now reads "22 עצירות · 8 ימים · 10-17
  באוגוסט", opens the date editor, and carries the countdown as a quiet line
  under it. **Zero new objects on screen** for a feature that had a pill and a
  row the day before.
- **The day strip went from three rows of wide pills to one row of compact
  chips.** "🇸🇰 יום 3" for every day is the same flag eight times; the chip is
  now the number, 44px tall so the touch target is unchanged, and the flag
  appears **only where the city changes** - where it actually says something
  ("from here it is Vienna"). The accessible name is still the full "יום 3
  בברטיסלבה, 12 באוגוסט", so nothing was lost for screen readers.
- **The map-mode switch moved onto the map**, top corner, where a map control
  belongs. That is a whole row back.
- **Preferences joined the actions row** instead of owning one.

**Result at 402px: the map starts at y=328 instead of 417**, and the header is
two rows instead of four. Not a redesign - the same controls, fewer rows.

**The popover bug is worth its own note.** No fixed anchor works: the trigger
sits in the middle of the header, so `end-0` overflowed 114px to one side and
`start-0` overflowed 64px to the other. `position: fixed` is not available
either - the screen root carries `.rise-in`, whose animation leaves a transform
and therefore a containing block (the trap this file already documents twice).
The fix measures the panel after opening and translates it back inside with an
8px margin - direction-agnostic, width-agnostic, and it works wherever the
button ends up living next.

**And a second-order bug the fix created**, caught only because the browser
suite clicks the button rather than looking at it: the map-mode switch was
`z-[500]` to clear Leaflet's panes, which put it **above the date panel**, so
the "add days" button was covered and the click went to the map toggle. The map
wrapper now has `isolation: isolate`, the switch is `z-[1001]` inside that
context, and the whole map subtree stays below the popovers outside it.

**Also fixed while there:** the longer summary chip squeezed the trip name to
"סלובקיה ווי" - the name row now wraps on mobile instead of shrinking the name.

**Verified 30/30 (dates) + 31/31 (trip screen)** in a real browser at 402px
DPR3 and 1440px, plus the panel-stays-on-screen assertion that would have
caught his screenshot. 165 unit tests, validator 0 errors, tsc/lint/build clean.

### 2026-07-29 (kk) - Trip dates: a range that never edits the plan behind your back

Netanel asked for dates on a trip and chose, in the clarifying questions, a
**start + end range** (not a single departure date), settable **on the trip
screen and by telling the agent**, showing on the day cards, carrying into
print/share/WhatsApp, plus a countdown. He did not pick Shabbat marking, so
nothing about pacing or `shabbatAware` changed.

**The whole design turns on one problem the range creates.** A range has a
length of its own, and it can disagree with the number of days already built.
The obvious implementation derives the days from the range - and that is
exactly how picking a date silently deletes a day full of stops. So:

- **Day N's date is derived** from `startDate` (day 2 = start+1). It cannot
  drift out of sync with the day order, and reordering days re-dates them for
  free. `endDate` is stored because that is how people think about a trip.
- **Filling one end completes the other** from the current day count, so the
  normal path is always consistent and a mismatch is something the user
  created deliberately.
- **A mismatch is reported, not resolved.** Longer than the plan: it says so
  and offers a button that adds the days. Shorter: it says so and says
  plainly "לא נמחק לכם ימים לבד". The only thing the feature does on its own
  is additive. The agent's tool gets the same treatment - its tool result
  tells the model to state the gap in one sentence and forbids it from adding
  or deleting days itself.

**`dates.ts` is deliberately paranoid about two things.** `new Date('2026-08-12')`
parses as midnight **UTC**, so anyone browsing from west of Greenwich would
have seen 11 August - every date is parsed into local noon from its three
numbers instead, and there is a test for it. And the Hebrew month and weekday
names are a table in the file rather than `Intl`, so the display cannot depend
on whether the runtime shipped full ICU data, and the tests assert one known
string.

**Share links went to v2, and v1 still opens.** The payload gained two optional
fields at the end (`[2, name, days, start?, end?]`); a trip with no dates is
still encoded as v1 so links do not grow for nothing, and the decoder accepts
both. A link somebody sent on WhatsApp months ago has to keep working - there
is a test that decodes a hand-built v1 payload, and another that feeds a v2
payload with a garbage date and confirms the trip still opens without it.

**The agent may not invent a date.** `set_trip_dates` takes `YYYY-MM-DD`,
validates it as a real calendar date (2026-02-31 is rejected, not rolled into
March), and the prompt rule is two lines: record dates the user states, never
raise the subject otherwise, and never compute a date - CURRENT TRIP now
carries the exact date of every day, so there is nothing left to calculate.
That is the same "give it the number instead of banning the guess" pattern as
`pinDistances` and the coverage counts.

**Verified 26/26 in a real browser** at 390px (DPR 3) and 1440px: a dateless
trip offers to add dates, the return date completes itself, the range shows on
the chip and the weekday+date on the day card, a longer range reports the gap
and leaves the plan at three days until the button is pressed, a shorter range
refuses to delete, clearing removes both, the homepage card shows "עוד 12 ימים
לטיול", and a shared link carries the dates to `/t/<code>`. 165 unit tests (18
new). One real RTL bug caught by looking at the screenshot rather than the
markup: "יום 1" followed by "10 באוגוסט" renders as "יום 110 באוגוסט", because
two numbers meeting in an RTL line have no separator - a `·` fixes it.

**Deliberately not built:** nothing dates-driven changes the planning. No
Shabbat marking (he did not choose it), no "best month" warning - that one is
impossible anyway, since `bestMonths` still does not exist in the catalog, and
inventing a seasonal opinion from a date is exactly what hard rule 2 forbids.

### 2026-07-29 (ll) - Photos: 272 fillable gaps down to 176, and a third retrieval method

Netanel: "Yes, dont stop until finished." This is the sustained photo pass.
**Tier A went 174 -> 78; total fillable 272 -> 176.** 96 photographs written
across three commits, every one visually checked before it was written.

**The worklist stopped being pasted.** The audit now fetches `/api/cities` from
the deployed site, filters places with no photo in a Tier A category, and
derives the gap list **in the browser**. No transcription, no drift between what
I think the gaps are and what they are.

**Three retrieval methods, and they are complementary rather than redundant:**

| method | what it asks | finds |
|---|---|---|
| Commons file **geosearch** | which photographs are geotagged AT this coordinate | markets and places Wikipedia never wrote about |
| **article** lead image | what does the article about this place lead with | landmarks with a real article |
| Commons **name search** + `prop=coordinates` on the file, 5km check | is there a file named for this place, and is it actually there | the long tail the first two miss |

The third was added for the 95 places the first two returned nothing for, and it
produced 38 candidates. Name search alone would be the wrong-place trap in its
purest form; checking the **file's own coordinates** is what makes it safe.

**Several places were got right on the second or third attempt**, which is the
argument for running more than one method: Reina Sofía was a public park, then
the museum's front gate. Santa Caterina was a nativity scene, then the market's
wavy roof. Souq el-Khodra was the *sugar* souq, then the vegetable one. Ballarò
was a palazzo facade, then street food in the market. Atarazanas was a bar
counter, then the market building.

**The contact sheet remains the only thing that works.** Across the three
batches it rejected **1 of 36, 29 of 55, 21 of 67 and 14 of 38** - call it 40%
of everything the filters passed. Every rejected image is a real Commons
photograph, correctly geotagged, within metres of the right place:

> a bus depot for Designer Outlet Warszawa · the Remarkables mountain range for
> the Remarkables Market · a canal for Piața Cibin · a Silla crown in a vitrine
> for Gyeongju · a protest crowd for Arcul de Triumf · a politician at a podium
> for Dubai Opera · stained glass for Dezerter Bazaar · Martyrs' Lane for Deniz
> Mall · a horse-head sculpture for the Málaga outlet · a tray of brains for the
> Haagse Markt · an information plaque for Cartagena's cathedral

**Reading the filename beside the image is a second, separate check**, and it
caught things the picture alone could not - because the picture looked fine:

    The Mall outlet     -> "Leccio - Case coloniche"      (farmhouses)
    Souq El-Khodra      -> "Souq Al-Sukar"                (the sugar souq)
    Ringsted Outlet     -> "Opladestation Ringsted"       (an EV charging point)
    Pärnu market        -> "Victoria Hotel. 1926"
    Kuressaare market   -> "vaekoda"                      (the weigh-house)
    ION Orchard         -> "Orchard Station exit"         (the MRT station)
    Designer Outlet Berlin -> "Lehrter Bahn, Berliner Außenring"  (a railway)
    Arusha market       -> "...street NEAR Arusha central market"

**Verification got cheaper without getting weaker.** Every URL written is
*derived* from the filename by `scripts/lib/commons-url.mjs`, and a derived URL
is not a fetched one. Rather than carrying full URLs back to the browser, only
the **md5 hash prefix** goes back; the browser rebuilds each URL from the
filename it already holds, applying MediaWiki's own encoding rules, and probes
it. That checks the derivation and the fetch in one pass. **96 built, 96 alive,
0 dead, 0 derivation mismatches.**

**Where it stands, honestly.** The remaining **78 Tier A** are places where all
three methods returned nothing, or returned something the sheet rejected. They
will not fall to re-running the same three - the next thing to try is
**local-language Wikipedias** (a Latvian market has a `lv` article and no `en`
one) and **Commons categories** by name. **Tier B is 98** and untouched by this
pass; entry (hh) predicted a low hit rate there and nothing here contradicts it.
Tier C stays at 53 and stays untouched.

**Addendum - a fourth method, and where the pass actually ended.** After the
three above, 78 Tier A remained. A fourth was added: find the Commons **category**
named for the place, then take a file from it, preferring one whose own geotag is
within 5km. Categories are how Commons organises places, so this reaches subjects
with **no article and no geotagged photograph** - Kolsai Lakes, Hoi An Market, the
Cabot Trail, Pula's market hall, Wellington's Harbourside, the Karakol animal
market, Nacpan Beach.

It is also the **loosest** method and the sheet rejected 16 of 37. The one to
remember: Budapest's **Premier Outlet matched the category for GUAM Premier
Outlets** - right brand words, wrong hemisphere. Nothing but looking at the
picture stood between that and the catalog.

**Final for the session: Tier A 174 -> 57, total fillable 272 -> 155, 117
photographs written**, every one visually checked, every URL derived and probed
(117 built, 117 alive, 0 dead).

**The remaining 57 Tier A have now had four methods run against them and yielded
nothing that survived review.** They are not "not yet tried" - they are the hard
tail, and a fifth pass should start from a different premise: local-language
Wikipedias (a Latvian market has an `lv` article and no `en` one), or accepting
that some of these have no free photograph and marking them so the worklist stops
re-offering them. Roughly a third of what remains is outlet malls and modern
retail, which Commons genuinely under-covers.

**Numbers:** 1814 places, **0 errors**, 67 warnings, 170 tests, tsc and build
clean. Photo manifest 1,735 URLs with recorded HTTP evidence.

### 2026-07-29 (kk) - The browser check that had been owed for seven passes, and the Hebrew it found

Netanel: "Do that" - the RTL/overflow check on the ~280 entries added across
passes (dd) through (jj). Every one of those entries shipped with the same
caveat in its log entry: no browser check had been run, because the Chrome
extension was down. Seven passes of accumulated untested surface, closed here.

**Method, and one thing worth stealing.** The extension reaches only public
URLs, so this ran against **production** rather than a local build - which is
the honest surface anyway. Instead of 24 navigations, the audit loads each page
in a **same-origin iframe sized to the target viewport** and measures its
document directly: `scrollWidth` vs `clientWidth`, every element's rect against
the viewport edge, `dir`, broken images, and whether Hebrew is present. One
tool call covers six pages at a real width, and the iframe's viewport drives the
CSS media queries exactly as a phone would.

**Result: clean.** 17 destination pages at 390px, 6 at 1440px, plus `/countries`,
three country pages, `/kosher` and the homepage. **Horizontal overflow 0
everywhere, `dir="rtl"` everywhere, 0 broken images, Hebrew present on every
page.**

Two categories of flagged element were investigated and both are known-good:
Leaflet **tiles** and **pins** sit outside the viewport by design - verified
their container is `.leaflet-container` with `overflow:hidden` ending at
x=1288 - which entry (x) already recorded, and page-level overflow stayed 0
throughout. The homepage's decorative flight-trails layer extends 8px past the
viewport and is contained by the `overflow-x: clip` fix from entry (h).

---

**Then the visual pass found something the numbers could not, which is the whole
reason to look at a screen.**

The place cards rendered **"כ-1 שעות"** - literally "about 1 hours". The
expression was `כ-{Math.round(min / 30) / 2} שעות`, and its *number* was
correct, so no test, validator or type check could ever have caught it. Only
reading the card does.

The blast radius is not small: **156 places are 60 minutes and 92 are 45**, so
**248 place cards** carried it, and 30-minute places printed "כ-0.5 שעות".

Hebrew has a **dual** form, so the fix is not a special case for 1:

    כחצי שעה · כשעה · כשעה וחצי · כשעתיים · כשעתיים וחצי · כ-3 שעות

The interesting part is that **the codebase already knew this**. `travel.ts` has
formatted journey times as "כשעה נסיעה" since entry (pp); the place cards simply
never got the same treatment. It now lives in `src/lib/duration.ts` so the two
callers can share one rule instead of one of them being right by accident.

`formatDurationHe` returns **null** rather than a string when there is no real
duration, so a place under a quarter-hour renders nothing instead of
"כ-0 שעות" - the caller drops the element rather than printing a zero.

Six tests, including a sweep of every duration from 1 to 600 minutes asserting
that no output can match the broken singular again. 170 tests.

**The generalisable bit.** Hard rule 7 asks for a "visual check of changed pages"
at the end of every session, and for seven passes that was deferred with a good
reason (the extension was down) and no cost visible - the catalog validated, the
tests passed, the numbers were right. The cost was real and it was invisible by
construction: **a correct number rendered in incorrect Hebrew on 248 cards.** A
deferred visual check does not show up as a failing anything; it shows up as
quiet, accumulating wrongness on the surface the user actually reads.

**Still not covered by this pass, stated so it is not assumed:** the trip
workspace (`/chat`, `/planner`) renders these same places and needs a seeded
trip to check, which this pass did not do. The duration fix is committed but
**was not visible in the production screenshots**, which still show the old
build - it verifies on the next deploy.

### 2026-07-29 (jj) - Chrome came back, and it turned out the blocker was never the research

Netanel, in order: "chrome is up, find images for places they dont exist", then
"All countries done?", then "Finish the food and shopping first, then add
pictures". This entry covers all of it.

**The headline: the nine empty countries are down to one.** Kazakhstan, Norway,
Turkey, Albania, Kyrgyzstan, India, Bolivia and Panama now have a food or market
place. Only the Philippines is still empty.

**Why that happened today and not in any of the last four sessions is the whole
lesson.** Every entry since (gg) has reported those nine as "blocked on
coordinates, not research" and left them. That sentence was true, and it was a
statement about **this sandbox**, not about the world - Mapcarta was simply the
only coordinate source reachable from here. The moment Chrome connected,
Nominatim became reachable, and eight of the nine closed in a single pass.

**Almaty is the case worth keeping.** Entry (gg) recorded five distinct wrong
answers across five slugs for the Green Bazaar - Baku, Kerala, Tashkent, an
Almaty bus stop, a fortress. Nominatim returns it correctly on the first query
**and still returns the two bus stops named after it.** What separates them is
not the name, it is the OSM `class`/`type` field: the market is
`type=marketplace`, the traps are `type=bus_stop`. **Filtering on type rather
than on name is the unlock**, and it generalises to every market in the catalog.

**A measurement bug of my own, found by asking the question properly.** Netanel
asked "All countries done?", and the honest answer needed a count on two axes.
It turned up four destinations - **Bratislava, Dubai, Almaty and grand-canyon** -
that had *only* kosher eating places. Cause: the priority-country pass in (ee)
counted legacy `shopping` entries as already-covered against a **food** quota, so
Dubai looked covered on the strength of four malls. All four now have a general
place; kosher-only destinations: 0.

**Four candidates rejected, each by a different mechanism:**

| rejected | caught by |
|---|---|
| Parlak (Antalya), KaLui (Puerto Princesa) | the distance guard |
| Kruja Old Bazaar | duplicate - `al-kruje`'s own description already describes that bazaar |
| Stará tržnica (Bratislava) | already in the catalog as an `attraction` |

The two guard failures were **checked rather than assumed**: `lycian-coast`'s
places stop at Myra, 0.7 degrees short of Antalya, and `palawan`'s southernmost
place is the Subterranean River, 48km north of Puerto Princesa city. Both cities
are genuinely outside their destination's footprint. **Dropping KaLui is exactly
why the Philippines is still empty** - and El Nido's own candidate, Trattoria
Altrove, has several branches within El Nido and fails the branch test. That is
a real finding, not a gap.

**The independent audit earned its keep again.** 17 coordinates re-checked
against sources other than the geocoder that produced them: 16 matched, and it
caught **Café Ruiz**, where OSM holds two outlets and ranks the Palmira one
first - 4.8km outside Boquete. The wrong-branch trap, for the fourth time this
week. Re-pinned to Bajo Boquete only after confirming OSM itself holds that
second outlet at the audited coordinate.

**One instruction from a researcher that was correctly refused.** Two venues came
back flagged "permanently closed" (Dibek opens afternoons and shuts Sundays; the
Karakol market is Sunday-morning only), and the researcher recommended publishing
the opening hours to stop travellers arriving on a dead day. **Not done.**
Storing a schedule is the thing this feature refuses to do, because schedules go
stale silently and the traveller finds out at a locked gate. Karakol says only
that it is a weekly market and to confirm the day locally.

---

**Photos: the re-probe list settled, and 51 Tier A places filled across two
passes** (218 -> 174).

Step 1 was the re-probe list, 38 rows -> 17. **Twenty-one of those URLs were
alive the whole time** and merely had no evidence recorded - which is precisely
why `photo-gaps.mjs` keeps "probed and failed" separate from "never probed".
Zero unprobed rows remain in the catalog; the 17 dead are the known-unrepairable
backlog from entry (s), now confirmed rather than assumed.

**Two retrieval methods, and the second is better.** Exact-title article lookup
finds the article about a place and takes its lead image; three filters then
apply - Commons-only path (licensing), a bad-filename class, and a 12km
coordinate check. The Commons rule immediately reproduced entry (u)'s
freedom-of-panorama finding automatically, rejecting five Dubai landmarks whose
leads are local non-free uploads.

Then **Commons file geosearch** (`gsnamespace=6`), which inverts the problem:
return FILES whose own geotag sits near the coordinate. Distance is measured to
the photograph rather than to an article centroid - Rialto matched at 10 metres,
Santa Caterina at 8, Chania at 4 - and it works for the many markets Wikipedia
has never written about.

**Both methods pass things that are still wrong, and that is the finding.**
Article lookup offered Parndorf's parish church for an outlet village, a metro
station for Mercat de Sant Antoni, the Dubai Fountain for the Dubai Mall, a 1915
advertisement for Nordiska Kompaniet, rolling stock for Balti Jaama Turg, and a
district map named `.svg.png` that slipped a rule checking only `.svg`. Geosearch
added its own class: **substring matching** offered "Small Venice.jpg" for Deniz
Mall because "Small" contains "mall" (the Olduvai bug again), and **city-name
tokens** matched everything in the city - a freight station for Batumi Central
Market, a business incubator for Ingolstadt Village.

So every survivor was rendered as a contact sheet and looked at. **The sheet
rejected 1 of 36 in the first pass and 10 of 26 in the second** - a nativity
scene, an office block, a WWF reserve gate, a park standing in for the Reina
Sofía, a stone lion, a festival crowd, three ambiguous Dubai frames, and a
**railway photograph** for Designer Outlet Berlin that was caught only by reading
the filename next to the image. Every one of those ten is a real Commons
photograph, correctly geotagged, within metres of the right place. **No filter in
this pipeline could have caught any of them.** Precision before the visual check
was 62%; the check is not optional, and this project has skipped it four times.

**Derived URLs were re-probed as written.** All 51 are built from the filename by
`scripts/lib/commons-url.mjs` rather than copied from the API, and a derived URL
is not a fetched one - 51 probed, 51 alive, 0 dead. Recording `ok:true` for a URL
nobody fetched is what produced 151 dead links in entry (s).

**Two harness bugs of mine, both the recurring species.** `/tmp/verify_new.mjs`
compared coordinates as strings while this batch wrote them as numbers, and
reported 32 failures whose "drift" was `-115.1497` vs `-115.1497`. And a
42-place browser loop blew the 45-second CDP ceiling from entry (u) - the work
completed in the page, so results accumulate in a window global and chunks stay
under ~14 items.

**Numbers:** 1814 places / 166 destinations / 83 countries, **0 errors**, 67
warnings. 165 tests, tsc and build clean. Index 246,646 of the 280,000 ceiling.

**What the next session should know.** (1) **Nominatim is reachable whenever
Chrome is** - filter on OSM `type`, never on name, and re-read `kosher-market`
and the `cafe` gaps in that light, because they were parked as "blocked on
geocoding" under the old assumption and that assumption is now false. (2) 174
Tier A photo gaps remain; both retrieval methods are proven and the contact sheet
is mandatory. (3) The Philippines is the last empty country and needs a venue
inside El Nido or Coron, not Puerto Princesa. (4) **No browser RTL/overflow check
has run on any of the ~280 entries added across passes (dd) through (jj)** - it
has now grown for seven consecutive passes and Chrome is currently connected,
which is the first real opportunity to close it. (5) Standing: the 17 dead photo
URLs, the 2.5MB client bundle, `feat/catalog-supabase` unmerged, and **both
GitHub PATs still need revoking at https://github.com/settings/tokens**.

### 2026-07-29 (ii) - "Continue to all destinations": the sweep, and two rejections that came from machinery rather than taste

Netanel: "continue to all destinations." Entry (hh)'s addendum had just recorded
that the first mall pass covered 18 of 166 and the second added 29 more. This
closes the remaining 132.

**Method, chosen because of the mistake in (hh):** five research subagents, one
per region, each given the full list of destinations in its region rather than a
sample. **No destination was judged from memory.** That is the direct application
of the lesson from the "Did all?" correction - the count is one script and the
assumption was free and wrong.

**26 candidates came back, 17 were written, 9 were dropped.** The drops are worth
listing because six of them are precedents already set this week, applied without
re-litigating:

| dropped | why |
|---|---|
| BTC City Ljubljana, Canal Walk, Albrook Mall | ordinary city malls - the Madrid Xanadu / Ibn Battuta bar |
| Markthal Rotterdam | already in the catalog from this morning's pass |
| Magasin du Nord Aarhus | a branch, not a landmark - the Shinsegae Uijeongbu call |
| Vila do Conde (offered for `douro`) | Porto is not in the valley |
| Sofia Outlet Center (offered for `rila-pirin`) | same mis-file shape |

**The two interesting rejections both came from machinery, and they failed at
different stages - which is the point.**

*Maasmechelen Village* failed the **distance guard**: 1.36 degrees from
`brussels-flanders` against that destination's own 1.24 tolerance. Identical to
Bicester Village at 1.03 from London. What makes it worth recording is that the
research subagent had **independently flagged it before the guard ever ran** -
the Mapcarta page prints a Maasmechelen address inside a *Dilsen-Stokkem*
administrative breadcrumb, with the coordinate itself in Dilsen-Stokkem. Two
unrelated checks, one from a reader and one from arithmetic, landed on the same
row. That is what a working pipeline looks like.

*Polygone Riviera* is the more instructive one, because it **passed the guard and
failed the audit**. Coordinates matched the source to the digit, the town matched,
the sign was right. But the page's own primary title is *Centre commercial
Shopping Promenade Riviera* - the adjacent open-air retail park in the same ZAC,
not the Polygone Riviera mall. Right site, right town, **different named entity**.

So the source did not confirm the place the entry named, and there is no source
here that does. It went. **The alternative was to rename the entry to what the
page actually describes, and that is worse**: nobody flies to Nice searching for
"Shopping Promenade Riviera", so the catalog would carry a row that is technically
sourced and practically useless. This is a new member of the wrong-place family -
not a wrong city, not a wrong branch, but **a wrong neighbour**: the coordinate is
essentially correct and the identity is not. A distance check cannot catch it, by
construction, because the two things are metres apart. Only reading the page does.

**Verification.** 17 of 17 coordinates re-read against their source pages by two
independent auditors: **17 matched, 0 failed.** The four negative-longitude rows -
Kildare, Wrentham, Las Vegas, CrossIron - each had the minus sign or the "west"
designation confirmed on the page explicitly, since a dropped sign is the other
half of the transcription class. A programmatic pass separately asserted that
every written coordinate matches the research record and every `externalUrl`
matches its own lat/lng. Two rows carry a benign naming note rather than a
correction: the Las Vegas page words the name "Las Vegas Premium Outlets North"
(the catalog has "Las Vegas North Premium Outlets") and it is confirmed the north
branch on Grand Central Parkway, not the south one; and Design Village's address
says "Bandar Cassia", which is Batu Kawan's township name.

**Numbers:** 1797 places / 166 destinations / 83 countries, **0 errors**, 64
warnings. 139 tests, tsc and build clean. Index **243,643 of the 280,000 ceiling**
- about 36,400 chars left, roughly 330 more entries.

**What the next session should know.** (1) Destinations with an outlet or landmark
mall entry went from **zero this morning to 40**; the sweep is complete and a
sixth pass would be re-checking work, not finding gaps. (2) The photo worklist is
unchanged and still the first thing to run when Chrome connects -
`scripts/photo-gaps.mjs`, order written into its own output. (3) The index
compaction in the budget section (45% saving, ~975 entries) is still the highest-
value move available and still needs a live key. (4) **No browser RTL/overflow
check has been run on any of the ~224 entries added across passes (dd) through
(ii)** - unchanged as the largest untested surface in this feature, and it has now
grown for six consecutive passes. (5) The nine countries with no food or shopping
place at all are unchanged and still blocked on coordinates, not research. (6)
Standing: the 18 dead photo URLs, the 2.5MB client bundle, `feat/catalog-supabase`
unmerged, and **both GitHub PATs still need revoking at
https://github.com/settings/tokens**.

### 2026-07-29 (jj) - "Prevent SQL injection": the audit found none, so the fix was to make it structural

Netanel asked to prevent SQL injection. The honest first half of this entry is
that **the audit found no exploitable injection**, and the second half is that
the safety rested on every caller remembering to escape - which this log has
watched fail too many times to leave alone.

**What was actually checked**, adversarially, not by pattern-matching:

- **Every PostgREST call that interpolates a value** - twelve of them across
  `admin.ts`, `identity.ts`, `limits.ts`, `billing.ts`, `shareStore.ts`, the six
  `/api/admin/*` routes and `/api/promo/redeem`. Each value is either
  `encodeURIComponent`d, regex-validated (`/^[A-Z0-9]{3,24}$/` for a promo
  code), or a uuid that Supabase itself issued and the server read back from a
  verified token. Nothing user-typed reaches a filter raw.
- **The `x-forwarded-for` path**, which IS attacker-controlled: it becomes the
  rate-limit identity `ip:<value>` and lands in a `usage_daily` filter - already
  encoded, and it only ever reaches `bump_usage` through a JSON body.
- **All three `security definer` functions** (`redeem_promo`,
  `find_traveler_by_email`, `bump_usage`). Zero dynamic SQL - no `EXECUTE`, no
  `||` concatenation, no `format`. All three already pin `set search_path =
  public`, which is the real hardening for definer functions, and execute is
  revoked from `anon`/`authenticated` where it should be.
- **supabase-js on the client**: no `.or()` and no raw `.filter()` anywhere -
  those are the two APIs that take a filter *expression* rather than a value.
  The one `.ilike()` strips `%` and `_` before use.

So: no finding with a reproducible attack path, and nothing was reported as one.

**What changed, and why it is worth doing anyway.** `adminSelect(table, query:
string)` invites exactly one thing:

    adminSelect('profiles', `user_id=eq.${id}`)   // works. and waits.

New `src/lib/server/pgrest.ts` is now the only place allowed to assemble a query
string. Values go through `pgValue` (always encoded), identifiers through
`pgIdent`, and the uuid that lands in GoTrue's admin URL path through `pgUuid`.
All twelve call sites were converted; the generated strings are byte-identical
to the old ones for legitimate input, which is how the change stays boring.

**The test caught a real defect in my own first version, which is the reason it
exists:** `encodeURIComponent` does **not** encode ``!'()*``. To PostgREST, `(`
and `)` close an `in.(...)` list or an `or=(...)` tree and `*` is the `like`
wildcard - so `pgIn('slug', ['a)', 'x'])` would have produced `slug=in.(a),x)`
and changed the predicate. `pgValue` now percent-encodes those four as well.
Guessing that `encodeURIComponent` "escapes everything" is precisely the kind of
assumption this project keeps getting burned by.

**The class guard.** A test walks all of `src/` and fails on any line matching a
hand-built filter (`col=eq.${...}`, `in.(${...}`) or a `rest/v1/${...}` path that
is not `pgIdent`. Verified by deliberately reintroducing one: the suite fails and
names the file and line. That is what makes this a fix rather than a cleanup -
the next session cannot quietly undo it.

**Two small hardenings in the same pass:** `/api/cities` now filters its slugs
by shape (`/^[a-z0-9-]{1,60}$/`) instead of trusting that they only ever meet an
in-memory `find` - a future external provider would put them in a URL; and the
traveler search strips `*` along with `%` and `_`, since `*` is PostgREST's own
wildcard.

**8 new tests (147 total)**, including live payloads (`1&role=eq.owner`, `x,y`,
`(select 1)`, `../../admin/users`) asserted through `URLSearchParams` - the real
question is not "are there odd characters" but "would the server see a second
filter", and it does not. Plus the 31/31 trip-screen suite re-run, `/api/cities`
probed with injection-shaped slugs (returns an empty list, no error), validator
0 errors, tsc, lint and build clean.

**Rules added to the Gotchas section** so this is findable by grep rather than by
memory: never hand-build a PostgREST query, and any new SQL function must be
`security definer` + `set search_path` and must never concatenate SQL.

### 2026-07-29 (ii) - Outlet villages, the photo worklist, and a cap that was never the binding constraint

Netanel, two instructions: mark the places without an image so the photo work is
ready the moment Chrome connects, and - after I offered to cover malls and
outlets at a different bar - "Do it. Increase the cap."

**The photo mark is a script, not a data field.** `scripts/photo-gaps.mjs`. The
absence of a `photo` field is already the mark; adding a flag would duplicate
state and cost index budget for nothing. What was actually missing is a *stable*
worklist - "which places have no photo" has now been re-derived by hand in four
sessions with four throwaway `/tmp` scripts, shaped slightly differently each
time.

**The tiering is the whole point**, because a flat list of 312 gaps reads as 312
units of work and it is not:

| tier | n | what it is |
|---|---|---|
| A | 171 | public places - landmarks, museums, parks, markets. Usually have a Commons article. The real queue. |
| B | 88 | businesses. The famous ones do have free photographs (Harry's Bar, Confeitaria Colombo, Pfunds Molkerei); neighbourhood ones never will. |
| C | 53 | kosher venues. **DO NOT WORK** - four sessions have now confirmed a Chabad house or kosher grocery has no freely licensed photograph anywhere. |

Plus a **re-probe list of 38** URLs already in the data with no passing HTTP
evidence - 16 recorded dead, 22 never probed. Those come first when Chrome
connects, because some are alive and merely lack a record, and one
`verify-photos --force` settles them. Every row carries the place's lat/lng,
because the wrong-subject trap is caught by comparing a candidate article's own
coordinates and **never by name matching** - that is the check that would have
caught the Abu Dhabi recycling bin and the Toronto restaurant that came back for
a Florence gelateria.

**A bug of mine in that script, worth recording because a terminal hides it.**
`process.exit(0)` immediately after a large `console.log` truncates stdout when
stdout is a **pipe** - it emitted 62KB of a 90KB document and produced invalid
JSON that read exactly like a data bug. Caught only by piping `--json` into a
parser. Falling off the end of the module lets Node flush.

---

**The shopping gap was real and specific.** 171 shopping-ish places existed but
only **seven** mall-like ones, because the standing bar - "a market or street
worth walking" - almost never admits a mall, and that was the right bar for that
pass. The category genuinely missing is the one Israelis actually fly for:
**designer outlet villages. There were zero.**

Eighteen added: eleven outlet villages (Parndorf, La Roca, Las Rozas, Castel
Romano, La Vallée, Berlin/Wustermark, Woodbury Common, Athens/Spata, Premier
Outlet, Warszawa/Piaseczno) plus landmark stores and malls that are destinations
in their own right (Galeries Lafayette Haussmann, Harrods, Macy's Herald Square,
Mall of the Emirates, Siam Paragon, ION Orchard, Mustafa Centre, Lotte World
Mall).

**Most of what the research returned was rejected**, which is the bar working:
Madrid Xanadú, Ibn Battuta, MBK, Băneasa, AFI Cotroceni, the whole Cyprus mall
set, Westfield Arkadia and Mokotów, Golden Hall - ordinary city malls. Valmontone
went because Rome already had Castel Romano and two outlets for one city is
padding.

**The distance guard decided scope, mechanically rather than by taste** - and
this is the part worth carrying. An out-of-town outlet is *legitimately* outside
its city, so the obvious move was an exemption for the new category. Instead the
guard's own tolerance became the arbiter: Parndorf, La Roca, Woodbury, Piaseczno,
Biatorbágy and Spata all pass and went in; **Bicester Village sits 1.03 degrees
from London, past the floor, so it went** - the same call as Porto and the Douro.
A brand-new category does not get a brand-new exemption; if it did, the guard
would mean nothing within a month.

**Two live brand traps, both caught.** The slug `Harrods` returns **Harrod,
Ohio** with entirely plausible coordinates - the London store needed its OSM
object id. And `Shinsegae Department Store` returns the **Uijeongbu** branch
rather than the Myeongdong flagship, so Seoul got one entry instead of two. *A
wrong branch of the right brand is still wrong* - the same lesson as All'Antico
Vinaio's Milan branch in entry (ee), now confirmed as a systematic hazard for
retail chains specifically. 18 of 18 coordinates re-read against source, 0
failed, with the four multi-branch retail rows confirmed by town explicitly.

---

**The cap: raised, but it was never the binding constraint, and that is the
finding.**

260,000 → **280,000**, and the authoritative section now carries the full
arithmetic instead of just a number. At 241,002 chars the index is ~78k-89k
tokens; adding the other blocks at their own worst case (detail ~28k, history
~45k, trip ~6k, system and tools ~6k) puts a worst-case request at **165k-177k of
the 200k window**. Scaled: 280,000 leaves ~15k headroom, 300,000 leaves ~8k, and
**340,000 is negative**. The failure mode is not gradual - entry (e) records a
real 408k-token request that then failed identically on every subsequent turn
forever, because history only grows.

So the honest answer to "increase the cap" is that the cap can move a little and
the window cannot. **The lever that actually creates room is the index FORMAT.**
`buildGroundingIndex()` serialises each place as a JSON object, so
`"id":"name":"category":"tags":"priceLevel":"mustSee":"durationMin":` repeats
1,768 times. Measured: re-encoding the identical information as tuples with a
one-line legend gives **132,184 chars instead of 241,002 - a 45% saving, ~107,000
chars, room for about 975 more entries at zero cost to the context window.** That
is four times what any safe ceiling raise buys.

**It was deliberately NOT shipped.** The index is the single most load-bearing
block in the prompt, the change alters how the model reads every place id, and
there is no `ANTHROPIC_API_KEY` in this sandbox to verify the model still uses it
correctly. That no information is lost is offline-provable; that the model still
*behaves* is not, and this log already contains enough entries about
prompt changes that looked safe. It is written up in the budget section as the
next session's highest-value move, for whoever has a live key.

**Numbers:** 1780 places / 166 destinations / 83 countries, **0 errors**, 63
warnings. 139 tests, tsc and build clean. Index 242,071 of the new 280,000.

**Addendum - "Did all?" and the honest answer was no.** The first mall pass
checked **18 of 166 destinations**; 29 large ones had never been looked at. Twelve
more were then added - The Mall at Leccio, Noventa di Piave, Factory Krakow,
Freeport, Livingston, Tbilisi Outlet Village, Galerias Pacifico, Gotemba below
Mount Fuji, Rinku, Yas Mall, Outlet Premium Rio, Deniz Mall - taking destinations
with an outlet-village entry from zero this morning to **23**.

Four were checked and got nothing, which is a result and not a gap: **Prague**'s
Fashion Arena is unresolvable (the bare slug `Fashion_Arena` returns a clothing
shop in **Kirkburton, England** - the fourth brand trap this week), **Sofia**'s
Outlet Village at Bozhurishte appears not to be in OpenStreetMap at all,
**Phuket** genuinely has no outlet village, and **Bratislava**'s nearest is
Parndorf, which is in Austria and already filed under vienna - adding one place
to two destinations to hit a number is what the duplicate check exists to stop.

**One caveat recorded rather than smoothed over:** the Rinku Premium Outlets
record is an OSM **bus stop named for the outlet**, not the mall polygon. Same
town, same name, coordinates agree and the stop is at the centre, so the pin is
right - but it is not the retail feature itself, and a later session re-sourcing
it should know that.

**The generalisable bit from today: "did you do all of it" deserves a measurement,
not a memory.** I had reported the first mall pass as done, and it was done *for
the cities I chose* - which is a different sentence, and the difference was 148
destinations. The count is one script; the assumption was free and wrong.

**What the next session should know.** (1) Run `scripts/photo-gaps.mjs` the moment
Chrome is connected; the order is written into its own output. (2) The index
compaction above, before any further ceiling raise. (3) The nine countries with no
food or shopping place at all are unchanged and still blocked on coordinates, not
research. (4) No browser RTL/overflow check has been run on any of the 193 entries
added across passes (dd) through (hh) - still the largest untested surface here.
(5) Standing: the 18 dead photo URLs, the 2.5MB client bundle,
`feat/catalog-supabase` unmerged, and **both GitHub PATs still need revoking at
https://github.com/settings/tokens**.
### 2026-07-29 (gg) - The long tail at two per destination: 126 entries, nine countries that resisted

Netanel: "Continue, now 2 per destination." This closes the food and shopping
rollout across the 113 destinations outside the priority countries.

**Result: coverage went from 62 of 166 destinations to 132, and the countries
with no eating or shopping place at all fell from 47 to nine.** The gap at two
per destination was 213 entries; 126 were written. The other 87 do not exist in
any form this sandbox can verify, and the nine remaining empty countries are
worth naming because each is a specific, diagnosable failure rather than a
skipped queue item: **Kazakhstan, Norway, Turkey, Albania, Kyrgyzstan, India,
Bolivia, the Philippines, Panama.**

**Almaty is the single most instructive miss.** The Green Bazaar is real, famous
and central. `/Green_Bazaar` resolves to **Baku**. `/Green_Bazar` resolves to a
supermarket in **Kerala**. `/Zelyony_Bazar` resolves to **Tashkent**.
`/Zeleny_Bazar` resolves to an Almaty **bus stop**. The one node URL that a
site-restricted search surfaced with the right name and city serves a page about
**Verniy Fortress** instead, twice, with no bazaar coordinates printed anywhere.
Five distinct wrong answers for one obviously-real place. That is the shape of
this whole pass: the bar was rarely the problem, the coordinate source was.

**Method: fifteen research subagents in three waves, my own curation, then four
independent coordinate audits.** The wrong-place trap fired constantly and every
instance was discarded rather than adjusted - "Marché des Halles" (Menton)
returned **Halė Market in Vilnius**, which is itself in this batch from the other
direction; "Targ Rybny" (Gdańsk) returned the fish market in **Batumi**, also in
this batch; "Nili" (a Lappish restaurant in Rovaniemi) returned **Nili District,
Afghanistan**; "Kaupé" (Ushuaia) returned a village in **Lithuania**; "Tepa"
(Mostar) returned a town in **Ghana**; "Crab Market" (Kep) returned
**Bangladesh**; "Malioboro" (Yogyakarta) returned a restaurant in **Surabaya**;
"Turasan" (Cappadocia) returned a locality in **East Java**; "Hanoi Old Quarter"
returned a Vietnamese restaurant in **Hawthorn, Australia**; "Neighbourgoods
Market" (Cape Town) returned the **Johannesburg** one; "Knysna Oyster Company"
returned its **Cape Town** branch; "Peters' Drive-In" (Calgary) returned
**Edmonton**; "Mercado de Mariscos" (Panama City) returned **Tegucigalpa**.

**Three duplicates, caught by the widened check.** Bratislava's **Stará tržnica**
was already in the catalog as an `attraction` **70 metres away under the same
name**. Savonlinna's market square sits **73 metres** from the town pin.
Marsaxlokk's fish market is **232 metres** from the village entry whose entire
fame is that market. None of the three would have been caught by searching the
food categories - the lesson from entry (ee) held, and running candidates against
every place in the catalog is now simply how this is done.

**Two entries dropped on placement, not quality, and the guard found both.**
Jakarta's Glodok was offered for `java`, a destination whose places are
Yogyakarta and the eastern volcanoes - 5.19 degrees away with no Jakarta presence
at all. Porto's Mercado do Bolhão was offered for `douro`, whose westernmost
place is Amarante; **Porto is the Douro's port city but it is not in the valley**,
and filing it there to fill a slot is exactly the kind of quiet
mis-categorisation that makes a catalog untrustworthy. Both went.

**The guard's margin moved 5% → 10% of a destination's own spread**, because at
5% it failed Kuching's Satok market by a hair - and the bound defining the
tolerance was Bako National Park, which *is* Kuching's own national park 20km
away. Re-verified that the Triana typo is still caught at 10%. This is the second
time the margin has needed loosening, and both times the false positive came from
the reference frame being a place in the same city as the entry being checked.
If it needs a third loosening, the right fix is a different reference frame, not
a bigger number.

**I cut roughly a third of what the research returned.** Njeguši and Mačkat came
back as village pins rather than venues - the same shape as the Geroskipou
rejection in entry (ee), so they went for consistency. King of Donair has
franchised beyond Halifax, so it fails the no-chains rule even though the
original is the genuine article. Peters' Drive-In and Las Vegas Chinatown do not
clear "would regret missing". The Scotch Whisky Experience is an attraction.
Paspatur came back labelled a tourist attraction with no confirmation it is a
food or market place at all. Two Takayama morning markets 500m apart collapsed to
one; so did two Ljubljana market entries on the same square.

**One rule applied more carefully than last time.** Several of these markets
trade on one day a week - Salamanca, Farm Gate, Remarkables, Harbourside, Satok,
Gaya Street, Kumtepa, Rissani, Kolaportið, the Old Biscuit Mill. Naming the day
would be storing a schedule, which is the thing this feature refuses to do
because schedules go stale silently and the traveller finds out at a locked gate.
Every one says it is a weekly market and to confirm the day before going.

**Verification.** 126 coordinates re-read against their source pages by four
independent auditors: **126 matched, 0 failed.** The southern-hemisphere and
western-longitude rows were audited specifically for a dropped minus - Cape Town,
Zanzibar, Mauritius, Seychelles, Bali, Cusco, Arequipa, Puerto Natales, Quito,
Rio, Hobart, Queenstown, Wellington, Auckland, Halifax, Calgary - and every page
prints the sign the catalog carries. A programmatic pass separately asserted that
every written coordinate matches the research record, every `externalUrl` matches
its own lat/lng, and every eating place carries a kashrut status.

**Numbers:** 1750 places / 166 destinations / 83 countries, **0 errors**, 63
warnings. 128 tests, tsc and build clean at 277 pages. Grounding index **239,396
of the 260,000 ceiling** - about 20,600 chars left, roughly 187 more entries, so
the remaining 87-entry gap would still fit if the coordinate problem were ever
solved.

**What the next session should know.** (1) The nine empty countries are blocked
on **coordinates, not research** - every one has a real, nameable candidate that
Mapcarta cannot resolve. If a second geocoder ever becomes reachable from this
sandbox, that list is the highest-value work available and it is already scoped.
(2) **None of these 126 entries has a photo**, deliberately - the Chrome
extension has been down for three passes now, and an unprobed URL is what
produced 151 dead links. The unprobed-photo debt is unchanged at 19 from entry
(dd). (3) No browser RTL/overflow check has been run on any of the 175 entries
added across passes (dd), (ee) and (ff) - that is the largest untested surface in
this feature. (4) Mapcarta's OSM-node URL form (`mapcarta.com/N…`, `/W…`) works
where slugs 404 and rescued perhaps a fifth of this batch; its `?q=` search
endpoint does not exist and resolves "Search" as a slug (it returns a sculpture
in Omaha). A web search restricted to `mapcarta.com` is how you find the node
URLs. (5) Standing and unchanged: the 18 dead photo URLs, the `kosher-market` and
`cafe` gaps, the 2.5MB client bundle, `feat/catalog-supabase` unmerged pending
Netanel's review, and **both GitHub PATs still need revoking at
https://github.com/settings/tokens**.
### 2026-07-29 (hh) - The last 490kB: the trip screen now loads the cities it needs, not the catalog

Entry (ff) ended with one thing left as a decision rather than done: `/chat`
and `/planner` still shipped the whole catalog as JavaScript, because
`TripWorkspace` imported `src/data/destinations.ts` to render whatever cities a
trip touches. Netanel: "do it."

**The shape of the fix.** A new `GET /api/cities` serves either the full
`Destination` objects for the slugs asked for, or (with `?options=1`) the
compact city list the add-day picker needs. `lib/trip/cityData.ts` is a
module-level cache in front of it, so a trip of one to six cities costs about
7kB per city instead of 492kB compressed, and switching between `/chat`,
`/planner` and trips costs nothing at all after the first load. **The request
goes through `getProvider()`**, so hard rule 4 survives - an external provider
that enriches a destination still enriches it here, which is exactly where that
abstraction is supposed to earn its keep.

Four separate import paths dragged the catalog into the trip screen and all
four are closed:

- `TripWorkspace` itself → the hook above.
- `ChatPanel` → the little map under a message now reads the same cache and
  fetches its one city if it is not there yet.
- `lib/trip/share.ts` → **`decodeTripShare` moved to
  `lib/server/shareDecode.ts`.** It validates every id against the catalog, and
  both of its callers (`/api/share`, `/t/[code]`) are servers - the screen that
  merely *creates* a link was pulling 2MB to do it.
- `PlannerClient` → the template's city is fetched on click.

Also `/start` (the quiz scores only the chosen cities, so it fetches those) and
`/t/[code]`, where the server page already decodes the trip and now simply
passes those cities down as props - no client fetch at all.

| route | before this pair of sessions | now |
|---|---|---|
| / | 843 kB | **356 kB** |
| /countries | 846 kB | **314 kB** |
| /destinations/[slug] | 816 kB | **328 kB** |
| /chat | 860 kB | **329 kB** |
| /planner | 829 kB (555 kB of it HTML) | **295 kB** (63 kB HTML) |
| /kosher | 761 kB | **273 kB** |

**The bug this uncovered is the part worth writing down.** The first build
crashed the whole trip screen with React error #310 - *rendered more hooks than
during the previous render*. The cause was not the new code: `shareUrlCache =
useRef(...)` had been sitting **below** `TripWorkspace`'s early `return` for the
loading state for a long time. It never fired because the only early return was
`!trip.hydrated`, which in practice never painted - so a hooks violation lived
in the core screen indefinitely, invisible. Adding a second, real early state
(waiting for the cities) made the early return actually happen, and the next
render ran one more hook than the last. **A hook below a conditional return is a
timer, not a bug that has been disproven by not crashing yet.** The ref moved up
with the rest of the hooks and the comment says why.

**A loading state was added deliberately**, not avoided: every stop name,
coordinate and description comes from the city data, so painting the trip before
it arrives would show a real trip with empty days - which reads as data loss.
It waits only on the FIRST city of a session; once anything is in hand it keeps
drawing, so adding a city mid-conversation never blanks the screen.

**Verified 31/31 in a real browser** at 390px (DPR 3) and 1440px, on a
production build: a seeded two-city trip renders from `/api/cities` with the
right stop names, exactly rome+venice are requested and nothing else, no
loading state left behind, day tabs and map pins draw, switching to the Venice
day shows Venice's stops, the add-day picker fetches its city list **only when
opened** and lists cities, a planner template still builds one real trip with
stops, the `/start` quiz still builds a trip and lands on the planner, the share
action still produces a `/t/<code>` link, and that page renders the shared trip
from server props. Plus the 36/36 suite from entry (ff) re-run unchanged. Six
new unit tests pin the cache itself (139 total): no city is fetched twice,
concurrent callers share one request, only new slugs go in the second request,
an unknown slug is not retried in a loop, and **a network failure does not mark
a city as missing** - otherwise one dropped connection would blank that city for
the rest of the session.

**Harness notes.** `next dev` would not render a seeded trip at all here (the
provider overwrites a seed written too early - the trap from entry (w)), so the
minified #310 had to be traced through the built chunk instead: find the byte
offset from the stack, read the surrounding minified source, recognise the
share-URL ref. Also `fonts.googleapis.com` is blocked in this sandbox, so a
naive "no console errors" assertion fails on every page; and the `/start` quiz
cannot be driven without pressing Escape first, because the city dropdown
intercepts the click on "הבא" - both recorded here so the next harness does not
rediscover them.

**Still true and deliberately unchanged:** `/` and `/countries` fetch the chat
route's chunk *after* load because Next prefetches the `/chat` link - that chunk
is now 254kB rather than 746kB, so the background cost fell with everything
else.

### 2026-07-29 (ff) - "Is there any way to make the website faster?" - measured first, and the answer was not the server

Netanel asked the open question. Measured on a production build in a real
browser at 390px before touching anything, because "faster" has three possible
meanings here and only one of them turned out to matter.

**The server was already fine and is not the story.** TTFB 13-19ms, FCP
340-610ms across every route. The weight is entirely in what the browser is
asked to download.

---

**1. The whole catalog shipped as JavaScript on every page - 492 kB compressed,
about 60% of all JS on the site.**

Traced rather than guessed: a script walked every `'use client'` file's static
import graph and found ten client entries reaching `src/data/destinations.ts`.
The load-bearing one is **`SiteNav` → `lib/trip/label.ts` → the catalog**, and
`SiteNav` lives in the layout - so **every page in the site**, including the
homepage and the 166 city pages that never touch it, downloaded 2 MB of trip
data to turn a slug into a Hebrew city name.

`tripLabel` now takes a `Record<slug, name>` built by the server
(`lib/server/cityNames.ts`) and passed as a prop: about 4 kB, always in sync
with the catalog because it is derived from it. A generated-and-committed file
would have saved the 4 kB and gone stale in silence every time the nightly data
session adds a city - a bad trade.

Second entry, same shape: `DestinationBrowser` (a client component) imported
`buildDestinationCards` from `destinationFacets.ts`, which imports the catalog -
**even though the server already computes the cards and passes them as props.**
The builder moved to `lib/destinationCards.ts` (server-only by import), the
filtering/constants/types stayed put for the client.

| route | resources before | after |
|---|---|---|
| /destinations/[slug] | 816 kB | **328 kB** |
| /kosher | 761 kB | **273 kB** |
| / and /countries | 843 kB | 847 kB initial payload clean; see below |

`/` and `/countries` still end up fetching that chunk **after** the load event
(measured: starts at 944ms, load finished at 501ms) because Next prefetches the
`/chat` link. It is no longer part of any page's initial payload; it is a
background prefetch of the app screen. Left as-is deliberately - it makes the
main CTA instant, and `prefetch={false}` is a one-line reversal if the mobile
data cost turns out to matter more.

---

**2. `/countries` requested 166 full-size photos the moment it opened.**

Every card painted its photo as a CSS `background-image`, and
`background-image` **cannot be lazily loaded** - the browser fetches it as soon
as the element is styled. 166 Commons thumbnails at ~50-90 kB is roughly
8-14 MB on a phone, before a single scroll, and it dwarfed every other cost on
the page.

New `CardPhoto` renders an `<img loading="lazy" decoding="async">` under an
absolutely-positioned overlay carrying the exact same gradient values, so the
card looks identical. **166 requests on load → 5.** Applied to the four card
surfaces that had the same pattern: the catalog browser, the country page's
city cards, the /kosher city cards (27 → 11) and the homepage highlights. The
page **heroes were deliberately left as backgrounds** - a hero is the LCP
element and lazy-loading it would make the page slower, not faster.

**One honest correction to my own first claim.** I also added `srcSet` with
250/330/500 (`lib/photo.ts`, which refuses to widen a thumbnail - the exact
mistake that killed 170 URLs in entry (k), now with a test). In practice the
browser almost always still picks 500w, because a card is ~360 CSS px wide and
phones are DPR 3. **The win here is the lazy loading, not the srcset**; the
srcset only helps low-density screens. Saying both would have been overclaiming.

---

**3. `/planner` served 555 kB of HTML.**

The page fetched all 166 destinations **in full** through the provider and
serialized them into the RSC payload - while `TripWorkspace` was separately
importing the same catalog as JavaScript. The same 2 MB delivered twice, and
555 kB of render-blocking HTML is roughly three seconds on a slow phone before
anything paints at all.

It now passes `provider.getDestinations()` summaries (the provider abstraction
is intact - hard rule 4 - just at summary granularity), the template cards read
name/flag/days from the summary and resolve the full destination from the
catalog already in the bundle, and `TripWorkspace` falls back to its own
curated import exactly as it already does on `/chat`. **HTML 555 kB → 63 kB.**
The `getCountries()` call went too: it was fetched, passed down, and never read.

---

**4. Agent response time: measured, and there is nothing left to win in our
code.** Building the grounding index costs 7ms (and is cached since this
morning), the detail block 1.3ms, `serializeTripForModel` 0.02ms, and the
catalog module loads in 290ms once per cold start. Total server CPU per model
call is single-digit milliseconds. **The remaining latency is model time and
the number of sequential tool calls**, which entry "Latency" already addressed
(37.6s → 22.2s, trip on screen at ~10s). Measuring further needs his key staged
live; I did not guess at it.

---

**Verified 36/36 in a real browser** at 390px (DPR 3) and 1440px: all 166 cards
render, photos are lazy `<img>` and actually paint, only the visible ones load,
the catalog filters still narrow correctly, /kosher and country-page cards
paint, the planner's city picker and template-to-trip flow still build exactly
one trip, the nav still shows the city-derived trip label, and zero horizontal
overflow anywhere. 133 tests, validator 0 errors, tsc, lint and build unchanged.

**Two harness lessons, both the same species as the flag-image trap.** The
suite reported "country page photos do not paint" twice: the first time because
those images are below the fold and lazy loading was *working*, the second
because that page's first card photo is an **Unsplash** URL and only
`upload.wikimedia.org` and `flagcdn.com` were stubbed. And an assertion that
lazy images stay deferred is simply false on a 10-card page - Chrome's lazy
threshold is ~1250px on a fast connection, so it loads them all. Each time the
number was surprising, the fixture was wrong.

**Left for a decision, not silently:** `/chat` and `/planner` still ship the
catalog as JS (~490 kB) because `TripWorkspace` needs place data for whatever
cities a trip touches; loading only the trip's cities means fetching per city
at runtime, which is a real change to the core screen and not a bundle tweak.

### 2026-07-29 (ee) - The priority-country rollout: 49 entries, and the 45 that do not exist

Netanel picked the second option - three per destination for the countries
Israelis actually fly to, the long tail left thinner. This entry is that pass.

**First, a correction he asked for and I owed him.** He asked whether all
countries have restaurants and shopping now. They do not, and my previous
message had let that stand. Measured: **28 of 166 destinations** carried a
curated food or market entry, and **47 of 83 countries had neither an eating
place nor a shopping place of any kind** - Portugal, the Netherlands, Turkey,
Mexico, Morocco, South Korea, Canada, Australia and the whole Nordic and Baltic
run among them. I had also reported "39 entries across 29 destinations" when the
real figures were 42 across 28; the gap was pre-existing entries recategorised
during the backfill, which my count double-handled. **Recount before quoting a
number in a summary, not after.**

**Scope, measured before writing.** The 17 priority countries hold 53
destinations. Counting legacy `cafe` and `shopping` entries as already-covered,
39 of them sat below three, a gap of **94 entries ≈ 10,340 index chars** - cheap,
because a food entry serialises 110 chars and not the catalog-wide average of
144. Note the UK's country slug is `united-kingdom`, not the `uk` shorthand the
older session-log entries use; my first count silently omitted two destinations
because of it.

**49 written, 45 not found - and that is the deliverable, not a shortfall.**
Nine destinations got fewer than three and six got nothing at all:
`meteora-epirus`, `northern-bulgaria`, `bucovina-maramures`,
`bohemian-switzerland`, `uae-mountains` and `grand-canyon`. The reasons are
specific rather than "we ran out of time": Epirus's real food identity is
handmade pies in village tavernas and a Metsovo dairy, none of which exist in
any coordinate source reachable from this sandbox; Maramureș's is household
horincă and periodic livestock fairs; the Southwest parks' is not food at all.
Padding those six was the easy result and the wrong one.

**Method: ten research subagents, then my own curation, then an independent
coordinate audit.** The subagents were given the wrong-place trap explicitly and
it fired constantly, which is the useful part - "Vivoli" (a Florence gelateria)
returned a restaurant in Toronto, "Kaupé" (Ushuaia) returned a village in
Lithuania, "Targ Rybny" (Gdańsk) returned the fish market in Batumi, "Do Mori"
(Venice) returned a locality in Papua New Guinea, "Marché des Halles" (Menton)
returned Halė Market in Vilnius, and **"All'Antico Vinaio" returned the Milan
branch rather than the Florence original - a wrong branch of the right business
is still wrong.** Every one was discarded rather than adjusted.

**I then cut about a third of what came back**, which is where the bar actually
gets held: two Dolomites rifugi collapsed to one, Lucky's Souvlakis and Mercado
Victoria were dropped as merely fine, the Scotch Whisky Experience is an
attraction and not a food place, Geroskipou came back as a village-centroid pin
rather than a loukoumi workshop, Hatta's honey garden and the Las Vegas Chinatown
strip do not clear "would regret missing", and Dedo Pene in Bansko arrived with
Mapcarta's own administrative labelling wrong, so it went.

**Two catches worth keeping.**

*Grassmarket was already in the catalog*, filed as an `attraction`. That is the
sixth instance of the duplicate class that got five past me last pass, and the
reason it was caught this time is that the check now runs candidate names against
**every** place in the catalog rather than against the food categories. The
narrow check is the bug; the category a place was filed under has nothing to do
with whether it is the same place.

*The Punta Arenas market was offered for `patagonia-south`*, which is the
Argentine destination - its places are El Calafate, Perito Moreno, Ushuaia. The
city of Punta Arenas is Chilean and already lives in `torres-del-paine`. It went
there. Filing it where the quota wanted it would have put a Chilean market inside
Argentina.

**The urban-distance guard from entry (dd) needed a margin.** Keying the
tolerance to the destination's exact maximum spread turned out to be brittle in a
way I did not anticipate: El Viejo Marino in Ushuaia failed by **0.002 degrees**,
purely because the city of Ushuaia was itself the place defining the bound. The
tolerance is now the spread **plus 5%**. The Triana typo is still caught (1.19
against a 1.05 tolerance), which is the test that matters - a guard that stops
catching its founding bug is not a guard.

**Verification.** All 49 coordinates re-read against their source pages by three
independent auditors: **49 matched, 0 failed**, signs included - the negative
longitudes for Maine, Boston and Edinburgh and the negative pairs for Ushuaia and
Punta Arenas were each confirmed explicitly, since a dropped minus is the other
half of the transcription class. A programmatic pass separately asserted that
every written coordinate matches the research record, that every `externalUrl`
matches its own lat/lng, and that every eating place carries a kashrut status.

**One rule I nearly broke by habit:** the first draft of the Edinburgh entry said
the farmers' market runs "only at weekends". That is a schedule, and schedules
are the thing this feature refuses to store because they go stale silently. It
now says the market is seasonal and to confirm before relying on it - which is
the honest version and does not rot.

**Numbers:** 1624 places / 166 destinations / 83 countries, **0 errors**, 62
warnings (the two new ones are the Ayutthaya-Krabi entries sitting far from that
destination's midpoint - its own existing places all warn identically, because it
is a two-city hub whose centre is the sea between them). 128 tests, tsc and build
clean at 277 pages. Grounding index **228,505 of the 260,000 ceiling**, about
31,000 chars of headroom left - roughly 280 more food entries, so the long tail
fits if it is ever wanted.

**What the next session should know.** (1) Coverage is now 62 of 166
destinations; the 113 destinations outside the priority countries still have
nothing, by decision rather than oversight. (2) The unprobed-photo debt from
entry (dd) is unchanged and has grown by nothing - **none of these 49 entries has
a photo**, deliberately, because the Chrome extension is still down and an
unprobed URL is what produced 151 dead links. (3) No browser RTL check has been
run on any of the scaled entries, for the same reason. (4) Mapcarta remains the
only working coordinate route; when a name slug 404s, its OSM-node URL form
(`mapcarta.com/N3779372494`) often works where the slug does not, and that is how
Kapana, the three Cyprus markets and the Tbilisi and Batumi bazaars were
resolved. (5) Standing and unchanged: the 18 dead photo URLs needing
human-chosen replacements, the `kosher-market` and `cafe` gaps blocked on
geocoding, the 2.5MB client bundle, `feat/catalog-supabase` unmerged pending
Netanel's own review, and **both GitHub PATs still need revoking at
https://github.com/settings/tokens**.

### 2026-07-29 (dd) - Scaling the food/shopping pass: 39 entries, five duplicates I missed, and a coordinate typo of my own

Netanel: "good. scale. use chrome session for images", then "Finish all of those
destinations". This entry covers both passes - the 27-entry rollout and the final
11 - since entry (bb) logged only the 12-entry sample.

**I told him scaling did not fit, and I was wrong.** Entry (bb) computed the cost
of ~500 new places using the catalog-wide average of 144 chars per place and
concluded there was no room under the 260,000 ceiling. That average is dominated
by places with descriptions, tags and durations. A food or market entry serialises
**110 chars**, because `buildGroundingIndex()` writes only id/name/category/tags/
priceLevel/mustSee/durationMin - not description, not source, not kosherStatus,
not coordinates, not photos. At 110 chars the headroom is **364 places, not
285**, and the pass fits comfortably. I corrected this to him unprompted, because
a wrong arithmetic result that says "stop" is more expensive than one that says
"go" - it silently cancels work nobody re-examines.

**39 entries now across 29 destinations.** The final nine: `ven-rialto-market`,
`it-ballaro`, `it-vucciria`, `ath-varvakeios`, `her-chania-agora`,
`es-mercado-triana`, `pmi-olivar`, `tbs-dezerter`, `th-warorot`,
`ba-san-telmo-market`, `ba-tortoni`.

**Mapcarta carried the whole pass, and that is the reusable finding.** The Chrome
extension went down twice, once mid-probe, so the Wikipedia coordinates API was
unavailable for most of this work. Mapcarta publishes OSM-derived six-decimal
coordinates at `mapcarta.com/<Name_With_Underscores>` and **is reachable from
this sandbox** where Wikipedia, Wikidata and Commons are cache-only. It traces
location and nothing else - so every entry written from it asserts a position and
a name, and no founding date, no numeric claim, no history.

**Photos shipped absent rather than unprobed.** 19 of them. `verify-photos` could
not run, and recording `ok:true` for a URL nobody fetched is exactly how the 151
dead links in entry (s) came to exist. They are deliberately missing from
`scripts/photo-verified.json`; the UI falls back to a category tile.

**Two mistakes of mine, both caught by machinery rather than by me.**

*Five duplicates.* My pre-filter searched for existing `food` and `market`
entries. Places already filed as `shopping` or `attraction` were invisible to it,
and I proposed five things the catalog already had: `dxb-gold-souk`,
`nyc-chelsea-market`, Sofia's `sof-hali` against `sof-market-hall`, London's
`lon-borough-market` against `lon-borough`, Budapest's `bud-vasarcsarnok` against
`bud-vaci`. The validator's duplicate check caught all five; I removed them.
Near-misses were correctly kept - Russ & Daughters sits 80m from Katz's and is a
different business.

*A latitude typo.* Triana went in as 38.38572 where Mapcarta says 37.38572. One
character, ~111 kilometres, and it would have put a Seville market in the
mountains north of Córdoba. I found it re-reading my own JSON against the source
values, then wrote `/tmp/verify_coords.mjs` asserting all eleven coordinates
against their source pages - all matched, and every `externalUrl` matched its own
lat/lng. **The pre-existing externalUrl check was structurally incapable of
catching this**, because the link is generated from the same wrong number.

**So the guard is new, and its threshold is the interesting part.** My first
version errored past a flat one degree. It reported five failures, and all five
were legitimate: a kosher market in Las Vegas inside the country-scale
`grand-canyon` destination, Union Oyster House in Boston inside `new-england`,
Triana inside `andalusia`, and Chabad houses in Reykjavik and Zagreb serving
regions from the nearest city. A destination that spans a country legitimately
holds urban amenities a degree or two from its map centre.

The tolerance is now **the destination's own geographic spread, measured from its
NON-urban places**. Attractions, nature and viewpoints are what legitimately
spread out across a regional destination, and they are not the bug class the
check guards, so they are the honest reference frame. `andalusia` spreads
1.00/2.50, so Triana at 0.19/1.40 passes - and the typo version at 1.19/1.40 is
still caught, on latitude. All five false positives cleared, the real error still
errors. Verified by re-injecting the typo and watching it fail.

**Numbers:** 1575 places, 166 destinations, 83 countries, **0 errors**, 60
warnings - the same warning count as before the pass, so nothing regressed. 117
tests, tsc and build clean at 277 pages.

**What the next session needs to know.** (1) The 19 photos from this pass are
unprobed and absent from the manifest - re-run `verify-photos` from a real
network and commit it. (2) No browser RTL/overflow check was done on the scaled
entries; the extension was down. (3) Mapcarta is the coordinate route when the
Chrome extension is unavailable, and it is worth trying before concluding a place
cannot be pinned. (4) Standing and unchanged: the 18 dead photo URLs needing
human-chosen replacements, the `kosher-market` and `cafe` gaps blocked on
geocoding, the 2.5MB client bundle, `feat/catalog-supabase` unmerged pending
Netanel's own review, and **both GitHub PATs still need revoking at
https://github.com/settings/tokens**.
### 2026-07-29 (cc) - Kosher volunteered itself into prose, and the search overlay was trapped inside the navbar

Two reports from Netanel, both from the deployed site on his phone. They are
unrelated bugs with the same shape: **a rule that was enforced in one layer and
absent in the layer next to it.**

---

**1. "I asked about a restaurant in Rome and it started talking about kosher
places, even though I did not switch the kosher button on."**

He is right, and this was a known-open item - entry (h) recorded exactly this
symptom in October's live testing and did not fix it. The two venues his
screenshot names, בא-גטו and יטבתה, are precisely the two `kosher-food` entries
Rome has in the catalog. **The model did not invent them; it read them.**

`filterKosherUnlessOptedIn` guards the TOOLS - what may enter a trip - and the
system prompt has said "do not raise the topic" in three progressively stronger
wordings. **Prose was never guarded at all**, and the data was in front of the
model every single turn.

Entry (h)'s own lesson applies: *when the model ignores a rule, do not rewrite
the rule harder - move it closer to the moment of generation, or replace it
with a computed fact.* So this is not a fourth prompt round. It is structural:
when kosher is off, **the kosher layer is not in the data the model receives.**
New `src/lib/server/grounding.ts` (moved out of the route, because a route
handler cannot export helpers and this needed tests - same reason
`sanitizeMessages` moved) strips, when the gate is closed:

- every `kosher-food` / `kosher-market` place, from BOTH the index and the detail block,
- the city's `practical.kosherOverview`,
- kosher ids inside the curated itineraries - **the back door**, since a day of
  the curated route can carry a kosher stop and that is how the id reaches the
  model without ever appearing in the place list.

**The gate opens on a computed fact, not a vibe:** the kosher preference is on,
`shabbatAware` is on, the UI toggle rode along with the request, or one of the
last six **user** messages actually says כשר / מהדרין / גלאט / בד״ץ / השגחה /
חב״ד / kosher / chabad. Deliberately not the assistant's messages: one mention
by the agent would hold the gate open forever, which is the thing it exists to
prevent. Deliberately not the word שבת either - "אני מגיע ביום שבת" is Saturday,
not a kashrut request.

**Two things were deliberately NOT stripped.** A `kosherNote` on a place that is
*not* kosher is a warning, not a recommendation - Katz's Delicatessen says
plainly it is not kosher, and hiding that would be the dishonest direction of
this change. And the closed gate ships an explicit `kosherPolicy` line in the
data telling the model it may not mention kosher **and may not claim the city
has none** - it was simply not given that layer, and if asked it should say the
site has a kosher layer and offer to switch it on. Silence that turns into
"there's no kosher food in Rome" would be a worse bug than the one being fixed.

**Cache safety, since the index is the expensive block:** there are exactly two
index variants (with kosher, without), each built once per process and cached,
so `cache_control` still hits on both. Index measures 218,568 chars with kosher
and 211,038 without. As a side effect the index is no longer re-serialised on
every model call - it used to be rebuilt for each of the 5 calls in a build.

**10 new tests** (119 total), run against the real catalog rather than a fixture,
because what is being asserted is literally what gets sent: his exact question
("איזה מקום לאכול יש ברומא") produces grounding blocks containing neither
`rom-baghetto` nor `rom-yotvata` nor their names; both come back when the
preference is on OR when the user asks; the assistant's own kosher sentence does
not open the gate; the not-kosher warning survives; the two index variants are
stable and distinct.

**The other half, found while rebasing onto entry (bb).** That session opened
`food`/`market` categories and hardened the TOOL guard for travellers who DO
keep kosher - Katz's could previously be added to a kosher trip. The prose side
of that is the mirror of this entry's bug, and it was still open: with kosher
ON, the grounding handed the model Café Central and Katz's with nothing marking
them. Now every eating place carries its computed `kosherStatus` when the gate
is open, plus a policy line - recommend only `kosher`, and a `not-kosher` or
`unknown` place may be named ONLY to say plainly that it is not kosher.
**Not stripped, deliberately:** an observant traveller who reads "Katz's is a
New York institution, and it is not kosher" got exactly what they needed;
deleting the row would have left them with no warning at all. 128 tests.

---

**2. "The line is not gone. On mobile."**

The screenshot is the site-search overlay: a shaded band exactly the height of
the navbar, ending in a hard horizontal line, with the panel floating below it
on an undimmed page - plus a faint vertical dashed hairline down the right edge.

**Measured rather than guessed, and the number is unambiguous:** the overlay
that reads `fixed inset-0` renders at **360x74 instead of 360x740**. Its
containing block is the `<header>`, because the header carries `backdrop-blur`
and `backdrop-filter` creates a containing block for fixed descendants. So
"full screen" was "the navbar": the dim painted only inside the header box, the
panel spilled out below it onto a page it was never dimming, and `pt-[10vh]`
lined the panel's top up with the header's bottom edge so it looked deliberate.

**The project had already solved this once and the second site was never
updated.** `AccountButton` carries a comment naming this exact trap and renders
its modal through `createPortal` - the login modal would otherwise be jailed in
the same navbar. `SiteSearch` never got it. It does now, with the measurement in
the comment so the next person does not have to re-derive it, and the rule is in
the Gotchas section: **anything `position: fixed` inside the header must be
portalled to body.** (`.rise-in`'s sticky transform is the same species; it is
already recorded in `TripWorkspace`.)

**14/14 in a real browser** at 360x740 with DPR 3 and at 1440x900, through both
entry points (mobile menu row, desktop nav icon): the overlay now measures
exactly the viewport, its parent is `<body>`, the dim reaches the bottom-right
corner of the screen, no horizontal overflow, Escape still closes.

**The honest limit.** The vertical dashed hairline does NOT reproduce in
headless Chromium - the DOM has no dashed border anywhere while the overlay is
open (checked every element's four border styles and its outline). It sits
exactly on the boundary of the clipped `backdrop-filter` region, which is a
GPU-composited edge that software rendering here will not show, so the most
likely explanation is a tiling artifact of that clip. That boundary no longer
exists after this fix - the filter now covers the whole screen - so it should go
with it. **If it survives, that is new information and worth another screenshot;
I could not prove it from here.**

---

**Also worth knowing.** With the phone keyboard open, the panel is taller than
the visible area (`pt-[10vh]` + `max-h-[60vh]` against a layout viewport that
does not shrink for the keyboard), so about three rows show and the rest scrolls.
That is real but it is not what he reported, and shaving the top padding buys
about half a row - left alone rather than fiddled with.

**Still waiting on Netanel, unchanged:** rotate the GitHub token (it was pasted
into chat); run `supabase-check.sql` and `supabase-trips-check.sql` and say what
they report; delete the two trips again and say whether they come back; add
`SUPABASE_SERVICE_ROLE_KEY` to Vercel; approve the 19.90 ₪ price; affiliate IDs;
the `[למילוי]` accessibility placeholders.

### 2026-07-28 (aa) - "I deleted 2 of those and they are back" - the tombstones held; the layer above them did not

Netanel, with a screenshot of three trips in the nav dropdown.

**First: the tombstone mechanism from entry (w) is fine.** The 14-check
browser suite still passes 14/14 against the Supabase stand-in - the reported
race, the signed-out delete, the cross-device propagation, all of it. I re-ran
it before touching anything, because the alternative was to start rewriting a
mechanism that was not broken.

**The defect is one layer above.** `AccountSync` applied the result of a pull
with `trip.upsertTrip()`, and `upsertTrip` stamps `updatedAt: Date.now()` **by
design** - it is the call used when somebody actually changes something. So
**merely signing in re-dated every trip that came down from the server to
"now"**, and the debounced push 1.5 seconds later wrote that fabricated
timestamp back up. From then on the merge does exactly what it is told - "an
edit newer than the deletion wins" - and a trip deleted earlier on another
device is restored everywhere, with the tombstone overwritten and lost.

Note what makes this nasty: **every individual piece behaved correctly.** The
merge was right, the tombstone was right, the last-writer-wins rule was right.
The only lie was the timestamp, and once a lie is in the data every correct
rule downstream faithfully propagates it.

**The fix is to stop impersonating an edit.** New `applyRemoteTrips()` in
`TripContext` merges pulled trips in with their timestamps EXACTLY as they
arrived, does **not** clear the tombstone (only a real local create or edit
does that - that path is still live and still correct), and does **not** hijack
`currentId`. That last one was a second, quieter bug: `upsertTrip` calls
`setCurrentId`, so signing in silently switched which trip was open, to
whichever happened to be applied last.

**Two unit tests pin the mechanism rather than the symptom:** with the
re-stamp a pulled trip beats a tombstone, without it the deletion holds, and a
GENUINE edit after a deletion still wins - the rule is not weakened, it just
stopped firing on its own. 109 tests. Plus a new focused browser check: a trip
seeded remotely with an `updatedAt` an hour old is now applied locally with
**0s drift** instead of being re-dated, and the open trip is not switched.

**The honest limit, stated because this log already contains four confident
wrong diagnoses.** This is a real defect with a proven mechanism. It is **not
proven to be the cause of what he saw.** The competing explanation is mundane:
he deleted those trips BEFORE the tombstone fix shipped, so the deletion only
ever existed in one browser and the next sign-in legitimately restored them -
a one-time event that cannot recur. Both fit the screenshot equally well, and
the difference is not decidable from here.

So the deliverable includes **`supabase-trips-check.sql`**: read-only, lists
his rows split into live trips and tombstones with both timestamps, and its
header says how to read the answer. If a trip is on screen AND has a tombstone
row, the bug is live and that query is the evidence. If the row is a live trip
with no tombstone, it was the pre-fix deletion and deleting again sticks. This
is the cheap way to end an argument that would otherwise take another round
trip - the same lesson as the `information_schema` diagnostic in entry (p).

**Harness notes, because two of them cost real time.** (1) `NEXT_PUBLIC_*` is
inlined at BUILD time, so the accounts suite needs
`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3140 npm run build`, not just the
env at `next start` - without it the login button never renders and the suite
fails looking like a product bug. (2) The `for p in $(pgrep -f ...)` kill
pattern matched my own shell **again** (exit 144, third time this week). What
actually works: `ps -eo pid,ppid,args`, read the real pid, `kill -9` it by
number. `lsof -t -i:PORT` reported the port free while a detached `next-server`
was still bound to `0.0.0.0` - do not trust it alone.

**Left alone deliberately:** the pull runs once per sign-in, so a tab left open
does not learn about a deletion made elsewhere until it reloads. That is
inherent to the current design, it self-heals on reload, and adding polling to
fix it is a bigger decision than this bug warranted.


### 2026-07-28 (z) - "The image is not good, and the blue bar is still showing" - one cause, and it was a class

Two reports from Netanel's phone, on `/destinations/nova-scotia`. **One root
cause**, and the second report was not the bug he thought it was.

**The image: a road SIGN was serving as the photograph.** `CabotTrailSign.png`
is the Cabot Trail's highway marker - a dark navy field with a silhouetted
coastline, a road and the words CABOT TRAIL. It sat in three fields on that one
page: destination hero, `iconicLandmark`, and the place `ca-cabot-trail`.

**The blue bar was the SAME file, and I measured that instead of guessing.**
With the search overlay open at 390px, a scan of every visible element found
exactly one blue background on the page: `.photo-bg`, the hero card, whose
background is the brand purple gradient - the deliberate no-photo fallback.
**`CabotTrailSign.png` has an alpha channel**, so the gradient showed straight
through it and the card rendered as a blue bar with a silhouette on it. Nothing
in the search overlay was ever blue; entry (x)'s `::selection` fix was a real
and separate bug. Two reports, one file.

**Audited as a class.** All 1,848 photo fields were checked against the naming
Commons actually uses for non-photographs. Sixteen more offenders, in three
groups: **signs** (Cabot Trail, Hatta, the Vaci utca street sign), **montages
and collages** (Szentendre, Shaki, Qabala, Rovaniemi, Kemi, Merida, Izamal,
Gyeongju, Kiruna, Travnik, Ioannina, Punta Arenas) and **a Wikivoyage banner**
(Gouda - a real photograph, but cropped 7:1 and unusable in a card). A montage
at 500px is six thumbnails in one frame; it is worse than an empty card.

**Replacements came only from photos already in the catalog with recorded HTTP
evidence** - no new URLs, no research, zero verification risk. nova-scotia's
hero is now Little River in Fall, and its landmark moved **wholesale** to the
Fortress of Louisbourg (name, nameLocal, photo and blurb together) - a card
titled "מסלול קאבוט" carrying a Louisbourg photograph is precisely the Edinburgh
assembly error entry (u) records. gyeongju-busan got Gamcheon village and
Bulguksa; Bosnia's country card got the Mostar bridge. The other fourteen simply
lose their photo and fall back to the category tile.

**`validate-catalog.mjs` now ERRORS on the class.** The pre-existing rule caught
only `.svg`, and this species ships as `.png` and `.jpg` constantly while the
filename announces itself. The new check matches the DECODED filename with
separator anchors, which is what keeps it honest: `Piazza_Signoria`,
`Iconsiam` and `Panorama` are photographs and must not trip a naive `/sign/`
test. 0 errors after the fixes.

**Flagged and deliberately NOT changed, because a filename is not evidence and
`upload.wikimedia.org` cannot be viewed from this sandbox:** `Turkestan.png`
(used three times - and entry (s) records that a Turkestan search once offered a
1900s portrait of an irrigation official), `Aisha_bibi.png`, `MADABA_2.png`,
`Quilotoa_Ecuador_Hike.png`, `Mount_kinabalu_01.png`, `Mogren_Beach_Budva_1b.png`,
and the Jeronimos and POLIN museum PNGs. A `.png` is *suspicious* for a
photograph, not disqualifying. These need a human to look at them.

**The generalisable bit:** "photo is verified" has meant three different things
in this project and only the first two were ever enforced - the URL is well
FORMED (entry q), the URL SERVES 200 (entry r/s), and the file is actually a
PHOTOGRAPH OF THE THING. The third has been caught by eye four times now
(Abu Dhabi's recycling bin, the Reina Sofia logo, the Bedesten 3D model, this
sign) and never by a check. The filename rule closes the cheapest slice of it.

**16/16 in a real browser** at 390 and 1440, with a NEUTRAL GREY png served for
the blocked image hosts - deliberately grey, so any blue found would be CSS
rather than the photograph. No sign or montage left in the markup, the hero
paints an opaque photo over the gradient, no other blue element anywhere, RTL
intact, zero overflow. Validator 0 errors / 43 warnings, 107 tests, tsc and
build clean.

**Also worth a look eventually, not fixed:** at 390px the destination hero
breaks the Latin `nameLocal` across two lines ("Nova / Scotia") beside the
Hebrew title. Cosmetic, pre-existing, and not what he reported.


### 2026-07-28 (y) - Kosher: 15 verified venues, and the coordinate route that finally worked

Third item of bundle B. The previous three sessions all stopped at the same
wall and wrote it down honestly: kosher restaurants and shops have no Wikipedia
articles, so their coordinates could not be verified from this sandbox. That
was true. It was also incomplete - **the wall was the geocoder, not the venue**,
and nobody had gone looking for a different door.

**What is blocked from here, tested this session, not assumed:** Nominatim and
Photon (robots-disallowed), overpass-api.de and api.openstreetmap.org
(robots-disallowed), the Wikipedia action API and Wikidata (cache-only),
overpass mirrors kumi.systems / private.coffee (an ID lookup returns instantly,
any tag+bbox query times out), openstreetmap.fr (DNS). dbpedia works but was
throwing 502s all session and rate-limits hard.

**What works: Mapcarta**, which publishes OpenStreetMap-derived coordinates at
six decimal places on `mapcarta.com/<Name_With_Underscores>` slug URLs - reachable
by slug, not by search. Plus 2GIS and a few business-specific listings. The rule
applied to every single one: **accept a coordinate only from a page that also
prints the venue's street, and only when that street matches the address the
kashrut source gave.** The pin and the address corroborate each other, which is
the difference between a verified coordinate and a confident-looking wrong one.

**Fifteen venues added**, each with name, exact street address and supervision
traced to the venue's own site, a certifying body or a community list:

| city | venues |
|---|---|
| new-york | Barnea Bistro, Reserve Cut (OU), Noi Due (OK, dairy), The Kosher Marketplace |
| buenos-aires | Lo De Victor, Confiteria Malena (Rabbi Chehebar), Super Modelo |
| dubai | Kikko’s, Rimon Market, Mosaica (all EAKC / Rabbi Duchman) |
| london | Novellino Bistro, Kosher Kingdom (KLBD), Tony Page |
| paris | L’As du Fallafel (Beth Din de Paris) |
| antwerp | Kleinblatt |

**Supervision is recorded as REPORTED, never asserted.** Super Modelo is the
entry worth reading: the City of Buenos Aires kosher list AND the Chabad
Recoleta list both carry the shop, and neither publishes its hechsher - so the
field says exactly that instead of borrowing a plausible one from a neighbour.

**Eleven candidates were dropped rather than guessed**, and the reasons are the
useful part: Madrid (no venue coordinate verifiable at all - the city gets
nothing this round); Kingston Kosher (Chabad says Malabia 460, two other sources
say Vera 532); Aux Délices d’Abraham (the OSM object and the kosher directories
spell the name differently); Hypercacher Meaux (the only Mapcarta match is the
Porte de Vincennes branch - **wrong branch is the restaurant version of the
wrong-city trap**); Hoffy’s and Eighteen in Antwerp, Carmelli and Bread in
London (absent from OSM); Le Fournil and three more Dubai venues (no
confirmable address page). Villa Crespo’s dbpedia coordinate is -34.6/-58.45,
a coarse grid - rejected on the same rule that rejected Ayia Napa.

**The load-bearing sentence stayed load-bearing.** Three cities said "the place
list is not yet in the catalog". That sentence was true and is now false, so it
was replaced - not deleted - with an equally honest one naming what is actually
there (four places in Manhattan, three around Once, three in Dubai) and saying
plainly that this is a small sample, not a full list. Deleting it to make the
data look complete is still forbidden; so is leaving a statement standing after
it stops being true.

**Redundancy caught by looking at the render, not the diff.** The first pass gave
every entry a `kosherNote` restating its supervision, and the card then printed
the same fact twice - once in the note, once in the badge. Thirteen notes
removed; the two that survive add something the badge cannot (Noi Due is dairy
and fish only; Super Modelo’s hechsher is unpublished). Also removed two
opening-hours claims I had written from habit and could not source.

**Numbers:** kosher entries 42 to 57, `kosher-market` 4 to 10, cities with kosher
data 32 to 35, catalog 1,510 to 1,525 places. Validator 0 errors and the same
44 warnings. Grounding index 218,568 of the 260,000 ceiling. 107 tests, tsc and
build clean. **22/22 in a real browser** at 1440 and 390 on /kosher: the three
new cities appear in the directory, search opens them, every entry renders its
supervision line and the "verify with the venue" caveat, RTL intact, zero
overflow. Photos: none of the fifteen has one, deliberately - kosher venues have
no freely-licensed photograph, and the UI already falls back to a category tile.

**Also shipped: `supabase-check.sql`**, because Netanel asked mid-session how he
could tell which SQL files he had actually run. It is read-only, reports OK or
MISSING per file with the exact missing object, and queries only the Postgres
catalog - so it cannot fail on a file that has not been run yet, which is the
exact failure that cost a round trip when an earlier diagnostic assumed
`p.plan` existed.

**Next session should know.** (1) Mapcarta slug URLs are now the coordinate route
for anything without a Wikipedia article - it is worth trying before concluding
a place cannot be pinned. (2) Madrid, and Antwerp beyond Kleinblatt, are still
open and are pure coordinate problems, not research problems. (3) The remaining
big kosher gaps are Milan (not in the catalog at all), Brooklyn, and Rome beyond
its two Ghetto restaurants. (4) The standing user actions are unchanged: rotate
the GitHub token, add `SUPABASE_SERVICE_ROLE_KEY` to Vercel, run the SQL files
that `supabase-check.sql` reports as MISSING, approve the 19.90 ₪ price, supply
affiliate IDs, fill the accessibility placeholders.

### 2026-07-27 (x) - Four polish items, and a fixture that invented a fifth

Netanel: "make trip screen be as clean as possible + navbar trips + fix shopping
selection + fix blue bar when searching." Visual and interaction only, one
branch, one merge.

**Read this first: the harness invented a layout bug and I nearly acted on it.**
The first screenshots of the trip screen showed the day tabs as **giant coral
circles** with a broken image inside, overflowing the row at 390px. They are
`rounded-full px-4 py-2` pills with a small `<Flag>` image. flagcdn.com is
blocked from this sandbox, a broken `<img>` renders its **alt text**
("דגל אוסטריה"), the text wraps, the pill becomes roughly square, and
`rounded-full` on a square is a circle. On a real machine they are ordinary
small pills. **Serving a real PNG for flagcdn and upload.wikimedia.org is now
the first thing the check script does** - four lines, and it is the difference
between fixing the product and redesigning around a broken fixture. That is the
fourth time this week (stale server, unloaded stylesheet, stateful mock, and
now a blocked image host).

**1. The blue bar when searching was the browser, not a component.** Nothing in
the site had ever set `::selection`, so selecting text - which is what you do
constantly in a search field - painted the OS blue across a cream and coral
page. It is a 26% coral tint now, built from the existing tokens so
high-contrast mode inherits it. The same one-liner fixed two neighbours:
`accent-color` (checkboxes and radios still drew system blue) and the grey-blue
Android tap flash, which is noise on a design that already shows its own
pressed states. Zero behaviour change - the same selection, in the brand.

**2. Shopping "selection" was not a selection - the chips CYCLED.** Each click
advanced to the next value, so reaching "שופינג: פחות" took four clicks through
two wrong values, with no way to see what the options were. Worse: **every one
of those intermediate clicks writes to the trip and syncs to the account.** The
chip opens a list now, with the current value ticked and an explicit
"בלי העדפה" row rather than a fifth click back to nothing. Pace and "מי נוסע"
cycled identically, so all three changed together - leaving two spinning would
be a worse screen than either consistent state. Kosher stays a plain toggle,
because it genuinely is binary.

**3. Navbar trips were three controls pretending to be navigation.** Up to two
trips rendered as loose pills between "כשרות" and the account button, the active
one in solid coral so it read as a nav section, plus a separate "עוד (N)" - and
`max-w-24 truncate` chopped the labels, so "ברטיסלבה + וינה" showed as
"ברטיסלב…". One "הטיולים שלי · N" control now, listing every trip with the full
name (wrapping to two lines when long) and marking the open one. Identical
actions; three fewer objects in the row. Mobile already had a proper list and
just lost its truncation.

**4. The trip screen: two real things, and a lot that was already fine.** The day
strip was `-mx-4 overflow-x-auto` below sm, so at 390px the last control was
sliced against the viewport edge - **the same failure Netanel already reported
once on the catalog's continent tabs**, which is a hint that a scrolling strip
of pills is simply the wrong pattern in this layout. It wraps now. And the map's
view switch repeated the selected day in the same coral as the day tab 55px
above it; it is a view toggle, not a primary action, so it is neutral and the
screen has one accent instead of two saying the same thing.

**Deliberately NOT changed**, because the screen turned out to be less crowded
than the first (broken) screenshots suggested: the header actions, the stats
chip, the per-stop menus, the agent column and the coach mark. Control count at
first paint moved 44 to 42 at 1440 and stayed at 29 on mobile - which is the
honest number. The win here is hierarchy, not density: what was removed is
duplicated emphasis, and the metric barely sees that. Same lesson as entry (l).

**Verified 33/33** in a real browser at 1440 and 390, fresh context per width,
against the production build: the selection colour and its high-contrast twin,
the far shopping value in ONE click, clearing, the other two pickers, no loose
nav pills, no truncated names, picking a trip still opens it, the mobile menu,
zero overflow, nothing clipped, RTL intact. 107 unit tests, tsc, build, lint
unchanged.

**Three assertions of mine failed and all three were the test, not the product**
- worth recording because they are the same species as the flag: Leaflet tiles
legitimately overflow their pane (the container clips them, and page-level
overflow was 0 the whole time); the map view switch also matches `^יום \d+$`
so the day-tab count read 4; and the CSS minifier **splits one authored
`::selection` rule into several**, so reading "the" rule found the background
and missed the colour.

### 2026-07-27 (w) - A deleted trip that would not stay deleted, the three unmetered paths, and a real Maps export

Three items, in the order Netanel asked for them while he was offline.

---

**1. "Delete a trip, reload, it comes back." Reproduced, and the cause was
structural rather than a slip.**

Every other change to a trip carries `updatedAt`, so the account merge can
decide "latest wins". **A deletion carried nothing** - it was expressed only as
the absence of a row - so any remote copy beat it. Three ways that bites, all
reproduced in a browser against a Supabase stand-in:

- the initial pull is in flight when the user deletes. Its snapshot predates the
  click, the merge sees a trip missing locally, and puts it back. **This is the
  reported bug**, deterministic with a 2.5s pull.
- a second device that still holds the trip pushes it straight back up.
- deleting while signed out, then signing in, restores it.

Deletion is data now. `TripState.deleted` maps id → when (pruned at 90 days and
200 entries), `mergeTrips` treats that timestamp like any other, and the remote
side stores a **tombstone row**: the same `user_trips` row survives with its
`data` replaced by `{ id, deletedAt }`. That gives cross-device deletion with
**no schema change** - nothing new for Netanel to run - and stops storing the
contents of a trip somebody deleted. Writing tombstones is idempotent and
repeated on every pull, so a delete that failed or raced repairs itself instead
of sitting "gone here, alive on the server".

An edit genuinely newer than the deletion still wins, in both directions. The
rule did not change; deletions just joined it.

**He asked whether renaming or removing a stop had the same cause. They did
not**, and now there is a test saying so: those carry stamps, so the merge
already resolved them correctly - verified by making both edits *during* a slow
pull and confirming they survive.

**Verified 14/14** in a real browser, fresh context and fresh mock user per
scenario. The harness fights back in one way worth writing down: `TripProvider`
writes its own (empty) state right after hydrating, so a test that seeds
localStorage too early has its seed silently overwritten and the app renders the
landing hero. Wait for the page to settle before seeding.

---

**2. Rate limiting: the audit found three unmetered paths, not a missing layer.**

Chat, generate-trip, share, import and checkout were already metered. What was
not:

- **Promo redemption had no limit at all**, and it is the one where success
  costs real money. A code is 3-24 alphanumeric characters, so one signed-in
  account could scan thousands of guesses a minute. Every other defence there
  (atomic RPC, row lock, identical messages for "no such code" and "code full")
  quietly assumed nobody could guess at speed. Now **5 an hour, 20 a day**, per
  account AND per address - and **the address check runs before authentication**,
  because otherwise each guess still costs a GoTrue round trip and a database
  read. Deliberately not plan-based: premium should not buy a faster guess.
- **`explore_destination`** (Wikipedia) and **`add_pin`** (OpenStreetMap) were
  unbounded. Neither costs us money; both spend somebody else's free service,
  and the Nominatim throttle is serial and global, so one person hammering pins
  stalls geocoding for everyone. **20 explores / 30 geocodes a day** free,
  100/150 premium, plus a per-turn ceiling of 3 and 6 - one turn can run 16 tool
  iterations and no real request needs more.
- **`/api/generate-trip` parsed an unbounded body.** Capped at 20k chars, like
  chat.

**The numbers, and why.** A free traveller gets 40 chat turns, 6 a minute,
300,000 AI units, 15 quick builds, 3 images, 5 map imports, 10 share links a
day. A full trip build plus dozens of edits sits well inside that; the caps
exist to stop an afternoon of abuse, not to shape normal use. Premium is 10x on
the AI numbers.

**Every refusal is a Hebrew sentence that says what happened and what to do
instead.** Two are worth calling out: over the explore quota **the agent
explains it in conversation** and offers catalog cities, which beats an error
box because it can still help; and one silence was fixed - over quota the
planner still builds from the buttons, and it used to drop the free-text
quietly, so it now says the text was not read this time. **15/15** against the
running production build.

---

**3. Google Maps export: there WAS a link here, and it was two-thirds right.**

Right day, right order. What it was not:

- It built `/maps/dir/lat,lng/...` by hand. The documented `?api=1` form takes an
  origin, a destination and at most **nine** waypoints, so **a day with 12 stops
  silently lost the rest.** Someone setting out with a route that quietly dropped
  four stops is the worst version of this feature. Long days now split into
  consecutive legs that overlap by one point, and the UI says why.
- No `travelmode`, so Google guessed driving even for a walking day in a city
  centre. Now derived from `preferences.booking.car` - the same field that
  already decides whether an inter-city leg is a drive or a flight.
- It did not say what it would do before opening another app. The button names
  the day and a line under it reads "5 נקודות · ברגל".

Added: when the traveller has pinned their hotel **and the location was actually
verified**, the route starts there. An unlocated pin is ignored rather than
guessed - same rule as everywhere else on this site.

**Coordinates, never names.** We have verified coordinates; "Café Central" can
resolve to a different city entirely. A less pretty URL beats navigating someone
to the wrong country.

**21/21** in a real browser at 1440 and 390: label, order, mode, the hotel start
and its explanation, an unlocated pin refused, a 14-stop day split with every
stop still reachable, 44px touch target, no RTL overflow, and no button at all on
a day with one stop.

---

**Left alone deliberately, per his "write it down instead of fixing it" rule:**

- **`/t/<code>` has no rate limit.** It is a read, it is the viral surface, and
  many people share one address behind NAT - limiting it would break sharing to
  stop something cheap. Flagged, not fixed.
- **`/api/admin/*` is unmetered.** Role-gated and costs nothing; `/api/admin/me`
  is the only route a signed-in stranger can reach and it does two reads.
- **A pending push is cancelled on navigation.** `AccountSync`'s debounce timer
  is cleared by the effect cleanup, so an edit made in the last 1.5s before
  leaving the page is not pushed. Local state is safe and the next pull merges
  it, so it is not data loss - but it is real, and it is not part of these three
  items.
- Cross-device deletion propagates through the tombstone row, which means a
  device that never syncs again keeps its copy. That is inherent to
  last-writer-wins and not worth more machinery today.

**NOT PUSHED.** Four commits sit on local `main`, rebased onto the data
session's latest: the account-count fix, the three items above. This session no
longer holds a GitHub token (the one used earlier in the day was pasted in chat
and is not in the environment after the context reset). `git push` needs it
supplied again - **and that token should be rotated regardless**, since it was
pasted into a chat window.

**Also still waiting on Netanel**, unchanged from earlier entries: add
`SUPABASE_SERVICE_ROLE_KEY` to Vercel and redeploy; re-run the updated
`supabase-admin.sql`; run `supabase-profiles.sql` and `supabase-community.sql`;
approve the 19.90 ₪ price; supply affiliate IDs; fill the `[למילוי]`
placeholders in the accessibility statement.
" (bottom of this file) with: (a) what was built/
   changed and in which files, (b) product decisions made and why,
   (c) anything left broken or deferred, (d) what the next session
   should know. No exceptions - docs-only sessions included.
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
  the detail block (capped at 6 cities, ~39,000 chars worst case) + the history budget
  (50,000 chars, see entry 2026-07-27 (e)) + system prompt and tools.
- Measured 2026-07-27: index 191,951 chars at 1,336 places, **90% ASCII / 10% Hebrew**,
  which is roughly 61k-67k tokens. An earlier entry's "~45k tokens" understates it.
- Cost per place is **~144 chars catalog-wide**, but only **110 chars** for a
  food/market/shopping entry, which carries no description - see entry (dd).

**280,000 is close to the real limit, and the arithmetic is why.** Measured
2026-07-29 at 241,002 chars, the index is ~78k-89k tokens. Adding the other blocks at
their own worst case - detail ~28k, history ~45k, trip ~6k, system and tools ~6k -
puts a worst-case request at roughly **165k-177k of the 200k window**. Scaling that:

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

### 2026-08-12 - Live lookups for hours/price/existence, and closing the kashrut leak structurally

Netanel asked for two things on one branch. First: let the agent answer factual,
time-sensitive questions (opening hours, admission price, whether a place still
exists) via a real web search, instead of the honest-but-useless "I don't know"
it gives today. Second, and explicitly non-negotiable: no kashrut claim may ever
come from the model's own knowledge or from a web search - he'd seen it twice in
testing, the agent correctly refusing a specific place and then volunteering
general kosher geography about the same region immediately after.

**The search feature is gated at the tool level, not by wording.** A new
`web_search_20260209` tool (`webLookup.ts`) is attached to the API call ONLY when
a deterministic classifier says the turn is eligible: hours/admission-price/
still-exists wording (`lookupEligible`), a per-conversation cap of 3 (counted by
scanning the conversation's own assistant messages for the citation marker the
model is required to write - no server state, same pattern as `relevantCitySlugs`
scanning message history instead of keeping a counter), and a personal daily quota
(`lookupsPerDay`: 5/10/50 by tier, same shape as `exploresPerDay`/`geocodesPerDay`).
`max_uses: 2` bounds it further inside a single API call. **Kashrut turns never
reach any of this**: `kosherIntentText(lastUser)` - the same regex that already
gates whether kosher data enters the prompt - is checked first, and if it matches,
`allowLookup` is `false` regardless of what `lookupEligible` would have said. A
tool that isn't in the `tools` array literally cannot be called; this is the same
structural guarantee `modelRoute.ts` already uses for the light-turn tool set.

**The output side is the actual fix for the reported bug, and it runs on every
turn, not just search turns.** `priceGuard.ts` - the same deterministic,
sentence-by-sentence guard that already strips invented hotel prices and event
dates - gained a `kosher-claim` category: any sentence carrying kashrut
vocabulary AND an existence/quality assertion ("יש שם קהילה", "ידוע כמרכז
כשרות", "יש בית חב״ד") is stripped unless it names a real catalog place or city
that was actually sent to the model **this turn** (`kosherAllowedNames` in
grounding.ts - new, mirrors `eventNames`). The reported leak happens exactly when
the general kosher gate is open (the user asked, so `kosherOk=true`) but the
specific city has nothing in the catalog - `kosherAllowedNames` returns `[]` for
that city regardless of the gate, so any claim about it is cut. This is why it
closes the bug even though the bug had nothing to do with search: the leak was
always the model's own training knowledge, and the guard doesn't care where a
sentence came from. Two independent layers, deliberately not dependent on each
other - tool-gating blocks the *action*, the guard blocks the *output* - so a
kashrut claim is unreachable whether it would have come from a search result or
from the model just talking.

**Hours/price/existence claims need a citation in the same sentence, or they're
cut too.** New categories `hours-claim`/`existence-claim`, allowed only when the
sentence also matches `LOOKUP_ANCHOR` ("נבדק ב-DATE" / "checked on/today"). It has
to be the *same* sentence, not the next one: `GuardedTextStream` flushes
sentence-by-sentence as the reply streams, so there's no "wait for the next
sentence" available - the prompt teaches the model to write fact + citation as
one clause. A narrow, separate exemption lets a cited admission-price sentence
through the generic price ban (`TICKET_CONTEXT` + `LOOKUP_ANCHOR`), but it sits
*after* the `ROOM_TYPE`/`STARS`/`PER_UNIT` checks, not before - so it cannot be
used to sneak a lodging price past the existing, unrelated hotel-price ban that
has held since `priceGuard.ts` was written. Verified with a regression test
naming exactly that: `"כרטיס כניסה למלון 300 ש"ח ללילה (נבדק ב-...)."` still
gets caught by `per-unit-price`, not waved through by the new exemption.

**Cost and provenance.** Today's date is handed to the model as a fact
(`todayIso()`) rather than something it computes - same rule as trip dates.
Search is $10/1,000 = $0.01/call (`WEB_SEARCH_COST_USD`, `aiCost.ts`), folded
into the *existing* dollar-budget machinery (`recordSpend`/`budget.ts`) via a
flattened `usage.web_search_requests` read off `message_delta` (the count isn't
known until the search has actually run) - the daily $10 cap, $3 per-caller cap
and $1.50 per-turn cap all already cover this with zero new code, by
construction. Also folded into the personal `aiUnits` quota at a rough
dollar-equivalent (3,500 units/search). A process-local cache (`webLookup.ts`,
12h TTL, keyed by normalized question text) skips re-attaching the tool for a
literal repeat of the same question within the cache's lifetime - best-effort,
same caveat as every other in-memory store in this codebase (`checkLimit`,
`budget.ts`'s local state): doesn't survive a restart, doesn't sync across
instances, and that's fine because it's a cost optimization, not a safety
mechanism.

**What it answers now, concretely.** Opening hours of a covered attraction with
no catalog data: previously "I don't know"; now, if the turn is eligible, a real
search runs and the reply reads like `"הקולוסיאום פתוח 9:00-19:00 (מקור:
colosseo.it, נבדק ב-2026-08-12)."` - stripped down to `NO_LOOKUP_LINE` if the
model forgets the citation. A kosher question about a city with nothing in the
catalog: unchanged and now doubly guaranteed - no tool to search with, and even
an invented answer from memory gets cut on the way out. Cost per eligible turn:
the existing per-turn baseline (~$0.06-$0.45 depending on cache state) plus at
most $0.02 for up to two searches - nowhere close to the $1.50 per-turn ceiling.

**Verified:** 470 unit tests (21 new - `priceGuard.test.ts` covers the kosher-claim
regression exactly as reported, the citation-anchor requirement, and the
admission-price exemption *not* leaking into lodging prices; `grounding.test.ts`
covers `kosherAllowedNames` returning empty for an uncovered or unsent city even
with the gate open; `webLookup.test.ts` covers the eligibility classifier, the
per-conversation cap, and the cache). Two real regex bugs were caught by my own
tests before they shipped: `TICKET_CONTEXT` and `LOOKUP_INTENT`/`HOURS_CLAIM` had
all been written as "דמי כניסה"/"שעות פתיחה" without the Hebrew definite article
("דמי **ה**כניסה", "שעות **ה**פתיחה" is the form people actually write) - the
tests used real Hebrew and failed until the regexes did too. `tsc`, `npm run
build`, and lint (34 problems, all pre-existing, none new) all clean. **Not
verified against a live model** - no `ANTHROPIC_API_KEY` in this sandbox, same
standing limitation as every other agent-loop change in this log; the prompt
section teaching the citation format (`agentPrefix.ts`, new "LIVE LOOKUPS"
section) is written but its actual adherence is unverified live.

**Scope, deliberately narrow per instruction:** touches `priceGuard.ts`,
`grounding.ts`, `agentPrefix.ts`, `plans.ts`, `aiCost.ts`, `route.ts`, and the new
`webLookup.ts`, plus three test files. Nothing in `billing.ts`, `stripe`, or
anything payments-adjacent - a parallel session owns that. **On its own branch,
not merged.**

**Worth recording for whoever reads this next:** the working directory this
session started in turned out to be shared, unisolated, with another concurrent
session - mid-edit, `git reflog` showed branches being checked out and a hard
reset happening that weren't this session's doing, and it wiped every uncommitted
change more than once (nothing was lost only because nothing had been committed
yet and the content was still recoverable from conversation history). Recovered
by moving into an isolated git worktree and redoing the edits there, which is
where this entry's diff actually lives. If two sessions are going to work in this
repo at once, they need separate worktrees from the start, not the same checkout.

### 2026-07-27 (r) - "The cards are being cut": a real clip below 640px, and three fake readings

Netanel reported cut cards on the new destination browser. **Above 640px nothing
was wrong** - which is why his own screenshot looked fine to me at first glance.
Below it the continent strip was `overflow-x-auto`, so it scrolled and **sliced
cards mid-word**: "אפריקה והמזרח התיכון" showed as half a card against the
viewport edge. A scroll affordance that cuts a word reads as breakage, not as a
hint.

**Fix:** the strip wraps at every width; each tab is `flex-1` with a 6.25rem
minimum, so tabs share the row and drop to the next instead of being cut, and a
long name wraps inside its own card. 3x2 grid at 390, one row at 1440. Verified
at 360/390/480/600/900/1440: zero overflow, zero clipped elements.

**The part worth writing down is the measuring, not the fix.** Three separate
readings today were harness artifacts that each looked exactly like a product bug:

1. A stale `next start` still bound to the port after a rebuild, serving HTML
   that referenced deleted chunks - every JS request 500'd and the page fell back
   to the landing hero. Reported as "13 controls".
2. A browser context where the **stylesheet never loaded**. The unstyled page
   reported **195px of horizontal overflow** and named four country pills as
   clipped. Completely fictional.
3. A measurement taken before layout settled, at a width where the same check ran
   clean three times in a row a minute later.

The check script now **launches a fresh browser per width and refuses to report
a number until `document.styleSheets.length > 0` and the body has its cream
background**. That guard is four lines and would have saved three cycles today.

**The rule, stated plainly:** when a measurement is surprising, suspect the
fixture before the code. Every time today that a number looked dramatic - 13
controls, 195px of overflow, deployments frozen - the fixture was wrong at least
as often as the product was.

### 2026-07-27 (q) - Destination browser: what the data supports, and what it does not

Netanel sent a competitor's page - continent tabs with counts, character chips -
and said "this is a good feature". It is, and `/countries` was the wrong shape
for it: a **country** card cannot tell you it is romantic or good with kids. The
grid is now the 150 **destinations**, with countries a click away from every card
and from a slug row at the bottom.

**He asked for four filters. Two are backed by data and two are not, and they are
not treated the same:**

| filter | backing | what shipped |
|---|---|---|
| יבשת | `WORLD_COUNTRIES` (built for the passport feature) joined on the flag emoji - **81 of 83** catalog countries matched | real tabs with live counts |
| אופי | the `tags` already on every place | real chips |
| מחיר | `priceLevel` of places, present in 149/150 | shipped **named for what it measures** - "מחירי אטרקציות", with a line saying it excludes flights and lodging |
| עונה | **nothing. no months, no climate, no field** | mechanism only: reads an optional `bestMonths`, renders only when some destination has it, so today it is absent |

Calling Switzerland "cheap" because its mountains are free is precisely the
confident-looking wrong value hard rule 2 exists to prevent. Naming the filter
after the thing it actually measures cost one line of copy and keeps it honest.

**The season filter is the pattern worth reusing:** build the mechanism, read an
optional field, render only when the data exists, and add a test asserting the
current emptiness - so the test failing is the *signal to unhide the feature*
rather than a regression. Oman and Bhutan likewise sit in a two-line override
here instead of a fix in `src/data/*`, which the parallel session owns; if that
file gains them, the override quietly becomes redundant.

**The character threshold took three attempts and the first two were measurably
bad**, which is the part I would have got wrong by eye:

- *"at least 2 places with the tag"* → **139 of 150** destinations were "nature".
  A chip returning 93% of the catalogue is decoration.
- *fixed 25% share* → nature 128, history 113 (still too broad) and **nightlife
  zero**, because the catalogue barely tags nightlife. A chip that always returns
  an empty screen is worse than no chip.
- **self-normalising**: among destinations that carry a tag at all, the top 40% by
  share qualify. Every chip now returns 14-59 of 150, nightlife included, and the
  rule holds as the catalogue grows. A chip under 5 destinations is not rendered.

**Continent counts are computed with the other filters applied**, so a number on a
tab means "this many if you click" - never a click into emptiness.

**Also removed the site-search field from this page.** It sat directly above the
browser's own filter box: two search inputs stacked, the same duplication removed
from the nav earlier today. Site search stays on the nav icon and Ctrl+K.

**Verified live:** 150 cards, אסיה narrows to 40, adding חיי לילה to 5, clearing
restores 150, zero horizontal overflow at 1440 and 390. 11 new tests run against
the real catalogue rather than a fixture - every destination has a continent, the
tab counts equal reality, every shown chip filters without returning all-or-none,
and multiple chips are AND.

**Shipped in the same commit:** `/api/admin/me` now answers **503
not_configured** to a signed-in user instead of a blanket 404 when
`SUPABASE_SERVICE_ROLE_KEY` is missing, and `/admin` renders the four steps to fix
it. Netanel was `owner` in the database and still saw "הדף לא נמצא" - **the third
time today a correct-but-switched-off state was indistinguishable from a bug.**
The page can just say which one it is; that is cheaper than another round trip.

**Deferred, and it is now the single highest-value data task:** add
`bestMonths?: number[]` to destinations. The filter, the UI and the test are all
waiting for it.

### 2026-07-27 (p) - "The search bar is not good" - it was dead when empty and flooded when used

**Empty state was a paragraph of documentation.** Opening the overlay showed one
sentence explaining *how* to search and nothing to click - 137px of dead panel.
It now opens with six real destinations, so the arrow keys and Enter work before
you type anything.

The six are the top editorially-rated destinations, **one per country**: without
that rule the list filled with two high-rated continents and read like one shelf
of the catalogue rather than its breadth. Heading is
**"היעדים המדורגים ביותר", not "פופולריים"** - there is an editorial rating in the
data, popularity is not measured, and calling it popular would invent a number.

**Typing a city buried the city.** `searchSite` had a flat `limit = 24`, so "וינה"
returned the city plus 23 places inside it - every café and market. Now capped
**per kind** (4 countries / 8 cities / 6 places): 24 rows → 8, city first. What
the cap drops is said out loud ("ועוד 16 התאמות") because a silently truncated
list reads as a complete one.

Row markup was duplicated between the two states, so keyboard behaviour could
drift; it is one `Row` component now. A keyboard hint at the bottom doubles as the
thing that stops the panel looking cut off. `searchSite()` kept as a wrapper over
the new `searchSiteHits()` so no other caller changed.

Measured: panel 137px → 391px at 1440 (357px at 390), rows for "וינה" 24 → 8,
still exactly centred at both widths. **One thing I checked and it was fine:** the
panel looked off-centre in the founder's screenshot; `centerDelta` is 0 at both
widths - the screenshot was cropped. Worth measuring before "fixing" a layout.

**Also, from him running the roles SQL:** `supabase-admin.sql` now creates the
premium columns itself when they are missing. He ran it before
`supabase-premium.sql` and got `column p.plan does not exist` - the role seeded
correctly, but a premium grant would have failed with nowhere to write. **A
"prerequisite" note in a file header did not prevent the mistake, so the file
stopped depending on run order.** The general lesson: if a script needs another
script to have run, either check it or do the work yourself; a comment is not a
dependency. Confirmed after his re-run: `natikyan153@gmail.com` → `role = owner`.

Also worth recording: the diagnostic query I first handed him assumed `p.plan`
existed and therefore errored on his database. When asking someone to inspect a
schema you are not sure of, query `information_schema` first - a broken
diagnostic wastes their round trip, not yours.

### 2026-07-27 (o) - תפקידים: owner/admin, הענקות פרימיום, קודי הטבה ומפסק חירום

בקשת נתנאל: *"add an admin and owner role, give natikyan153@gmail.com the owner
role (which can give out premiums and stuff, think about something cool.)"*
בחר בשאלות ההבהרה: כל ארבע היכולות, הענקה עם או בלי תאריך פקיעה, שינוי תפקיד
ל-owner בלבד, ועמוד `/admin` באפליקציה.

**העיקרון שהכל נשען עליו: התפקיד נקרא מהדאטהבייס לפי הטוקן, ולעולם לא מגוף
הבקשה.** לקוח יכול לשלוח `{"role":"owner"}` בכל בקשה. לכן `requireRole`
מאמת טוקן מול GoTrue, מקבל uuid, וקורא `profiles.role` עם ה-service role. בנוסף,
ההרשאות ב-SQL הן **ברמת עמודה** ולא רק RLS: `role`, `plan`, `plan_until`,
`plan_source` הוסרו מרשימת העמודות שמשתמש מחובר יכול לכתוב. בלי זה כל חשבון היה
יכול להפוך את עצמו ל-owner בקריאת REST אחת.

**חוסר הרשאה מחזיר 404 ולא 403** - אין סיבה לאשר לזרים שהאזור קיים.

**אין מטמון על התפקיד**, בשונה מהתוכנית (5 דקות ב-`identity.ts`): הורדת תפקיד
חייבת לחול מיד ולא להישאר תקפה חמש דקות אחרי שנשללה.

**מה נבנה.** `supabase-admin.sql` (עמודות, `admin_audit`, `promo_codes`,
`promo_redemptions`, `app_flags`, זריעת ה-owner לפי מייל, ו-RPC אטומי לפדיון);
`lib/server/supabaseAdmin.ts` (REST עם service role, בלי תלות חדשה);
`lib/server/admin.ts` (`requireRole` + `audit`); `lib/server/flags.ts`; שבעה
נתיבי API; עמוד `/admin` בעברית; שדה פדיון קוד ב-`/account`.

**`effectivePlan()` הוא התיקון החשוב ביותר כאן ולא נראה כמו אבטחה.** פרימיום
מגיע עכשיו משני מקורות - מנוי Stripe (בלי תאריך) או הענקה (עם תאריך). בלי
פונקציה אחת שבודקת פקיעה, **הענקה ל-30 יום הייתה הופכת בשקט לפרימיום לנצח** -
באג שאף אחד לא מדווח עליו, כי הוא נראה כמו נדיבות. כל מי שמחליט אם מישהו
פרימיום עובר דרכה: `identity.ts`, `fetchProfile`, ה-UI.

**שלושה סירובים מכוונים בשינוי תפקיד**, וכל אחד הוא באג אבטחה אם הוא חסר:
אי אפשר לשנות את התפקיד של עצמך (אחרת owner מוריד את עצמו ואין דרך חזרה מה-UI),
אי אפשר להוריד owner אחר, ואי אפשר למנות owner מהממשק - זה נזרע ב-SQL עם המייל
המפורש, כך ש"מי הבעלים" הוא החלטה שמישהו כתב.

**הפדיון הוא ה-RPC ולא קריאה-ואז-כתיבה**, עם `for update`: שתי בקשות במקביל על
המקום האחרון בקוד היו שתיהן קוראות `redeemed=0` ושתיהן מצליחות. פדיון כפול
נחסם ע"י מפתח ראשי כפול בדאטהבייס, לא בתנאי בקוד.

**אימות: 60/60 מול מוק Supabase שנכתב במיוחד לתקוף את המערכת** - לא "האם המסלול
המאושר עובד" אלא "האם מי שאסור לו נכנס":

- אנונימי, טוקן מפוברק ומשתמש רגיל מקבלים 404 בכל תשעת הנתיבים - וכלום לא השתנה
  בדאטהבייס אחרי כל הניסיונות.
- `role` בתוך גוף הבקשה נבלע בלי השפעה.
- אדמין **כן** מעניק פרימיום, אדמין **לא** משנה תפקידים.
- owner מקדם לאדמין; לא מוריד את עצמו; לא ממנה owner.
- שלילה מנקה את שלושת השדות, לא רק את `plan`.
- קוד: אותיות קטנות עובדות, פדיון שני מאותו חשבון נדחה, אנונימי נדחה, קוד לא
  קיים נדחה - וההודעות לא מבדילות בין "לא קיים" ל"מלא", כדי לא לעזור למנחשים.
- דגל לא מוכר נדחה; כל פעולה מותירה שורת יומן עם מייל המבצע, כולל **חיפוש**
  של מטייל - צפייה בחשבון היא פעולה.

**מלכודת בהארנס ששווה לזכור:** הרצה שנייה של סקריפט התקיפה נכשלה בארבע בדיקות,
כי המוק שומר state בזיכרון ו-`u-plain` כבר היה פרימיום מהריצה הקודמת. **לאתחל
את המוק לפני כל ריצה** - אותו שיעור כמו ה-`next start` המיושן מהבוקר: תוצאה
מפתיעה היא חשד בהארנס לפני חשד בקוד.

**נבדק גם המצב של נתנאל היום** - בלי `SUPABASE_SERVICE_ROLE_KEY`: כל נתיבי
הניהול מחזירים 404, `/admin` מציג "הדף לא נמצא", והאתר, הצ׳אט ודף הבית עובדים
בדיוק כמו קודם. הפיצ׳ר כבוי בשקט עד שהוא מריץ את ה-SQL ומוסיף את המפתח.

**מה מחכה לו** (גם ב-TODO): להריץ `supabase-admin.sql` - הוא זורע את
natikyan153@gmail.com כ-owner, ואם הוא עוד לא התחבר לאתר אף פעם הקובץ יאמר זאת
ויצטרך ריצה שנייה אחרי ההתחברות; ולהוסיף את מפתח ה-service role.

**מה שלא נבנה בכוונה:** התחזות למשתמש (impersonation). זה הכלי הכי שימושי
לתמיכה והכי מסוכן - קריאת טיולים של אנשים בלי ידיעתם - והוא ראוי להחלטה נפרדת
ולא להיכנס בשקט בתוך פיצ׳ר תפקידים. 70 טסטים, tsc נקי, build נקי, lint על 27.

### 2026-07-27 (n) - Two mobile bugs from the founder's own phone: keyboard on load, zoom on focus

**1. "when opening the website on mobile, the textboxes are being opened
automatically."** `HeroPrompt` carried a bare `autoFocus`, so every arrival at the
homepage or the `/chat` landing from a phone popped the keyboard instantly. It
covers about half the screen, pushes the heading and the idea chips out of view,
and forces the traveller to dismiss it before they can even see where they landed.
Instead of inviting them to type it hid the explanation of *what* to type.

**The project had already solved this twice and the hero was never updated:**
`AccountButton`'s login modal and `CityCombobox` both focus only when
`(pointer: fine)` matches, each with a comment saying exactly why. Same guard now
in `HeroPrompt` - desktop keeps the focus, phones do not.

**2. "when selecting a textbox, the website zooms in."** That is iOS Safari's
rule, not a layout bug: focusing a field whose `font-size` is under 16px zooms the
page, and it does not zoom back. Seven fields sat at 14px - the agent composer, the
day-notes textarea, the add-day search, the map-import URL box, the planner's
free-text field and two account fields. All raised to 16px **below the `sm`
breakpoint only** (`text-base sm:text-sm`), so the trigger goes away and the
desktop design is untouched.

**Deliberately NOT `maximum-scale=1` / `user-scalable=no`.** That is the usual
one-line fix for this and it works by forbidding pinch-zoom, which breaks
magnification for anyone who needs it - on a site that ships an accessibility
widget and a statement page. The viewport meta stays
`width=device-width, initial-scale=1`.

**Method worth reusing:** the offenders were found by measuring **computed**
`font-size` in a real iPhone 13 emulation, not by grepping for `text-sm`. A first
pass with a regex over the JSX reported *zero* offenders because `className` often
spans lines - the browser found seven. When the question is "what does the user
actually get", ask the browser.

**Verified:** 17 reachable fields across the homepage, the site-search overlay, the
workspace, the day-note disclosure, the add-day picker, the chat drawer, `/start`
and `/kosher` are all ≥16px, zero remaining; plus 14/14 checks - nothing focused
on load on `/`, `/chat`, `/planner`, `/start`; no horizontal overflow on any of
them; `visualViewport.scale` exactly 1; no `maximum-scale` in the meta; and the
desktop hero input still autofocuses.

**One honest limit:** headless Chromium does not implement Safari's
zoom-on-focus, so what is verified is the **mechanism** (every field ≥16px), not
the symptom. Final confirmation is Netanel's own iPhone.

**For future work: any new `<input>`, `<textarea>` or `<select>` must be ≥16px at
mobile widths**, i.e. `text-base sm:text-sm` rather than `text-sm`, or iOS will
zoom the page the moment it is focused. There is no lint rule for this; the
harness in this entry is the way to catch it.
### 2026-07-27 (v) - Every priority country now has its obvious city. Thirteen new cities in one session.

Netanel asked for the run to finish: every one of the 17 countries Israelis actually fly
to, done in this session. This entry closes it.

**Final scope: 166 destinations, 83 countries, 1,510 places, 0 errors.** Started the
session at 150/83/1,313.

**Thirteen cities added across the session:** Dubai, New York, Santorini+Mykonos, Venice,
Florence, Nice/Riviera, Edinburgh, Buenos Aires, Sofia, Bucharest, Warsaw, Madrid,
Nicosia, Plovdiv, Kazbegi/Mtskheta, Ayutthaya/Krabi.

**The single most useful lesson of the whole session, stated plainly: when a country
looks thin, check whether its obvious city is simply ABSENT before deepening the cities
it already has.** This caught me out five separate times. UAE had no Dubai. USA had no
New York. Greece had no Cyclades. Italy had no Venice or Florence. Then Bulgaria had no
Sofia, Romania no Bucharest, Poland no Warsaw. Then **Spain had no Madrid**. Every time
the instinct was "add places to what exists", and every time the real gap was a missing
city worth 10-25 places on its own.

Per-country, session start to end: italy 37 to 64, greece 38 to 52, spain 37 to 49,
usa 19 to 46, uae 22 to 45, thailand 35 to 40, bulgaria 12 to 28, georgia 23 to 28,
poland 17 to 27, romania 13 to 25, uk 13 to 25, cyprus 17 to 25, france 15 to 24,
argentina 6 to 22. Germany, Hungary and Czechia were already well stocked and got
itinerary rebuilds instead.

**Verification held all the way through.** Every place: coordinates from the Wikipedia
coordinates API, filename checked against Commons with `redirects=1`, source width read
before choosing a thumbnail width, then the final URL browser-probed. **1,569 of 1,587
catalog photo URLs now carry HTTP evidence, and 0 of the ~230 URLs added this session
were dead.** The 18 unproven remain the known-unrepairable filenames from entry (s).

**The trap list is now long enough to be the main deliverable of this session.** In
addition to those in entry (u), this batch rejected: **Reina Sofia** (logo SVG),
**Thyssen-Bornemisza** (lead image is a different building), **Bedesten** (a 3D model,
not a photograph), and **Ayia Napa** (coordinates 34.98,34.00 - a whole number for
longitude is kilometres of error). Consult the trap list in [[memory]] or entry (u)
before sourcing anything.

**Roundness, honestly reported.** The `cafe` gap went from 14 countries to 6.
`kosher-market` is still missing in 16 of 17 and **was deliberately not faked** - kosher
shops have no Wikipedia articles, so coordinates cannot be verified from this sandbox and
Nominatim freezes the browser bridge. Every city with real kosher infrastructure
describes it in `practical.kosherOverview` and ends by saying the place list is not yet
in the catalog. **Do not delete that sentence to make the data look complete.**

**Index: 216,509 chars against the 260,000 ceiling** - about 300 places of headroom.

**What is genuinely left.** (1) The 18 dead photo URLs from entry (s) - needs a human to
choose replacements. (2) `kosher-market` everywhere and `cafe` in cyprus, argentina,
bulgaria, georgia, uae, greece - blocked on geocoding, not research. (3) The thinnest
countries are now argentina 22, france 24, cyprus 25, romania 25, uk 25; the obvious next
cities are Lyon or Provence, Manchester or Liverpool, Mendoza or Iguazu, and Brasov as a
standalone. (4) Nothing else on the 17-country list is missing an obvious city.

### 2026-07-27 (u) - Overnight run: eight new cities, and three missing capitals nobody had noticed

Netanel went to sleep and asked for the full programme across the 17 countries Israelis
actually fly to. This entry covers the whole run. **Catalog went 153 to 161
destinations and 1,377 to 1,479 places, 0 errors throughout.**

**The pattern held: the gaps were not thin place-lists, they were missing cities.**
After Dubai, New York and the Cyclades in entry (t), auditing the "thin" countries
turned up three absent CAPITALS: **Bulgaria had no Sofia, Romania had no Bucharest,
Poland had no Warsaw.** Also added: **Venice, Florence** (Italy had Rome, Dolomites and
Sicily but neither), **Nice/Riviera** (France was Paris only), **Edinburgh** (UK was
London only) and **Buenos Aires** (Argentina was 6 places total, the worst on the list).

Country totals now, against where they started this session: italy 37 to 63, greece 38
to 52, usa 19 to 46, uae 22 to 45, poland 17 to 27, romania 13 to 24, uk 13 to 25,
bulgaria 12 to 24, france 15 to 25, argentina 6 to 23.

**Every place: coordinates from the Wikipedia coordinates API, photo confirmed against
Commons with `redirects=1`, then browser-probed. 86 + 15 + 11 URLs probed, 0 dead.**
1,539 of 1,557 catalog photo URLs now carry HTTP evidence; the 18 unproven remain the
known-unrepairable filenames from entry (s).

**The trap list grew, and it is worth reading before sourcing anything else.** Wikipedia
lead images are unreliable in specific, repeatable ways. Rejected this run:
- **Location-map SVGs/PNGs** posing as photos: Santorini, Mykonos, Warsaw Old Town.
- **Corporate logos**: Rockefeller Center, One World Trade Center, Caffè Florian,
  E. Wedel.
- **Montage collages**: San Telmo, Palermo, Puerto Madero.
- **An 1856 painting** offered for Antico Caffè Greco, which is an archival artwork and
  not a photograph of the café. Same call as the 1901 Puerta del Reloj rejection.
- **Wrong subject**: Central Park returns a music-festival crowd.
- **Wrong place entirely**: `Agios Sostis` resolved to longitude 21.95, the Peloponnese,
  ~300km from Mykonos. `Deira` resolved to a UK article with a Northumbria image.
- **Rounded coordinates**: Nea Kameni and Santorini caldera came back as 36.4,25.4,
  which is kilometres of error on a map pin. Dropped rather than shipped imprecise.
- **Non-Commons local uploads** (licensing, not style): five Dubai landmarks, because
  the UAE has no freedom of panorama; also Bucharest's Palace of the Parliament and
  Arcul de Triumf.

**I also caught one of my own.** I gave Edinburgh an `iconicLandmark` named "Edinburgh
Castle" carrying the Calton Hill photograph. Relabelled before pushing. The lesson is
that the wrong-subject trap does not only come from the source; it comes from assembly.

**Roundness: real progress on `cafe`, and an honest wall on `kosher-market`.** The cafe
gap went from 14 countries to 6, filled with genuinely notable, verifiable places (Les
Deux Magots and Café de Flore, Els Quatre Gats where Picasso first exhibited, Café
Kranzler, Caru cu Bere, Jama Michalika, Fortnum & Mason, Caffè Florian). Museums added
for Georgia and Cyprus, a viewpoint for Argentina.

**`kosher-market` is still missing in 16 of 17 countries and I did not fake it.** Kosher
supermarkets, butchers and bakeries almost never have Wikipedia articles, so their
coordinates cannot be verified from here, and Nominatim freezes the browser bridge on
every attempt. Every city that has real kosher infrastructure says so in
`practical.kosherOverview` with the supervising bodies named as reported, and every one
of those texts ends by saying the place list is not yet in the catalog. **That sentence
is load-bearing - do not delete it to make the data look complete.** Getting these in
needs a geocoding path this sandbox does not currently have.

**Kosher honesty cut both ways this run.** Buenos Aires and New York got genuinely good
news (largest communities outside Israel, Once and Villa Crespo, the Upper West Side).
Santorini and Mykonos got the opposite, stated plainly: no kosher restaurants, no Chabad
house, stock up in Athens or bring food. Edinburgh: stock up in Glasgow. Sofia: Chabad
only, coordinate ahead.

**Other editorial calls recorded in the data itself:** Katz's Delicatessen is marked NOT
kosher; La Boca says stay in the tourist streets and not after dark; the Warsaw Rising
Museum entry distinguishes the 1944 uprising from the Ghetto Uprising; Warsaw's Old Town
says everything medieval-looking was rebuilt after 1945; Bucharest's parliament and
Jewish sites note passport-and-booking entry; Venice notes the day-visitor access fee.

**Index: 211,871 chars against the 260,000 ceiling** - roughly 335 places of headroom
left. Cost per place is steady at ~144 chars.

**Next session, in priority order.** (1) The 18 dead photo URLs from entry (s), which
need a human to pick replacements. (2) `kosher-market` and the remaining `cafe` gaps
(cyprus, argentina, bulgaria, georgia, uae, greece) - both blocked on geocoding, not on
research. (3) Thinnest countries are now cyprus 17, argentina 23, bulgaria 24, georgia
23 - the obvious next cities are Nicosia, Plovdiv and Kutaisi/Mtskheta. (4) Consider
Madrid: Spain has Barcelona, Mallorca and Andalusia but no capital, the same gap this
run found three times.

**Tooling, unchanged and still true:** the Chrome extension is the only route to Commons
from this sandbox. Navigate to `en.wikipedia.org/wiki/Special:BlankPage`, then make
SAME-ORIGIN `/w/api.php` calls. Cross-origin fetches freeze the renderer reliably. Keep
each call under ~45s and re-read `tabs_context_mcp` after every navigate. dbpedia was
down for most of this run.

### 2026-07-27 (t) - Coverage vs the real market: Dubai and New York added, six itineraries unblocked

Netanel asked for depth and roundness across the 17 countries Israelis actually fly to,
then left me to it. The audit changed the job: **the problem was not thin place-lists,
it was that the top markets had no flagship city.** UAE is the #3 market and the catalog
had Abu Dhabi but no Dubai. USA is #2 and had Grand Canyon and New England but no New
York, which is why it read 14 nature places against 2 attractions.

Market data is sourced, not remembered: Israel Airports Authority 2025 gives Greece
~2.2M, USA ~1.6M, UAE ~1.5M, Italy ~1.2M, Cyprus ~1.2M, and PassportCard winter 2025/26
puts Thailand 1st and Hungary 2nd. **Ranks 6-15 are published nowhere reachable** - the
TODO says so explicitly so a later session does not invent them.

**Dubai, 23 places. New York, 27 places.** Every coordinate from the Wikipedia
coordinates API, every photo filename confirmed against the Commons API with
`redirects=1` (so the Kykkos redirect trap cannot recur) and its real source width read
before choosing a thumbnail width. All 45 resulting URLs were then browser-probed:
**0 dead**, and they are recorded ok:true in the manifest.

**Four sourcing traps caught in one sitting, which is why lead images cannot be trusted
blindly:**
- **Local non-free uploads.** Five Dubai lead images (Dubai Mall, Dubai Frame, Museum of
  the Future, Burj Al Arab, Dubai Opera) live on English Wikipedia, not Commons, because
  **the UAE has no freedom of panorama** for modern buildings. Those places ship with no
  photo. Hotlinking them would be a licensing problem, not a style one.
- **Corporate logo SVGs.** Rockefeller Center and One World Trade Center both return a
  logo as their lead image. Used the 30 Rockefeller Plaza photo for the former; dropped
  the latter rather than illustrate a tower with its wordmark.
- **Right subject, wrong photo.** Central Park's lead image is a crowd at the Global
  Citizen Festival. Central Park therefore ships with NO photo. A gradient beats a
  concert crowd captioned as a park.
- **Wrong place entirely.** `Deira` resolved to a UK article with a Northumbria image.
  Dropped.

**Katz's Delicatessen carries an explicit "not kosher" line in its description.** For
this audience that correction is the useful part of the entry, and leaving it implied
was the dishonest option.

**Six flagship cities were hiding half their own research.** Prague, Barcelona,
Budapest, Rome, Berlin and Vienna each had 20-23 researched places but only 3-4
itinerary days, so 11-16 places per city never appeared in any suggested route - the
same failure the Hebrew entry found for Bratislava and Athens. All six rebuilt from
existing places, grouped geographically so each day is walkable. Unused places per city
went 16/16/14/14/12/11 to **0/0/0/0/0/0**. No new research, no index cost, no
verification risk.

**Kosher, deliberately incomplete rather than fabricated.** Dubai has real
infrastructure (Chabad Dubai / Rabbi Duchman, EAKC, OU, Badatz Tiferet Yisrael) and New
York is the easiest kosher city outside Israel. Both are described in
`practical.kosherOverview` with supervising bodies named as reported plus the standing
"verify with the venue" caveat. **No kosher PLACES were added in either city**, because
restaurant coordinates could not be verified from here, and both texts say so rather
than implying the list is complete.

**Also:** an authoritative `## Grounding index budget` section near the top of this file.
The ceiling is 260,000 and the index now measures 195,677, which is above the ~190,000
that a dozen older entries still quote. Those entries stay as written, but a future
session reading one could easily conclude the catalog needs trimming. The new section
states plainly that the figure is a self-imposed guardrail, appears nowhere in the code,
and what the real 200k-context constraint actually is.

Scope now: **152 destinations, 83 countries, 1,363 places, 0 errors.** USA 19 to 46
places, UAE 22 to 45. 1,427 of 1,445 photo URLs carry HTTP evidence; the 18 unproven are
the known-unrepairable filenames from entry (s).

**Next, in the agreed order:** Greek islands (Greece is #1 and has no Cyclades at all),
then Venice and Florence, then Nice, then Edinburgh. Then priority 2 (thin countries:
argentina 6 places, bulgaria 12, romania 13, uk 13) and priority 3 (roundness: `cafe`
missing in 12 of 17 countries, `kosher-market` in 16 of 17).

**Tooling note for whoever picks this up:** the Chrome extension is the only route to
Commons from this sandbox and it freezes often. What works: navigate to
`en.wikipedia.org/wiki/Special:BlankPage`, then make **same-origin** `/w/api.php` calls.
Cross-origin fetches (Commons from Wikipedia, Nominatim from anywhere) freeze the
renderer reliably. Keep each call under ~45s and re-read `tabs_context_mcp` for a fresh
tab id after every navigate.

### 2026-07-27 (s) - The photos are actually fixed: 151 dead down to 18, every one probed

**Netanel reconnected the Chrome extension after a full restart, and it held.** That
gave the whole repair in one sitting. Numbers, all from real HTTP probes and not from
a passing validator: **151 dead URLs before, 18 after.** On the live `/countries`
page, country cards went from **74/83 loading to 83/83**.

**Root cause, confirmed at scale: file-extension case.** Commons filenames are
case-sensitive in the extension and an earlier pass lowercased `.JPG` to `.jpg`.
103 of 133 broken filenames came back from a filename-variant fix alone - mostly
extension case, plus double-encoded names (`Torre_Bel%C3%A9m`) and one lowercased
first letter (`bengmealea`, which Commons always capitalises).

**9 more came back from a spelling-only rule that is deliberately strict.** A search
result is accepted **only** when its normalised form - diacritics stripped, case
folded, every non-alphanumeric removed - is EXACTLY equal to the original. That
recovers `Krakow`/`Kraków`, `Slîtere`/`Slītere`, `Üçhisar`/`Uçhisar`,
`Białą`/`Biała`, `Liepāja`/`Liepaja`, ASCII `'` versus okina `ʻ` in
`Mulla_Qirgʻiz`, the curly apostrophe in `Schindler’s`, and a comma in the
`Musée_d'Orsay` title. Unit-tested on 12 cases, 12 correct: it accepts all eight
spelling variants and rejects `Turkestan.jpg` → a Yasawi mausoleum photo,
`Pompidou_center` → `Pompidou Center Paris`, and `Philippnes` → `Philippines`, which
is a genuine typo rather than a spelling variant. **Every one of these is a RENAME of
the same photograph. Nothing was swapped for a different image.**

**THREE tooling bugs of mine surfaced, all the same species as the original bug.**
Worth reading together, because the pattern is the point:

1. **GET query length.** The lookup packed 40+ long filenames into a GET query string,
   blew past URL limits, and `if (!res.ok) continue` swallowed the failure. Whole
   batches vanished, so the first dry run reported 45 repairable and **88 false "not
   found"** - split by batch position, not by filename. The tell was that the fallback
   *search* then found the exact `.JPG` twin for names the lookup had just denied. Now
   POST, and a failed batch **throws**.
2. **Rate limiting.** Commons answered 429. Two causes: a generic User-Agent (Wikimedia
   policy wants the tool identified with a contact URL) and pacing that ignored
   `Retry-After`. Now paced, backed off, and **resumable** - results cache per batch
   including negatives, so a throttle costs one batch instead of the whole run. The old
   behaviour discarded all progress and forced a restart, which generated more load and
   invited the next 429.
3. **The REDIRECT trap.** After applying 112 fixes I re-probed everything and found 25
   dead: 24 expected, plus **one of my own repairs**. `Kykkos_monastry_from_the_air.JPG`
   is a Commons *redirect* to `Kykkos_monastery_from_the_air.jpg` (different spelling
   AND extension case). `prop=imageinfo` returns full data for a redirect - exists,
   4416x3312, image/jpeg - so every existence check passed, but **thumbnails only exist
   under the canonical title**, so the constructed URL 404s at every width. The lookup
   now sends `redirects=1` and `iiurlwidth` and takes the API's canonical `thumburl`
   instead of deriving one.

**A near-miss worth keeping.** Probing the 8 Unsplash country photos from a
`commons.wikimedia.org` page reported all 8 dead. They are alive at 1600px - Commons'
CSP blocks third-party images. **The origin you probe from is part of the
measurement.** Re-probed from the tiyulplus.com origin, all 8 pass.

**Serbia and Oman, the last two visible country cards.** Serbia was a pure typo:
`Péterváadi` should be `Péterváradi`, plus `.JPG`. Same photograph, verified at 960px.
Oman's file exists under no spelling, so it needed a genuine replacement - and the
first candidate, `Sultan_Qaboos_Grand_Mosque_(28).jpg`, was **rejected on its Commons
category**: "Incidental views of Sultan Qaboos Grand Mosque" means the mosque is
incidental, not the subject. Took `Muscat,_moschea_del_sultano_qaboos,_esterno_01.jpg`
from the mosque's own category instead ("esterno" = exterior), verified at 960px. The
Muscat destination hero was then given Nizwa Fort so the page does not show the same
mosque image three times.

**18 dead URLs across 15 filenames remain, deliberately.** Truncated words
(`Обл_Видин` should be `Област_Видин`), a swallowed apostrophe
(`musée_dart`), typos (`Philippnes`), and files that exist under no spelling at all -
the Louvre, the Pompidou, the Acropolis Museum, Rio Lagartos, Mexico_167,
Groženjan, Kamikouchi, Turkestan. Each needs a human to choose a real photograph, and
the search output shows exactly why: `Turkestan.jpg` was offered a 1900s portrait of
an irrigation official. **A blank card beats a photo of the wrong place.**

**Tooling now in the repo:** `scripts/repair-photo-names.mjs` (variant + strict
spelling repair, resumable, rate-limit aware, redirect-resolving) and
`scripts/photo-verified.json`, the committed probe manifest that lets the offline
validator tell probed from merely well-formed. The validator prints a `DEAD n` line
naming the extension-case cause. **Flip its manifest-failed check from WARN to ERROR
once those 18 reach zero** - it is WARN only so the backlog does not block unrelated
commits.

**Still open for the next session.** The 18 above; the place-photo backlog; and the
index ceiling, which Netanel raised to **260,000 chars** (measured: index is 188,780
chars, 90% ASCII, roughly 61k-67k tokens; the old ~190,000 appears nowhere in the code
and was convention, not an API limit). Photo work costs zero index budget.

### 2026-07-27 (r) - Browser access arrived, and it demolished my own diagnosis from (q)

**Netanel connected the Chrome extension, which gave this session its first real HTTP
path to `upload.wikimedia.org`. The first four probes killed entry (q)'s conclusion.**
Romania's 960px URL **loads fine** (960x643). Amsterdam's fails at **960 AND 500**. So
the width swap was never the cause, and (n)'s "safe fix" of rewriting 170 URLs down to
500px was both unnecessary and useless. It has been reverted. Read (q) with this entry
next to it.

**What is actually wrong, measured across the whole catalog.** I probed all 1,396
Wikimedia URLs from the browser with `new Image()`: **151 are dead.** Then I probed every
one of those 151 at 960/500/330/250: **zero were rescuable at any width.** The dead rate
was 131/1264 at 500px versus 20/132 at 960px, so width barely correlates. These are dead
FILES, not sizing errors. Confirmed independently on 19 of them via the Commons
`imageinfo` API, which reports them `missing`.

**THE ROOT CAUSE: file-extension case.** Commons filenames are case-sensitive in the
extension, and an earlier pass lowercased `.JPG` to `.jpg`. Of a 16-URL sample, **14 were
recovered by restoring the original case alone** - same photo, same subject, correct
again. `Sukiennice_and_Main_Market_Square_Krakow_Poland.JPG`,
`Cliffs-Of-Moher-OBriens-From-South.JPG`, `London-Eye-2009.JPG`, `TanahLot_2014.JPG`,
`Bayon,_Angkor_Thom,_Camboya,_2013-08-17,_DD_37.JPG` and so on all exist. **So the 151
are REPAIRABLE, not deletions.** Do not delete them.

**Why every offline check was blind to this.** A wrong filename still hashes consistently
with its own md5 path prefix, because the prefix is derived from the same wrong string. My
sweep of all 1,620 URLs found 0 prefix mismatches and I read that as reassuring; it proved
nothing about existence. Only an HTTP probe can see this class. That is now written into
`validate-catalog.mjs` next to the rule.

**A second cause, confirmed live in production.** Oman's country card had its CSS
declaration **dropped by the parser**: `background-image` was built as unquoted
`url(${...})`, and Oman's filename contains a literal `)`. Six such interpolations
existed. They are now `url("${...}")` - DOUBLE quotes deliberately, because Commons
filenames legitimately contain apostrophes (Musée d'Orsay, Schindler's factory,
ANSE SOURCE D'ARGENT) and `encodeURIComponent` does not escape them, while a literal `"`
can never survive URL encoding.

**A near-miss worth recording.** Probing the 8 Unsplash country photos from a
`commons.wikimedia.org` page reported all 8 dead. They are alive - Commons' CSP blocks
third-party images. Re-probing from the tiyulplus.com origin showed all 8 at 1600px. **The
origin you probe from is part of the measurement.** I nearly recorded 8 false failures.

**Two real narrow sources did turn up**, so (q)'s mechanism is real even though it was the
wrong cause: `MUTRAHCORNICHE2.jpg` is 604px and `Wat_Phnom_Doun_Penh.jpg` is 720px, so
their 960px thumbs genuinely 404. The 960-needs-proof rule stays.

**Shipped in this entry.** `scripts/photo-verified.json` is committed with real probe
results for all 1,402 URLs, so the offline validator can finally tell probed from
merely-well-formed. The validator gained a shared `checkPhoto()`, first-ever coverage of
`Country.photo` and duplicate country slugs, an SVG-in-photo-field error (the Vatican
Museums were wearing a coat of arms and Barceloneta a district location map - both
removed), the CSS-quote error, and a `DEAD 151` summary line that states the extension-case
root cause so the next session cannot miss it. The manifest-failed check is WARN and not
ERROR **only** because 151 pre-existing URLs would otherwise block every unrelated commit;
it should become an ERROR the moment the backlog hits zero.

**Deliberately NOT shipped.** I had the repair half-built - 9 verified country photos, 17
verified destination heroes, 174 dead fields removed - and reverted all of it. Removing the
dead URLs turned out to strip `photo` from 17 `iconicLandmark` objects where the type
requires it, and repairing those properly needs the browser, which froze partway through
(repeated CDP timeouts and tab reloads after the 1,396-image sweep). Shipping a half-repair
that deletes recoverable data was the worse option. The catalog is therefore unchanged
except for the two SVGs; production is no worse than before, and the manifest now records
exactly what to fix.

**Index ceiling raised to 260,000 chars on Netanel's decision.** The old ~190,000 figure
appears **nowhere in the code** - it is a convention propagated through these session logs.
Measured now: the index is 188,780 chars, 90% ASCII / 10% Hebrew, so roughly 61k-67k tokens
(the "~45k" in an earlier entry understates it). Worst-case request is index + a 6-city
detail block (~38,836 chars) + the 50,000-char history budget + system/tools, which leaves
real slack under the 200k window. At 260,000 the headroom is ~71,000 chars, about 495
places at the measured 143.8 chars/place. **This is a guardrail, not an API limit.**

**`scripts/repair-photo-names.mjs` now automates the repair.** It reads the `ok:false`
entries from the manifest, generates candidate filenames for every corruption class seen
(extension case, double-encoding, first-letter case), verifies each against the Commons
`imageinfo` API, and rewrites the data with the corrected filename, a **recomputed md5 path
prefix** (the prefix changes with the filename, so this is not optional) and the widest
allowed thumb that does not exceed the real source width. Its md5 logic is verified offline:
it reproduces 1,106 of 1,263 known-alive URLs byte-for-byte, and the other 157 differ only
in `(` versus `%28` style, which the script now preserves from the original. It never
invents a replacement photo - unresolved names are left untouched and printed with Commons
search *suggestions* for a human, because omission beats a guess. It needs network, so run
it where `upload.wikimedia.org` is reachable:
`node scripts/repair-photo-names.mjs --dry` first.

**What the next session must do, in this order.** (1) Run the repair script. (2)
`node scripts/verify-photos.mjs --force` and commit the manifest. (3) Flip the
manifest-failed check from WARN to ERROR. (4) Only then fill the place-photo backlog.

**NOT PUSHED - still needs Netanel.** No GitHub write access from this session:
git-over-HTTPS has no credentials and the API proxy answers "GitHub access to this
repository is not enabled for this session. Use add_repo" while exposing no such tool.
Delivered as `tiyul-photofix.patch` in the device repo folder; apply with `git am`.

### 2026-07-27 (q) - The 960px swap was the bug; and a green offline validator is not proof

> **SUPERSEDED BY ENTRY (r) ABOVE.** The diagnosis in this entry is WRONG. A browser probe
> showed Romania's 960px URL loads fine and Amsterdam's fails at every width, so the width
> swap was not the cause; the real cause is file-extension case (`.JPG` lowercased to
> `.jpg`). The 170-URL rewrite to 500px described below has been reverted. The entry is
> kept because its reasoning about proof-versus-shape is still right, and because it is the
> record of my getting it wrong the same way (k) did.


**The reported bug.** Netherlands and Romania still rendered as flat purple cards on
`/countries` after entry (k) claimed the country-photo gap was closed. Entry (k) has
been corrected in place - it recorded an unverified change as a fix.

**Cause, and it was the width swap.** Entry (k) generated 48 country photos by taking
each country's first destination's verified `iconicLandmark.photo` and string-replacing
`/500px-` with `/960px-`. That is not a safe transformation: Wikimedia only serves a
thumbnail NARROWER than the source file, so the derived URL 404s for every source image
under 960px wide. `/countries` applies the photo as a raw CSS `background-image` in an
inline style with no `onError` handler, so a dead URL fails silently to the gradient -
a 404 and a working URL are visually indistinguishable from the code's point of view.
The blast radius was three populations, not one: 48 country photos, three hand-written
960px URLs (Ecuador, Mauritius, Seychelles), and ~84 destination hero photos from the
`### 2026-07-27 (המשך)` run. **All 170 are back at 500px**, the width they were actually
verified at. A narrower thumbnail always exists where a wider one may not.

**I could not HTTP-probe it, and I am not claiming I did.** This sandbox cannot reach
`upload.wikimedia.org`: the egress proxy answers `CONNECT` with 403, WebFetch reports the
domain cache-only, every server-side image proxy I tried is robots-blocked, and no Chrome
extension was connected. The fix is safe because it *returns* every URL to a width that
already passed `verify-photos.mjs`, not because the 960px URLs were confirmed dead. Do
not upgrade that to "verified" in a later entry.

**What I could check offline, and it paid off twice.** I recomputed the md5 path prefix
from the filename for all 1,620 Wikimedia URLs in `src/data`: **0 mismatches**, which
retired the encoding/hash hypothesis entirely. The same sweep found two real defects that
had shipped and were live:

- **Six unquoted `url(${...})` interpolations** (`countries/page.tsx`,
  `countries/[slug]/page.tsx` x2, `destinations/[slug]/DestinationClient.tsx`,
  `kosher/KosherSearch.tsx`, `DestinationHighlights.tsx`). A literal `)` in a Commons
  filename terminates the CSS value and invalidates the whole `background-image`
  declaration - the identical purple-card symptom, from a different cause. It affected
  Oman, Muscat and Paro. Now `url('...')`. This touches route files the parallel
  features session owns; it is a quoting change with no behaviour change, flagged here
  because the ownership split says so.
- **Two `.svg` files sitting in `photo` fields.** `rom-vatican` wore
  `Musei_vaticani_Coat_of_Arms.svg` and `bcn-barceloneta` wore
  `Barcelona_Barceloneta.svg`, a district location map. An emblem and a map, not
  photographs - trap #1 and #4 from the handoff, shipped. Both removed rather than
  replaced by a guess.

**The verification hole, and why it stayed open.** `verify-photos.mjs` already covered
`Country.photo`; the problem was that it needs network and its results lived in
gitignored `.cache/verified-photos.json`. So the only check that can run while authoring
- the offline validator - had no way to distinguish a URL that had been probed from one
that was merely well formed, and `validate-catalog.mjs` did not look at `Country.photo`
at all. Green therefore meant nothing, and was read as everything. Changes:

- The manifest moves to **committed `scripts/photo-verified.json`**, and now records
  failures (`ok:false`) explicitly instead of only printing them.
- `validate-catalog.mjs` gains a shared `checkPhoto()` used by all four photo fields,
  and **finally checks the country layer** (plus duplicate country slugs).
- **960px now requires recorded HTTP proof** and errors without it. Shape checks alone
  can never re-admit this bug.
- New errors: `.svg` in a photo field; a quote character in a photo rendered inside
  CSS `url('...')`.
- When the manifest is absent the validator says so **loudly**: "NONE of the 1,285 photo
  URLs has HTTP evidence in this repo; a passing run means well FORMED, not that they
  load." Absence of proof must never again read as proof.

Validator after the change: **150 destinations / 83 countries / 1,313 places, 0 errors,
21 warnings** - identical warning count to before, so no regressions. `npx tsc --noEmit`
and `npm run build` both pass.

**NOT PUSHED - needs Netanel.** This session has no GitHub write access: git-over-HTTPS
has no credentials, and the API proxy answers "GitHub access to this repository is not
enabled for this session. Use add_repo" while exposing no such tool. The commit exists
locally only. It was delivered as `tiyul-photofix.patch` (written into the device repo
folder); apply with `git am tiyul-photofix.patch`. **Nothing from this session is on main
or in production yet.** The previous session's PAT-in-chat route is what unblocks this.

**Photo backlog: 62 gaps, deliberately untouched** (60 plus the two SVGs I removed).
I stopped rather than fill them. dbpedia was in another degraded window - `/data/*.json`
returned `{ }` or truncated for Tower of London, Café Louvre, Getsemaní, Mina Zayed, and
`/page/*` gave 502s and read timeouts; `Kolsai_Lakes` and `Stará_tržnica` 404 as article
titles and need correct ones found. More to the point: with `upload.wikimedia.org`
unreachable I cannot verify a single new URL, so filling the backlog tonight would have
added another 62 unprobed URLs of exactly the kind that caused this bug. Omission beats
approximation. Next session, if the network is open, run `verify-photos.mjs --force`
first and commit the manifest - that turns the backlog into verifiable work.

**What the next session should know.** (a) Apply or re-create the patch; nothing shipped.
(b) The catalog now has *zero* 960px URLs by design; do not reintroduce them without a
probe. (c) `samarkand/uzb-aral` is no longer the round 45,60 placeholder - it reads
43.76833,59.021389, so that open item is closed. (d) Rejected and staying rejected:
Slovenska Plaža, Chust, md-cricova, ph-nacpan, ec-otavalo, the 1901 Puerta del Reloj
archival photo.

### 2026-07-27 (m) - The deployment freeze was mine: an ignoreCommand that skipped everything

Netanel, looking at a wall of red X marks: *"i dont understand why they are not
being deployed, maybe that's the vercel plan?"* Reasonable guess. Wrong culprit -
it was me, and this is the second wrong deployment diagnosis I have written today.

**The evidence that settled it, in two fetches.** `/countries/bolivia` was live;
`/countries/seychelles`, from a later commit, returned 404. So production was
pinned to `d0965d7` - and `d0965d7` is the last commit before `08c1c4d`, where I
widened the Vercel `ignoreCommand` from two literal filenames to the wildcard
`':(exclude)*.md'`. Everything after it showed a red X with **no deployment row**,
including data commits touching `src/data/destinations.ts` that must always build.

**Mechanism.** "Everything skipped" is what an exclude-only pathspec that matches
nothing produces: `git diff --quiet` finds no differences, exits 0, and **0 means
SKIP**. I tested that command in this container against three real commits and it
classified all three correctly, so the wildcard evidently does not resolve the
same way in Vercel's build image. **Testing a build-config command somewhere other
than where it runs is not testing it.**

**Reverted by deleting the file, not by narrowing it back**, for three reasons:

1. **The premise was already wrong.** I added it to conserve deployments against a
   Hobby-plan cap I had inferred from red X marks - and entry (j), written an hour
   earlier, already records that the cap theory was wrong and the X's were
   superseded commits. It optimised a problem that did not exist.
2. **It made the commit list look broken by design.** A skipped build reports as a
   red X on GitHub, so every docs-only commit would have shown as a failure
   forever - while Netanel was already spending the afternoon asking why commits
   show X.
3. A wasted build on a session-log commit costs 45 seconds and nothing else. There
   was no real saving to protect.

Confirmed after the revert: Seychelles renders in production, so the workspace
simplification, the og:image fix and the data session's backlog all shipped
together.

**The rule worth carrying:** never put a command in build config that decides
whether to deploy unless it has run in the build environment at least once. And
when a change to deployment plumbing is followed by deployments stopping, suspect
the change before suspecting the platform - the timing was visible in the commit
list the whole time.

### 2026-07-27 (l) - "It looks like flying an airplane": measured the cockpit, then uncrowded it

Netanel, as the founder looking at his own trip screen: *"i fear this looks like
flying an airplane for some people, i am the founder and it looks sometime
scary."* He asked whether the answer was a tutorial or simplification. Neither was
answerable yet, because nobody had counted what is on the screen.

**The audit.** Production build, real Chromium, two seeded trips, an element
counted only if genuinely visible and larger than 4x4px:

| | 1440 | 390 |
|---|---|---|
| interactive elements at first paint | **54** | **32** |
| whole page, booking panel open | 90 | 73 |

**Two things we both assumed that were wrong.** The booking panel defaults to
collapsed (`BookingPanel.tsx:33`) - his screenshot of six cards was taken after
opening it, so that section was already correct. And mobile was already better
than desktop, because the action row collapses under 640px and the all-days grid
under 1024px. **This was specifically a desktop problem.**

**The diagnosis was hierarchy, not quantity.** Three contributors: eleven controls
sat above the plan and a first-timer needed none of them (`מחיקה` rendered at the
same weight as `שיתוף`); every stop carried four permanently-visible controls, so
four stops meant sixteen; and the agent - the product itself - was the narrowest,
quietest column while the loudest element on the page was a Google Maps link.

**A tutorial was rejected as the primary cure** and the reasoning is worth
keeping: a walkthrough reduces the control count by zero and *adds* controls. It
teaches people to tolerate a crowded screen instead of uncrowding it. One
coach-mark above the agent composer survived, once per browser.

**Shipped:** a `Menu` primitive (real button, not hover - hover does not exist on
touch and keyboard must reach every action; closes on outside click and Escape;
no new dependency); header 7 buttons to 3 with delete demoted to the bottom of a
menu behind a separator; preferences collapsed to one chip that **still shows the
set values as text**; per-stop controls 4 to 1, with irrelevant actions *absent*
rather than disabled; notes behind a trigger that auto-opens when a note exists;
the navigation button de-emphasised; the agent column widened and given a real
heading, its empty state centred because widening alone created a white void; the
all-days grid collapsed at every width.

**Results, and I missed my own targets.**

| | before | after | target | met |
|---|---|---|---|---|
| 1440 first paint | 54 | 43 | ≤30 | no |
| 390 first paint | 32 | 29 | ≤20 | no |
| 1440 excl. map + nav | 35 | 27 | ≤13 | no |

**Why: I set those numbers without doing the arithmetic.** What the approved
dispositions leave standing at 1440 is 6 nav + 10 Leaflet + 4 header + 1
preferences + 5 day tabs + 2 map toggle + 3 day card + 3 stop menus + 7 agent + 1
a11y = 42, plus the first-visit coach = **43, exactly what the harness reports.**
43 is the floor of the plan as approved. Going lower needs a *decision*: a compact
day selector instead of one tab per day, and 2 starters instead of 4. The ten
Leaflet controls cannot go - three are licence-required attribution links.

**The metric under-measures the fix, which is the more useful lesson.** The count
fell 20% while the screen reads far calmer, because what was removed was the
*flat, equal-weight* noise. Counting controls measures density; the complaint was
about hierarchy. A better proxy next time: how many things compete for first
attention - now about three (day tabs, the agent, the plan) instead of everything.

**A removal I talked myself out of.** Removal was permitted, so I went looking and
drafted `שופינג` for deletion on the theory nothing reads it. Then checked:
`set_preferences` validates it (`agent.ts:958`), it rides to the model inside
`preferences` every turn, and it drives scoring in `generate.ts:55-57`. It
collapses instead. "Low-value control" is an easy thing to assert and a
five-minute grep to check.

**Verified by driving the real UI**, not by reading markup: 11/11 at 1440
(reorder, move-to-day, remove, notes and preference write-through, Escape, no dead
disabled items, keyboard opens a stop menu, both header menus carry every
relocated action, coach shown exactly once across a reload) and 6/6 at 390 with
touch (no horizontal overflow, accessibility button not occluded, drawer, coach in
the drawer too, tap opens a stop menu, all-days collapsed). 60 unit tests, tsc
clean, build clean, lint unchanged at 27.

**A harness trap that cost a wrong measurement.** The first re-measure reported 13
controls and a 3,243px page - the trip had not rendered at all. Cause: the old
`next start` was still bound to the port, serving HTML that referenced chunks the
rebuild had deleted, so every JS request 500ed and the page fell back to the
landing hero. **Kill the previous server before measuring a rebuild**, and treat
an implausibly good number as a broken harness rather than a win.

**Left for a decision, not deferred silently:** the day-tab and starter reductions
above; and the empty state (a first-time visitor with no trip sees the landing
hero, not this screen) - if the fear is about first *impressions* rather than
first *itineraries*, that is separate work this pass did not touch.
The full audit, the per-control disposition table and the layout sketches are in
`SIMPLIFY-PROPOSAL.md` at the repo root.
### 2026-07-27 (k) - Country cards had no photos; +4 countries; Maldives rejected

**The bug Netanel spotted.** A screenshot of `/countries` showed Sri Lanka,
Malaysia, Indonesia, Morocco, Laos and Cambodia as flat purple blocks.
`src/app/countries/page.tsx` reads `c.photo` and falls back to a gradient, and
`Country.photo` is optional - **48 of 80 countries had none**. My own coverage
report had missed this entirely because it measured destinations and places
only. Lesson: a coverage report must cover every entity that renders an image.

> **CORRECTION (2026-07-27, entries (q) and (r) below): the fix described in this
> section did not work and this entry was wrong to record it as done.** Netanel reported
> Netherlands and Romania still rendering as flat purple cards afterwards. The
> `/500px-` → `/960px-` swap described below is not a safe transformation:
> Wikimedia only serves a thumbnail NARROWER than the source file, so the swap
> 404s for every source image under 960px wide, and `/countries` applies the photo
> as a raw CSS background with no `onError`, so a dead URL fails silently to the
> gradient. NOTE: entry (r) later disproved the width theory by HTTP probe - the real
> cause is file-extension case, `.JPG` lowercased to `.jpg`. Nothing
> in this entry was ever HTTP-verified - the sandbox cannot reach
> `upload.wikimedia.org`, and a green offline validator was mistaken for proof.

**The fix was free.** Two things make country photos cheap: the grounding index
does NOT serialize photo URLs (verified with `/tmp/measure.mjs` - index chars
were identical before and after), and `scripts/validate-catalog.mjs` does not
check `Country.photo` at all. So each of the 48 got its first destination's
already-verified `iconicLandmark.photo` with `/500px-` swapped to `/960px-`.
All 80 countries now have a photo. Field order: `photo` goes after `summary`,
before `practical`. (The width swap was the defect - see the correction above.)

**Four countries added:** Ecuador (`quito-cotopaxi-andes`), Mauritius
(`mauritius-island`), Seychelles (`seychelles-mahe-praslin-ladigue`), on top of
Guatemala, the Philippines and Panama earlier in the day. Catalog is now
**150 destinations / 83 countries / 1,313 places, 0 errors, 21 warnings**.

**Maldives was researched and REJECTED.** I had the photos and coordinates ready
when the visa research came back: the Maldives has banned Israeli passport
holders since 15 April 2025 (Third Amendment to the Immigration Act). It must
not be added to a site for Israeli travelers. This is the strongest argument yet
for the research-first rule - the Philippines turned out to give Israelis 59
days rather than the usual 30, Guatemala's 90 days turned out to be a shared
CA-4 allowance, and the Maldives turned out to be closed entirely. None of that
was recallable.

**BUDGET IS ESSENTIALLY GONE.** The grounding index is at **188,628 chars**
against a ~190,000 ceiling - roughly **1,370 chars, about one destination**, of
headroom. Do not add another country without first deciding what comes out, or
raising the ceiling. Photo work, by contrast, is free: fill the backlog freely.

**Photo backlog: 60 place gaps.** Most are Chabad/kosher entries that will never
have a Commons photo. Still-tractable: Cartagena's five colonial landmarks (the
dbpedia articles are traps - `Cartagena_Cathedral` returns the SPANISH
Cartagena at 37.6/-0.98, and `Palace_of_the_Inquisition` returns MEXICO CITY),
Tower of London (dead after four attempts), Kata Beach, On Lok Yun, the Iranian
Souk at Mina Zayed, the Antwerp Jewish quarter, Kolsai Lakes, Nemunas Delta,
Bratislava's three, Prague's two. dbpedia went from healthy to 502s and read
timeouts over the course of the session - retry later rather than concluding a
name is dead.

### 2026-07-27 (j) - The red X on GitHub is a SUPERSEDED deployment, not a failure

Netanel asked what the red X next to some commits means. Worth writing down
because I got the answer wrong once on the way, and because with two sessions
pushing to `main` all day it will keep appearing.

**What it is.** GitHub shows Vercel's deployment check; `✗ 0/1` means no
successful deployment for that commit. The dashboard showed the real story: the
X'd commits have **no deployment row at all** - Vercel never built them.

**My first explanation was wrong.** I concluded the Hobby plan was refusing
deployments because the two sessions had pushed 63 commits that day, and I said
so in the `vercel.json` commit message. Then the next data commit (Bolivia,
`d0965d7`) went green two minutes later, which a quota would not permit.

**The actual mechanism, and every observation fits it.** Vercel builds one
commit per branch at a time and **skips a commit that a newer push has already
superseded**. Trace it:

    b5d29e3 (og fix)   pushed → no check at all
    d17c315 (its log)  pushed 2 min later → superseded b5d29e3, then got ✗ itself
    dc37fab (vercel.json) pushed → superseded d17c315, then got ✗ itself
    d0965d7 (data, Bolivia) pushed → newest, so it BUILT ✓

So the X marks commits that were leapfrogged. **Nothing was broken and nothing
was lost:** production lands on the newest commit, which contains all the earlier
ones, and the og:image fix went live inside the Bolivia deployment - verified by
reading the served HTML (all ten `og:` tags present, `/og.png` serving). The only
real effect is a delay: a feature commit ships whenever the next build happens,
which may be the other session's.

**The practical rule for two parallel sessions:** if a change needs to be live
*now*, check that the deployment actually ran instead of trusting the push, and
be aware the other session's next push will carry it up anyway.

**Kept anyway, on its own merit:** `vercel.json` now has
`ignoreCommand: git diff --quiet HEAD^ HEAD -- ':(exclude)CLAUDE.md'
':(exclude)TODO.md'`, so a commit touching only the session log or the TODO does
not spend a build. 15 of the day's 63 commits were docs-only, i.e. about a
quarter of all builds produced a byte-identical site. Tested against three real
commits: docs-only exits 0 and skips, code and data exit 1 and build; a missing
`HEAD^` errors non-zero, so the failure mode is "build anyway", never "skip a
real change". **This was not the fix for the X's** - do not read it as one.


### 2026-07-27 (i) - WhatsApp showed Vercel's logo: no og:image, and the starter favicon

Netanel shared `www.tiyulplus.com` in WhatsApp and got a **black circle with a
white triangle** beside the correct tiyul+ title and description. Two causes, and
the second is the embarrassing one.

1. **There was no `og:image` anywhere on the site** - no `openGraph` block in the
   root metadata, no `metadataBase`, nothing. With no image declared the scraper
   falls back to the site icon.
2. **`src/app/favicon.ico` was still the create-next-app default** - the
   Next/Vercel triangle, 25,931 bytes of it, shipped since day one. `icon.svg`
   (the paper plane) was added in an earlier session and the `.ico` was never
   replaced. **Browsers prefer the SVG**, which is exactly why nobody ever saw
   this on the site itself - it could only surface through a share.

**What shipped.** `public/og.png`, 1200x630, built from the real `Logo.tsx` paths
and the `globals.css` tokens in Heebo, so it is the brand rather than an
approximation: night background, the paper-plane mark, the coral rule,
"סוכן הנסיעות החכם לישראלים" in zest, the tagline, `tiyulplus.com`. A new
`favicon.ico` from the same mark (cream plane on a night rounded square,
16/32/48/64/128/256). Root metadata gained `metadataBase` (absolute - relative
URLs do not work in scrapers), full `openGraph` and `twitter`
`summary_large_image`. The five unused create-next-app SVGs are gone,
`vercel.svg` among them.

**The composition is centred on purpose, and this is the reusable bit.**
WhatsApp crops the *small* preview to a **square**. A left- or right-weighted
layout loses the logo completely in that crop - which is how the original design
(brand in the top-right corner) would have failed even after adding an image. I
simulated the centre-square crop and checked the mark and the name both survive
it. `og:image:width/height` are declared so WhatsApp prefers the large card.

**`/t/[code]` sets `openGraph` explicitly rather than inheriting.** Next merges
metadata **per field**, so a child's `title`/`description` do NOT flow into the
parent's `openGraph` - the shared-trip card would have carried the generic site
title. That URL is the one people actually send, so it is the one that most needs
the trip name on it.

**Zero new dependencies** (hard rule 6): Heebo came from
`npm pack @fontsource/heebo` into `/tmp`, and the render used the preinstalled
Chromium with a playwright install kept entirely outside the repo. `package.json`
is untouched. Two rendering gotchas worth keeping: `body{overflow:hidden}` does
**not** clip an absolutely-positioned glow in an RTL document (the `html` element
scrolls instead, and the whole layout shifts) - wrap it in a sized
`overflow:hidden` div and screenshot that element; and `chrome --headless
--screenshot --window-size` did not honour the size, while a playwright
`viewport` did.

**Verified by reading the SERVED html from a production build**, not the source:
homepage carries all ten og/twitter tags with absolute image URLs, `/t/<code>`
carries the trip name in `og:title` with `og:type=article`, `/og.png` returns 200
`image/png`, `/favicon.ico` returns 200 `image/x-icon`. `tsc` + build clean.

**Netanel should know:** WhatsApp caches link previews per URL for a long time,
so links already sent may keep the old card; a fresh URL shows the new one.
Deferred: per-destination OG images (a city page could render its own hero) -
worth it only if destination links get shared, and it needs the
`ImageResponse`/Hebrew-font question answered first.


### 2026-07-27 (h) - Short answers: position in the prompt beat wording, twice

Netanel: *"Make the AI have not so long responses when can. for example: no need
to name all countries."*

**The literal example was a deterministic bug, not the model.** The keyless reply
greeted with `countries.map(c => c.name).join(' · ')` - **all** of them. Fine at
eight countries; **713 characters at 74**, and it grew with every data commit.
Replaced with `coverageLine()` in `lib/server/catalogSummary.ts` - real count plus
up to five examples, 81 chars. There is a test asserting the **length does not
grow with the catalog**, because that is precisely the regression nobody notices
while reviewing a data diff. This was also the text in his morning screenshots.

**Then the part worth carrying forward.** I wrote four brevity rules into
LANGUAGE & VOICE, measured live against the real model, and they did **almost
nothing**:

| | before | after prompt rules | after the real fix |
|---|---|---|---|
| "what do you cover?" | 116 words | 88 words, still a continent-by-continent list of ~35 cities | **32 words** |
| "build me 4 days in Vienna" | 174 words + full day recap | - | **26 words** |
| "do I need a visa for Italy?" | 81 words | - | **20 words** |

**Why the build reply was long: a rule conflict, not weak wording.** One rule
taught the `**יום N**` itinerary format for recommendation answers, and nothing
said it stopped applying after a tool call - so the model formatted an *edit*
reply as a full itinerary and re-wrote the plan the panel was already rendering.
The format is now explicitly conditional (no tool ran → allowed; tool ran →
forbidden), and the brevity clause rides on **`PROSE_DISCIPLINE`**, i.e. inside
the tool result - the last thing the model reads before writing. 174 → 26 words.

**Why the catalog list survived two explicit bans: position.** Both bans sat near
the top of a ~75-line system prompt. `OUTPUT_DISCIPLINE` is now a separate block
sent **last** in the `system` array, after CURRENT TRIP. Same principle as
`PROSE_DISCIPLINE`, applied to ordering. 116 → 32 words, no region breakdown.

**The generalisation, since this is now three-for-three this week
(`pinDistances`, `PROSE_DISCIPLINE`, `OUTPUT_DISCIPLINE`): when the model ignores
a rule, do not rewrite the rule harder - move it closer to the moment of
generation, or replace it with a computed fact.** Emphasis is the weakest lever
available.

**Two bugs found ONLY because this was tested live, both fixed in the same
commit:**
- The model **invented its own coverage** - "50 יעדים ב-40 מדינות" when the real
  numbers are 141 and 74. It cannot count a long list and there was no reason to
  make it try: `buildGroundingIndex()` now carries a `coverage` object and the
  prompt says quote it, never estimate. Exactly the same shape as the invented
  walking distances - give it the number instead of banning the guess.
- **"רק להתייעץ, בלי לשמור כלום" still created a trip.** The BUILD IMMEDIATELY
  rule had no exception for an explicit refusal. An explicit "don't" now outranks
  it; re-verified that the request produces no `trip` event.

**Checked that it did not become uselessly terse.** A genuine "recommend an
itinerary, don't save it" still returns the full `**יום N**` layout and calls no
tool; an edit reports what changed in one sentence; an uncovered city is still
declined honestly with real alternatives.

**Verified:** four live scenarios against real Sonnet with Netanel's key (staged
from his `.env.local` via the device bridge and deleted afterwards, including the
Turbopack dev cache that had absorbed it), `tsc` clean, 60/60 tests,
`npm run build` clean, lint unchanged at 27 problems with no hits in touched
files.

**Two pre-existing problems the live runs exposed and I did NOT fix, deliberately
- both need a decision, not a fifth prompt round.** (1) Soft walkability phrasing
is still there in new forms ("המרכז כולו מהלך ברגל", "הכול מהלך") - the ban list
names "במרחק הליכה"/"ברגל"/"צמוד" and the model simply reaches for a synonym.
Three prompt rounds have failed at this; per the rule above it needs a computed
substitute or a server-side rewrite, not more wording. (2) In a **prose**
recommendation with kosher unset, the model volunteered kosher restaurants in
Rome. The deterministic filter (`filterKosherUnlessOptedIn`) only guards the
tools, so prose is unprotected - and "kosher is opt-in, never assumed" is a
product principle, so this is worth a real fix.

**Also still open from earlier entries:** share links drop hotel pins
(`share.ts` has no `pins`); the agent characterises a hotel without a caveat
before `add_pin` runs; a `geocode.ts` unit test is owed; `supabase-accounts.sql`
may be unrun.

**CLOSED, by a screenshot from Netanel on the deployed site.** Entry (c) shipped
`set_day_city`/`move_day` and flagged as unverified whether the model would
actually reach for them instead of offering to wipe and rebuild. His run - the
same Slovakia trip, the same hotel confirmation - answered it: the pin landed
("✓ הוספתי למפה: לינה · Hotel Devin"), and the days moved
("✓ הזזתי את ברטיסלבה מיום 5 ליום 1", "מיום 6 ליום 2"), with a two-sentence
reply and no offer to rebuild. That is the exact request that produced
"המערכת לא מאפשרת לי" this morning, now working end to end, and it also confirms
the brevity work on a real restructuring turn rather than a probe.

### 2026-07-27 (g) - Catalog: North Macedonia, Mongolia, Bhutan, an 18-photo sweep, and a validator lesson

Data track only. Feature files untouched. Catalog went from 139 destinations /
72 countries to **142 destinations / 75 countries / 1,259 places**, validator at
**0 errors, 21 warnings**.

**What was added.** Three countries, each with one destination, in
`src/data/countries.ts` and `src/data/destinations.ts`:

- **North Macedonia** (`north-macedonia`) -> destination `ohrid-skopje`
  (`אוחריד וסקופיה`), 8 places, centre 41.5/21.05, score 4.3, iconic landmark
  the Church of St John at Kaneo. The country visa field says explicitly that
  this is outside Schengen so the stay does not eat the Schengen quota.
- **Mongolia** (`mongolia`) -> destination `mongolia-steppe-gobi`
  (`הערבה והגובי`), 9 places, centre 46.3/104.6, score 4.4, iconic landmark the
  Genghis Khan equestrian statue.
- **Bhutan** (`bhutan`) -> destination `paro-thimphu-punakha`
  (`פארו, טהימפו ופונאכה`), 7 places, centre 27.5/89.72, score 4.6, iconic
  landmark Paro Taktsang.

**Product decisions.** Bhutan's visa field leads with the fact that independent
travel is impossible and that every tourist pays a Sustainable Development Fee
of 100 USD per person per night, hedged `נכון להיום ובכפוף לשינויים`, because a
reader who discovers that number after booking flights has been badly served.
All three `kosherOverview` blocks state the absence of kosher infrastructure
plainly - no restaurant, no shop, and for Macedonia and Bhutan no Chabad house
either; Ulaanbaatar does have one and that is said. No kosher business was
invented anywhere. Choijin Lama Temple was fetched successfully for Mongolia
and then **deliberately dropped** to protect the grounding-index budget, and
Chele La was dropped from Bhutan because dbpedia returned `{ }` and a guessed
coordinate is worse than an absent place.

**Photos.** 18 missing place photos filled across three commits (`3f9cc2e`,
`261683a`, `4ea0740`) in Paris, London, Singapore, Malta, Reykjavik, Athens,
Berlin, Uzbekistan, Bosnia and Cartagena. Photoless count is down from 82 to
about 64, of which roughly 60 are Chabad and kosher-business entries that are
permanently unfillable.

Two bits of tooling made this repeatable and should be rebuilt rather than
re-guessed. `/tmp/ids.mjs` imports `destinations` by **absolute** path and
prints `slug, id, nameLocal` for every place with no photo, which ends the
recurring mistake of guessing a place id. `/tmp/apply1.py` inserts a `photo:`
line immediately after the `externalUrl:` line of a named id, asserting both
that the id occurs exactly once and that no photo is already present.

**New sourcing findings.**

- When a dbpedia HTML page yields no `Special:FilePath` strings, ask for
  `Special:FilePath **or dbp:image**`. Buckingham Palace had none of the first
  and did expose the second.
- Article-name fallbacks that rescued dead lookups:
  `Genghis_Khan_Equestrian_Statue` -> `Equestrian_statue_of_Genghis_Khan`;
  `Lake_Khovsgol` / `Khovsgol_Lake` -> `Lake_Khövsgöl` (umlauts required);
  `Bayanzag` -> `Flaming_Cliffs`.
- Confirmed dead, do not retry: `Chele_La`, `Kolsai_Lakes`,
  `Getsemaní,_Cartagena`, `Clock_Tower_Monument` (all `{ }`);
  `Nemunas_Delta_Regional_Park` (coords, no images); `Tower_of_London` (no
  images in JSON, HTML 502 twice - `lon-tower` stays photoless on purpose).
- Ukraine research was abandoned mid-flight: `Kyiv_Pechersk_Lavra` 502'd twice
  and `Saint_Sophia_Cathedral,_Kyiv` read-timed-out. The rule is two failures
  then move on, so it is worth a clean retry later, not a hammering.

**What went wrong, and the rule that fixes it.** I pushed a validator-failing
state to `main` as `261683a`: `uzb-samarkand` got
`RegistanSquare_Samarkand.jpg`, which `uzb-registan` already used, and two
places in one destination sharing a photo is an ERROR. It reached `main`
because the `git add / commit / push` sat on its own line instead of being
chained behind the validator. **Always chain the commit behind the validator
with `&&` on the same line, and check a candidate photo URL is not already
present in the destination before assigning it.** Fixed one commit later with
`Shah-i-Zinda_01.jpg` (`4ea0740`).

**Warnings kept honestly.** Mongolia's centre was retuned by hand from 46.8 to
46.3, which pulled Yolyn Am and Khongoryn Els inside the 3-degree threshold.
`mn-khovsgol` still warns at 4.8 degrees because it genuinely is that far, and
moving the centre to silence it would misplace the rest.

**For the next data session.** The grounding index is at **180,648 chars**
against the ~190,000 ceiling - about 9,350 chars, roughly 6-7 destinations, of
headroom. Measure before adding, budget ~1.4k chars per destination. Note the
(f) entry above: the index is only ~9% Hebrew, the per-city detail block was
the real overflow and is now capped, and **the catalog is not to be shrunk over
either entry.** Obvious remaining gaps: Ukraine, Moldova, and a second Indian
destination (Rajasthan). The photo backlog costs no index budget at all and is
the safest work when headroom is tight.

### 2026-07-27 (f) - The other half of the overflow, and a message that gave advice that could not work

Netanel, five minutes after the history-budget deploy: **"when i refresh, the
chat stays."** Two findings, both mine.

**1. The overflow was only half fixed.** His screenshot (12:26 Israel time)
postdates the history-budget push (12:21) and shows my own
`CONTEXT_TOO_LONG_MESSAGE`, so the fix was live and still insufficient. The
history was one half; `relevantCitySlugs()` was the other, and it had **no cap
at all**. It adds every destination whose Hebrew name, local name, slug **or
country name** appears in the last 6 messages - and the agent's own replies name
plenty of cities, so the set snowballs on its own output.

Measured against the real catalog rather than estimated:
`buildGroundingDetail` is **~6,500 chars per city at 45% Hebrew ≈ 3,800 tokens
per city**. 10 cities = 65,526 chars, 20 = 111,311, all 139 = 633,609 chars
≈ **370k tokens in one block**. Worse, it grows with the **catalog**, which the
data sessions expand hourly - so this was a bug that gets worse while nobody
touches the code.

Capped at `MAX_DETAIL_CITIES = 6`, **trip cities first** so the cities actually
being planned never lose their detail to a city merely mentioned in passing.
Worst-case prompt is now roughly 133k tokens (index ~50k + detail ~23k + history
~50k + trip ~10k) against the 200k limit.

**Do not shrink the catalog over either of these entries.** The grounding
**index** is 179,196 chars but only **9% Hebrew** - slugs, ids and JSON keys are
ASCII - so it really is ~45-50k tokens, exactly what the data sessions have been
measuring against. The index was never the problem; the per-city detail block
was.

**2. My error message told him to do the one thing that cannot work.** The
context-length message said to refresh the page and start a new conversation.
`loadChat()` restores the conversation from localStorage on **every** load, so a
refresh restores the too-long history verbatim and the next turn fails
identically. `reset()` in `useTripChat` cleared only the in-memory state - and
**nothing called it**, so it was dead code. There was no way, anywhere in the
product, to clear a conversation.

Fixed with the smallest honest thing: `clearChat(tripId)` in `chatStorage.ts`
(removes the key, keeps the trip), `clearConversation()` in `useTripChat` which
clears storage **and** memory with `suppressSaveRef` set so the save effect
cannot immediately write the old messages back, and a **"ניקוי" button** in the
`ChatPanel` header behind a `window.confirm`. The error message now points at
that button instead of at a refresh. Both header actions moved into one
`ms-auto` flex group, which also fixed their alignment.

**The lesson, and it is not the same one as the other four entries.** Every
earlier failure today was a wrong diagnosis. This one was a **correct diagnosis
with unverified remediation advice**: I wrote a user-facing instruction without
checking that following it changes anything. An error message is a feature - if
it tells the traveller what to do, that path has to exist and has to work.

**Verified:** `tsc` clean, 53/53 tests, `npm run build` clean, lint unchanged at
27 problems with no hits in the touched files.

**Deferred / next session should know.** Netanel's own long thread is still over
the limit in his browser's stored history - the cap does not retroactively shrink
what is already saved, so **"ניקוי" is how he clears it**. Still open from
earlier entries: share links drop hotel pins (`share.ts` has no `pins`); the
agent still characterises a hotel without a caveat *before* `add_pin` has run;
soft walkability phrasing ("ממש ליד") persists on top of the true numbers; a
`geocode.ts` unit test is still owed; and `supabase-accounts.sql` may still be
unrun, which affects cross-device pin persistence. Never live-verified: whether
the model actually reaches for `set_day_city` instead of offering a rebuild.


### 2026-07-27 (e) - The actual cause, at last: the history blew the context window

The body-logging shipped an hour earlier paid for itself immediately. Netanel's
next log line:

    400 invalid_request_error
    "prompt is too long: 408754 tokens > 200000 maximum"

**Twice the context window.** My leading-assistant hypothesis from entry (d) was
wrong - the fourth wrong root cause in one day. This is what had been killing his
conversations since the morning.

**Why, measured rather than assumed.** The history was capped by MESSAGE COUNT
(40) and per-message length (8,000 chars): up to **320,000 characters**. That
looks fine under the English assumption of ~4 chars per token. This conversation
is dense Hebrew, where **a token is roughly one character**. Derived from his own
log: 408,754 total minus ~70k of constants (grounding index ~45k, system prompt,
detail block, trip state) leaves ~337k tokens for a history of at most 320,000
chars - more than a token per char.

**A number in these docs was misleading in the other direction, and that is
worth fixing here.** The grounding index is 179,196 chars, but only **9% Hebrew**
- slugs, ids and JSON keys are ASCII - so the ~45k-token figure the data sessions
have been measuring against is about right, and the ~190,000-char ceiling is a
reasonable guardrail. **The index was never the problem.** Do not panic-shrink
the catalog over this entry.

**The property that made it look unfixable:** history only grows, so once a
conversation crosses the limit **every subsequent turn fails with the identical
400 forever**. That is exactly what he experienced - the same error again and
again in one long thread - and it is why three earlier fixes appeared to change
nothing for him. Each of those fixes was real; none of them touched this.

**The fix:** a 50,000-char budget on the whole history, filled newest-first
because the relevant context is the end of the conversation. The current user
turn always survives, truncated rather than dropped. Worst case drops from ~390k
tokens to ~120k against the 200k limit.

**Ordering is load-bearing and commented:** the budget must run BEFORE the
leading-assistant rule from entry (d), because trimming can itself expose an
assistant message at the head of the array. There is a test for that exact
interaction.

A context-length 400 also gets its own message now - it tells the traveller the
conversation grew too long and to start a new one, instead of
"משהו השתבש, נסו שוב", which invites the single action that cannot possibly work.

**53 tests.** One caught my own wrong expectation again: the per-message 8,000
cap applies before the budget, so a single enormous message is capped there
first, and the "current turn always survives" branch is insurance against a
future cap change rather than a live path. The test now documents that instead of
asserting fiction.

**The honest summary of today.** Five root causes, four of my diagnoses wrong
before this one, and the thing that finally closed it was not cleverness - it was
logging the response body instead of the status code. `catch {}` and
`Error(\`anthropic ${status}\`)` cost Netanel an entire day of deploys. When an
external API rejects a request, capture what it *said*, not just that it failed.


### 2026-07-27 (d) - The blank-message fix traded one 400 for another. Mine.

Netanel's Vercel log named it in one line:

    [chat] agent turn failed AnthropicHttpError: anthropic 400 { status: 400 }

400 on the first call, no text streamed - and `isTransient` correctly declined
to retry, so that part worked as designed.

**The cause was entry (b), earlier the same day.** That fix DROPS messages
carrying neither text nor image. His conversation opens with the booking
screenshot as its own message with no text; once the image ages past the last
two messages the client stops sending it, the message arrives blank, and the fix
deleted it - leaving the history **opening on an assistant message**. Anthropic
requires the first message to be a user turn.

**How it slipped through is the part worth recording.** Before choosing that
fix I probed the live API for three constraints and confirmed all three: blank
user content (400), blank assistant content (200), consecutive same-role
messages (200). That third result is what made "just drop it" safe. I never
probed **"first message is assistant"**, and wrote no test for it. The single
adjacent constraint I did not check is the one that broke production, ~23
minutes after deploy.

**The fix** drops leading assistant messages so the array always opens on a
user turn. Removal rather than a placeholder, for the same reason as before: an
assistant message at index 0 has no user turn it is answering, so it carries no
usable context. This also closes a path that predates all of today's work -
`raw.slice(-40)` can open the window on an assistant message in any conversation
longer than 40 messages, images irrelevant.

**Second fix, earned by the round trip it cost.** `AnthropicHttpError` carried
only the status, so `anthropic 400` said nothing about which field was rejected
and diagnosing it needed a full exchange with Netanel. The response body is now
captured and included, truncated to 400 chars - Anthropic returns field paths
("messages.2: ...") rather than user content, so this is safe to log.

**48 tests**, five of them new and all on the constraint I skipped, including
the 40-message-window case. One existing test needed updating: its fixture was a
lone assistant message, which is now correctly dropped - the new behaviour was
hiding what that test actually checks, so it got a user turn in front.

**Verified:** `tsc` clean, `npm run build` clean, 48/48, lint unchanged at 27
problems with no hits in the touched files. Not verified live - the device bridge
is still down so the key could not be re-staged, and this fix is deterministic
enough that the tests are the real proof.

**The lesson, stated plainly because it cost Netanel three deploys.** Probing
three constraints and skipping the fourth is not "verified against the API" - it
is a guess with evidence attached. When a fix changes the SHAPE of a payload,
enumerate every shape rule the API has and test the ones the change can reach,
not the ones that happen to come to mind.


### 2026-07-27 (d) - Catalog: France, UK, Singapore, Malta, Belgium and a 77-photo sweep

Database-track session, run in parallel with the feature chat. Five new
destinations landed with their country entries where missing: **פריז**
(France), **לונדון** (UK), **סינגפור**, **מלטה** and **בריסל ופלנדריה**
(Belgium), plus Kolsai and Delphi as additions to existing destinations.
The catalog now stands at **137 destinations, 70 countries, 1,216 places,
0 errors, 20 warnings**. Grounding index is ~174,000 chars against the
~190,000 ceiling, so roughly 11 destinations of headroom remain. Budget
about 1.4k chars per new destination.

**The single most reusable finding of the session:**
`https://dbpedia.org/page/<Article>` - the **HTML** endpoint - returns
`dbo:thumbnail` and `foaf:depiction` on large articles where
`https://dbpedia.org/data/<Article>.json` silently truncates and drops them
entirely. This had blocked Eiffel Tower, Louvre, Versailles, Westminster
Abbey, British Museum, St Paul's, Camden Market and Hyde Park across
several sessions. When even the HTML page looks empty, reformulate the ask
as "search the whole page for strings containing Special:FilePath, list
every distinct filename" - that rescued St Paul's with 40 filenames after
a direct thumbnail request returned nothing.

Source order of preference is now: (1) `dbpedia.org/data/X.json` for small
and medium articles, one call gives thumbnail, depictions and coordinates;
(2) `dbpedia.org/page/X` for large articles, no reliable coordinates;
(3) `geonames.org/search.html` for coordinates only. Throttle to 2-3
concurrent calls - 502s and read timeouts cluster above that.

**New dbpedia traps, all confirmed by example:**

- **Wrong city, same name.** `Palace_of_the_Inquisition` returns the
  *Mexico City* palace; `Cartagena_Cathedral` returns the *Spanish*
  Cartagena's. This is the dangerous one, because it returns
  confident-looking data. Always read the depiction filenames and check
  they match the intended city.
- **Corporate logo instead of a photograph.** British Museum returns
  `British_Museum_logo.svg`; Marina Bay Sands returns
  `MBS_Primary_Logo_Lockup_800px_72dpi_Black.png`. Take a `foaf:depiction`
  exterior shot instead.
- **Coat of arms instead of a photograph.** Most small European towns do
  this: Peso da Régua, Lamego, Bansko, Sigulda, Krujë, Sombor. Skip the
  thumbnail entirely for towns and go straight to the depictions.
- **Montage or composite.** `Marsaxlokk` returns `Marsaxlokk_montage.png`;
  `Cartagena,_Colombia` returns only `Montaje_Cartagena,_Colombia.jpg`.
  Rejected both.
- **Ambiguous image.** Montmartre's thumbnail is a generic Paris rooftop
  view. Deferred rather than accepted.

**GeoNames trap reconfirmed:** when GeoNames has no record it silently
falls back to a Wikipedia result for a *different* place. It returned
Kortrijk for "Markt Brugge". Always check the returned name matches.

**Photo sweep.** The photoless count went from **161 to 78 of 1,216**.
Filled across Paris, London, Singapore, Douro (all 6), south Albania,
Vojvodina, Patagonia, Bosanska Krajina, Fergana, Amsterdam, Krakow, Banff,
Stockholm, Mexico, Latvia, Lithuania, Denmark, Korea, Greece, Austria,
Sri Lanka, Canada, New England, Romania, Tasmania, Brazil, Kyrgyzstan,
Estonia, Cyprus, Azerbaijan, Vienna, Rome, Chile and Morocco. Roughly 60
of the remaining 78 are Chabad houses and kosher restaurants that have no
freely-licensed photograph anywhere and will stay blank permanently.
The genuinely stuck ones are Buckingham Palace, Tower of London, Montmartre,
Champs-Élysées, Centre Pompidou, Rue des Rosiers, Golders Green, Merlion,
Raffles, Singapore Botanic Gardens, and seven of the ten Cartagena places.

**Two deliberate omissions, both documented in their commit messages.**
Malta's Blue Lagoon has no sourceable coordinate anywhere, so it was folded
into the Comino island entry rather than pinned at a guessed point.
Antwerp's diamond district likewise has none, so the kosher entry is
anchored on the verified Antwerpen-Centraal coordinate and the description
says so outright. The project's worst outcome is a plausible-looking wrong
value, so omission beats approximation every time.

**Kosher honesty, both directions.** Malta's overview states plainly that
there is no kosher restaurant on the island and Chabad by prior arrangement
is the only cooked option. Belgium's says the opposite: Antwerp is the most
serious kosher infrastructure in western Europe after London, with the
explicit caveat that Bruges and Ghent have essentially nothing and visitors
should shop in Antwerp first.

**Tooling added under /tmp, worth recreating if lost:** `photoless.mjs`
(census of places with no photo - note it needs an *absolute* import path,
a relative one resolves against /tmp and fails), `mkphotos.mjs` (place id
to Commons filename map to thumb URLs, with the `%27` apostrophe fix baked
in) and `applyphotos.py` (splices `photo:` after each place's
`externalUrl:` line). Do not inline `node -e` inside a bash heredoc when
the JS contains quotes - shell quote nesting breaks it, write a `.mjs`
file instead.

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

### 2026-07-28 (bb) - Food and shopping beyond kosher-only, and the guard that was only half built

Netanel asked to open food and shopping past the kosher categories: curated, not
comprehensive - a dish or product the city is known for, a market worth walking,
somewhere you would regret missing. Twelve entries across Vienna, Rome, Bangkok
and Barcelona, shown to him as a sample before scaling. **Merged to main.**

**The load-bearing finding is not the content.** The brief assumed food in this
catalog was kosher-only. It was not - it was kosher-*labelled* only. Twelve
`cafe` and restaurant entries already existed with no kashrut statement at all:
Café Central, Katz's, Café de Flore, Les Deux Magots, Caru cu Bere, Fortnum &
Mason, Gerbeaud, Florian and others. And `filterKosherUnlessOptedIn` opened with

    if (trip?.preferences?.kosher === true) return { ids, dropped: [] };

so a traveller who had **chosen** kosher was never filtered at all. The function
only ever protected people who had NOT opted in, from places they had not asked
for. That was safe exactly as long as every food entry carried a `kosher-*`
category, and it had already stopped being true. **A traveller who ticked כשר
could be handed Katz's Delicatessen.**

Fixed in all three injection paths - the agent (`create_trip_full`,
`set_day_places`), `tripFromTemplate`, and `validateDayPlans` in
`/api/generate-trip`. **`'unknown'` is blocked exactly like `'not-kosher'`:**
"we do not know" is not "probably fine" when somebody is trusting us on kashrut.
The two refusal messages to the model are deliberately different and there is a
test asserting they cannot be confused, because telling the model "kosher was
not selected" when the truth is the opposite makes it re-add what was just
removed.

**Schema, kept small.** Two categories (`food`, `market` - `market` earns its
place because "a market worth walking" behaves nothing like a shop), a required
`kosherStatus` on anything you eat at, and `PlaceSource { url, title, checked }`.
**No existing kosher row was edited:** `kosherStatusOf()` derives `'kosher'` from
the `kosher-*` category rather than reading a field, so the migration touched
zero kosher entries. The twelve unlabelled non-kosher ones were backfilled -
leaving them blank is what the new rule forbids and is also what made them
reachable.

**The rules Netanel set, enforced in `validate-catalog.mjs` rather than by
habit:** an eating place with no kashrut status is an ERROR (0 remain); a
`food`/`market` entry without a source is an ERROR; a malformed source date is an
ERROR; opening hours or a price inside a food/market/cafe/shopping description is
an ERROR; and an `externalUrl` that links by NAME instead of coordinates is an
ERROR - the catalog has already been burned by "Cartagena" resolving to Spain and
"Deira" to Northumbria. Seventeen legacy entries elsewhere mention a time; those
are WARN, not ERROR, because rewriting other people's content was not the task.
**One real hours claim was removed in scope:** On Lok Yun's description said it
closes on Sundays.

**What is deliberately absent from the twelve, and each is a decision:** no
`priceLevel` (a 0-3 bucket is not a price, but he said no prices - flagged for
his call; the cost is that these do not appear under the "מחירי אטרקציות"
filter), no `rating` (inventing an editorial score for a café is a fabricated
number), and no `photo` (an image URL cannot be verified from this sandbox, and
151 dead URLs is what that produced last time).

**Sources.** Coordinates from the Wikipedia coordinates API via the Chrome
extension - en for Vienna/Rome/Bangkok, **ca.wikipedia for the three Barcelona
markets**, which is where they actually have articles. `Mercato di Testaccio`,
`Figlmüller` and `Casa Gispert` on en all came back missing; Testaccio and
Figlmüller were dropped rather than pinned at the neighbourhood, Casa Gispert was
recovered from ca. Vienna's three are all coffee houses on purpose - the Viennese
coffee house is what the city's food identity IS, and Naschmarkt and Café Central
were already in the catalog.

**Verified:** 117 tests (7 new, one of which caught a naive assertion of my own -
the not-opted-in message legitimately contains the substring "שומר כשרות" in its
closing clause), validator 0 errors / 60 warnings, tsc and build clean (277
pages), and **44/44 in a real browser** at 1440 and 390: all twelve render, the
new `שוק` and `אוכל` chips exist and the latter is distinct from `אוכל כשר`, RTL
intact, zero overflow. verify-photos: 1,529 of 1,546 from cache, 17 live checks
all 403 - **this branch added zero photo URLs** (confirmed by grep), so those are
the known-unrepairable backlog from entry (s) plus the sandbox block, not a
regression.

**Scaling is blocked on a decision, not on work.** Three entries per destination
across the remaining 162 is roughly 500 places ≈ 72,000 index chars, against
~41,000 of headroom under the 260,000 ceiling. **It does not fit.** The options
are priority cities only, fewer per city, or raising the ceiling - and that is
Netanel's call, not something to discover halfway through.

**Still open, unchanged:** the 18 dead photo URLs; `kosher-market` and the `cafe`
gaps blocked on geocoding; the 2.5MB client bundle; and `feat/catalog-supabase`,
which stays unmerged by his instruction until he reviews it himself.
### 2026-07-28 (w) - הקטלוג עובר ל-Supabase כמקור אמת, והקבצים נשארים נתיב הקריאה

ענף `feat/catalog-supabase`, לא ממוזג ל-main בכוונה. נתנאל בחר באפשרות A:
**Supabase הוא מקור האמת לעריכה, סקריפט מייצר מחדש את `src/data/*.ts`, והאתר
ממשיך לקרוא קבצים ולהיבנות סטטית.**

**למה לא קריאה מ-Supabase בזמן ריצה, וזו ההחלטה המרכזית כאן.** עמודי היעדים
והמדינות נוצרים סטטית (`generateStaticParams`, 166 נתיבים), כך שהיום עלות
הקריאה בזמן ריצה היא **אפס**. מעבר ל-fetch היה מוסיף סיבוב רשת במקום שאין בו
אחד - כלומר מאיט ולא מזרז. בנוסף, חמישה רכיבי `'use client'` מייבאים את
הקטלוג סינכרונית ברמת המודול, ומעבר אסינכרוני היה מחייב שינוי במסך הטיול -
שנפסל במפורש בבריף. `PlacesProvider` לא נגע, ואף קורא לא השתנה.

**מה נבנה.** `supabase-catalog.sql` (שלוש טבלאות שמשקפות אחד-לאחד את
`src/lib/types.ts`, `jsonb` למבנים מקוננים, `position integer not null` כי
הסדר בקטלוג הוא תוכן עריכתי ולא גחמה של `ORDER BY`); `scripts/lib/catalogMap.mjs`
(המרה דו-כיוונית); `scripts/lib/catalogEmit.mjs` (הדפסת TypeScript);
`scripts/catalog-push.mjs` (קבצים → Supabase); `scripts/catalog-pull.mjs`
(Supabase → `src/data/*.generated.ts`); `scripts/catalog-roundtrip.mjs` (ההוכחה).

**RLS: קריאה בלבד לציבור.** שלוש הטבלאות עם `enable row level security`,
policy ל-`select` בלבד ל-anon ול-authenticated, ו-`revoke insert, update,
delete`. **אין policy לכתיבה, וזו לא השמטה אלא הנקודה** - הכתיבה נעשית אך ורק
דרך סקריפט ההעלאה עם service role key, שעוקף RLS בהגדרה. מפתחות ממשתני סביבה
בלבד; שום דבר סודי לא נכנס לריפו.

**אידמפוטנטיות, כי "בטוח להריץ פעמיים" זה לא upsert לבד.** ההעלאה עושה upsert
באצוות של 200 ואז **גוזמת** רשומות שכבר אינן בקבצים, בסדר הפוך להעלאה בגלל
המפתחות הזרים. בלי הגיזום, מקום שנמחק מהקבצים היה נשאר בדאטהבייס לנצח ושתי
ההרצות היו נותנות מצבים שונים.

**ההוכחה, ולמה ספירה לבדה לא מספיקה.** ספירת מדינות/יעדים/מקומות יכולה להיות
מושלמת בזמן ששדה `kosherNote` נשמט מכל רשומה. `catalog-roundtrip.mjs` מריץ
files → rows → files בהשוואה עמוקה שבה **נוכחות מפתח היא חלק מהנתונים**: שדה
אופציונלי שנעדר במקור חייב להיעדר גם אחרי החזרה, ולא להופיע כ-`undefined` או
`null`. `mustSee` הוא המקרה החד ביותר - הוא קיים רק כשהוא `true` ולעולם לא
כ-`false`. שלב שני מדפיס TypeScript אמיתי, כותב לדיסק, מייבא מחדש ומשווה שוב;
זה מה שתופס באג ציטוט שאף ספירה לא הייתה רואה.

**התוצאות, בארבעה שלבים:** `src/data` = **83 מדינות / 166 יעדים / 1,510
מקומות**. שורות להכנסה: אותו הדבר. בנייה מחדש מהשורות: אותו הדבר. TypeScript
מודפס ונטען מחדש: אותו הדבר. השוואה עמוקה עברה על `countries` ועל
`destinations`. חמש דגימות (`dxb-burj-khalifa`, `nyc-katz`, `vie-alef-alef`,
`cyc-oia`, `ba-la-boca`) חזרו זהות בייט-בבייט שדה אחרי שדה. `validate-catalog.mjs`
0 שגיאות / 45 אזהרות, `tsc --noEmit` נקי, `npm run build` עובר.

**אזעקת שווא שכדאי לזכור.** `JSON.stringify(before) === JSON.stringify(after)`
דיווח DIFFERENT על כל חמש הדגימות בזמן שההשוואה העמוקה עברה. הסיבה: `stringify`
רגיש ל**סדר** המפתחות, וסדר מפתחות באובייקט אינו נתון. הבדיקה נכתבה מחדש
שדה-אחרי-שדה ומדפיסה במפורש `(key order re-sorted, not a data change)`. הכלל:
לפני שמכריזים על אובדן נתונים, לוודא שההשוואה בודקת תוכן ולא ייצוג.

**הדחיפה עצמה מעולם לא רצה מול פרויקט אמיתי.** אין לי `SUPABASE_URL` ואין
service role key, ולא ביקשתי אותו בצ׳אט. מה שנדרש מנתנאל: להריץ את
`supabase-catalog.sql` ב-SQL Editor, ואז
`SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node --experimental-strip-types
--import ./scripts/alias-loader.mjs scripts/catalog-push.mjs` (עם `--dry` קודם).
הסקריפט סופר מהדאטהבייס עצמו אחרי הכתיבה ונופל אם המספרים לא תואמים.

**שתי תשובות שנתנאל ביקש בלי לפעול עליהן.** (1) **כן, ההשענה של הסוכן קוראת
את כל הקטלוג** - `buildGroundingIndex()` מסדר את כל הערים והמקומות, 216,509
תווים, בכל קריאה. אפשר לצמצם לטיול הנוכחי, אבל שני מחירים: זה שובר את מטמון
הפרומפט (האינדקס נושא `cache_control: ephemeral` ומשותף לכל המשתמשים), וזה
מוריד מהמודל את היכולת להציע מקום מחוץ לטיול הנוכחי - שזה בדיוק מה שהופך אותו
לסוכן ולא למילוי טפסים. בלוק הפירוט כבר חסום ב-`MAX_DETAIL_CITIES = 6`.
(2) **תוכנית לחבילת הלקוח, בלי קוד:** למדוד מה חמשת הרכיבים באמת צריכים (כמעט
תמיד שדות בודדים ולא הקטלוג); לחשב בשרת מטען צר ולהעביר אותו כ-props; להחזיק
`CatalogContext` ברמת הראוט כדי שלא יעבור דרך חמש שכבות; לשמור על
`generateStaticParams` בדיוק כפי שהוא; לטעון בעצלתיים את הזנב הארוך (חיפוש
אתר, ייבוא מפה); ולמדוד first-load JS לפני ואחרי. **שלב 3 נוגע ב-TripWorkspace**,
ולכן הוא דורש החלטה מפורשת לפני שמתחילים.

**מה נשאר פתוח.** 18 כתובות תמונה מתות שדורשות בחירה אנושית; `kosher-market`
חסר ב-16 מ-17 מדינות ו-`cafe` ב-6, שניהם חסומים על גיאוקודינג ולא על מחקר;
וחבילת הלקוח של 2.5MB, שנתנאל אמר שיתזמן בנפרד.

### 2026-08-12 (yy) - Google Maps links, re-audited: the fix had already landed, and the gap was the fallback nobody closed

Netanel asked for a full audit of how the site sends people to Google Maps, on the
belief the split was "roughly half and half" between coordinate-based and
name-based links, with a live sample check across hard cases - generic names,
duplicate names across cities, small places, Hebrew-named entries.

**The headline finding: that belief was already stale.** `git log` turned up an
unlogged commit from the day before (`0d9aa9e`, "קישורים יוצאים: מודול אחד,
קואורדינטות במקום שמות") that built exactly this - `src/lib/outbound.ts` and
`placeMapUrl()`, overriding every place's stored name-based `externalUrl` with a
coordinate query whenever valid lat/lng exist. **Measured fresh against the
current catalog: 1,814 of 1,814 places produce a coordinate-based link, 0
name-based, in every one of 166 destinations.** That session's own log entry was
never written - a gap worth naming, since it is exactly what hard rule 8 exists to
prevent, and it is why this audit started from a wrong premise nobody could have
caught by reading the log.

**So the audit became: verify that fix live, then close what it deliberately left
open.** `placeMapUrl` still fell back to the OLD stored name-based guess when a
place had no valid coordinates at all - "half a link is better than nothing," an
explicit design comment. Netanel's instruction for this session reversed that
call: *"I'd rather the export skip it with a note than send someone to the wrong
street."* That fallback is now `null`, never a guess, with the reasoning written
into the module doc next to the reasoning it replaces - not deleted, corrected in
place, because the old argument is exactly the mistake the new one explains. It is
dead code against today's data (every place has real coordinates) and it is a
guardrail against tomorrow's: a future place added without a verified coordinate
now gets an honest "מיקום לא אומת" note in the three place-card renderers
(`DestinationClient`, `KosherSearch`, `MapInner`'s popup) instead of a confident
wrong pin.

**The day-route export (`DayNavExport`/`mapsExport.ts`) had the same shape of gap,
one level up.** It already filtered invalid points out of the Google Maps
directions URL - but the summary line under the button still read `points.length`,
the count *before* filtering, so a day with an unlocatable stop would have silently
undercounted-in-reverse: claiming more stops were included than actually were.
`isValidNavPoint` is now exported once from `mapsExport.ts` and reused by the
component to report the real navigable count and, when anything was dropped, say
so explicitly ("N עצירות לא נכללו כי אין להן מיקום מאומת") rather than let the
number quietly lie. Also fixed: a day with stops but zero navigable ones no longer
vanishes with no explanation - it says there isn't enough verified location yet,
distinguished from the ordinary one-stop day (which still, correctly, shows
nothing - there's nothing to route between and nothing wrong with the data).

**Coordinate PRESENCE was never the whole story - precision is a second, separate
risk, and it already had a script.** `scripts/coarse-coords.mjs` (from the same
unlogged session) flags any place whose lat/lng round to ≤2 decimal places
(~1.1km error or worse), split by whether the category is an area (nature/
viewpoint, where a rough center is legitimate) or a point (everything else, where
it isn't). Run fresh: **154 places at ≤2 decimals, 68 of them points.** Its logic
moved into a shared `src/lib/coordPrecision.ts` so the script and a new test read
the same definition of "coarse" instead of two copies drifting apart.

**The test Netanel asked for - "fails if a place has coordinates too coarse to be
useful" - is a ratchet, not a zero-tolerance gate, and that's a deliberate choice
worth defending.** The 68 coarse points are pre-existing data debt, not a code bug;
blocking every unrelated commit until a human re-geocodes 68 places by hand would
stop all other work over something this branch cannot fix (fixing them means
opening a map and finding the real point - exactly what `coarse-coords.mjs`'s own
doc comment already argues, and correctly). `coordPrecision.test.ts` snapshots
today's 68 as an allowlist and asserts the current set is always a **subset** of
it: fixing one drops it off the list for free, and any place NOT already on the
list that turns up coarse fails the build by name. Verified the guard actually
guards, not just documents: fed it a synthetic coarse point outside the catalog and
confirmed `coarseCoordRows` flags it as expected.

**A second, distinct precision problem, found only by cross-checking coordinates
against each other rather than against a decimal-count threshold: six kosher
venues share their EXACT coordinate with an unrelated "city" entry in the same
destination** - Chabad Arusha/Cusco/Queenstown/Reykjavik/Zagreb/Hanoi are each
pinned at 4-6 decimal places, precise-*looking*, but the identical point as a
generic "city base" pin nearby. `coarse-coords.mjs` doesn't catch this - the
precision is real, the LOCATION is wrong. Confirmed live in a real browser: the
Arusha Chabad link lands in central Arusha, on a hotel-lined street, not at the
restaurant's actual address. Reported here rather than silently "fixed" with a
guessed coordinate - the same omission-over-approximation rule this catalog
already follows everywhere else. Not added to the ratchet test (it's a different
failure mode than raw decimal precision and a threshold-based test can't express
it honestly); flagged in the session report instead.

**Live browser verification, phone viewport (iPhone 13 emulation via real Chrome,
not the bundled headless shell - the first attempt served a "your browser needs to
upgrade" lite-Maps fallback that hid POI names; a real Chrome channel with WebGL
rendered the actual interactive map).** Sampled across the hard cases asked for:
a market (Naschmarkt), a park (National Garden Athens), two places sharing the
identical Hebrew display name "הארמון המלכותי" in Madrid and Stockholm, two more
sharing "בית הכנסת הגדול" in Tbilisi and Florence, several small kosher venues,
and both coarse and 6-decimal-precision entries. **Every sample landed in the
correct city**; the duplicate-name pairs are the cleanest proof the fix does what
it claims - identical Hebrew text, two entirely different, geographically correct
pins, because the URL never carries the name at all. The six city-anchor kosher
duplicates above were the only samples that landed in the wrong specific spot
(right city, wrong building).

**Verified:** `npx tsc --noEmit` clean, `npm run build` clean (293 pages, no route
changes), 452 unit tests (3 new: coarse-coordinate name-based prohibition strengthened,
the precision ratchet, the area/point classification), lint unchanged at the
pre-existing 34 problems with zero hits in touched files. Live-rendered
`/destinations/vienna` (26 place links, 0 name-based), `/kosher` → ניו יורק (4
links, all coordinate-based, RTL intact at 390px), and a seeded trip's day-navigation
button (correct point count, correct "starts from lodging" note, correct multi-point
directions URL) - all on a production build, not dev.

**What this session did NOT do, and why.** Did not touch `src/data/destinations.ts`
- every coordinate in the 68-point coarse list and the 6 city-anchor duplicates is
real data work (open a map, find the address) that belongs to a data session, not
a code audit. Did not raise the coarse-coordinate threshold past 2 decimals or
attempt to auto-repair anything - the project's standing rule is that omission
beats a guessed value, and this branch keeps that rule rather than relaxing it to
look more finished. Branch `fix/google-maps-links`, cut from `main`, this entry's
merge closes it - built and tested in isolation, merged after review.

### 2026-08-12 (zz) - The anon/signed-in split becomes a dial, and the alert gets a way to prove itself

Netanel, ahead of launch: the spend card lets him move the daily ceiling but not
the split between the anonymous and signed-in pools, and he wants that split
adjustable the same way - no deploy, tunable live while he watches what actually
shows up. He also wants the default flipped: anonymous should be the *larger*
pool, since pre-launch traffic is almost entirely logged out and blocking it is
the expensive mistake. And he wants confirmation, not faith, that the 90%-ceiling
alert actually reaches him before he runs the budget close to the edge.

**The default was already flipped, one commit ago, and never logged.** `ANON_SHARE`
in `lib/server/budget.ts` was 0.55 as of the "outbound links" commit
(`0d9aa9e`) - up from 0.4 - bundled in as an unrelated fifth item in a session
whose own log entry never got written (see 2026-08-12 (yy) on the maps-link
branch, which hit the identical gap independently). So "give anonymous the
bigger share" was **already true in code**, just never surfaced to him and never
adjustable. This entry is honest about that rather than presenting a rename as
new work: the number stayed the same (`DEFAULT_ANON_SHARE = 0.55`), what's new is
that it's now a dial and not a constant.

**The dial: `ai_anon_share`, same mechanism as `ai_daily_budget_usd`, on purpose.**
`anonShare()` reads the flag → env (`AI_ANON_SHARE`) → `DEFAULT_ANON_SHARE`, in
that exact priority order, because these two numbers are meant to be tuned the
same way during the same launch window. `budgetFor()` now calls it per-request
instead of reading a top-level constant. The flags API (`/api/admin/flags`)
gained a real per-key range - `KNOWN` used to be just `{key: type}`, with a single
hardcoded `0..10_000` bound baked in for every number flag; a share flag with that
bound would have accepted "55" (5,500%) as valid. `KNOWN` now carries `{type,
min, max}` per key, `ai_anon_share` gets `0..1`, and the daily-budget flag keeps
its old range unchanged.

**The guarantee holds regardless of what the dial is set to, and that's provable
rather than asserted.** The floor for signed-in traffic is `1 - anonShare()`, and
the thing that actually protects it - the `Math.min(s.anonUsd, budget * share)`
clamp on anonymous overspend - never touches `share` directly; it composes with
whatever `share` is. Added a test that sets the dial to an extreme (90% to
anonymous) and re-runs the exact "anonymous overspend doesn't touch the signed-in
floor" scenario that the original bug report was about - it holds at 90% exactly
as it held at 55%, because the protection was never *in* the percentage, it's in
the `min()`.

**The webhook alert had never been tested, at all - not even a fixture.** The one
existing "alert" test asserted a threshold constant was less than 1. `post()`
(the function that actually calls the webhook) swallowed every failure with
`.catch(() => {})` - no log, no trace, nothing. A wrong URL or a downed endpoint
during launch would have failed *exactly* as silently as success, which is the
worst possible failure mode for the one mechanism Netanel is relying on to know
something's wrong. Fixed in two parts:

1. `post()` is now awaited internally and returns `{configured, ok, error?}`
   instead of `void` - every failure is `console.warn`'d (visible in Vercel
   function logs) even on the fire-and-forget path from `maybeAlert`, which still
   doesn't block the request on it (`void post(...)`, same as before - an alert
   should never slow down a chat turn).
2. **`sendTestAlert()` + `POST /api/admin/alert-test`** - an admin-gated route
   that sends a real, clearly-labeled test message and waits for the answer, so
   "the webhook is configured" becomes "I pressed the button and it arrived."
   Wired to a new button on the spend card: sends, shows ✓ on success, the actual
   error string on failure (`webhook_http_500`, or the fetch error verbatim), and
   "not configured" when `AI_BUDGET_ALERT_WEBHOOK` is unset - three different
   answers to three different questions, instead of one silent nothing.

**Verified live, not just by reading the code.** 12 new tests in
`budget.test.ts` mock `globalThis.fetch` (same pattern as `shareStore.test.ts`)
and capture what actually gets POSTed: the single-source alert fires once per
identity per day and stops firing after; the daily-ceiling alert fires once at
90% with the concentrated/broad classification correct; neither fires below
threshold; `sendTestAlert` correctly reports all four real outcomes - not
configured, delivered, HTTP failure, and network failure - none of them thrown
as an uncaught exception. Running the suite prints the actual webhook payloads
to the console as a side effect, which is itself a form of proof: the messages
read exactly as they would in Slack.

**A second, smaller stale-comment bug found on the way, same species as the
`ANON_SHARE` gap.** The pool card's UI copy said "לפחות 70% מהיום" (at least 70%
of the day) for signed-in users - a number left over from when `ANON_SHARE` was
0.3, surviving unchanged through two later bumps to 0.4 and then 0.55 (would have
been "at least 60%," never "70%"). Both pool labels are now computed from
`d.budget.anonShare` instead of hand-written, so this specific class of drift
- a percentage baked into copy instead of read from the number it describes -
can't recur here. `.env.example` had the same shape of staleness for the daily
budget default (documented as $5, code says $10) - fixed while adjacent, not
chased elsewhere.

**Verified:** `npx tsc --noEmit` clean, `npm run build` clean, 460 unit tests (12
new), all touched files individually lint-clean (`npx eslint` on the exact
changed files - the repo-wide `npm run lint` currently reports ~14,700 problems
that are entirely `.next` build output from a concurrent session's git worktree
under `.claude/worktrees/agent-web-lookup/`, not this branch's content; left
untouched since it's a different session's live directory, not a bug in this
change). The admin UI addition was **not independently browser-verified** - it
reuses the exact hook/API pattern of the daily-budget editor that's already
shipped and working, with no new interaction shape, and there was no live
Supabase admin session available in this environment to drive it end-to-end.

**What this session did NOT do.** Did not touch the per-caller cap
(`CALLER_CAP_USD`/`ANON_CALLER_CAP_USD`) - Netanel asked specifically about the
anon/signed-in split, not the individual-identity ceiling, and conflating the two
wasn't asked for. Did not pick a new default share value beyond confirming 0.55
is already "anonymous gets the larger half" - he said he'll tune it himself
against real launch traffic, and guessing a number he explicitly wants to
discover would be answering a question he didn't ask. Branch
`feat/anon-share-tunable`, cut from `main`, committed but **not pushed** - a
cost-control change affecting live spend gets a look before it ships.

### 2026-08-12 (aaa) - Four branches into main, merge-only, and the two conflicts that were exactly where predicted

Netanel asked for a pure merge - four branches into `main`, one at a time,
build+tests verified between each, nothing else touched. He named the risk in
advance: branches 2 (`feat/agent-web-lookup`) and 3 (ambiguity + trip-creation
+ `/ask`) both edit the agent's system prompt and `chat/route.ts`, and a
careless resolution could quietly drop one of four required behaviors -
ambiguous-city question, no trip without a clear ask, web search gated to
eligible questions, kashrut claims stripped for uncatalogued places.

**Before touching anything: confirmed nothing was in flight.** Two worktrees
(`agent-web-lookup`, `predeparture-check`) existed under `.claude/worktrees/`
- both fully committed, zero uncommitted changes, safe to merge from. One
stash (`stash@{0}`, mine, from an earlier session) is stale debris superseded
by real commits on those two worktrees - left untouched, flagged below rather
than dropped. `main` matched `origin/main` exactly. Working directory clean.

**"The trip-creation and /ask branch" turned out to be two git branches, not
one** - `feat/ask-agent-no-auto-trip` (clear-yes trip creation, the offer/
accept chip flow, `/ask`) and `fix/ambiguous-city-and-corrections` (the names
gate, correction-not-duplicate). Confirmed rather than guessed: the four
required post-merge behaviors map exactly one-to-one onto these two branches
plus branch 2, so "step 3" had to mean both, merged in sequence with
verification after each - five merges total for four named branches.

**Merge 1 (anon-share-tunable) and merge 4 (predeparture-check): clean, no
conflicts**, including a merge-4 oddity worth naming - `agentPrefix.ts`,
`agent.ts` and `useTripChat.ts` showed real diffs in `main`-vs-branch stat but
produced an EMPTY diff after the merge, because by then `main` already
carried everything that branch had touched in those files. Confirmed via
direct diff against the pre-merge commit rather than trusted on faith.

**Merge 2 (agent-web-lookup): clean auto-merge, but it explained a standing
mystery.** `CLAUDE.md` auto-merged with zero conflict markers even though
both this session's own prior branch and `agent-web-lookup` append to a
"## Session log" - because the file has **two separate append points**: a
literal end-of-file tail (where most sessions, including mine, append) and a
heading partway through the file (~line 3126) where at least one earlier
session prepended instead. Not a merge bug - a pre-existing inconsistency in
how this file has been maintained, surfaced by this merge rather than caused
by it. Worth a human decision on which convention wins; not touched here per
"nothing else."

**Merge 3a (ambiguous-city-and-corrections): the predicted conflict, exactly
where predicted, exactly as narrow as it should be.** Two hunks, both in
`runClaudeTurn` - the function's parameter list and its one call site - where
branch 2 had added `allowLookup`/`lookupNote` and branch 3a had independently
added `serverVerdicts` at the same position. Pure "keep both": neither
addition depended on or excluded the other, both belong, resolved by
concatenating the two parameter blocks and the two argument lists in the same
relative order each branch already used. Traced the full data flow after
resolving - both features' variable definitions, both features' consumption
sites in the system-prompt assembly, and the tool-execution loop's "names
gate" (branch 3a) sitting cleanly alongside the web-search tool gating
(branch 2) with zero overlap - to confirm the merge was semantically correct,
not just textually conflict-free. `tsc` clean before the merge commit even
landed.

**Merge 3b (ask-agent-no-auto-trip): zero conflicts, and that absence was
itself worth verifying, not just accepting.** Read the actual diff introduced
by this merge (not the branch-vs-main diff, which is 3x larger for
unrelated reasons) for `agentPrefix.ts` and `chat/route.ts` specifically:
confirmed the full "CREATING THE FIRST TRIP NEEDS A CLEAR YES" rule landed
intact and correctly renumbered against the surrounding rules it was inserted
into, and confirmed `buildAskIntent`/`acceptsOffer` compose correctly with
the pre-existing `editIntent` (kept, deliberately, for token-budget sizing
only - not for the build-trigger decision, which is the whole point of the
narrower flag).

**One pre-existing test flake surfaced, unrelated to any of the four
branches**: `limits.test.ts`'s "the window resets when its time passes" uses
a live 1ms rate-limit window with a busy-wait loop and failed once across
~6 total suite runs during this session, passing cleanly every other time.
Not touched (none of the four branches touch `limits.test.ts`) - flagged for
Netanel rather than fixed, per instruction.

**One pre-existing lint error found in code that shipped wholesale with a
merged branch**: `placeResolve.test.ts:60` (`fix/ambiguous-city-and-corrections`)
declares `let noisy: string[] = []` and only ever pushes to it - `prefer-const`.
Confirmed present on the source branch itself, not introduced by conflict
resolution. Not fixed, per instruction - flagged.

**One noisy false positive from the new ambiguous-name matcher, seen live and
worth watching**: asking the agent "ספר לי בדיחה קצרה" (tell me a joke) logged
`verdicts names=ספר:one` - the imperative "ספר" (tell) matched some catalog
token closely enough to produce a disambiguation verdict on an entirely
ordinary Hebrew sentence with no place-name intent at all. Harmless here
because the verdict only ever *blocks* a tool call that picks a mismatched
city, and no tool was called - but it is unwanted noise riding into the
model's prompt on unrelated turns. Not touched (would be exactly the kind of
"improvement along the way" this session was told not to make) - flagged for
whoever owns `placeResolve.ts` next.

**Full-suite verification: `tsc` clean, `npm run build` clean (293 pages),
553 unit tests passing after all five merges** (up from 460 before this
session's own first merge - the added tests belong to the merged branches,
not to this session). `npx eslint` on the full changed-file set (all five
branches' files against the pre-merge base) found exactly the one
`placeResolve.test.ts` issue above and nothing else - the repo-wide
`npm run lint` is currently unusable from this checkout because it also
walks `.claude/worktrees/*/.next` build output belonging to the two
concurrent sessions; scoped the check to touched files instead of chasing
that.

**Live browser verification, real `ANTHROPIC_API_KEY` and Supabase
credentials from `.env.local`, production build, desktop (1400px) and phone
(390px) - not just the test suite, per explicit instruction, because these
are prompt-level behaviors a merge can break without failing a single test.**
All four required behaviors reproduced live post-merge:

- **Ambiguous city**: "תבנה לי טיול 4 ימים בויאנה" -> the agent asked
  "התכוונת לוינה (אוסטריה) או לוילנה (ליטא)?" and built nothing until
  answered.
- **No trip without a clear ask**: "5 ימים באיטליה, מה כדאי לראות?" got a
  short recommendation and zero trip; following up with "מעולה, זה מספיק לי
  כרגע" got a polite close and still zero trip, across two full turns that
  each named both a destination and a day count. A control case
  ("תבנה לי טיול 4 ימים לוינה") built a real 4-day, 14-stop trip immediately,
  confirming the restriction is specific to unclear asks, not building in
  general.
- **Web search gating**: a built Berlin trip, asked "מה מחיר הכניסה
  לרייכסטאג?" (eligible - admission price), got a specific, confident answer
  (free entry, advance registration required, booking opens ~3 months out) -
  reads like a genuinely checked fact, not a guess. The same conversation
  asked "ספר לי בדיחה קצרה על טיסות" (ineligible) got "אני מומחה לתכנון
  טיולים, לא לבדיחות" and a redirect to real TLV-Berlin flight data already in
  the catalog - no search artifact, no confusion between the two turns.
- **Kashrut for an uncatalogued place**: "יש משהו כשר בקייב?" got an honest
  "קייב לא נמצאת בקטלוג היעדים שלי" - the model declined before ever reaching
  for a kashrut claim, which is the best possible outcome (the `priceGuard`
  strip is the safety net for when this doesn't happen, not the first line of
  defense).

One test-harness lesson worth keeping: an early multi-turn run produced a
garbled-looking transcript (a "tell me a joke" turn appearing to answer about
Colosseum opening hours) that read like a real bug. Rerunning the identical
scenario with longer waits between sequential messages reproduced cleanly and
correctly both ways - it was this session's own script sending the second
message before the client had settled the first, not a product defect.
Confirmed by re-testing in isolation before concluding either way, which is
the same discipline this file has recorded before: a surprising result is
grounds to suspect the harness first, not the product - but only after
actually checking, not by assuming it away.

**Also verified, with real limits stated plainly**: `/ask` answers general
questions with no trip and no login; the mobile chat drawer (`TripWorkspace`'s
fixed bottom bar) opens and renders the same conversation correctly at 390px
with no overflow. **Not independently live-verified**: the admin spend card
and its test-alert button - this environment's `.env.local` has Supabase URL
and anon key but no `SUPABASE_SERVICE_ROLE_KEY`, so `/admin` correctly serves
the anonymous-visitor 404 (this session was never logged in - no email access
for the OTP flow) rather than the authenticated "not configured" screen;
confirmed this is the documented, correct behavior for that exact
configuration by reading `/api/admin/me`'s own comment, not a gap the merge
created. The 27 tests covering that card's logic (written in the branch this
session merged first) already cover the delivery-confirmation logic directly,
including mocked webhook success/failure/network-error paths. Also **not
independently verified**: a live Viator link's parameters - no Viator API
credentials in this environment - but confirmed none of the four merged
branches touched `viator.ts`, `viatorLocale.ts`, `ActivitiesPanel.tsx` or
`/api/activities` at all, so there was no merge risk to it in the first
place; its own existing test suite ran clean as part of the full 553.

**What this session did not do, on instruction**: no refactor, no fix, no
"while I'm here" cleanup - not the flaky test, not the lint error, not the
noisy name-matcher false positive, not the dual-append-point CLAUDE.md
inconsistency, not the stale stash. All five are named above instead. All
four branches were left as-is on `main` in a single local checkout,
**not pushed** to `origin` - a batch this size, touching the agent's core
prompt logic and a live payment integration, gets a look before it ships.

### 2026-08-12 (bbb) - A real 404 page: the site had none

The site had no `app/not-found.tsx` at all - every broken link fell through
to Next's stock, unbranded, English "This page could not be found." Added
one: a server component (no client JS needed, same reasoning as
`SiteFooter` - nothing here depends on the browser), reusing the exact hero
visual language from `HomeHero` (the warm radial wash, `.display`/`.rise-in`,
the paper-plane `Logo` tilted off its course) so it reads as the same site
mid-error, not a generic fallback.

The copy names real numbers rather than a generic apology: `catalogCounts`
(the same source `SiteFooter` already uses for "1,814 מקומות · 166 יעדים ·
83 מדינות") drives "בדקנו מול כל 166 היעדים ב-83 המדינות שיש לנו" - so it
can never drift out of sync with the catalog the way a hardcoded number
would. `robots: { index: false, follow: true }` so broken URLs don't
accumulate in search results while links back to the real site still get
followed.

Verified this is a genuine HTTP 404 (not just a page that looks like one) -
`curl` against an unknown path on a production build returns status 404 -
and checked in a real browser at 1400px and 390px: zero horizontal overflow,
`dir="rtl"` correct, buttons wrap cleanly to full-width stacking at phone
width. `tsc`, `eslint` on the new file, and the full 553-test suite all
clean; no new tests added - this is static presentational content with no
logic to test, the same judgment already applied to `SiteFooter`.

Pushed straight to `main` on explicit instruction - a missing 404 page is
pure upside with no behavioral risk to anything else on the site.

### 2026-08-13 - Performance pass, then "make sure a user can't get another user's info"

Two asks in one session, both audits first and code second.

**Performance: most of the 5 standard items were already done, and saying so
mattered more than pretending to redo them.** AI streaming is already SSE end
to end (`/api/chat`); `generate-trip` is correctly non-streaming (it returns
one atomic structured trip, not prose). Lazy loading already existed on the
photo-heavy surfaces (`CardPhoto`, `Flag`, `PlaceThumb`, `ActivitiesPanel`).
Every list-returning API route already caps rows and reports truncation
honestly. Image format conversion (WebP/AVIF) is **not applicable and not
attempted**: every catalog photo is hotlinked from Wikimedia/Unsplash, there
is no upload pipeline we own, and this file's own history records 150+ dead
links from a past session that rewrote photo URLs without live HTTP
verification - rewriting them again for format conversion would be the same
mistake with a different excuse.

What was real and got fixed: `supabase-admin-dash.sql` tried to index
`admin_audit (at desc)` - that column doesn't exist (it's `created_at`), so
that line has been silently failing every time the file ran. Removed it; the
correct index already exists in `supabase-admin.sql`. New
`supabase-perf-indexes.sql` adds three indexes for queries that already run
in the code with no covering index: `ai_spend(route, at desc)` (the warm-path
check, on a table that grows one row per AI call forever), `purchases
(created_at desc)` (the unfiltered admin "recent purchases" listing), and a
`pg_trgm` GIN index on `profiles.display_name` (the community search does a
leading-wildcard `ILIKE`, which no plain btree can ever use). **Netanel needs
to run this file.** `/api/admin/user` had one real unbounded query (all of a
user's trip ids, no limit) - capped it and added a `tripsCapped` flag,
mirroring the `{total, capped}` pattern `countAuthUsers` already uses.
Six `<img>` tags were missing `loading="lazy" decoding="async"` - added,
matching the pattern already established elsewhere; left the chat's
pending-attachment preview eager on purpose, same reasoning `CardPhoto`
already documents for its hero image.

**Then: "make sure a user can not get the info of any other user."** This
was a verification request, and the honest way to answer it is to actually
trace every path, not to assert confidence. Read every RLS policy in every
`supabase-*.sql` file, and every API route that accepts an identifier, and
checked: does identity come from a verified auth token, or from something
the client sent? `user_trips` and `profiles` policies are both
`auth.uid() = user_id` - the standard, correct shape. `admin_audit`,
`purchases`, `usage_daily`, `ai_spend*`, `shared_trips`, `app_flags` are all
`revoke all from anon, authenticated` - service-role-only, no policy at all,
which per `supabase-rls-fix.sql`'s own hard-won lesson is "nobody" and not
"everybody". The one deliberately-public surface, `public_profiles`, exposes
only `user_id/display_name/avatar/visited` for rows the owner explicitly
marked public, granted to `authenticated` only (not `anon`), with email
search going through a `SECURITY DEFINER` function that requires an *exact*
match and never returns the email itself.

Every route that scopes to "my data" - `checks/create-order`,
`checks/capture` (explicit `purchase.user_id !== caller.userId` check),
`checks/status`, `billing/checkout`, `promo/redeem`, `share` - derives the
acting user from `resolveCaller`/`actorFrom`, which verify the bearer token
against GoTrue and read the uuid back from Supabase; none of them trust a
`userId` field from the request body. The only two places a `user`/`userId`
query param is read (`admin/trips`, `admin/purchases`) are both
`requireRole(req, 'admin')`-gated and logged to `admin_audit` before the
data is returned - an admin looking up a specific user by design, not a
regular user reaching another user's data. `emailByUserId`/`userByEmail` are
only ever called from admin routes or from `actorFrom` resolving the
caller's *own* email. Newsletter signup returns the same response for "just
signed up" and "already signed up," so it can't be used as an oracle for
whether an email exists.

**Found no vulnerability - every path checked was already correctly scoped.**
What I did add: `src/lib/server/userTrips.test.ts`, a permanent regression
test on `findOwnTrip` - the primitive every money-touching route relies on
to decide "is this really this user's trip." It asserts the actual query
sent to Supabase filters on **both** `user_id` and trip id (not just the
trip id, since `adminSelect` uses the service role and RLS does not apply -
the isolation has to come from the filter the code sends, not from the
database), that a row belonging to someone else comes back as `null`, and
that a malformed/tombstoned row and a failed request both fail closed rather
than open. This kind of check existed before only as one-off browser
harnesses run during past sessions and never committed as a test file - this
makes it something a future edit can't silently break.

**Verified:** `tsc --noEmit` clean, `npm run build` clean, 557/557 tests
(4 new), lint clean on every touched file.

### 2026-08-13 - Fixing premium: real quotas, a real cap, a real pool, and a real feature

Netanel did the arithmetic himself and it was damning: ₪19.90/month is ~$4 net
after VAT and payment fees, a measured turn costs $0.063 (cached) to $0.45
(cold), and the card was promising 400 chats and 100 builds **a day**. At
zero margin $4 buys ~60 turns or ~7 trips a month; a subscriber using a
fraction of the promised quota already costs more than they pay. Five things
to fix, all implemented, all pushed.

**1. Monthly quotas, sized to the money, not to ×30 of the old daily number.**
`periodMsFor(tier)` (`plans.ts`) returns a day for anon/free and 30 days for
premium; every `checkLimit` call site that reads a `PlanLimits` field
(`chat/route.ts`, `generate-trip/route.ts`, `share/route.ts`,
`import-map/route.ts`) now asks for the right window instead of a hardcoded
`24*60*60*1000`. The new premium numbers are monthly and generous *relative to
real usage*, not relative to the old daily ceiling: 150 chats, 20 quick
builds, 20 images, 30 map imports, 60 shares, 60 live lookups - each sized so
"plan two real trips with plenty of editing room" fits comfortably inside the
$2 cap below, while the old "12,000 chats/month" ceiling is gone. Full
arithmetic lives next to `PLAN_LIMITS.premium` in `plans.ts`. One quota
(`activities/route.ts`'s Viator browsing cap) had been *derived* from
`exploresPerDay * 3` as a daily figure - once `exploresPerDay` meant "per
month" for premium that derivation would have silently produced ~450/day. Cut
loose from that field entirely; it's zero-cost to us either way, so it's now
a flat generous number per tier instead of inherited math that stopped making
sense.

**2. A real per-subscriber money cap: $2.00/month, in `SUBSCRIBER_MONTHLY_CAP_USD`.**
50% of the $4 net - a subscriber who fully maxes it out still leaves us 50%
margin on themselves, and the constant lives in `plans.ts` (the shared
file), not `budget.ts` (server-only), because `PLAN_FEATURE_ROWS` displays
it on `/premium`. It buys, concretely, about two full trip builds
(2×$0.53) plus ~15 cached edit/question turns (15×$0.063) - "generous for
one or two real trips," matching what he asked for. Enforced from a **new,
separate monthly rollup table**, `subscriber_spend_monthly` (new
`supabase-premium-budget.sql`, **Netanel needs to run this**), read via a
cheap PK lookup (`premiumBudgetFor`) rather than summing raw spend rows
before every request - same reasoning that produced `ai_spend_daily` in an
earlier session, applied to the new table before it could repeat the mistake.

**3. The protected pool - bidirectional, and it's structural, not a check.**
Premium calls **never touch `budgetFor()`/the daily anon-free pool at all**:
`chat/route.ts` and `generate-trip/route.ts` branch on `caller.plan ===
'premium'` and call `premiumBudgetFor()` instead, full stop - there's no
code path where a premium request even reads the shared daily budget. And
`recordSpend()` now branches on a new `premium` flag: for a premium caller it
updates *only* the new monthly table (local cache + `bump_subscriber_spend`
RPC) and explicitly skips `bump_ai_spend` (which is what feeds
`ai_spend_daily.usd`/`anon_usd`, the numbers the free/anon pool math reads).
The raw per-call `ai_spend` row is still written for everyone, unconditionally
- it's bookkeeping, nothing sums it before a request, so it costs nothing and
keeps admin reporting complete. Two independent tests in `budget.test.ts`
assert the actual property, not the intent: heavy premium spend leaves a
free-tier caller's `poolSpent` at exactly 0, and heavy anon/free spend leaves
a premium subscriber's monthly `spent` at exactly 0 - each direction proven,
not just each mechanism proven to exist.

**4. Payment copy: audited every mention, and one page was flatly wrong.**
`/premium`'s trust line said "מאובטח דרך Stripe" - false today: Stripe billing
has never processed a single transaction (no `STRIPE_SECRET_KEY` anywhere
this session could see), and PayPal is the site's only live processor
(already running real money through the pre-departure check). Changed to
PayPal, with a code comment flagging the mismatch explicitly: the checkout
button still calls the Stripe-coded `/api/billing/checkout`, which is
unconfigured and returns "coming soon" regardless of what the trust line
says. **Not fixed here, deliberately**: actually wiring premium subscription
billing through PayPal is a real, untested, financially-sensitive new
integration (PayPal Subscriptions API, new webhook event types) that wasn't
itemized as an engineering task and couldn't be verified from this sandbox -
flagged for a decision rather than guessed at. The bigger find was
`refunds/page.tsx`, which stated outright "we don't sell anything, nothing
can be purchased" - directly false, since the pre-departure check has been a
real PayPal purchase for weeks. Rewritten to describe what's actually
purchasable today (the check) versus what's built but inactive (the
subscription), with the subscription section's own honest "not active" framing
left untouched since it's still true. `privacy/page.tsx`'s processor
disclosure was missing PayPal entirely, despite it being the one processor
that's actually run a transaction - added, and the Stripe line re-labeled as
conditional on a subscription that isn't live. `/premium` also got
`robots: { index: false, follow: true }` - a one-line change, and per his
"nobody knows the site exists yet" - reasonable to keep it out of search
until there's something to actually buy.

**5. The feature: pre-departure checks, included and unlimited for premium.**
`predeparture.ts` has a comment from whoever built it saying it must never be
tied to `Plan`/`Tier` - a real, deliberate decision at the time, for a
standalone one-time product. Reconsidered here because the request explicitly
invited it: the check is a deterministic catalog validation with **zero
marginal AI cost** (no model call at all), making it free to give away and the
first thing premium offers that isn't just a bigger number on the same
product. `checks/create-order/route.ts` now branches before it ever touches
PayPal: a premium caller (from `resolveCaller`'s server-verified token, never
client-supplied) gets `buildPreDepartureReport()` run immediately and a
`purchases` row written with a new `source: 'premium_included'`
(`amount: 0`, like `admin_grant` but counted separately in `computeStats` so
the admin dashboard can tell automatic subscriber perks from human support
grants - `supabase-premium-budget.sql` widens the `source` check constraint,
discovering its real auto-generated name via `pg_constraint` rather than
guessing it). `PreDepartureCheck.tsx` shows "כלול בפרימיום" instead of a price
and skips the PayPal round-trip entirely - the report is ready before the
button's spinner would have stopped. **The one real tension, stated plainly**:
premium is ₪19.90/month and a single check alone sells for ₪29.90 - someone
could subscribe for a month, grab checks on every trip they own, and cancel,
for less than one check would have cost standalone. Recorded as a known,
accepted trade rather than something quietly engineered around: it's the same
shape as any no-lock-in monthly plan giving away a bundled perk, the check
costs nothing to produce, and the alternative (rate-limiting an included
feature to guard against a hypothetical opportunist) adds real complexity
against a low-value abuse case.

**Verified, per his explicit ask, before pushing.** Full rebuild + `tsc` +
566 tests (13 new, covering both isolation directions, the cap boundary, the
new source bucketing) all clean. Then the part that actually mattered: he was
right to worry that touching the gate ahead of the model call could silently
change agent behavior, so before pushing, the two live scenarios he named were
tested against a **production build with a real key** - direct `/api/chat`
calls, not just reading the diff. Kashrut for an uncatalogued city (Kyiv)
still declines rather than fabricating. The ambiguous-city/no-auto-build flow
turned up something that looked exactly like a regression at first: asking
for a Vienna trip, even across two turns with the city stated outright,
consistently got "where do you want to travel?" instead of a build. Rather
than assume either way, it was A/B'd - `git stash`, clean rebuild, same exact
requests replayed against unmodified `main` before any of today's edits. Same
result, byte for byte, twice. **Pre-existing on `main`, not caused by this
session** - confirmed by the harness, not asserted from a diff read. Flagged
here rather than fixed, since it's a real product issue but out of scope for
a quota/billing task, and now has a reproduction recipe instead of a vague
impression.

**Deployment status:** everything above pushed to `main`. The two items that
need Netanel directly: run `supabase-premium-budget.sql` in the Supabase SQL
editor (premium enforcement and the new source bucketing don't take effect
without it), and decide whether premium subscription checkout should actually
move to PayPal or wait for Stripe - the copy now says PayPal, the code still
calls Stripe, and that gap is deliberate rather than silent.

### 2026-08-13 (b) - The dollar cap goes invisible, and the visible numbers must fit under it

Netanel, on the previous entry: the $2 cap is right but must never be shown -
"'$2 of planning' means nothing to anyone." Users see only counts (trips,
messages); the dollar figure stays as the internal backstop; and the binding
order **inverts**: the visible allowance must run out before the money cap in
every realistic path, because "if someone is cut off by the dollar cap while
the page told them they had trips remaining, that's a broken promise and a
refund."

**The one dollar leak was mine, from the previous entry.** `PLAN_FEATURE_ROWS`
showed "עד $2.00 בחודש" on the pricing card - removed. Grep of every
user-facing surface found no other dollar display; a test now locks that
(`plans.test.ts` scans every feature row and both block messages for `$`).

**The visible numbers, and the arithmetic that produced them.** The previous
entry's premium quotas (150 chats/month) were sized as a soft ceiling with the
dollar cap expected to bind first - exactly the order Netanel now forbids. At
worst-realistic prices, 150 chats alone is ~$9.5, nearly 5x the cap. The new
numbers are derived backwards from $2.00 with margin:

| visible allowance (monthly)     | worst price | cost    |
|---------------------------------|-------------|---------|
| 2 full agent trip builds        | $0.53       | $1.06   |
| 10 agent chats (builds inside)  | $0.063 × 8  | $0.504  |
| 5 wizard quick builds (Haiku)   | $0.02       | $0.10   |
| 5 live lookups                  | $0.01       | $0.05   |
| 5 image attachments (in chats)  | +$0.01      | $0.05   |
| **total, everything maxed**     |             | **$1.76** |

88% of the cap; the test asserts ≤90% and fails any future quota bump that
breaks the arithmetic. In *typical* pricing (warm cache, light routing) the
same full consumption is ~$0.6-0.9. The only realistic path to the cap is
deliberate tool-loop abuse, per-turn bounded by MAX_TURN_USD ($1.50) - which
is precisely the case the cap exists for. Zero-AI-cost quotas (imports 30,
shares 60, explores/geocodes 150/200) stay generous; they're not in the
arithmetic because they cost nothing.

**Netanel's illustrative "5 טיולים מלאים בחודש" does not fit**: 5 × $0.53 =
$2.65 on builds alone, over the cap before a single message. Displaying 5
trips honestly needs a cap around $3.50-4.00. He said keep the cap exactly
as it is, so the numbers are what $2.00 affords - flagged in the summary
rather than quietly fudged.

**A new gate: full builds are counted separately from chats.** A build turn
costs ~8x an edit turn, so "10 chats" without a build limit would allow 10
builds = $5.30. `create_trip_full` for premium callers is capped at
`PREMIUM_TRIP_BUILDS_PER_MONTH = 2` inside the tool-dispatch in
`chat/route.ts`. The mechanics matter: the gate checks with a new
**`peekUsed`** (read-only, `limits.ts`) and consumes via `checkLimit` only
after the build *succeeded* - otherwise a build attempt that failed
validation (model retries in the same turn) would burn one of the two
monthly builds on nothing. The blocked-tool message tells the model to
explain the monthly build allowance conversationally, with no money numbers.

**Honest-copy sweep, because the new numbers falsified old promises.** The
premium page h1 said "תכננו בלי מכסות" (premium now has *tighter* counts
than free, monthly instead of daily); the free-tier quota message and image
quota message both promised premium has "a much bigger quota" - no longer
true, and a user who upgraded on that promise would have a refund case. All
rewritten around what premium actually is: a guaranteed personal lane
(never blocked by the shared daily pool), a monthly package sized for one-two
real trips, and pre-departure checks included. The `/account` blurb still
said "מכסות מוגדלות פי 10" - same fix. The comparison card gained a
"זמינות הסוכן" row making the guarantee explicit, since it - not quota
size - is now the honest headline.

**Admin sees the real money, everywhere it matters.** `/api/admin/spend`
gains a `premium` block from new `premiumSpendOverview()` (`budget.ts`):
month total, subscriber count, per-subscriber list with emails (fetched only
for displayed rows, same rule as `/api/admin/trips`), and `stored: false`
distinct from zero when `supabase-premium-budget.sql` hasn't run.
`/api/admin/user` returns `premiumUsdMonth`/`premiumCapUsd` for premium
accounts; both render in AdminClient.

**A self-inflicted bug caught by counting, worth its place in this file's
pattern-list.** The new guard tests were written into `src/lib/plans.test.ts`
with Write - **which silently clobbered an existing file of the same name**
holding 10 tests (effectivePlan expiry, role ranking, isRole). The tell was
the suite total: 566 before, 562 after, when 6 tests had been *added*. The
diff of test names between stash and working tree named the missing ten;
the file was recovered from HEAD and merged. The lesson is the standing one:
a surprising number is a harness/process suspect first - and Write to a path
you haven't Read is how files die quietly.

**Verified:** 572/572 tests (16 vs HEAD: 6 new, 10 recovered), tsc clean,
build clean, lint at the pre-existing baseline (the two remaining hits
reproduce on unmodified HEAD). Pushed to main.

### 2026-08-13 (c) - The pricing page inverts: the one-off check leads, the subscription steps back

Netanel closed the "premium has no exclusive feature" question with a decision,
not a feature: **don't build capability to justify a tier nobody has bought
yet.** Instead, run the numbers as a buyer would - ₪19.90/month is ₪238.80 a
year; the one-off check covers two trips for ₪59.80; for the typical Israeli
travelling once or twice a year the subscription is four times the price of
buying what they need. Anyone doing that arithmetic picks the one-off, and
they'd be right. So the page now says it before the buyer has to work it out.

**The new `/premium` structure** (route unchanged, framing inverted):

1. Hero: "התכנון חינם. לפני היציאה - בדיקה אחת." - planning is free, the
   product is the check.
2. **The check as the star card** (it took the dark hero treatment the
   subscription used to have, badge "🛫 לרוב המטיילים"): what it does, ₪29.90
   per trip, bought from the trip screen within 21 days of departure, CTA to
   `/chat`. A quiet line notes it's included for subscribers.
3. **The arithmetic, in the open**: "החשבון, בגלוי:" - two checks ₪59.80 vs a
   year of subscription ₪238.80, "לרוב המטיילים הבדיקה החד-פעמית משתלמת
   בהרבה - וזו גם ההמלצה שלנו", and the break-even stated plainly: the
   subscription starts justifying itself around 8 trips a year. All three
   numbers are **computed from the real constants** (PRICE_ILS,
   PREMIUM_PRICE_ILS), not typed - a price change updates the honest math
   automatically.
4. **The subscription, demoted and aimed**: "מתכננים כל הזמן? בשביל זה
   המנוי" - families with several trips a year, guides and group leaders,
   organizers, named in plain words. The free-vs-premium comparison cards
   stay but both are now light shell cards; the subscription no longer
   wears the star treatment.

**The guaranteed lane stepped out of the headline** per instruction - its
value is invisible until traffic actually exhausts the daily pool, and
pre-launch that's nobody. It moved from the page h1 and from row #2 of
`PLAN_FEATURE_ROWS` to after the quota rows (still in the table - it's true,
it's just not the pitch), and the free-tier quota message's upsell line was
reframed from mechanism ("מסלול מובטח") to audience ("מתכננים כל הזמן?").

**Nothing was gated.** No code path changed - this is copy and structure
only (`PremiumClient.tsx`, `premium/page.tsx` metadata, `PLAN_FEATURE_ROWS`
order, one string in `chat/route.ts`). Live lookups and everything else free
stay free, per the explicit line in the instruction.

**Verified:** 572/572 tests, tsc/build/lint clean, and 13 content assertions
against the served production HTML: the h1, the star card with per-trip
price, both arithmetic figures and the break-even, the check card rendering
above the subscription section, the guaranteed lane absent from the hero,
PayPal (not Stripe) in the trust line, zero dollar signs. One SSR gotcha
worth keeping: React splits JSX text interpolations with `<!-- -->` comment
nodes in served HTML, so a naive substring assertion on "סביב 8 טיולים"
fails against the raw page - strip the comment markers before asserting.

### 2026-08-14 - The five clauses lawyers ask for, and a consent that never overwrites its own timestamp

The site already had `/terms` and `/privacy` - hand-written, RTL, with the
established `Gap` discipline (yellow-boxed, unmissable placeholders for
anything requiring a lawyer or a business decision this session cannot make).
The ask was five specific protective clauses plus a real consent record tied
to signup. Nothing here was built from a blank slate; it was built to fit
what was already there.

**Two decisions were not mine to make, so they were asked rather than
guessed** (Section 12/14's placeholder already refused to invent a
jurisdiction, and hard rule 2 forbids fabricating facts): governing law and
dispute-resolution shape, and the liability-cap wording. Netanel chose Israel
with binding individual arbitration + an explicit class-action waiver, and a
cap at the greater of ₪100 or amount paid in the trailing 12 months (most
users pay ₪0, so the nominal floor is what usually applies).

**`/terms` gained three sections and one was rewritten**, renumbered 8-14:
Section 8 (limitation of liability) now leads with an explicit AS IS / AS
AVAILABLE disclaimer, excludes indirect/incidental/special/consequential
damages by name (including data loss and service outages), and states the
cap. Section 9 (new) is indemnification - third-party claims arising from a
user's own content, misuse or breach. Section 10 (new, split out of the old
combined section) is suspension/termination: sole discretion, at any time,
without prior notice - the graceful "we'll try to give notice" language now
applies only to a full shutdown, not to closing an abusive account. Section
14 is the dispute-resolution clause finally written out: Israeli law,
binding individual arbitration (small-claims and injunctive-relief carve-
outs), Hebrew-language, Tel Aviv-Yafo default seat, and an explicit
class-action / consolidated-claim waiver. **What still can't be filled
honestly stays in `Gap`, not prose**: the legal entity name and notice
address (only Netanel has these), and a `verify` flag that Israeli consumer-
protection law places real, specific restrictions on arbitration clauses
against consumers and this wording needs a lawyer before it's load-bearing -
writing it as settled fact would be exactly the "sounds right" trap this
file's own `Gap` component exists to prevent.

**Consent is clickwrap, not a checkbox** - the OTP login has no signup form
to attach one to, and adding a mandatory tick would add friction to a flow
this codebase has tuned hard for zero friction. The line under the email
step now reads "בלחיצה על ׳המשך עם המייל׳ אתם מסכימים לתנאי השימוש ולמדיניות
הפרטיות שלנו", with real links to both, opened in a new tab so the modal's
in-progress state survives a click-through to read them.

**The timestamp is recorded once, not on every login.** New columns
`terms_accepted_at`/`terms_version` on `profiles` (`supabase-consent.sql`,
additive, follows the same degrade-gracefully `fetchProfile` ladder pattern
already used for `plan`/`role` - a fourth tier, so an account created before
this migration runs doesn't break). `verifyCode` in `AuthContext` checks the
freshly-fetched profile immediately after a successful OTP verify; if
`termsAcceptedAt` is still null it writes today's date and the current
`TERMS_VERSION` via a **partial** upsert (`recordTermsAcceptance` in
`profile.ts`) that touches only those two columns - a returning user's
display name, avatar or preferences are never touched by this call, and a
second login never overwrites the original acceptance date. `TERMS_VERSION`/
`TERMS_UPDATED_LABEL` live in one new file, `src/lib/legal.ts`, and `/terms`'
own `<Updated>` stamp now reads from that same constant instead of a
hand-typed string - the exact species of drift this file's session log has
flagged more than once (a date duplicated by hand in two places, one of them
quietly going stale).

**`/privacy` got one line, not a rewrite.** It already promises to describe
exactly what's collected under an account; a new field on `profiles` that
it didn't mention would have made an accurate document quietly wrong the
moment this shipped, so the "עם חשבון" list gained one bullet naming the new
timestamp, and the page's own `Updated` date moved to match.

**Verified:** `tsc --noEmit` clean, `npm run build` clean (all 293 routes,
`/terms`/`/privacy` still static), 580/580 tests (a pre-existing, unrelated
suite - no test file for `profile.ts`/`AuthContext.tsx` existed before this
session). `npx eslint` on every touched file: one real new issue (straight
quotes around AS IS/AS AVAILABLE, `react/no-unescaped-entities`) found and
fixed; the remaining 5 hits in `AccountButton.tsx`/`AuthContext.tsx` are
confirmed pre-existing by diffing against unmodified `HEAD` with the same
files - all `react-hooks/set-state-in-effect`, the same class of finding
this file's session log has repeatedly noted as baseline noise, not
introduced here. `policyPages.test.ts`'s hard rule - every `[למילוי]`/
`[לבירור]` must render through `<Gap>`, never as plain prose - holds by
construction: the placeholder labels are generated by the component, never
hand-typed.

**Not done, and it's a real gap rather than an oversight.** No SQL migration
in this repo has ever been run against production from inside a session -
that's consistently been Netanel's own action (see every `supabase-*.sql`
file above). `supabase-consent.sql` is the same: written, idempotent,
follows the established pattern exactly, and waits for him to run it in the
SQL Editor. Until then, consent is simply never recorded (the write fails
silently inside a `try/catch`, per the comment in `AuthContext.tsx` - a
missing migration must never block login). No commit was made either - the
system-level git protocol this session runs under requires an explicit ask
before committing, which supersedes this file's own "every session ends
with commit + push" convention; the diff is sitting in the working tree,
verified, waiting for Netanel to review and commit himself.

### 2026-08-16/17 - The "do everything" run: PayPal subscription live, zmanim everywhere, trip book, story, group trips - cut short by a PC shutdown

Written retroactively by the next session (hard rule 8 was owed): the
machine shut down mid-flight and the session left `HANDOFF-NEXT-SESSION.md`
instead of this entry. Everything below WAS committed and pushed to main
before the shutdown; the handoff's own warning is worth keeping verbatim -
**a /teleport attempt wiped uncommitted work once mid-session** and it had
to be recreated from conversation context and re-verified (tsc + 618 tests)
before the final push. Commit before any teleport.

**What shipped, seven commits:**

1. **Performance audit fixes** (`9ed35f1`) - an emails N+1, thin rows for
   the admin dashboard, caches, and a skeleton for the trip screen.
2. **PayPal premium subscription, live** (`6d61e8d`) - `paypalSubs.ts`,
   `/api/billing/checkout` now creates a real PayPal Subscription and
   returns the approval link; activation happens only in the verified
   webhook; `supabase-paypal-subs.sql` widens the `plan_source` CHECK to
   include 'paypal' (without it activation fails silently) and adds a
   support-only `paypal_subscription_id` column.
3. **Two trip-screen features** (`ca6bf47`): "today" mode (trip in
   progress → opens on the right day, once, with a "היום · יום N מתוך M"
   bar) and `ShabbatKosherPanel` + `lib/zmanim.ts` (NOAA astronomical
   candle-lighting/havdala times in the real local clock via IANA
   timezones, opt-in when the kosher preference is on). **Both shipped
   ungated** - the commit title says "לחבילת הפרימיום" but no premium
   check exists in either; that's framing, not enforcement, and the
   pricing page must not claim otherwise.
4. **Zmanim guaranteed catalog-wide** (`8cc3061`) - all 166 destinations
   resolve a timezone, locked by a test.
5. **ספר הטיול, free** (`2813a5a`) - print export upgraded: place
   descriptions per stop + Shabbat annex + kosher annex (opt-in), with the
   panel and print reading one shared source (`lib/trip/shabbatRows.ts`).
6. **סיפור הטיול, premium** (`a04ab05`) - the trip becomes a public story
   page: `supabase-stories.sql`, `lib/server/stories.ts`, `/api/story`,
   `/story/[slug]` (+`StoryView`), `TripStoryPanel` in TripWorkspace.
   Creation is premium (enforced server-side in `/api/story`); viewing is
   free and the slug-only `get_trip_story` RPC exposes published snapshots
   only. Photos go through a Supabase Storage bucket (`story-photos`) with
   strict server-side data-URL validation.
7. **טיול משותף, premium** (`f29126e`) - invite link `/join/<code>`,
   friends join free (login required - one vote per person), see a live
   server-built snapshot of the trip and vote 👍/👎 per stop; the organizer
   sees tallies in `TripGroupPanel`. `supabase-group-trips.sql`,
   `lib/server/groupTrips.ts` (+4 tests), `/api/group`, `JoinClient`.

**Pricing decisions (Netanel: "price to your liking"):** premium stays
₪19.90/month and story + group are its content; creation premium-only,
viewing/joining free - the viewers and joiners are the viral loop; the
pre-departure check unchanged (₪29.90 standalone, included in premium).

**Left owed to the next session:** full build + lint on the final commit
(the PC died after tsc + 618 tests but before them), the /premium
rebundle, this log entry, and live verification - none of the three
premium features had run against real Supabase, only mocks.

### 2026-08-17 - Closing the handoff: the deferred verification, and /premium finally sells what premium is

This session picked up `HANDOFF-NEXT-SESSION.md` and closed everything in
it that a session can close. The handoff file itself is deleted - its
content is absorbed here and in the entry above, and a stale handoff
claiming "premium rebundle NOT DONE" would mislead the next reader.

**1. The deferred verification passed.** `npm run build` on the untouched
main (exit 0), `npx eslint` on every file the handoff named
(groupTrips.ts/.test.ts, api/group/route.ts, join/[code]/*,
TripGroupPanel.tsx, supabaseAdmin.ts, stories.ts) - zero findings. The
previous session's final commit was sound; only the proof was missing.

**2. The /premium rebundle - the last planned step of the "do everything"
directive.** The page kept its inversion (the one-off check leads, per
entry 2026-08-13 (c)) and the subscription section now sells what the
subscription actually contains: a three-card strip (📖 סיפור הטיול,
🤝 טיול משותף, 🛫 הבדיקה כלולה - content, not quotas), the intro reworded
from "חבילת סוכן חודשית" to "יש בו דברים שקיימים רק למנויים", and the
open-arithmetic box's closing line now names the content features as the
other reason to subscribe. `PLAN_FEATURE_ROWS` gained two rows (story,
group) whose free column says honestly what free gets - viewing and
joining - because that IS the free half of the feature, not a lack.
Deliberately NOT claimed for premium: today-mode and the Shabbat panel,
which shipped ungated (see the entry above). Also fixed while there: the
`PREMIUM_PRICE_ILS` doc comment and the /premium `page.tsx` metadata
comment both still said the subscribe button returns "בקרוב" - stale
since `6d61e8d` made PayPal subscriptions live; both now describe
reality, and the metadata description mentions the new bundle.

**3. The Supabase state, measured rather than assumed.** With the service
role key, PostgREST answered 404 for all four new tables (`trip_stories`,
`trip_group_invites`, `trip_group_members`, `trip_group_votes`) and 400
for `profiles.paypal_subscription_id` - **none of the three SQL files has
been run.** DDL cannot go through PostgREST and SQL Editor runs have
always been Netanel's own action, so this stays with him (list below).
Consequence: live verification of story/group/PayPal-activation remains
blocked on that, not on code.

**4. Browser/RTL checks, owed since the features shipped.** Production
build, headless Edge over CDP, 390px (DPR 2, real mobile metrics) and
1280px: /premium renders the new trio + both new comparison rows with
zero horizontal overflow at both widths; /story/<bad-slug> shows the
orderly "הסיפור לא נמצא" page; /join/<code> logged-out shows the clean
invitation + login prompt; and a seeded two-day Vienna trip on
/chat?trip= renders both new panels ("טיול משותף", "סיפור הטיול", each
tagged פרימיום ★) with honest logged-out states and scrollW exactly 390.
One harness note worth keeping: a clean `/chat` deliberately resets
`currentId` (entry "הטיול הפתוח יושב בכתובת"), so a seeded trip does NOT
open by itself - navigate to `/chat?trip=<id>`; clicking the landing chip
via CDP `.click()` on a Next Link doesn't navigate in headless Edge.

**Verified:** tsc clean, 618/618 tests, `npm run build` clean twice (before
and after the rebundle), eslint clean on all touched files, plus the
browser checks above. The feature-row guard tests (no `$` anywhere,
premium quotas fit under the internal cap) pass with the new rows.

**Waiting on Netanel, in order:**
1. Run in the Supabase SQL Editor (all idempotent; `supabase-check.sql`
   verifies them): `supabase-paypal-subs.sql`, `supabase-stories.sql`,
   `supabase-group-trips.sql`. Until the first runs, PayPal premium
   activation fails silently on the old plan_source constraint; until the
   others, story/group return errors on creation.
2. Live end-to-end: create story + upload photo + publish + open
   /story/<slug>; create invite + join from a second account + vote;
   PayPal sandbox subscription (subscribe → webhook activates → cancel
   downgrades). His account is owner + permanent premium grant, so the
   subscribe button will say "already premium" - use another account.
3. After sandbox testing: remove `PAYPAL_ALLOW_SANDBOX_LIVE_DOMAIN=true`
   from Vercel + redeploy; create live PayPal keys (PAYPAL_MODE is still
   `sandbox`). The production webhook URL MUST be
   https://www.tiyulplus.com/... (with www) - non-www 308-redirects and
   PayPal drops the delivery.

### 2026-08-17 (b) - English-only developer notes: 2,368 comment lines, and a guard that was blind to a fifth of the repo

Netanel: no Hebrew in any note in any file - comments English-only, and Claude
always commits in English. Hard rule 9 (added earlier the same day) is the
policy; this entry is the sweep that made the codebase match it.

**Scale: 2,368 Hebrew comment lines across 146 files, now zero.** Not a
mechanical translation - these comments are the densest design documentation in
the project (the `chat/route.ts` header alone is 352 lines explaining model
routing, escalation and the two-wallet budget), so each was rewritten as English
prose that keeps the reasoning, the measured numbers and the named incidents.

**Method, because a 2,368-line hand-edit needs one.** A line-range patch
pipeline: a scanner reusing the guard's own detection prints the offending
runs, a JSON patch supplies replacement blocks by line range, and an applier
splices them bottom-up per file with an overlap check. The point is that I only
ever WRITE English - I never retype the Hebrew - so a transcription error is
impossible by construction. `tsc` after every batch, four checkpoint commits.

**What stays Hebrew, deliberately:** UI copy, catalog data, test names and test
fixture strings. The applier enforces exactly that distinction - its first
version rejected any Hebrew in a replacement, and it fired on
`dolomites: { name: 'הדולומיטים' }, // no figure - deliberately`, where the
Hebrew is *test data* and only the trailing comment is a note. The guard now
checks the comment portion only, using the same rule as the scan.

---

**Two real defects in the guard test itself, both found by disbelieving it.**

**1. `accept="image/*"` turned on block-comment mode and never turned it off.**
The tracker tested for `/*` anywhere on a line, so a JSX MIME attribute in
`AccountClient.tsx` made every subsequent line count as a comment - and seven
Hebrew *UI strings* below it were reported as Hebrew comments. I nearly
"translated" `aria-label="בחירת קובץ תמונה"`, which would have shipped an
English accessibility label into a Hebrew RTL product. The opener must start a
line; that is how block comments are actually written here, and it makes the
check both safe and exact. **This is the fixture-before-code lesson again: the
surprising reading was the tool, not the file.**

**2. The guard was blind to 21 files - and they were the ones full of Hebrew.**
`SCAN_DIRS = ['src','scripts','public','supabase']`, but there is no `supabase/`
directory: the 21 `supabase-*.sql` files live at the **repo root**, along with
`next.config.ts`. So 81 Hebrew comment lines sat permanently outside the guard
while it passed green. It now walks the whole repo with a denylist of build
output - an allowlist of source directories is precisely what could not see a
new location, and a denylist cannot make that mistake again.

**The guard was then verified to actually guard**, not merely to pass: injecting
one Hebrew comment into `next.config.ts` fails the test and names
`next.config.ts:19` - i.e. it now catches a regression at the repo root, exactly
where it was previously blind. Restored, re-verified green.

---

**A note on quoted Hebrew inside comments.** Several comments quoted Hebrew as
evidence - real model output ("I have arranged a weekend in Barcelona for you:"),
misspellings that resolved to the wrong city, the `hePrefix` doubling rule. A
quote reproduced verbatim would reintroduce Hebrew, so these are rendered as
English glosses, and `hebrew.ts`'s examples are transliterated
(`prefix B + "Vina" -> "BVVina"`) so the rule they document still reads. Nothing
was dropped to make the sweep easier.

**Verified:** 619/619 tests, `tsc` clean, `npm run build` clean (303 pages),
and lint measured A/B on the exact changed-file set - **8 errors before, 8
after**, all pre-existing (`react-hooks/set-state-in-effect`, plus the
`prefer-const` in `placeResolve.test.ts` this log already records). Zero Hebrew
comment lines repo-wide.

**One thing worth knowing for the next session:** writing these patch files
through a bash heredoc mangles backslashes (`'\'` arrived as `'\'`), which cost
three failed script writes. Use the Write tool for any file containing regex or
escape sequences; heredocs are fine only for plain prose.

### 2026-08-17 (c) - Photos and descriptions on the two read-only pages, and a map that was 0px tall on a phone

Netanel: add pictures and descriptions of places to the shared trip and to the
trip story. The two surfaces started from very different places, and the
interesting part is the story side.

**`/t/<code>` was the easy half.** It already rendered descriptions, and the page
already passes full `Destination` objects down from the server, so the photos
were sitting in props doing nothing. One `PlaceThumb` per stop, and the
description clamp went 2 lines to 3. `PlaceThumb` was reused rather than a
second `<img>` written, so the places with no photograph keep the category tile
and the broken-URL `onError` fallback for free.

**The story side needed a decision: the snapshot, or the catalog?** A story row
stores a frozen snapshot precisely so that editing or deleting the traveller's
TRIP cannot change or break a published story. The tempting move is to freeze the
photo and description into it too - and that would leave every already-published
story bare forever, until its owner happened to press "refresh".

**So they are resolved at render time from the catalog, by the `id` the snapshot
already stores** (it was there for the group-trip votes, and is public
information anyway). A photo and a description are not trip data - they are our
own curated content, static per deploy and identical for everyone. Existing
stories get their photos with nobody doing anything, and a photo URL we later
repair propagates instead of staying dead in dozens of frozen snapshots.

**The name is deliberately NOT re-resolved.** It stays exactly as the snapshot
recorded it, so a place renamed in the catalog cannot silently rewrite somebody's
published story. There is a test named after that, using a stop whose name
differs from the catalog's on purpose.

**The enrichment happens in `page.tsx`, on the server.** `StoryView` is a client
component; importing the catalog into it would ship ~2MB to every viewer of a
public story - the exact regression `label.ts` and `destinationCards.ts` were
already fixed for. Same shape as `/t/<code>` passing `cityData` as props.

A side effect worth having: the story's map pins now carry the real category and
photo, so they draw in category colour and show the place photo above the pin at
city zoom, like the planning screen. Previously every pin was a grey `attraction`.

---

**The bug this turned up, which was not what I was asked to do.** Reading the
390px screenshot, the story's map looked like a thin line. Measured rather than
assumed: **`.leaflet-container` was 288x0 - zero pixels tall on a phone.**

`MapInner` renders its container as `h-full w-full ${className}`, and the story
passed `className="h-72 sm:h-96"`. Two height utilities of equal specificity, so
the winner is whichever Tailwind emits last - `sm:h-96` happened to beat `h-full`
on desktop, and `h-72` happened to lose to it on mobile. The parent had no
height, so `h-full` resolved to zero. **The map on a public shareable page was
invisible on phones, which is how most people open a shared link.** The height
moved to the wrapper, exactly as `/t/<code>` already does it. Measured after:
288px with 12 tiles.

**And a harness trap that cost three wrong readings, already in this file once.**
After rebuilding, both pages reported no map at all - including the shared page I
had barely touched. The served HTML did not contain the new wrapper class: a
**stale `next start` still held the port**, so I was measuring the previous build.
`pkill -f "next start"` silently matched nothing on Windows; the process had to be
found by port (`netstat -ano`) and stopped by pid. The rule from entry (l) stands
and is worth repeating: kill the previous server before measuring a rebuild, and
when a number is surprising, suspect the fixture first.

**A third gap in the English-comments guard, found by reading a SQL file for an
unrelated reason.** The guard checks trailing `//` comments but SQL uses `--`, so
a Hebrew note written after code on a SQL line was invisible to it - four of them
were sitting in `supabase-accounts.sql` and `supabase-stories.sql` while the test
passed green. It now uses a SQL-aware trailing-comment reader (single-quoted
strings tracked, so a literal containing a double hyphen is not misread), and it
caught all four immediately.

**Verified:** 623 unit tests (4 new on `enrichSnapshot`), tsc, build and lint
clean. In a real browser at 1400 and 390, against a production build: **16/16 on
each surface** - six stop rows, four photos that actually decode plus two
category tiles for the places with none, a real thumbnail size, a description on
every row, zero horizontal overflow, RTL intact, no console errors. The story was
checked end to end through the real page, by publishing a temporary row to
`trip_stories` with the service role and deleting it afterwards (confirmed gone).
`supabase-stories.sql` has been run since the last session - the table exists now.

### 2026-08-17 (d) - The third surface, and a vote that waited for the network before moving

Netanel, with a screenshot: *"still, no description and images, and also - when
pressing a thumbs up/down it takes a few seconds to show, which feels laggy."*

**The screenshot was `/join/<code>`, not the two pages entry (c) changed.** There
are three read-only trip surfaces, not two - the shared link, the story, and the
group-trip page a friend opens from an invite. Entry (c) did the first two and I
reported it as done; the one he was actually looking at still rendered its stops
as a bare list of names. Worth naming plainly: "add it to the shared trip and the
story" had a third member I did not enumerate before declaring the work finished.

**The fix reuses the same server-side enrichment.** `groupTripSnapshot` already
returned the same snapshot shape the story uses, so it now returns
`enrichSnapshot(buildSnapshot(trip))` and the friend sees a photo, a description
and a category per stop. Same reasoning as the story: resolved on the server, so
the catalog never ships to the browser - here that matters more than anywhere
else, since the whole point of an invite is that lots of people open it.

---

**The lag was real and it was not the network.** `vote()` awaited the POST before
touching any state, so nothing on screen moved until the round trip finished -
and the POST does two sequential Supabase calls (write the vote, then re-tally).
On top of that a single `busyPlace` disabled **every** button on the page while
one request was in flight, so voting down a list felt like the page had frozen.

Now the count is painted from local arithmetic on the click and the server's
reply replaces it when it lands. **Measured in a real browser: 5ms at 1400 and
11ms at 390**, against "a few seconds" before. The guard became a per-place `Set`,
so voting on one stop no longer blocks the other five.

**The arithmetic is a tested module rather than three lines in the component**
(`lib/trip/voteTally.ts`), because an optimistic number that drifts from the
server is worse than the lag it replaced: the count is the entire content of that
page. Seven tests pin it to the same rules `castVote` applies - same side twice
removes, opposite side moves rather than adds two, other people's votes untouched,
never negative, and a full up-down-undo round trip landing exactly back where it
started. A failed request rolls that one place back, because keeping the optimistic
number would be the one case where the screen shows a vote that does not exist.

---

**Verified end to end on the real page, not by reasoning.** Voting needs a signed-in
user, so the harness created a throwaway confirmed user through the GoTrue admin
API, gave them a trip and an invite, took a session via the password grant, and
seeded it into `localStorage` with `Page.addScriptToEvaluateOnNewDocument` so the
app booted signed in. **18/18 at 1400 and 390**: six stop rows, four photos that
decode plus two category tiles, a description on every row, twelve vote buttons,
the click-to-paint latency above, zero horizontal overflow, RTL intact. Everything
created was deleted afterwards and the deletion was confirmed by re-querying.

**One harness bug worth recording, the same species as always.** The first run
failed one check: at 390 the vote registered as *not* mine. The cause was that the
desktop pass had left a vote in the database, so the phone pass's click removed one
instead of adding one. State leaking between viewports, not a product fault - the
harness now clears the votes table before each pass. A failing assertion that looks
like a product bug is worth one minute of suspicion first.

**Also confirmed while there, since he asked separately:** of the 18 `supabase-*.sql`
files, seventeen have been run. **`supabase-consent.sql` has not** - `profiles.
terms_accepted_at` and `terms_version` do not exist, so the clickwrap line under the
login field promises an agreement that is currently recorded nowhere. Nothing breaks
(the write is wrapped so a missing migration can never block a login), but it is the
one file still outstanding. Checking that needed a correction of my own first: my
initial probe called each RPC with no arguments and read PostgREST's `PGRST202` as
"missing", which wrongly condemned six files including `get_trip_story` - a function
I had used successfully minutes earlier. The reliable read is the OpenAPI schema at
`/rest/v1/`, which lists every exposed function and cannot be fooled by argument names.

**Verified:** 630 unit tests (7 new), tsc, build and lint clean.

### 2026-08-17 (e) - The vote that dropped taps, a 26px target, and zoom

Netanel: *"voting mechanism still feels laggy, sometime does not click"* - after
entry (d) had already made it optimistic and measured 5-11ms - plus *"add a way to
zoom into pictures"* and, mid-session, *"describe the premium features better
(cant understand what a 'story' is)"*.

**The 5-11ms measurement was true and it measured the wrong thing.** It timed one
click on an idle page over localhost. Both remaining symptoms lived in what
happens around a click, not in the first paint, and both were mine from entry (d):

1. **`if (inFlight.has(placeId)) return` discarded taps.** One in-flight request
   was treated as a lock, and that window is a few hundred milliseconds on a real
   connection (the route reads the trip, writes the vote, then re-tallies). A tap
   inside it did *nothing at all* - literally "sometimes does not click".
2. **A reply replaced the WHOLE tally map.** Vote on one stop, then quickly on
   another, and the first reply overwrote the second stop's optimistic paint until
   its own reply arrived. The click visibly un-happened, which reads as lag.
3. **The buttons were about 26px tall** (`py-1.5 text-xs`) - well under the 44px
   touch target this project applies everywhere else. Some taps simply missed.

Now: every tap paints, none is dropped; a per-place sequence number means a reply
a newer tap superseded is ignored rather than allowed to overwrite it; a reply
merges, keeping the local value for any place whose own write is still open; and
rollback goes to the last thing the SERVER said about that place, not to a guess.
Refs rather than state, because a fast second tap has to read what the first one
just painted rather than the previous render.

**Measured under 400ms of emulated latency**, which is the condition the bug needed
and which localhost had been hiding: three fast taps on one stop all register
(0 -> 1 -> 0 -> 1, settling on 1 with the server agreeing), and a vote on one stop
survives another stop's reply. Buttons measure 44x64.

---

**Zoom: `PhotoLightbox`, portalled to `document.body`, and that is not optional.**
All three pages wrap their content in `.rise-in`, whose animation keeps its final
transform - and a transform creates a containing block, so a `fixed` overlay inside
it is measured against that element instead of the screen. Exactly the trap already
recorded here for the header's backdrop-blur and the mobile chat bar. Verified in
the browser rather than assumed: the overlay's parent is `<body>` and its width
equals the viewport.

**The enlarged image deliberately keeps its existing URL.** Swapping the Wikimedia
width up to 960 for a "real" zoom is precisely the bug that killed 170 photo URLs
in entries (k) and (q) - a thumbnail wider than the source 404s. So it is the
verified URL laid out large: 64px -> 358px on a phone, 80px -> 500px on desktop.
Honest limit: on a wide desktop a 500px source is shown at 500px, not upscaled.

The travellers' own uploaded story photos are full-size, so those zoom properly.

---

**"Cannot understand what a story is" was a collapsed-state problem.** Opened, the
panel explains itself well. Collapsed it read `📖 סיפור הטיול [פרימיום ★] ▾` - a
product name for a thing nobody has seen before. Both premium panels now carry a
`meta` line naming the OUTPUT rather than the feature.

**And the first wording of it was too long, which the browser said and I would not
have.** `meta` is a single truncating line: the fuller sentences measured 177px and
236px against the 123px available at 390 - so half of the explanation was cut off on
the device that needs it most. Shortened until it fits (`clipped: false` at both
widths). Making those two bars taller instead was rejected: `PanelSection` exists
precisely so five sibling bars cannot drift apart, and two of them growing a second
line is that drift.

**Verified:** 630 tests, tsc, build, lint clean. 18/18 in a real browser at 1400 and
390 on the throttled join page, 16/16 re-run on the shared trip to confirm the
zoom wrapper changed nothing there, and the panel measurement above. The throwaway
user, trip, invite and votes were deleted and the deletion confirmed by re-query.

### 2026-08-17 (f) - The trip story is retired

Netanel: *"The trip story is still not it.. not worth paying a penny for."*

He is right, and the comparison makes it obvious. Rendered side by side, the paid
page was a **poorer** version of the free one:

| | free `/t/<code>` | premium `/story/<slug>` |
|---|---|---|
| name, map, stops with photo + description | yes | yes |
| trip dates | yes | **no** |
| travel legs between cities | yes | **no** |
| day descriptions | yes | **no** |
| the traveller's own per-day notes | yes | **no** |
| uploaded photo grid | no | yes |

Everything on it was generated. The descriptions added the day before come from
the catalog and are identical for every trip to Rome. Nothing on the page came
from the person who took the trip, so it was not a story - it was the itinerary
with a nicer header, behind a paywall, next to a free page that showed more.

**The feature had been wired up short, and that is visible in the schema.**
`StoryPhoto` carries `dayNumber`, `/api/story` accepts a `caption` - and the panel
sent `{action:'photo', photo}` with neither, ever. The hooks for a real story (a
photo attached to the day it belongs to, in the traveller's own words) were
designed and never connected, so every upload landed in an undifferentiated grid.

Given the choice between building that and removing it, he chose removal.

**What went.** `/story/[slug]`, `/api/story`, `TripStoryPanel`, `server/stories.ts`
and `supabase-stories.sql`; the feature card, the comparison row and the copy on
`/premium`, and the entry in `supabase-check.sql`. Premium is now the group trip,
the pre-departure check included, and the monthly agent package - all three of
which are things the free tier genuinely does not have.

**What survived, and why it moved.** `buildSnapshot`/`enrichSnapshot` were never
story-specific - the group trip reads a member's view through them - so they moved
to `server/tripSnapshot.ts` with `StorySnapshot` renamed `TripSnapshot`, rather
than being deleted along with the file that happened to host them. Their tests
moved too: the guarantees they carry (names from the catalog only, the snapshot's
name never re-resolved, an unknown place degrading instead of vanishing) matter
more now that the group trip is the only caller.

**The database is left alone.** `supabase-check.sql` no longer looks for
`trip_stories`, and a separate `supabase-retire-stories.sql` drops the table and
the function **only if Netanel chooses to run it** - a check file must not delete
anybody's data, and the story-photos bucket holds travellers' own photographs, so
emptying it is spelled out as a deliberate manual step rather than bundled in.
Nothing in the app reads any of it now, so leaving it costs nothing.

**Verified:** 627 tests (the three story-only ones went with the feature), tsc,
build and lint clean; `/story/<slug>` and `/api/story` both return 404; no story
route in the build output; the word appears nowhere in product copy (the remaining
hits are catalog prose like "the story of Slovak Jewry" and one chat-guard regex).
The group trip was re-run end to end under 400ms of emulated latency **after** the
deletion, 18/18 at 1400 and 390 - which is the check that matters here, since the
snapshot code it depends on moved house. The trip screen now shows the group panel
and no story panel.

**A note on the sequence, because it is the lesson.** The day before, this same
page got photos, descriptions, a map fix and a lightbox - real work, on a feature
that should not have existed. None of that was wasted (the photo/description work
serves the shared trip and the group trip, and the lightbox serves all of them),
but the question "is this worth paying for" would have been cheaper to ask before
polishing it than after. When the founder says a feature is not worth money, the
useful first move is to compare it against the free thing next to it, not to
improve it.

### 2026-08-17 (g) - The SQL files get a folder

Netanel: *"make sure all sql files are foldered, remove any unnecessary .md and
other files."*

**22 `supabase-*.sql` files moved from the repo root into `sql/`.** Moved with
`git mv` so the history follows them, and the **filenames were deliberately not
changed**: 197 references to them exist across 34 files, most of them prose
("run supabase-admin.sql") in code comments, `NEEDS-YOUR-INPUT.md`, `TODO.md` and
this log's own history. Renaming would have meant either a mass edit through
Hebrew prose or leaving stale names everywhere, and `sql/supabase-admin.sql`
being mildly redundant is cheaper than either. The folder is `sql/` and not
`supabase/` because the Supabase CLI reserves that directory name, and adopting
the CLI later should not collide with this.

**One test caught the move, which is exactly why it exists.**
`shareStore.test.ts` reads `supabase-setup.sql` off disk to assert the removed
`anon` policy has not crept back in - it went red with ENOENT the moment the file
moved. Fixed to the new path. It was the only path-based read in the codebase;
everything else refers to these files by name in prose, which is still accurate.

**The `.env.example` setup line** now points at `sql/supabase-setup.sql`, and the
comment in `englishComments.test.ts` explaining why the guard walks the whole repo
was updated - it cited "the repo root" as where the SQL lives, which is no longer
true. The two mentions in older session-log entries were left alone: those are a
record of what was true then.

**Verified the guard still covers them in their new home** rather than assuming
it: a Hebrew comment injected into `sql/supabase-check.sql` fails the test and
names `sql\supabase-check.sql:141`. Restored afterwards.

**Nothing was deleted, and that is a decision rather than an oversight.** The root
has exactly four `.md` files and all four are load-bearing: `CLAUDE.md` (these
instructions and the log), `README.md`, `TODO.md` (the deferred data work, and the
coordinate-sourcing playbook that stops a future session re-deriving which sources
are reachable), and `NEEDS-YOUR-INPUT.md` (a live form Netanel fills in - deleting
it would destroy work waiting on him). There are no stray patches, logs or scratch
files tracked at the root to remove.

627 tests, tsc, build and lint clean.

### 2026-08-17 (h) - Historical places get their own category

Netanel: *"change the places that are historical from attractions to historical
places."*

**The rule is the catalog's own tag, not my judgement of 731 places.** Every place
already carries editorial `tags`, and `history` is one of them - so the migration
is exactly: `category: 'attraction'` **and** tagged `history` becomes
`category: 'historic'`. Re-deciding by name would have meant 731 unauditable
judgement calls; this is one rule anybody can check.

**Only the generic bucket splits.** The `history` tag also sits on 71 museums, 38
viewpoints, 29 nature places, 21 markets and 15 cafes - none of them moved. A
museum is a museum and a historic cafe is still a cafe; `attraction` was the only
category that was a grab-bag. Result: **547 historic, 184 attraction**, 1814 places
unchanged in total, and zero places either tagged-but-left or moved-but-untagged.

**The emoji and colour stayed with the bigger half, deliberately.** `historic`
keeps the classical-building emoji and the purple that these places already had,
so most pins on most maps do not change at all; `attraction` - what is left is an
opera house, a funfair, the Dancing House - takes a neutral pin and a steel blue,
because a symbol that suits Schonbrunn misdescribes the Prater.

**The change that would have been silent.** `TYPE_WEIGHTS` in `generate.ts` is a
`Partial<Record<PlaceCategory, number>>`, so a category with no entry scores **0**.
Adding `historic` to the type without adding it there would have dropped three
quarters of the sightseeing out of every wizard-built trip, with nothing failing -
no type error, no test, just thinner trips. `historic` carries `attraction`'s
weight in all three trip types so the table means what it meant before. The same
class of omission was checked in `photo-gaps.mjs` (historic is Tier A, like
attraction) and in the explored-place allowlist. `URBAN_CATEGORIES` in the
validator correctly needed nothing - it is a denylist of urban categories, and
historic is not one.

**Two tests failed and both were right to.** They pinned Schonbrunn as
`attraction`; that is precisely what changed, so they were updated. The
`enrichSnapshot` test asserting `'attraction'` for a place NOT in the catalog was
left alone - there it is the neutral default, not a catalog value.

**Verified:** catalog validator 0 errors and **306 warnings, identical to HEAD**
(checked by stashing and re-running, because a warning count that moves during a
data pass is the thing worth catching); 627 tests, tsc, build and lint clean. In a
real browser at 1400 and 390: both categories render as separate filter chips,
place cards show the new badge, the map draws 9 distinct pin colours, zero
horizontal overflow.

### 2026-08-17 (c) - The shared trip becomes a planning tool: comments, suggestions, dates, RSVP

Netanel: *"add comments to the shared trip, and other features, so it will be very
optimal for planning together, and people will pay"* - and, asked which, chose all
four: friends can suggest places, dates that work for everyone, who is coming, and
tell people when something changes.

**The framing that decided the shape.** Until now a friend could only approve or
reject the organizer's plan. A vote says THAT somebody objected; it cannot say why,
and it cannot say "what about the market instead". That gap is the whole reason the
real conversation was happening in WhatsApp while the plan sat here - two places,
neither complete. Every one of the four features exists to move one more part of
that conversation onto the trip itself.

**New: `sql/supabase-group-planning.sql`** - `trip_group_comments`,
`trip_group_suggestions`, `trip_group_dates`, `trip_group_rsvp`, plus a
`date_options text[]` column on the existing invites table. All four follow the
pattern this project settled on: **RLS on, no policy, execute revoked from `anon`
and `authenticated`** - service-role only, so the API route is the only door and
membership is proved there rather than in four separate policies.
**Netanel has to run this file**; until then the group panel's writes fail and the
friend page shows its honest error, which is the intended degraded state.

**`groupPlanning.ts` is the whole server half, and every function takes the invite
rather than re-deriving permission.** The route proves membership ONCE per request
(`isMember(code, userId)` for a friend, `inviteForTrip(userId, tripId)` for the
organizer) and hands the resulting row down. That is deliberate: eleven actions
each doing their own permission check is eleven chances to get one wrong. The two
organizer-only actions - deciding a suggestion and setting the candidate days - are
additionally checked against `invite.owner_id` **inside** groupPlanning, not in the
UI, because a panel that merely does not draw a button is not access control.

**Only real catalog places may be suggested.** The picker is built from
`useCityData` (the same per-city fetch the trip screen uses, so the catalog is
never shipped whole to a friend's phone), and the server re-checks the place
against the catalog and against the trip's own cities anyway. A picker is a
convenience; it is never the guarantee. Places already in the trip are filtered out
on both sides - suggesting something already planned is noise, not a suggestion.

**Accepting a suggestion actually adds the place to the trip.** The first version
only flipped a status column, and that is worse than rejecting: a friend whose idea
is marked "accepted" and then never appears in the plan has been told yes and given
nothing. `decide()` calls `tripApi.addPlace(citySlug, placeId)` before it records
the decision.

---

**The date poll is the piece with real arithmetic, so it is the piece with its own
tested module.** `dateOverlap.ts` + 10 tests. The claim it exists to protect is one
sentence: **silence is `pending`, never agreement.** A day nobody answered must not
be counted as a day that works, because the organizer books flights on that number.
`pending` is therefore a separate count from `no` rather than folded into either
side, `everyone` is true only when every member said yes explicitly, and `blockers`
names who said no so "September 4th doesn't work" is a person and not a statistic.
Only the organizer sets the candidate days - a poll everyone can edit is not a
poll.

**Notifications: organizer-only, deliberately.** `groupNotify.ts` POSTs to
`GROUP_NOTIFY_WEBHOOK` (`{text, content, event}`, so Slack, Discord or any
request-to-email service works with no dependency - the same shape as the existing
budget alert). It never blocks a write, never throws, and logs when unconfigured
instead of failing silently. **Notifying members was not built**: sending a message
to somebody who joined a trip through a link is a consent question, not a task, and
guessing the answer is how a planning tool turns into unsolicited mail.

---

**One client bug avoided, and it is the same species as the vote lag from earlier
today.** Every write returns the WHOLE planning payload, so a comment, an RSVP and
a date answer each leave the screen holding one truth with no second fetch. But the
vote is optimistic - it paints before the round trip - so a comment reply arriving
mid-vote would have replaced the tally map and rolled the tap back on screen. The
non-vote poster now merges votes exactly the way the vote path does, keeping the
local number for any place whose own write is still open. The vote path itself is
unchanged and stays hand-rolled for that reason; everything else takes the server's
answer as truth.

**Also fixed while there:** the organizer's GET now returns the existing invite
`code`, so reopening the panel shows the link that already exists instead of
minting a second invite for the same trip. And `TripSnapshotDay` gained `citySlug`
- the friend page needs it to offer places from the trip's own cities, and it was
the one field the snapshot dropped.

---

**Verified:** 637 tests (17 new - the date arithmetic, and the vote tally the
optimistic path depends on), `tsc` clean, `npm run build` clean, `npx eslint` clean
on every touched file. Two lint findings in my own new hook were real and fixed
rather than suppressed: a ref written during render, and an effect the rule could
trace into - the ref turned out to be dead weight (no consumer used it) and the
effect only needed its fetch wrapped.

**NOT browser-verified, and that is worth stating precisely rather than glossing.**
The four tables do not exist in Supabase yet, so there is no way to drive the real
flow. A CDP harness with `/api/group` stubbed and an auth session seeded into
localStorage got as far as proving the page loads, is RTL and has zero horizontal
overflow at 390px and 1400px - and then stalled: supabase-js never finished
`getSession()` against a hand-made session, so `auth.ready` stayed false and the
page sat on its loading state forever. Three things were ruled out on the way and
are worth recording so the next harness does not rediscover them: **a request a
service worker makes never surfaces as `Fetch.requestPaused` on the page target**
(use `Network.setBypassServiceWorker`); a narrow `urlPattern` that matches nothing
reads exactly like a broken page; and fulfilling the *document* request with JSON
poisons the service-worker cache for every later run in that profile. The real
verification is Netanel's own, after the SQL: organizer creates an invite, a second
account joins, votes, comments, suggests a place, answers a date and an RSVP, and
the organizer sees all of it and accepts the suggestion into the trip.

**Waiting on Netanel:** run `sql/supabase-group-planning.sql` (and
`sql/supabase-consent.sql`, still outstanding from an earlier session). Optionally
set `GROUP_NOTIFY_WEBHOOK` - without it the notifications simply log, which is the
correct behaviour and not a failure.

### 2026-08-17 (d) - The pricing page, and the sentence it was quietly getting wrong

Netanel: update /premium with the group-planning work and make it optimal for
sales. Two separate jobs turned out to be in that, and the second one is the
interesting half.

**The undersell.** The page described the subscription's one real feature as
"friends join, see the trip and vote on the stops". After the morning's work that
is a quarter of what it does, and voting is the least valuable quarter - the
things people actually fight about while planning are *why* somebody objected,
*what they would do instead*, *which dates work* and *who is even coming*. The
shared trip now gets the full page width and four concrete cards instead of a
line, with the point stated plainly underneath: **friends pay nothing and never
subscribe - only the person who creates the link does.** That sentence removes the
objection ("so I'd be asking five people to pay?") that would otherwise kill the
feature at the moment somebody considers using it.

---

**The sentence that was wrong, and it was wrong in our favour.** A month of
subscription is ₪19.90. One pre-departure check is ₪29.90. **The check is included
in the subscription.** So for a traveller with a single trip who is willing to
cancel afterwards, the subscription is not merely competitive - it strictly
dominates: cheaper, and it contains the thing they were about to buy. The page's
"open arithmetic" box, which exists precisely so a reader does not have to do the
sums themselves, was recommending the more expensive option to exactly those
people.

That is now the first line of the box, in bold, ending with "we are telling you
this even though it earns us less". It is the honest reading and it is also the
better sale: a subscriber who stays three months is worth more than one check, and
a page that names the cheaper option is a page people believe on everything else.

**It renders from the two constants and is conditional.** `monthBeatsOneCheck =
PREMIUM_PRICE_ILS < PRICE_ILS` - if the prices ever cross, the paragraph removes
itself rather than turning into a false claim. Same discipline as the rest of the
box, and the reason it exists: the year-total, the two-check total and the
break-even in trips are all computed, never typed.

**The known trade this creates, recorded rather than engineered around:** somebody
can subscribe for one month, take checks on every trip they own, and cancel. The
2026-08-13 (b) entry already accepted that; this page now makes it obvious instead
of leaving it as something a clever reader discovers. The check costs nothing to
produce, so the alternative - rate-limiting an included feature against a
hypothetical opportunist - buys complexity and no money.

---

**The rest is ordinary conversion work, all of it honest.** The headline names the
count ("two things cost money") instead of one of them. The check card opens with
the situation rather than the feature list - *"you planned two months ago and you
fly in two weeks. What changed since?"* The CTA carries the price and the terms
(`התחלת מנוי · 19.90 ₪ לחודש`, "cancel in one click, no commitment") rather than
saying "sign up" and making the reader scroll back for the number. A four-question
FAQ answers what people actually ask before paying - what stays free, do my
friends pay, what happens to my trips if I cancel, are the monthly quotas enough -
and the answers are the true ones, including "if you hit a wall while planning a
real trip, write to us and it will be sorted".

**One gap the screenshot showed that the assertions could not.** The arithmetic
box tells the reader to subscribe and then gives them nothing to press - the
button is three sections further down. There is now an in-page link straight to it
(`#premium-plan`, with `scroll-mt-24` so the sticky header does not eat the
heading). Reading the rendered page found that; no automated check would have.

**`PLAN_FEATURE_ROWS`** gained the fuller description of the shared trip, so the
comparison table and the page cannot drift apart - it is the only place the free
column has to be honest about what free actually gets, and there it says
"joining and taking part - free".

**Verified:** 637 tests, tsc, build and lint clean, plus **38/38 in a real browser
at 390px and 1400px** - the four capabilities all present, the price comparison
rendered from the constants, the CTA carrying its price, the FAQ closed by default
and its answers rendering when opened, no dollar sign anywhere, no mention of the
retired story feature, zero horizontal overflow and nothing past the viewport edge
at either width.

**Worth knowing:** the page now sells the shared trip as the reason to subscribe,
and that feature does not work until `sql/supabase-group-planning.sql` has been
run. Until then a subscriber who creates an invite gets the panel's error state -
so the SQL is now on the critical path for the pricing page being true, not only
for the feature being complete.

### 2026-08-17 (e) - The page inverts: the subscription leads, the shared trip is the star

Netanel, immediately after entry (d): *"the shared trip should be the superstar.
but most - the premium subscription, then the features alone below"*. So the
arrangement entry (d) kept - the one-off check leading, the subscription as a
secondary option - is now the other way round. Entry (d) is not wrong, it is
superseded; read them in order.

**The reversal follows a change in the product, not a change of mind about
honesty.** When the check was made to lead (entry 2026-08-13 (c)) the
subscription's only exclusive content was "friends join and vote on the stops" -
genuinely thin next to a concrete pre-departure report. This morning that feature
became the place a group actually plans: comments per stop, friends proposing
catalog places, a date poll, RSVP. It is now the one thing on the site nobody gets
for free, so it belongs in the lead card rather than in a row of a comparison
table three screens down.

**Structure now:** headline → the subscription as a full dark card, with the
shared trip as a block INSIDE it (labelled "the star of the subscription", four
tiles for the four things friends can do, and the friends-pay-nothing line) plus
the two other things it carries (the check included, the guaranteed lane) and the
CTA → the open arithmetic → **"רק צריכים דבר אחד?"** and the one-off check as a
standalone card → the free-vs-premium table → the FAQ.

**The one-off check was demoted, not weakened.** It keeps its full feature list,
its price, its own heading and its route into the trip screen - somebody who wants
exactly one thing and no recurring charge can still find it in one scroll, and the
section is named for that person rather than for the product. Selling a
subscription by making the alternative hard to find is the thing this page has
deliberately not done since it was written.

**The arithmetic box did not need rewriting to fit the new order**, which is worth
noting: it already said that a month of subscription costs less than one check and
includes it. Under the old arrangement that was an admission against interest;
under the new one it is the strongest argument on the page. The same true sentence
did both jobs, and it is still rendered conditionally from the two constants, so
it removes itself if the prices ever cross.

**Two CTAs now, not one** - under the star card and under the comparison table -
because the page is long and a reader who is convinced by the table should not
have to scroll back up. They are one function rendered twice, so the label, the
price and the cancellation line cannot drift apart between them.

**Verified:** 637 tests, tsc, build and lint clean, and **46/46 in a real browser
at 390px and 1400px** - including an assertion on the ORDER (the subscription card
must appear before the standalone section, measured by position in the rendered
text, not by reading the JSX), both CTAs present, all four capabilities, the price
comparison, the FAQ closed by default, no dollar sign, zero horizontal overflow and
nothing past the viewport edge at either width. The rendered page was also looked
at rather than only asserted.

### 2026-08-17 (f) - "How is that possible?" - the paid plan was worse than the free one on every single row

Netanel, with a screenshot of two rows of the comparison table: free showing
**15 a day** next to premium showing **5 a month**. He was right, and it was not
those two rows. Measured against `PLAN_LIMITS`, **premium was worse than free on
every countable quota there is**:

| | free | premium | free, per month |
|---|---|---|---|
| chats | 60 a day | **10 a month** | 1,800 |
| quick builds | 15 a day | 5 a month | 450 |
| images | 3 a day | 5 a month | 90 |
| live lookups | 10 a day | 5 a month | 300 |
| shares | 10 a day | 60 a month | 300 |
| imports | 5 a day | 30 a month | 150 |
| explores | 20 a day | 150 a month | 600 |
| geocodes | 30 a day | 200 a month | 900 |

A subscriber paying 19.90 a month got **fewer agent messages in a month than a
free user gets in a single day**. The full trip build was the same shape: 2 a
month for premium, while free has no build limit at all beyond its chat quota.

**How it happened, because nothing here was careless.** Entry 2026-08-13 (b)
derived every premium quota backwards from `SUBSCRIBER_MONTHLY_CAP_USD` so that
spending the whole visible allowance could never hit the invisible dollar cap -
Netanel's own rule, word for word: *"if someone is cut off by the dollar cap
while the page told them they had trips remaining, that's a broken promise and a
refund."* The arithmetic in that entry is correct and there is a test locking it.
What nobody did was compare the result against the **free** column - and premium
was on a monthly clock while free was on a daily one, so the two columns were
never even in the same unit.

**No amount of care inside one column catches an error that only exists between
two columns.** That is the whole lesson, and it is why the fix is a test before
it is a number.

---

**The fix.** `periodMsFor` returns one day for every tier - it no longer takes a
tier at all, so the signature itself is the guard - and premium's numbers are
daily and strictly larger than free's on every row (200 chats vs 60, 40 quick
builds vs 15, 20 images vs 3, 40 lookups vs 10). `PREMIUM_TRIP_BUILDS_PER_MONTH`
became `PREMIUM_TRIP_BUILDS_PER_DAY = 5`, which real planning never reaches and
which is deliberately more permissive than what free effectively gets.

**The test that should have existed** asserts premium >= free >= anon on all ten
countable fields, and names the field and both numbers when it fails. Verified by
putting the bug back: `פרימיום גרוע מחינם ב-chatPerDay: 10 מול 60`. A second test
pins the window to a day for every tier, because the differing window is what
made the inversion possible in the first place, and a third pins the one table
row whose number is hand-written (the build cap) to the constant behind it.

---

**What this costs, stated plainly rather than smoothed over.** With daily premium
quotas the visible numbers can no longer be the first thing to bind - so the rule
from entry (b) is inverted again, and the $2.00 cap is now the real constraint for
heavy use. That is a deliberate trade and it is the lesser evil: the rule exists
to stop a subscriber being cut off while the screen promises more, and the old
numbers broke that promise far more brutally by promising a tenth of what free
gives away for nothing.

**And the number that actually needs Netanel's decision, measured:**

| a planning session | cost | fits under $2.00? |
|---|---|---|
| 10 turns | $1.16 | yes |
| 15 turns (typical) | $1.48 | yes |
| 20 turns | $1.79 | yes |
| 24 turns | $2.04 | **no** |
| two 15-turn sessions | $2.95 | **no** |

So **$2.00 a month covers about one ordinary planning session** and runs out
inside a long one or a second one. The pricing page's own FAQ used to claim the
quotas were "sized around two real trips a month" - that sentence was false and
has been rewritten. Raising the cap to ~$3.50 would make two sessions fit, at
roughly 12% margin on ~$4 net per subscriber instead of 50%. **That is a pricing
decision, so it is written up in `plans.ts` and reported rather than changed**:
raise `SUBSCRIBER_MONTHLY_CAP_USD`, raise `PREMIUM_PRICE_ILS`, or accept that
heavy subscribers meet the ceiling. Two tests encode today's answer - one asserts
a typical session fits, the other asserts a long one does **not**, so if the cap
is ever raised the second test fails and points at the comment that needs
updating.

**Also corrected while there:** the premium page said the agent lane was a
"monthly package" and the FAQ said the quotas were monthly - both now describe
daily quotas, larger than free's and guaranteed regardless of site load.

**Verified:** 638 tests (3 new, 2 removed with the arithmetic they locked), tsc,
build and lint clean on every touched file (the remaining `src/lib` findings are
the pre-existing AuthContext/TripContext/placeResolve ones), and **46/46 in a real
browser at 390px and 1400px**, plus the rendered comparison table read row by row
out of the live page to confirm every line is now the right way round in matching
units.

### 2026-08-17 (g) - Both paid products, at equal weight, and what can be bought alone

Netanel, on the rebuilt page: *"premium should show it has the trip sharing, and
the check before the trip, and then below - options to buy them alone."*

The subscription contains **two** products and the card was showing one. The
shared trip had a full block; the pre-departure check - a real 29.90 product on
its own - was a single tick line underneath, which is where a reader's eye stops
counting. Both now get the same treatment inside the lead card: their own panel,
their own heading, and for the check a short list of what it actually does. The
guaranteed agent lane stays one line under them, because it is real but it is not
a product.

**Below the card is now "רוצים רק אחד מהם?" - and it says what can be bought
alone honestly.** Today that is the check and only the check: the shared trip has
no standalone price, so the section states that rather than leaving a reader to
work it out from an absence. **Giving the shared trip its own one-off price would
be a business decision, not a page edit**, so it is reported instead of invented -
if Netanel names a price it drops into the same section.

Small thing worth keeping: the standalone card no longer repeats the "you planned
two months ago" line, which now belongs to the block inside the subscription. The
same sentence twice on one page reads as a template rather than as writing.

**Verified:** 48/48 in a real browser at 390px and 1400px (two new assertions -
the check renders as a block and not a footnote, and the standalone section names
the shared trip as subscription-only), 638 tests, tsc, build and lint clean.

### 2026-08-17 (h) - Two tall columns, and a standalone card for a product that has no standalone price

Netanel, with a screenshot: *"2 high blocks, not fat. also below that - 2 options
for the check alone, and the second thing alone"*.

**The layout half is straightforward and it was a real defect.** The two paid
products were stacked full width, so each was a wide slab and the price at the
top of the card sat a screen away from the CTA at the bottom - a reader had to
scroll to discover the subscription contains two things at all. They are now a
two-column grid, each column tall and narrow, both visible in one eyeful. The
four capability tiles inside the shared-trip column stack instead of pairing up,
which is what makes that column tall rather than square. `h-full` on both so a
shorter column does not leave a ragged edge.

**The second half needed a decision I did not make.** "The second thing alone"
asks for the shared trip to be buyable on its own, and it has no price. Two
reasons it was not simply invented:

1. **It is a business decision.** A number typed into a pricing page is a
   commitment, and this one interacts with the subscription: at any price below
   about two months it is strictly better than subscribing, and at any price
   above it nobody buys it.
2. **The subscription would lose its reason to renew.** The shared trip is the
   only thing here that is worth paying for every month rather than once. Selling
   it per trip converts a recurring product into a transactional one, which is a
   different business, not a different card.

So the section now has **two cards, one per product, mirroring the card above**:
the check with its real price and its real route to purchase, and the shared trip
saying plainly that it is not sold per trip, why (it is the heart of the
subscription), what it contains, and pointing back up to the plan - with the
already-true line that one month costs less than a single check. If a standalone
price is ever set, that card is where the number goes and nothing else moves.

**Verified:** 50/50 in a real browser at 390px and 1400px (two new assertions -
two standalone cards exist, and the shared-trip card is honest about having no
one-off price), 638 tests, tsc, build and lint clean. The rendered page was looked
at, at 1100px, which is how the first screenshot attempt was caught: the clip fell
outside the emulated viewport and showed an empty band where the cards are, and
the cards were in the DOM the whole time.

### 2026-08-18 - Skeleton loaders, and the wait that mattered most was the shared link

Netanel: add skeleton loaders, "and don't forget trip sharing".

**The shared link is the right thing to name first, and it turned out to be the
only page on the site that genuinely waits on the network before it can render
anything.** `/t/<code>` resolves a short code into a Supabase row on the server,
and until that answers Next has nothing to stream. It is also the page opened
cold, from WhatsApp, by somebody who has never seen this site, usually on a
phone on mobile data - and a blank screen there reads as a broken link, at
exactly the moment we cannot afford to look broken. It now has a route-level
`loading.tsx` drawn as the page that is coming: header card, map rectangle, day
cards with numbered stops and their thumbnails.

**Measured rather than assumed.** With a 3-second server wait injected into the
page (and removed afterwards), the streamed HTML carries the skeleton at
**154ms** and the resolved content at **3,090ms** - so the shape is on screen
almost three seconds before the trip is. In a real browser at 390px mid-wait:
43 shapes, zero horizontal overflow, and it is replaced by the resolved page
when the server answers.

---

**The other surfaces, and the rule that decided which ones got one.**
`src/components/Skeleton.tsx` is now the only place a loading shape is drawn -
`Skeleton`, `SkeletonScreen`, `SkeletonRows` - and it carries the three rules in
its own header. The one worth repeating here is the third: **skeleton the
screen, never the count, and never a wait that could end on a different
screen.**

That is not a style preference, it changed the code. `/join/<code>` and
`/account` each had ONE loading branch covering two different waits: the session
resolving (which can still end on "please sign in") and the fetch that follows
(which can only end on the real screen). Both were split. Before the session
resolves they show the dots and promise nothing; once the visitor is known to be
signed in, the screen they are getting is drawn in advance. The planner's
pre-hydration gate keeps its dots for the same reason - after hydration it is
either the onboarding form or the trip workspace, it is one frame long, and a
skeleton of the wrong screen flashing for one frame is worse than no skeleton.

Also converted: the traveller profile, the map placeholder (which also drops the
last hardcoded `bg-slate-100` on that screen - a hex ignores high-contrast mode,
a token does not), the site-search catalog rows, the Viator activity rows, the
group suggest-a-place list, and the admin usage card. The admin cards that fold
loading and failure into one `!d` check deliberately keep returning null: a
skeleton there would spin forever on an error.

**A real bug found on the way, in the traveller profile.** The effect decided on
`auth.user`, which is null while the session is still resolving - so a signed-in
visitor was shown the "signed in only" screen and then had it swapped for the
profile. Not a slow screen, the *wrong* screen. It now waits for `auth.ready`.

---

**The pattern is guarded, not just applied.** `TripSkeleton` wrote
`skeleton-block` by hand while the homepage band wrote `animate-pulse
bg-cream/10` - two different shimmers for the same idea, neither fixable in one
place. Both now go through `Skeleton`, and a new test in
`designConsistency.test.ts` fails on any `skeleton-block` / `animate-pulse`
written outside it. **Verified by reintroducing one**: the test fails and names
the file and the class. Same shape as the caret and hardcoded-colour guards
already in that file.

`.skeleton-block-invert` is new in globals.css because the night-tinted shimmer
is invisible on the night bands, and both variants freeze to a static tint under
prefers-reduced-motion.

---

**Verified.** 639 unit tests (1 new), tsc and build clean, and lint measured A/B
on the exact changed-file set - **5 errors before, 5 after**, all the
pre-existing `react-hooks/set-state-in-effect` baseline, none introduced.
35/35 in a real browser at 1400 and 390 over every skeleton screen: RTL, zero
horizontal overflow, nothing past the viewport edge, one labelled `role=status`
per screen with the shapes hidden from assistive tech, the inverted variant
actually painting on the dark bands, and the shimmer frozen to a visible tint
under reduced motion. Plus 6/6 on two waits driven **for real** under 60kB/s
throttling rather than as static shapes: the map placeholder fills the real
664x560 map rectangle while Leaflet loads, and the search panel shows catalog
rows that then give way to real results.

One assertion of mine was written so it could not fail (a reduced-motion check
with an `|| true` shape to it) and was rewritten to read the computed
background alpha instead. An assertion that cannot fail is worse than no
assertion, and this file has said so before.

**Not committed** - the working tree holds the change for review.

### 2026-08-18 (b) - "The AI assumes 4 days" - and the sentence that went past the day count

Netanel: *"AI assumes 4 days when no days are written (he should ask for things -
even if i ask him to do a trip, he should not assume, but ask for personality
etc)."*

**Where the four came from: nowhere.** There is no 4 in the agent path - the
model picked a number that looked reasonable, because the prompt told it to.
Rule 1 of "CREATING THE FIRST TRIP NEEDS A CLEAR YES" said to *"build
immediately... with sensible defaults for whatever is still missing"*, while
HOW YOU WORK two paragraphs later said to ask when key details are missing. Two
rules in one prompt saying opposite things, and the specific one won.

**A length is not a detail you may default.** It decides how many cities fit,
how the days split and what the whole plan looks like. A confident value where
there is no fact is the same species as an invented price - which this codebase
already refuses in `priceGuard`.

---

**Two gates, in code, because the prompt is the half that gets swallowed.**
New `lib/server/tripBrief.ts`, wired into the tool dispatch in `/api/chat` next
to the city gate and the kashrut guard - `create_trip` / `create_trip_full`
**fail** rather than build, and the tool result tells the model what to ask.

1. **No length stated anywhere → refuse.** Detected from the traveller's own
   messages only: digits + days/nights, Hebrew count words, "yomayim",
   "shavua", "sof shavua", a date range, the English forms, and a message that
   is *only* a number (the typed answer to "how many days?"). Three other ways
   it counts as known, none of them a guess: real dates on the trip, or a trip
   that already has days - so this touches new trips only, never an edit.
2. **Length given but nothing about the people → refuse once.** "תבנה לי טיול
   6 ימים בוינה" says how long and nothing about who, and a family with small
   children and two friends get genuinely different itineraries. This one has
   an explicit way out, because a traveller is allowed not to care: it fires
   only while the agent has not yet asked anything (`agentAlreadyAsked` - any
   question mark in any assistant message), so it costs exactly one question
   and "לא משנה, תבנה כבר" then builds.

**The assistant's own words never count as the traveller's.** Same rule as the
kashrut gate and for the same reason: the model answering "here's a 4-day
suggestion" must not read its own sentence back one turn later as if it had
been asked for. There is a test named after exactly that.

**The two refusal messages are deliberately different**, and there is a reason
this file has flagged before: telling the model "no length was given" when the
length *is* given sends it to ask the one thing it already knows, and a guard
that nags is a guard someone removes.

---

**Three bugs of mine, each caught by a test rather than by reading.**

- A pattern assembled with `new RegExp` from a template string - **`\s` inside
  a template literal is not an escape at all**, so it silently became `...)s+(?:`
  and matched nothing. It passed tsc and lint. (The backslash was eaten by a bash heredoc -
  the trap already recorded in this file; the fix was written with the editor,
  and the pattern is now one literal regex with no assembly.)
- The negative lookahead meant to exclude "ba-shavua ha-ba" (next week, a
  *date*) also **rejected "shavua be-Italia"** (a week in Italy, a *length*),
  because the word for "in Italy" opens with the same two letters as the word
  for "next". JavaScript's `` only knows ASCII, so the boundary had to be
  spelled out as a Hebrew letter range.
- The interests list contained a bare two-letter token for "sea" - and the
  Hebrew word for "days" **ends with exactly those two letters**, so a message
  that said only the length read as a stated interest and the second gate never
  fired at all.

All three are the same shape: Hebrew has no word boundary a regex can lean on,
so short tokens must be spelled out long.

---

**Verified live against the real model** (production build, real key), four
scenarios, **10/10**:

| asked | before | now |
|---|---|---|
| "תבנה לי טיול לוינה" | a 4-day trip nobody asked for | no trip; asks how long + who + what interests, with day chips |
| then "5 ימים, זוג, אוכל ואמנות" | - | builds **5** days, art and food |
| "תבנה לי טיול 6 ימים בוינה" | built on assumptions about the people | asks who/what **once**, then builds 6 |
| a full brief in one message | - | builds immediately, no interrogation |
| "לא משנה, תבנה כבר" | - | builds - the loop breaker holds |

One assertion in the first live run was **my** expectation, not his: I had
asserted that a stated length should build immediately with no further
question. Re-reading the request - *"even if i ask him to do a trip"* - that is
exactly the case he was complaining about, so the assertion was wrong and the
behaviour was changed instead.

648 unit tests (9 new), tsc, build and lint clean on every touched file (zero
problems before and after).

**One judgement recorded rather than smoothed over:** the length gate is hard
and has no escape hatch, while the who/what gate yields after one question.
That asymmetry is deliberate - a trip has to have *some* length, so there is no
honest way to proceed without one, whereas "I don't care who's asking, just
build it" is a real answer that deserves to be taken at face value.

### 2026-08-18 (c) - Premium stops sitting on top of free, and moves somewhere else

Netanel: *"design premium/normal features in a smart way. i dont think that the
premium features should be on top of the free ones (which are very important).
they should just be in a different place."*

**This could have meant two surfaces and they are different jobs**, so it was
asked rather than guessed: the /premium page, where free and premium are one
table of identical rows with bigger numbers, or the app itself. He chose the
app.

**What the trip screen actually looked like.** Nine blocks under the plan, and
the two that cost money were at **positions three and four**:

    1 מה קורה בתאריכים   free
    2 שבת וכשרות          free
    3 טיול משותף ★        LOCKED    <- an advert, mid-scroll
    4 בדיקה לפני הנסיעה   ₪29.90    <- a second one
    5 מה עוד חסר          free
    ...

So a traveller scrolling their own free trip met a padlock halfway down, and
the working tools around it read as the free tier of something rather than as
the product. The fix is placement, not wording: everything above is free and
uninterrupted, and everything that costs money is in one section, below all of
it, on its own ground (`PaidTools`).

**The label does the more useful half of the job.** It says "כלים בתשלום" and
then, to a free traveller, **"רק אלה. כל שאר הכלים במסך הזה חינם."** That
sentence is only true because of where the section sits - the layout is the
claim and the copy just reads it out. It is scoped to *this screen* on purpose:
the free tier has daily quotas, so "everything else is free" would have
overshot by exactly one word.

**A subscriber sees the same section in the same place**, with the subtitle
changed to "כלולים במנוי שלכם". A block that moves depending on who is looking
is a block nobody can learn, and these are once-per-trip actions (create an
invite link, run the check), not things you reach for while arranging a day.

**The ★ badge is gone from the group panel.** It only ever appeared as a
fallback when there was nothing real to show, i.e. the panel announcing its own
price from inside the free stack it was sitting in. The section says it once,
at the top; the bar now carries only real state (new suggestions, how many
friends joined).

---

**The judgement worth recording: the pre-departure check moved too**, although
it is a one-off purchase and not a subscription. Same category - it costs money
- and leaving one paid product in the free stack would have kept the reported
problem at half size. The cost is real and stated in the code: the check is
time-sensitive (it only appears near departure) and used to sit high, beside
the other date-driven block. If that turns out to hurt how many people run it,
moving that one component back is a one-line change.

**A regression caught before it shipped, and only by reading the component it
was wrapping.** The obvious `print:hidden` on the new section would have been
wrong: `PreDepartureCheck` deliberately *prints* once it has a real result,
because a report somebody paid for belongs in the PDF they hand around. The
section therefore stays printable and loses only its own chrome - the label is
print-hidden, the tint and padding are stripped - while each child keeps
deciding for itself. This is the kind of defect that is invisible on screen and
only findable in an export.

**A mistake of mine worth writing down.** Proving the new guard actually fails,
I injected a bad render into `TripWorkspace.tsx` and then reverted with
`git checkout --` - which restores from **HEAD**, not from the pre-injection
state, so it silently wiped that file's uncommitted work along with the
injection. The whole edit had to be redone. Save a copy first; `git checkout`
is not an undo when the file has changes that are not committed.

---

**Verified.** 649 unit tests (1 new: a placement guard asserting every paid
component sits between `<PaidTools>` and `</PaidTools>` in TripWorkspace -
**proven to fail** by putting the group panel back in the free stack, where it
names the offender). 16/16 in a real browser at 1400 and 390 on a seeded
two-city trip: the section exists and is labelled, the paid tools are inside
it, **every free panel measures above it**, no "פרימיום ★" anywhere on the
screen, RTL, zero horizontal overflow. Plus 4/4 on print emulation - label
gone, chrome stripped, section not removed. tsc, build and lint clean on every
touched file.

One assertion failed first and it was the harness, not the product: Leaflet
tiles legitimately extend past the viewport (their container clips them, and
page-level overflow measured 0 throughout) - the documented case from entry
(kk), now excluded by container rather than by silencing the check.

### 2026-08-19/22 - The kashrut model, and Shabbat as arithmetic (reconstructed from the commits)

**Written retroactively, and by a different session than the one that did the
work** - hard rule 8 was owed and never paid. Five commits sat on
`feat/kosher-shabbat-real` with no log entry; the pricing session found them
when it branched off that head and had to merge them to main. What follows is
summarised **from the commit messages**, not from having done it: the numbers,
claims and verification below are theirs, and anything the commits did not state
is not stated here.

---

**The old `KosherVerification` had three fields and two of them carried nothing.**
`source` was `'curated'` in 53 of 53 records and `lastChecked` was
`'pending-review'` in 53 of 53. The third, `supervision`, was free text holding
four different kinds of thing at once - the certifying body, a caveat, meal
logistics, meat/dairy - and in one record the *absence* of certification. 46
distinct strings across 53 records, and nothing downstream could tell a
certification from a disclaimer.

`KashrutRecord` replaces it. `knowledge` is certified / none-found / unknown -
three states always distinguishable, where a blank field used to mean all three
at once. `certifications[]` names the body, with a Latin form to search for.
`diet` was prose in 20 records and unqueryable in all of them. `provenance`
carries source, sourceType and a real ISO `checked` date **or an explicit null,
never a placeholder** - all 53 migrated records carry null, because no date was
ever recorded and inventing one is fabrication. `legacySupervision` keeps the
original string verbatim so nothing is lost.

**The bodies are reported, never graded.** A local rabbinate and a Badatz render
identically, and a new deterministic guard (`kashrut-verdict`) strips any
sentence that grades one - checked **before** the allowlist, because a sentence
can be perfectly well grounded, naming a real body from that turn's data, and
still be a verdict. Two defects their own tests caught in that guard: "the London
beth din is stricter than the Prague rabbinate" was not caught because it
contains no word for kosher at all, and the replacement line tripped its own
filter (the classic self-match).

**First 12 records with real provenance** - Vienna, Prague, Budapest, read from
the communities' own sources on 2026-08-19. Three findings worth more than the
row count: Vienna's entries were **over-attributed** (the IKG's rabbinate page
says in as many words that it makes no recommendation and each business is the
responsibility of its own hashgacha, so appearing on the IKG list is not IKG
supervision); three IKG-listed venues geocode to addresses where OpenStreetMap
names a different business, and all three were **left out rather than pinned**;
and Budapest's Hanna is recorded verbatim as its own page writes it rather than
expanded, since the initials are shared by more than one body and expanding them
would be our interpretation. Koscherland is recorded as `unknown` with the date
we looked, explicitly not as a claim that it closed.

**`/kosher` now states its own denominator** - 65 places, 12 verified against a
source with a date - and says outright that a place missing from the list is not
a claim it is not kosher, only that we have no information. A filter that shows
what it has without saying what it lacks reads as coverage rather than a sample.

---

**The Shabbat layer is computed, which is why it carries no fabrication risk** -
the same argument `zmanim.ts` already makes for sunset. `hebrewCalendar.ts` is
the Hebrew calendar as arithmetic (molad of Tishrei, the four dechiyot, month
lengths from the year length), zero dependencies and **deliberately not `Intl` at
runtime**, because the output would then depend on whether a deployed runtime
shipped full ICU data - and a candle-lighting date that moves with a Node build
is not something to leave to chance.

It is validated against ICU as an **independent** implementation: agreement on
the Hebrew year for every month from 1900 to 2100 (2,412 comparisons) and on the
day-of-month for 1,460 consecutive days, crossing leap years, both Adars and all
six legal year lengths. That is what makes `EPOCH_OFFSET` a calibrated constant
rather than a guess.

**Both days of every second-day yom tov are returned, flagged `diasporaOnly`** -
whether an Israeli abroad keeps the second is a real dispute, and this reports it
rather than settling it. The same rule that stops us grading a hechsher.

**Walking distances use the lodging pin of that city**, and refuse a city-less
pin on a multi-city trip - measuring a Bratislava day against a Vienna hotel
would have produced a confident number ~55km wrong. An unlocated pin is ignored
rather than guessed at.

**And the panel now opens on either preference.** It used to require
`kosher === true`, so a Shabbat-observant traveller who had not ticked the kosher
box was shown nothing at all - not even that day 4 is Yom Kippur. Kashrut content
still stays behind the kosher preference; nothing is on by default.

`ZMANIM_METHOD_HE` states the method wherever a time appears (18 minutes, 8.5
degrees) and says outright that these are common customs and not the only ones.

---

**Verified, as reported by those commits:** 691 tests, tsc, build and lint clean
on every touched file; the served HTML of a production build carrying the new
places, the check date, the "body not named" wording and the canonical caveat;
6/6 in a real browser at 1400 and 390 with RTL intact and zero overflow. The
validator stayed at its pre-existing baseline of 1 error / 55 warnings.

**Confirmed independently when this was merged to main:** the catalog validator
reports the identical 1 error / 55 warnings on `origin/main` and on this stack,
with the catalog at 1,822 places against main's 1,814 - eight added, no new error
and no new warning. Zero photo URLs changed anywhere in the batch.


### 2026-08-22 - Four options instead of two, a ₪89 tier that had to justify itself, and the ordinal gate that made it safe

Netanel: rework the pricing page into four options - free as it is, ₪19.90 as it
is and marked recommended, a new ₪89 heavy plan whose arithmetic he wanted shown
the same way the ₪19.90 tier's was, and a travel-agent card with no price and a
contact form. Plus: keep the one-off check prominent rather than burying it, and
work out how four options read at 390px **before** building.

---

**The ₪89 tier, and the answer to "tell me rather than inventing filler".**

Net revenue, by the exact method that produced the existing ₪19.90 figures (it
reproduces them to the agora, which is why it is trusted):

| | ₪19.90 | ₪89 |
|---|---|---|
| gross | 19.90 | 89.00 |
| less VAT 18% | 16.86 | 75.42 |
| less PayPal 3.4% + ₪1.20 | 14.98 | 71.19 |
| net at ₪3.75/$ | **$4.00** | **$19.00** |

Cost, at the measured prices already in the test file (`COLD_TRIP_USD` $0.53 for
a full build including the cold cache write, `HEAVY_TURN_USD` $0.063 for a warm
turn): a typical planning session is 1 build + 15 turns = **$1.475**, a long one
is 1 build + 24 turns = **$2.040**.

The cap is **$12.00 - 63% of net, a 37% gross margin** where premium keeps 50%.
That difference is deliberate: at ₪19.90 the fixed ₪1.20 payment fee alone is
9.4% of gross and the entire subscriber is worth $2.00 of margin, so prudence is
cheap; at ₪89 the same fee is 4.8% and 37% of $19 is **$7.00 of margin per
subscriber - three and a half times what a premium subscriber yields in total**.

**And the rule he stated is enforced strictly this time.** The visible promise is
`PRO_TRIPS_PER_MONTH = 5`, not a daily quota, and it is sized against the cap
directly: five *typical* plannings cost $7.38 (61% of the cap), five *long* ones
$10.20 (85%). So the person who reads "five trips a month" and then edits
obsessively still does not meet the ceiling first. Six would be $12.24 - over -
and that is exactly the broken promise the number exists to avoid. **The test
fails in both directions**, verified by injection: at 7 it says the promise
exceeds the cap, at 3 it says the promise is too timid.

**What the tier contains is volume and nothing else, and the card says so in
those words.** No feature premium does not have. That is not a gap left for
filler - it is what the product honestly has, and for the person it is aimed at
volume IS what they are short of: at premium's $2.00 cap a subscriber gets about
**one** full planning session a month, and there is nothing else on the site they
can buy to move it. **4.47x the price buys 6x the capacity**, and a test asserts
that ratio stays the right way round, because a tier that costs more per unit of
capacity is a tier nobody could sensibly choose.

**One thing he asked for that is already true and therefore is not a
differentiator: pre-departure checks are included, unlimited, in the ₪19.90 plan
today.** Reported rather than quietly re-sold.

---

**The change that made all of this safe, and it is the reason the diff is bigger
than a page rewrite.** Every feature gate in the codebase was written
`caller.plan === 'premium'`, which silently means "premium and nobody above it".
The moment a third paid tier exists, each of those becomes a bug that **removes**
a feature from the more expensive plan - and it fails silently, because nothing
throws when a paying subscriber is told they need to subscribe.

So plans are now **ordinal**, exactly like the `ROLE_RANK` pattern this codebase
already had: `PLAN_RANK`, `planAtLeast(plan, 'premium')` for every gate,
`paidPlanOf(caller)` where a wallet is involved, and equality kept only for
**display** ("you are on the pro plan"). Fourteen call sites converted across the
chat loop, generate-trip, the group invite, the pre-departure check, activities,
identity, the account screen and the admin badge.

**Three real bugs that only existed because of the new tier, all found by walking
the gates rather than by a type error** (TypeScript sees none of these):

- **The full-build quota skipped pro entirely.** `create_trip_full` was capped
  only when `plan === 'premium'`, so the tier with the largest allowance had
  *no* cap on the single most expensive tool we have. It now reads the caller's
  own limit.
- **A promo code would have demoted a pro subscriber.** Redemption wrote a flat
  `plan: 'premium'`, so somebody holding an active pro subscription who redeemed
  a code would have been moved *down* - and would have discovered it themselves,
  having just been handed what looked like a gift. It now extends, never demotes.
- **The identity fallback dropped pro to free.** The second read that runs when
  `plan_until` does not exist as a column matched only the literal `'premium'`.

---

**A double charge caught by looking at the upgrade path.** With the gate made
ordinal, a premium subscriber clicking "pro" would have created a *second* PayPal
subscription - PayPal does not replace the first, so both bill, on the one path
where a customer is actively trying to give us more money. Doing it properly is
PayPal's `revise` call on the `paypal_subscription_id` we already store, which is
a separate integration that cannot be verified from here. So the switch is
**refused** (`switch-requires-support`) and the page says plainly that we move
people by hand so they are not charged twice. Selling a second subscription and
letting them find the duplicate on their statement was the alternative.

**PayPal back-compat is carried in `custom_id`, and that is the one thing here
that can break a live paying subscriber.** The tier travels as `<uuid>|pro`;
premium keeps the bare uuid and its existing unsuffixed `paypal_plan_id_<mode>`
flag, so existing subscriptions - whose custom_id PayPal will echo back on every
renewal and cancellation for the rest of their life - keep activating and
downgrading correctly. `parseSubscriptionCustomId` has its own test file for
exactly that reason, including an unrecognised suffix resolving to the *cheaper*
plan rather than the one it claims.

---

**The page: four options at 390px, worked out before building.**

Five things to buy (three plans, the check, the agent card) is a page nobody
reaches the bottom of as full-width slabs. So: a **"which one is you" strip** of
four one-line anchor rows at the very top, each carrying its own price - one
screen that lets somebody skip the two plans they were never going to buy, and
also the fastest honest answer to "what does this cost". Then the three consumer
plans as one grid, with **the recommended one ordered first on a phone**
(`order-first sm:order-none`) - on desktop the middle column is the privileged
position, on a phone "middle" means nothing and first means everything. The agent
card is its own section below, because it is not a fourth column: no price, no
button that charges anything, a different reader. The row-by-row comparison is a
`<details>`, since each card already carries what distinguishes it and ten rows
across three columns is about a thousand pixels of supplement on a phone.

Measured: the plans start at y=590 of a 390px screen, the check at y=2055 of
5269, zero horizontal overflow at both widths, nothing past either viewport edge.

**The check is not buried, and the arithmetic argues against us in public.** It
keeps a full-width card with the same weight as a plan, and the open-arithmetic
box states which option wins at which travel frequency - including that **a month
of premium costs less than one check and contains it**, so somebody who wants
only a check should subscribe for a month and cancel. Every figure renders from
`PREMIUM_PRICE_ILS` / `PRO_PRICE_ILS` / `PRICE_ILS`, and the comparison that
depends on their ordering renders conditionally, so a price change cannot leave a
false sentence behind.

**The agent card claims only what exists today** - the kosher layer with
supervision as reported, computed Shabbat times per city per day including the
print annex, several client trips side by side with their own chats, and the
print/PDF book, the live share link and the invite-with-votes for collecting
participant preferences. What is absent is named as absent: no branding on the
export, no multi-user account, no integrations - "built to fit, priced per
business", with no screenshots of screens that do not exist.

---

**Where the enquiries land: `agent_leads` in the same Supabase project as
everything else** (`sql/supabase-agent-leads.sql`), RLS on with **no policy** and
both browser roles revoked - the same shape as `newsletter_signups` and for a
stronger reason, since these rows carry a name, a business and a phone number.
Write through `/api/agent-enquiry` (rate limited 3/hour, 6/day), read through
`/api/admin/agent-leads`, rendered in a new admin card placed high because a
business waiting for an answer is the most perishable thing on that screen.
**There is no delete and no edit** - `handled_at` is enough, and a dashboard that
can erase inbound leads is one that will.

---

**Verified.** 700 unit tests (11 new: the ordering guard extended to pro, the
promise-fits-the-cap arithmetic in both directions, the price/capacity ratio,
`paidPlanOf` requiring a user id, pro expiry falling to free rather than premium,
and the four `custom_id` back-compat cases). `tsc` clean, `npm run build` clean,
and lint measured A/B on the touched files - **HEAD was clean on them and so is
this**; the three errors my first version introduced were fixed rather than
suppressed (`window.location.assign` instead of writing `location.href`, and the
admin card matched to the file's existing effect pattern).

**35/35 in a real browser at 390px (DPR 3) and 1400px** against a production
build: four options present, the recommended badge, every price rendered, no
dollar figure anywhere, the recommended plan first on a phone and raised on
desktop, the check above the agent card at both widths, the enquiry form opening
with three inputs none under 16px (iOS zoom), no overflow with the form open, and
a submit that gives an honest answer rather than a silent success.

**And the enquiry write path verified against a PostgREST stand-in that parses
the column list out of the SQL file itself** - because a column typo would ship
silently and only surface after Netanel runs the migration. Submitted through the
real form in the browser: `unknown columns: 0`, Hebrew intact, and a phone number
correctly classified as `phone` rather than `email`.

**A harness artifact worth recording, since it looked exactly like data
corruption.** The same submission sent with `curl` from git-bash stored mojibake;
the same fields sent from the browser stored perfect Hebrew. The shell's codepage
was mangling the payload before it left, not the route. **The browser is the real
path - check there before believing an encoding bug.** Also: the first run of the
form check read `stub-seen.json[0]` and got the *previous* curl submission, since
the stub rewrites the whole array. A surprising reading is the harness first.

**Not verified, stated plainly.** The admin card was not driven in a browser -
signing in needs an OTP emailed to a real address, which this environment has no
access to; it follows the identical `requireRole` + `adminSelect` pattern as
every existing card, and an unauthenticated caller getting 404 **was** verified.
The service role key in `.env.local` is present but rejected by Supabase (401),
so nothing was checked against the live database. And the PayPal side - a real
pro subscription, its activation webhook and its cancellation - is unverified
live, like every payment change in this log.

**One judgement recorded rather than smoothed over.** Premium's real monthly
capacity is about one full planning session, and the pro card states its capacity
while premium's cell in the comparison table deliberately does not. Stating it
would be more honest and it would make pro's step up obvious - but it is
repositioning an existing product inside a task that said to leave ₪19.90 as it
is. It is in the summary and in TODO.md for Netanel to decide, not decided here.

### 2026-08-22 (b) - PayPal revise: one subscription instead of two, and the field that must decide the plan

Netanel: build it. The previous entry left the premium-to-pro switch refused
(`switch-requires-support`) because creating a second PayPal subscription does
not replace the first - PayPal bills both, and the customer discovers it on the
one path where they were actively trying to give us more money.

**`revise` changes the plan on the subscription that already exists**, so there
is only ever one. `reviseSubscription()` POSTs to
`/v1/billing/subscriptions/{id}/revise` and returns the approval link; like
`createSubscription` it **grants nothing** - `plan='pro'` is written only by the
verified webhook.

---

**The bug this whole design is arranged around, and it is not obvious.**

`custom_id` is fixed when a subscription is created and PayPal echoes that exact
string back forever. It carries the tier (`<uuid>|pro`) since the pro plan
existed - which is correct for a *new* subscription and **wrong for a revised
one**. A premium subscriber who upgrades still carries a custom_id saying
premium, so reading the plan from it on the UPDATED event would **demote the
person on the very webhook confirming they now pay more**.

So `planIdToPlan()` reverses the app_flags lookup - `plan_id` is the only field
on that event that reflects the change - and the webhook reads it first.
custom_id survives only as the fallback for a subscription created before the
pro plan existed, and it resolves to **premium, the cheaper plan**, so a failed
lookup under-grants (visible, they tell us) rather than over-grants (invisible,
we pay).

**And an UPDATED event whose plan we cannot identify changes nothing at all.**
On this path "I do not know" must never mean "assume the old value still holds",
because the event exists precisely because something changed. Fail closed, log
it, leave it to a human.

**Three tests, and the first one is the point.** Proven to guard by injecting the
exact bug - replacing `fromPlanId ?? sub.plan` with `sub.plan` - which fails the
named test *and* the pro-activation test, while the back-compat test still
passes, confirming that one really does exercise the fallback rather than the
primary path.

---

**Three ways the switch legitimately cannot proceed**, and each falls back to the
manual path **and never to `createSubscription`** - the fallback that looks
helpful is exactly the double charge this branch exists to prevent:

- the current plan did not come from PayPal (an admin grant or a promo code has
  no subscription to revise) - the same `plan_source === 'paypal'` guard
  `cancelPaypalPremium` already uses;
- we hold no `paypal_subscription_id` for them;
- PayPal declines, or returns no approval link. A missing link is a failure and
  not a silent success, because "we changed your plan" is not something to
  assume.

**Downgrades are deliberately still manual.** `revise` can do them, but
proration, credit and a refund for the unused remainder are a money decision I
cannot answer or test from here, and getting it wrong takes money from somebody.

**Cancellation after an upgrade still works** - `revise` does not touch
`plan_source`, so a cancelled pro subscription falls to free like any other.
There is a test for that, because it is the kind of thing an upgrade path
quietly breaks.

**Verified:** 706 tests (6 new), tsc, build and lint clean on every touched file.
**Not verified against real PayPal** - no sandbox credentials here, so the revise
call itself, its approval redirect and the UPDATED webhook are unexercised
outside the mock. That is the one thing Netanel has to run before trusting it.

### 2026-08-22 (c) - The four open decisions, decided - and one of them moved a cap

Netanel: "just make up something reasonable. think well before doing so." The
four items left open by the pricing rework, closed here.

---

**The two that turned out to be one decision.** Whether to state premium's
capacity on the card, and whether its cap should move, looked independent and
were not. The rule this project already applies to pro is that **a stated
promise must hold at the WORST case, not the typical one** - and measured
against a $2.00 cap:

| | cost | of a $2.00 cap |
|---|---|---|
| typical session (1 build + 15 turns) | $1.475 | 74% |
| **long session (1 build + 24 turns)** | **$2.040** | **102%** |

So the moment the card says "a full trip a month", a subscriber who plans that
one trip and then keeps editing it gets cut off - having used the plan exactly
as intended. That is the broken-promise-and-a-refund case, and it is why
premium's capacity had never been stated: at $2.00 there was no true sentence
to write.

**So the cap moved to $2.50** and the sentence is now true: a long single
session is 82% of it, and two typical sessions ($2.95) still do not fit - which
makes "one trip a month, however much you edit it" exactly right rather than
approximately right.

**What it costs, and why it is smaller than it looks.** Gross margin 50% → 37%.
But this is a **ceiling, not an expectation**: nearly every subscriber plans one
trip from a warm cache and costs a small fraction of it, so blended margin
barely moves. The cap binds only on the heaviest user - who is precisely the
person we would rather serve than block.

**And it made the two paid tiers one structure instead of two numbers.** Pro is
37% at a $12.00 cap; premium is now 37% at $2.50. That is worth having as a
property rather than a coincidence, so there is a test asserting both stay above
30% and within 8 points of each other. If a future price change splits them, the
pricing page's "here is the honest arithmetic" section stops being one argument.

**The old test fired and told me what to fix, which is the whole point of having
written it that way.** It asserted the opposite - that a long session did *not*
fit - with the message "if these now fit, the cap was raised and you need to
update the comment that says it covers one session only". It failed on the first
run after the change, named itself, and was rewritten to the new claim.

---

**Pro's $12.00 cap: unchanged.** $7.00 of absolute margin per subscriber is 3.5x
what a premium subscriber yields in total; there was nothing to fix.

---

**Agent pricing: ~₪15 per planned trip, floor ₪249/month.**

The unit is per-trip because that is **what actually drives our cost** (a full
trip is ~$1.5 typical, $2.04 worst) and because it is the unit an agent already
thinks in - they price their own work per trip. Per-seat would be the other
obvious axis and we cannot honestly bill on it: there is no multi-user account.

Bands, each checked against the **worst** case rather than the average, leaving
~35%+ margin:

| trips/month | price | ≈ per trip |
|---|---|---|
| up to 15 | ₪249 | ₪16.6 |
| up to 40 | ₪599 | ₪15.0 |
| up to 80 | ₪1,190 | ₪14.9 |

The floor matters more than the ceiling: below ₪249 a single business customer
does not repay the support cost of having one.

**And the recommendation that is not a number: give the first three a pilot** -
₪149/month for three months against feedback and a quotable line. There is not
one agent-specific feature in the product; charging ₪599 on day one and then
discovering they needed multi-seat is a worse trade than a few hundred shekels a
month. Finding out what they actually lack is the thing being bought here.

**It lives in the /admin leads card, not in a document.** Admin-only, so an
internal number is fine there - and it is read at the moment a lead is being
answered rather than in a file nobody opens with the phone in hand.

---

**Also:** "כתבו לנו" appeared twice on the pricing page and linked nowhere,
while `/contact` exists with a real address on it. Both now link.

**Verified:** 707 tests (1 new - the margin-structure guard; the capacity test
rewritten rather than added), tsc, build and lint clean on every touched file,
and 35/35 in the browser at 390px and 1400px re-run against the rebuilt page
with the new premium line rendering.

### 2026-08-22 (d) - "Looks too detaily" - the same four things, read twice; and pro becomes ₪89.90

Netanel, on the rebuilt pricing page: *"everything is good, but i dont like this
design much - looks to detaily."* Content fine, density not.

**Two causes, and both were duplication rather than volume of information.**

**1. The chooser strip was a phone affordance rendered at every width.** Four
rows of emoji + name + who-it-is-for + price, sitting directly above three cards
carrying the same names, the same audiences and the same prices. On a phone it
earns its place - it lets somebody skip the two plans they were never going to
buy. **At desktop width the three cards are already side by side**, so the strip
stopped being a shortcut and became sixteen fragments to read before reaching a
plan. It is `sm:hidden` now, and on the phone it lost its subtitle line: emoji,
name, price, one line each.

**2. The premium card had boxes nested inside a box while its neighbours used
plain lists.** Three tinted sub-cards, each a heading plus a paragraph. Nested
cards are the classic over-detailed signal, and worse here, they broke the one
job a pricing grid has: **all three columns must have the same shape so a reader
can compare by scanning across rather than reading each one.** Flattened to
check-lines matching the other two, and the pro card's grey "who is this for" box
went the same way - a quiet line above a hairline rule instead of a fourth box.

Also: the intro was an inventory of seven free things followed by an explanation
of what costs money. It is one sentence now.

**Result at 390px: 5,269px of page down to 5,092**, and at 1400px the entire
three-plan comparison plus the check card now fits without scrolling. The
reduction is not the point - the point is that the three cards read as one
system.

---

**Mid-session, from Netanel: pro is ₪89.90, not ₪89.**

Re-ran the arithmetic rather than just changing the constant: net moves $18.99 →
**$19.18**, so the $12.00 cap is still 37% margin and the price ratio against
premium is 4.5x rather than 4.47x. Every quoted figure in the `SUBSCRIBER_CAP_USD`
comment was updated with it - the table, the fee percentage, the margin
comparison - because a comment that carries arithmetic is wrong the moment one
input moves.

**Two formatting bugs the change created, both caught by looking:**

- `ils()` existed because `89` rendered as "89" in a heading and "89.00" on the
  button beneath it. With 89.90 both prices now carry agorot, so the helper is
  temporarily indistinguishable from `toFixed(2)` - its comment says so, and it
  stays for the derived figures and for the next round price.
- A year of pro rendered **"1,078.8"** - `toLocaleString('he-IL')` with no
  options drops the trailing zero. New `ilsBig()` pins two decimals.

**One grep that lied, and it is the same trap as before.** Checking the served
HTML for `1,078.80 ₪` found nothing, because **React splits a JSX interpolation
with `<!-- -->` comment nodes** - the string in the markup is
`1,078.80<!-- --> ₪`. The value was correct the whole time. This log already
records that trap once; recording it again because it cost a second look.

**Verified:** 707 tests, tsc, build and lint clean, 35/35 in a real browser at
390px and 1400px on the rebuilt page. The chooser assertion now counts **visible**
rows rather than DOM nodes - with `sm:hidden` the old check would have kept
passing while the user saw nothing - so it asserts four at 390 and zero at 1400.

### 2026-08-22 (e) - "Is there an option for me to give out premium and pro?" - the API said yes, the dashboard said no

Netanel asked. The honest answer was **half** - and the half that was missing is
the half he would actually use.

`/api/admin/plan` has accepted `plan: 'pro'` since the tier was built. **The
admin UI never sent it**, so every grant silently became premium and pro was
unreachable from the screen where grants are made. A capability that exists and
cannot be reached is the same as one that does not exist, and this one was mine:
I added the parameter and never wired the control.

Promo codes were worse - not a wiring gap but a missing column. `promo_codes`
had nowhere to record which plan a code hands out, so the route hardcoded
premium. A code could never grant pro at all.

---

**What changed.**

- **The traveller card** gains a plan selector beside the days field. The button
  relabels with it (`פרו ל-30 ימים`), and the confirmation message names the
  plan **from the server's response** rather than from the local toggle - the
  message has to describe what was written, not what was requested.
- **`sql/supabase-promo-plan.sql`** adds `plan` to `promo_codes`, defaulting to
  premium with a check constraint pinning it to the two known values. Every code
  that already exists keeps granting exactly what it granted yesterday.
- **`redeem_promo` is deliberately untouched.** It is the security-definer
  function doing the atomic part - the row lock, the redemption count, the
  double-redeem primary key - and it returns days. The plan is read separately
  from the same row afterwards, so the thing that must be atomic stays exactly
  as atomic as it was, and nothing that already redeems can break.
- **A missing column falls back to premium**, so the feature degrades to
  yesterday's behaviour rather than failing, on the same ladder `fetchProfile`
  already uses for `plan`/`role`.
- The promo card gains the same selector and each listed code now shows which
  plan it hands out.

---

**The rule worth extracting, because it is about money and not display.**

`grantedPlanFor(current, offered)` returns the **better** of the two. A premium
promo code redeemed by an active pro subscriber must not move them down - they
would be the ones to discover it, having just been handed what looked like a
gift. Same for an admin granting premium to somebody already on pro.

It replaces a condition that was already in the redeem route but expressed as a
one-off `planAtLeast(currentPlan, 'pro') ? 'pro' : 'premium'`, which happened to
be correct for two tiers and would quietly stop being correct at three. Now it
is one function with a test, **proven to fire** by replacing its body with
`offered` - the named case fails immediately.

**Verified:** 708 tests (1 new), tsc, build and lint clean on every touched file.
**Not verified live** - the admin screen still needs an OTP login this
environment cannot receive, and the promo column does not exist in the database
until the SQL is run. What the fallback guarantees is that until then, promo
codes behave exactly as they did before.
