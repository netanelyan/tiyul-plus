# טיול+ (Tiyul+) 🧭

**Trip planning that speaks Hebrew.** A travel-planning web app built for Israeli
travelers: full RTL Hebrew UI, day-by-day itineraries on an interactive map, a
kosher food layer, and the practical info Israelis actually need (direct flights
from TLV, visas, eSIM, payments).

Part of **BlackZ**.

## Features

- 🗺️ **8 destinations** with curated Hebrew content: Vienna, Bratislava, Prague, Budapest, Rome, Athens, Barcelona, Berlin
- 🧳 **Trip builder** - create trips, add places from any page, reorder days and stops, multi-city trips with travel legs
- 🪄 **Smart wizard** - pick cities, days, pace, trip type (city/nature/combined), shopping level and kosher preference; get a generated, editable itinerary
- ✡️ **Kosher layer** - kosher restaurants and markets with supervision notes, marked on every map
- 💬 **Hebrew travel chat** - grounded in the site's data, with a map under every answer (plugs into Claude via `ANTHROPIC_API_KEY`)
- 🧭 **Google Maps handoff** - open any day as a ready navigation route

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Works with zero API keys.

## Architecture notes

- **Next.js 16 (App Router) + Tailwind 4 + react-leaflet** (OpenStreetMap tiles, no key)
- The app talks only to a `PlacesProvider` interface (`src/lib/types.ts`).
  Swap data sources via `.env`: `NEXT_PUBLIC_PLACES_PROVIDER=sample | google | tripadvisor`
  (adapters for Google Places API (New) and TripAdvisor Content API are included)
- Curated content lives in `src/data/destinations.ts` - adding a destination there
  lights it up across the whole site
- Trips persist in the browser behind a small storage module (`src/lib/trip/storage.ts`),
  designed to be replaced by a real backend without touching components
- See `.env.example` for all configuration

## Disclaimer

Sample data is hand-curated for demonstration. Kashrut, opening hours and prices
change - always verify with the venues before traveling.
