# Handoff: the features session

Written 2026-07-26 by the data/photos session, for a parallel chat that will
own **features, UX and product code**. Two sessions are running against the
same repo at the same time, so read section 2 before you touch anything.

---

## 1. Who owns what

| Area | Owner |
| --- | --- |
| `src/data/destinations.ts` | **data session (not you)** |
| `src/data/countries.ts` | **data session (not you)** |
| `src/data/worldCountries.ts` | **data session (not you)** |
| `scripts/fetch-photos.mjs`, `scripts/apply-photos.mjs`, `scripts/verify-photos.mjs`, `scripts/lib/` | **data session (not you)** |
| `photo-report.json` | **data session (not you)** |
| Everything else: components, routes, `src/lib/**`, API routes, styling, config | **you** |

The data session is filling 610 missing place photos and then resuming
catalog expansion. Those are enormous mechanical diffs in two files. If you
also edit them, every merge is a conflict resolved by hand across thousands
of lines, and a bad resolution silently deletes curated content.

**If a feature genuinely needs a new field on `Place`, `Destination` or
`Country`:** edit `src/lib/types.ts` (yours) and say so in the chat. Do not
backfill values across `destinations.ts` yourself - hand that to the data
session. A new field must be optional so the existing ~1,114 places still
typecheck.

## 2. Working alongside a second session on `main`

Both sessions push to `main` on `github.com/netanelyan/tiyul-plus`.

1. `git pull --rebase origin main` **before you start** and **again right
   before every push**. Never `git push --force`.
2. Commit in small, focused commits. A 40-file commit that also touches data
   is unrecoverable in a rebase.
3. **The `## Session log` in `CLAUDE.md` is the one shared file you will both
   touch.** It is append-at-the-bottom, so it conflicts on nearly every
   rebase. The routine: finish your work commits, push them, then
   `git pull --rebase`, *then* write the log entry as its own commit, then
   push again immediately. Keep the window between writing and pushing the
   log entry as short as possible. If you hit a conflict there, the
   resolution is always "keep both entries" - never drop the other session's.
4. If a rebase conflicts inside `src/data/*.ts`, you have edited a file you
   do not own. `git checkout --theirs` the data file, drop your change, and
   raise it in chat.

## 3. Project rules you cannot break

These come from `CLAUDE.md` and from Netanel directly. They are not
negotiable and they are not stylistic preferences.

1. **Full Hebrew RTL, always.** Never regress it. All UI copy is Hebrew.
2. **No fabricated content.** No invented places, opening hours, prices,
   flight routes or kashrut claims. Where something is unknown the product
   says so ("לוודא מול המקום"). If you cannot verify a fact, do not ship it.
3. **Kosher caveats stay in.** `KosherBadge.tsx` is the only component that
   renders kosher status, and the policy (set by Netanel 2026-07-25) is: show
   the supervision as *reported*, plus a quiet "לוודא מול המקום". There is
   deliberately no per-entry verified/pending system in the UI.
4. **`PlacesProvider` stays intact.** The app talks only to that interface;
   external APIs enrich curated data, they never replace it.
5. **API keys only in `.env.local` / Vercel env vars.** Never in the repo.
6. **No new heavy dependencies without asking Netanel first.**
7. **Every session ends with:** `npm run build` passing, a commit and push,
   and a dated `## Session log` entry appended to the bottom of `CLAUDE.md`
   **as a separate commit**.
8. **Formatting:** never use an em dash - use a single hyphen or commas.
   Never put an ASCII apostrophe inside a single-quoted Hebrew TS string; use
   `׳` (U+05F3). `SYSTEM_PROMPT` in `src/app/api/chat/route.ts` is a template
   literal - never put a backtick inside it (this has caused TS1005 errors
   that were painful to unpick).

## 4. Where the code is

