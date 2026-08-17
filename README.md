# טיול+ (Tiyul+) ✈️

**An AI travel agent that speaks Hebrew.** Tell it where, when and who's
coming - it plans a real, mapped, day-by-day trip in conversation, edits it
on request, and shows its work on an interactive map. Built for Israeli
travelers: native Hebrew RTL everywhere, flights-from-TLV / visa / eSIM
practicalities per destination, and kosher & Shabbat awareness as
preferences - respected when chosen, never assumed.

**Live:** [tiyulplus.com](https://www.tiyulplus.com) · Part of **BlackZ**.

## What it does

- 💬 **The agent** (`/chat`) - a Claude-driven planning loop grounded in the
  site's curated catalog. It builds and edits trips with validated tools, so
  it can never invent a place, price or kashrut status; without an API key
  it falls back to a rule-based Hebrew responder.
- 🗺️ **A curated catalog** - **166 destinations across 83 countries,
  1,814 places**, all in Hebrew, with verified photos and coordinates,
  country-level practical info written for Israelis, and a calendar of
  events and closures that reshape trips.
- 🧳 **One trip, one screen** - itinerary + map + conversation together, at
  `/chat` and `/planner` on the same trip object. Day-by-day Google Maps
  navigation (coordinates, never names), trip dates with Hebrew calendar
  awareness, a printable trip book with place descriptions and optional
  Shabbat & kosher annexes.
- ✡️ **Kosher & Shabbat layer (opt-in)** - kosher venues with supervision
  as reported (plus an honest "verify with the venue" caveat), and
  astronomically computed candle-lighting / havdala times for every Shabbat
  of the trip, in the destination's real local clock.
- 🔗 **Sharing** - read-only trip links (`/t/<code>`), public trip-story
  pages with photos (`/story/<slug>`), and group trips where friends join
  by invite link, see the live plan and vote on stops (`/join/<code>`).
- 👤 **Accounts** - email-OTP login (Supabase), cross-device trip sync, a
  countries-passport, and a travelers community with public profiles.
- 🛫 **Pre-departure check** - a paid one-time re-validation of a specific
  trip (closures, holidays, kosher records, route order) close to the
  departure date; included in the premium subscription.
- 📱 **Installable & offline** - a PWA that keeps the trip readable abroad
  with no connection.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. **Works with zero API keys** - the catalog, the
planner and a rule-based chat all run keyless. Optional keys (see
`.env.example`): `ANTHROPIC_API_KEY` for the real agent, Supabase for
accounts/sync/sharing, PayPal for payments.

```bash
npm run build   # must pass before every commit
npm test        # unit tests (node:test, zero test dependencies)
npm run lint
```

## Architecture notes

- **Next.js 16 (App Router) + Tailwind 4 + react-leaflet** (CARTO/OSM
  tiles, keyless). Hebrew RTL is a hard rule across every surface.
- The app talks only to a `PlacesProvider` interface (`src/lib/types.ts`);
  external APIs enrich the curated data, never replace it.
- Curated content lives in `src/data/countries.ts` and
  `src/data/destinations.ts` - adding a destination there lights it up
  across the catalog, the planner and the agent's grounding automatically.
  `scripts/validate-catalog.mjs` and `scripts/verify-photos.mjs` guard it.
- The agent (`src/lib/trip/agent.ts` + `/api/chat`) is a server-side
  tool-use loop with strict server-side validation of every place id, model
  routing by task (strong model for planning, light model for mechanical
  edits), prompt caching, and real cost controls (daily budget, per-caller
  caps, quotas).
- Trips persist in the browser behind a small storage module and sync to
  Supabase when signed in; deletion uses tombstones so it propagates across
  devices.
- No heavy dependencies by policy - the only notable runtime additions over
  the years are `@supabase/supabase-js` and `react-leaflet`.

## Disclaimer

The content is AI-collected and hand-curated from public sources. Kashrut,
opening hours and prices change - always verify with the venues before
traveling.
