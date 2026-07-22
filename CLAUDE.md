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

## Commands

```bash
npm run dev      # dev server on :3000
npm run build    # MUST pass before every commit
npm run lint
```

## Architecture map

- `src/data/destinations.ts` - curated content, 8 cities (Hebrew). Adding a
  destination here lights it up across the whole site. This data is the
  product's moat; quality > quantity.
- `src/lib/types.ts` - domain types + `PlacesProvider` interface. The app
  talks ONLY to this interface.
- `src/lib/providers/` - `sample` (default, keyless), `google` (Places API
  New), `tripadvisor` (Content API). Selected via
  `NEXT_PUBLIC_PLACES_PROVIDER`. External APIs ENRICH curated data, never
  replace it.
- `src/lib/trip/` - the Trip domain: types, localStorage-backed `storage.ts`
  (designed to be swapped for a backend without touching components),
  `TripContext.tsx` (React context + all mutations), `generate.ts` (wizard
  scoring + geographic day-packing), `travel.ts` (static inter-city legs).
- `src/app/api/chat/route.ts` - chat backend. Uses Claude when
  `ANTHROPIC_API_KEY` is set (grounded in destinations data via system
  prompt), falls back to a rule-based Hebrew responder without a key.
- `src/components/` - `PlacesMap`/`MapInner` (Leaflet, client-only),
  `AddToTripButton`, `TripChip`.
- `src/app/layout.tsx` - RTL shell, fonts, TripProvider, BlackZ trademark
  footer (web component in `public/blackz-signature.js` - must appear on
  every page).
- Design system: Tailwind 4 `@theme` tokens in `src/app/globals.css`
  (night/sunset/zest/cream palette, bold & playful). Reuse these tokens; do
  not invent new palettes.

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

## Roadmap (execute one phase per session, in order)

- **Phase 1 - Agent Core**: make the chat a real agent. Claude tool-use over
  the trip store: create trip, add/remove/reorder stops and days, set
  preferences; UI reflects changes live (trip visible alongside the
  conversation). A preferences object (dates, party, budget, pace, kosher,
  Shabbat-aware, shopping, interests) collected conversationally, stored on
  the trip, honored by agent AND wizard. Rule-based responder stays as
  keyless dev fallback.
- **Phase 2 - Content Engine**: deepen all 8 cities to 20+ places each:
  per-place photos (verified URLs + gradient fallback), price levels,
  audience tags (families/nightlife/romantic), must-see flags; kosher entries
  get a verification object (source, lastChecked, supervision) shown as an
  honest trust badge.
- **Phase 3 - Agent-First UX**: homepage leads with the conversation;
  site-wide search (Hebrew + local names), top-10 collections, audience
  filters; mobile-first polish pass.
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