Next.js 16 App Router + Turbopack, React 19, TypeScript strict, Tailwind v4
with `@theme` tokens. Palette: night `#241b4d`, sunset `#ff5941`, zest
`#ffc531`, cream `#fdf6ec`, shell `#fffdf8`. Cream background, night text,
sunset as the single accent, zest only as a rare small highlight. Reuse the
tokens; do not invent new colours.

The full architecture map is in `CLAUDE.md` under `## Architecture map` and
it is current as of commit `a1b92c0`. The short version:

- `src/components/TripWorkspace.tsx` - **the** unified trip view (itinerary +
  map + chat), used by both `/chat` and `/planner`. ~1,000 lines. Most
  feature work lands here or in a child of it.
- `src/components/AgentWorkspace.tsx` - landing hero, then TripWorkspace.
  Handles `?q=` / `?kosher=1` / `?trip=`.
- `src/components/ChatPanel.tsx` - presentational chat UI, rendered twice
  (desktop column + mobile drawer) sharing one state.
- `src/lib/trip/useTripChat.ts` - conversation state hook; streams
  `/api/chat`, per-trip history in `chatStorage`, `upsertTrip` on every
  `{trip}` event.
- `src/app/api/chat/route.ts` - server-side Anthropic tool-use loop,
  streaming SSE events of type `status | text | meta | trip | explored |
  quickReplies | done`. Without an API key a rule-based Hebrew responder
  takes over. Max 16 tool iterations.
- `src/lib/trip/agent.ts` - tool definitions + a strictly-validated
  **synchronous** executor. Two tools are async and are special-cased inside
  `runAgent` in the route: `explore_destination` and `add_pin`.
- `src/components/PlacesMap.tsx` / `MapInner.tsx` - Leaflet, client-only.
  `PlacesMap` is a 19-line `ssr:false` wrapper that forwards props verbatim,
  so a new `MapProps` field needs no change there.
- `src/lib/booking.ts` - the booking layer. **The agent never produces
  links.** `buildBookingUrl(kind, query)` composes them deterministically
  from config. All affiliate fields are currently `null`, so links fall back
  to the provider's public URL with no invented tracking parameters.

## 5. Traps that have already cost time

- **`npx tsc --noEmit` must be run with an explicit `cd` into the repo root**,
  otherwise it silently prints help text and looks like it passed. Confirm
  with `npx tsc --noEmit; echo "TSC_EXIT=$?"`.
- **Read `tsc` output separately from `npm run build`.** The build can pass
  while `tsc` fails.
- **`npm run lint` reports 29 problems / 25 errors that are all
  pre-existing** (e.g. `react-hooks/set-state-in-effect` at
  `useTripChat.ts:221`). Verify your own work by grepping the lint output for
  the specific file paths you touched. Zero hits means you added nothing.
- **The `useMemo` on `flat` in `MapInner.tsx` is load-bearing.** A freshly
  allocated array on each render made the map snap back on every zoom. The
  `bounds` memo follows the same discipline for the same reason. Do not
  "simplify" either of them.
- `Destination` has **`countrySlug`, not `country`**. This has caused a bug
  before.
- Next.js 16: `params` / `searchParams` are async - await them. `ssr: false`
  dynamic imports only inside client components.
- Leaflet touches `window`; keep it client-only. Map internals are LTR by
  design (`.leaflet-container`); popups are RTL.
- Windows + npm: if install fails on `@tailwindcss/oxide-win32-x64-msvc`,
  delete `node_modules` and `package-lock.json` and reinstall (npm
  optional-deps bug with cross-platform lockfiles).
- **Sandbox egress is heavily restricted.** In the cloud container every
  Wikimedia, OpenStreetMap, Unsplash and Google host returns `000` (the proxy
  answers `403` to the CONNECT). `WebSearch` and `WebFetch` work for most
  ordinary sites. Grey map tiles and gradient photo fallbacks in a sandbox
  are expected, not bugs. `src/lib/server/geocode.ts` has therefore **never
  been exercised live** - first real verification happens in production.

## 6. Recently shipped, so you do not rebuild it

- `dfc7b36` + `a1b92c0` - **traveler pins on the map.** `add_pin` /
  `remove_pin` agent tools, `src/lib/server/geocode.ts` (Nominatim then
  Photon, zero new deps), `PinsPanel.tsx`, draggable pins in `MapInner`, and
  a `PINS` section in `SYSTEM_PROMPT`. Design decision worth preserving: the
  resolved geocode is passed to `executeAgentTool` as a **separate fifth
  parameter**, never inside `input`, so model-supplied coordinates are
  structurally impossible rather than merely filtered. A failed lookup saves
  the pin marked "מיקום לא אומת" and offers manual placement - it never
  guesses the city centre.
- `f3e4435` + `0cd8087` - image attachments in the agent chat, with a daily
  cap.

## 7. The feature backlog (from `TODO.md`)

Netanel's input is needed on the first three; the rest are buildable now.

**Needs Netanel:**

- **Affiliate IDs.** The booking layer is built and waiting. `src/lib/booking.ts`
  is the single source of truth for both the homepage services grid and the
  "מה עוד חסר לטיול" panel. To wire a partner: fill
  `affiliate: { template, idKey }` and put the ID in `NEXT_PUBLIC_AFFILIATE_*`.
  Today Skyscanner / Booking.com / GetYourGuide / Airalo link to public sites
  with no tracking params; insurance and car rental render as "בקרוב".
- **Accessibility statement** (`src/app/accessibility/page.tsx`) still has
  `[למילוי]` placeholders - real coordinator name, contact, last-tested date.
  Do not invent these.
- **Link extraction (Reels/TikTok/YouTube).** Only YouTube is realistically
  extractable and it needs a paid transcript API or a fragile scrape
  dependency - that is a hard-rule-6 decision. `/start` currently detects the
  platform and says so honestly.

**Buildable now:**

- **Accessibility pass** (probably the highest-value item here). Muted text
  (`text-night/40-45` on cream) and small white-on-sunset text fall below
  WCAG AA 4.5:1. Leaflet map markers are not keyboard-reachable. There is no
  global visible focus ring - only the a11y button has one. A focus-ring plus
  muted-text-contrast pass closes most of it.
- **Phase 3 leftovers:** site-wide search (Hebrew **and** local names), top-10
  collections, audience filters, a mobile-first polish pass.
- **Phase 4:** read-only shareable trip URLs, WhatsApp share cards, print/PDF
  polish, then lightweight cross-device accounts.
- **A unit test for `src/lib/server/geocode.ts`.** There is no coverage and
  it could not be exercised live. `GEOCODE_NOMINATIM` and `GEOCODE_PHOTON`
  are env-overridable specifically so the path can be pointed at a stub. This
  is a genuinely good first task.
  (`BookingPanel`'s per-city query already landed in `dfc7b36` - it no longer
  derives the search from `trip.citySlugs[0]` only. Nothing to do there.)

## 8. Blocked on Netanel outside the code

Recorded in `TODO.md`; do not try to do these for him, and never enter his
credentials into a third-party dashboard on his behalf:

- run `supabase-premium.sql` and `supabase-community.sql` in the SQL editor
- add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and Vercel (server secret)
- create the Stripe product and Price, fill `STRIPE_SECRET_KEY`,
  `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- confirm the 19.90 ₪/month price matches `PREMIUM_PRICE_ILS` in
  `src/lib/plans.ts`
- live-test a real My Maps import link

## 9. Known content debt (data session's problem, not yours)

Mentioned only so you do not report it as a bug: 610 of 1,114 places have no
`photo` and fall back to a gradient, kosher `lastChecked` is
`pending-review` on all 37 kosher entries, and the chat grounding index sits
at roughly 157k of a ~190k character ceiling, leaving room for about 30 more
destinations.
