# tiyul+ (טיול+) - Handoff

This file explains the project to someone picking it up cold. It is the
orientation document; `CLAUDE.md` is the operating manual and the session
history, and `TODO.md` is the open-items list. Read this first, then
CLAUDE.md.

---

## What the product is

tiyul+ is a Hebrew, right-to-left AI travel-planning site for Israeli
travelers. Live at **tiyulplus.com**, deployed from
`github.com/netanelyan/tiyul-plus` (public repo) through Vercel. Owner:
Netanel.

A traveler describes a trip in Hebrew, an AI agent builds a real
itinerary, and a map renders it. The distinguishing idea is that the
agent is not free to invent. It plans strictly out of a hand-curated
catalog of destinations and places that we wrote and verified ourselves.
That catalog is the moat. Anyone can wire an LLM to a chat box; the
value here is that when the site says a place exists, has those hours,
or has that kashrut supervision, it is true.

Everything downstream follows from that single commitment. The agent
never produces links, because a fabricated URL is a fabrication. Booking
links are composed deterministically in code from a provider config. Map
pins that could not be located are shown as unlocated rather than
guessed to the city centre. Kosher badges show supervision exactly as it
was reported, with a "verify with the venue" tail, and there is a
site-level disclosure that the data was collected by AI from public
sources.

## Current scale

127 destinations across 62 countries, roughly 1,100 places. All Hebrew.
Re-count with a grep before quoting these numbers anywhere; they move.

## Stack

Next.js 16 App Router with Turbopack, React 19, TypeScript strict,
Tailwind v4 using `@theme` tokens. Leaflet for maps. No heavy
dependencies beyond that, and adding one requires Netanel's explicit
approval.

Design tokens: night `#241b4d`, sunset `#ff5941`, zest `#ffc531`, cream
`#fdf6ec`, shell `#fffdf8`. Cream background, night text, sunset as the
single accent for primary buttons and active states, zest only as a rare
small highlight. Reuse these; do not invent new palettes.

## How the pieces fit

**The data layer.** `src/data/countries.ts` holds country-level facts
(visa, currency, sim, payments) shared by every city in that country.
`src/data/destinations.ts` holds the cities and their places, each
joined back by `countrySlug`. A place carries a photo URL, a price
level, tags from a fixed set, a `mustSee` flag, and for kosher entries a
`kosherVerification` object. City-level `practical` holds only what is
genuinely city-level: flights, getting around, kosher overview.

**The provider interface.** `src/lib/types.ts` defines `PlacesProvider`.
The app talks only to this interface. There are three implementations:
`sample` (the default, keyless, reads our curated data), `google`
(Places API New) and `tripadvisor` (Content API). External APIs enrich
curated data; they never replace it.

**The agent.** `src/app/api/chat/route.ts` runs a server-side Anthropic
tool-use loop. The client posts its current trip, tools defined in
`src/lib/trip/agent.ts` mutate an in-memory copy under strict
validation, and the response streams back as `text/event-stream` JSON
events: `status`, `text`, `meta`, `trip`, `explored`, `quickReplies`,
`done`. Without an API key it degrades to a rule-based Hebrew responder,
so the site is never broken by a missing key.

Grounding is two-tier. `buildGroundingIndex()` is static, cached, and
carries `cache_control`; `buildGroundingDetail(slugs)` loads the full
text for the handful of destinations actually in play. The index was
last measured at 157,269 characters against a ceiling of roughly
190,000, which is about 30 more destinations of headroom. Measure before
growing the catalog.

**The trip domain.** `src/lib/trip/` contains the types, a
localStorage-backed `storage.ts` deliberately shaped so it can be
swapped for a real backend without touching components,
`TripContext.tsx` (context plus every mutation, including `upsertTrip`
which is how the agent writes), `generate.ts` (wizard scoring and
geographic day-packing), and `travel.ts` (static inter-city legs).

**The UI.** `TripWorkspace` is the unified trip view: itinerary, map and
chat on one screen, used by both `/chat` and `/planner`. `ChatPanel` is
presentational and is rendered twice, once as a desktop column and once
as a mobile drawer, both driven by a single `useTripChat` instance.
`PlacesMap` is a thin `ssr:false` wrapper that forwards every prop to
`MapInner`, where the actual Leaflet work lives.

## Non-negotiable rules

These are in CLAUDE.md as well, and they are the ones that actually get
violated by newcomers.

1. **RTL is never regressed.** The whole site is Hebrew right-to-left.
2. **Nothing is fabricated.** No invented places, hours, prices, or
   kashrut supervision. If a fact cannot be verified, it does not ship.
   "Probably" is not a source.
3. `PlacesProvider` stays intact as the only path to place data.
4. API keys live in `.env.local` or Vercel environment variables. Never
   in the repo, ever.
5. No new heavy dependencies without Netanel's explicit approval.
6. Every session ends with the build passing, work committed and pushed,
   and a dated `## Session log` entry appended to CLAUDE.md **as its own
   separate commit**.

## Practical gotchas that cost real time

Run `npx tsc --noEmit` with an explicit `cd` into the repo root,
otherwise it silently prints help text instead of typechecking. Read its
output separately from `npm run build`, because the build can pass while
tsc fails.

`npm run lint` currently reports 29 problems, 25 of them errors, and all
of them are pre-existing. Do not try to get it to zero as a side quest.
Verify your own work by grepping the lint output for the specific file
paths you touched; no hits means you added nothing.

`SYSTEM_PROMPT` in `route.ts` is a template literal. A backtick anywhere
inside it terminates the string and produces confusing syntax errors far
from the real cause.

Never put an ASCII apostrophe inside a single-quoted Hebrew TypeScript
string. Use the Hebrew geresh ׳ (U+05F3) instead.

Memoize anything you pass to Leaflet. A freshly allocated array on every
render made the map snap back to its default view on every zoom. Both
the `flat` memo and the `bounds` memo in `MapInner` exist for that
reason and are load-bearing.

Wikimedia thumbnail URLs accept only widths 250, 330, 500 and 960
pixels. Anything else 404s. Run `node scripts/verify-photos.mjs` after
touching any photo. If it returns 403 on every URL with an empty cache,
that means the sandbox is being blocked wholesale, not that photos
regressed.

The development sandbox has **no outbound network access from bash**.
Nominatim, Photon, Wikipedia and Wikimedia all return HTTP 000. This is
environmental and cannot be worked around from inside. It blocks live
geocoder testing and it blocks photo verification.

## The most recent feature: traveler pins

Shipped in commits `dfc7b36` (feature) and `a1b92c0` (session log). The
request was: when a traveler tells the AI about their hotel, it should
appear on the map, the AI should proactively ask about accommodation,
and affiliate links should be offered where nothing is booked yet.

Three product decisions were settled with Netanel up front. Locations
come from a server-side OpenStreetMap lookup, free and keyless. Pin
types are stays, reservations (restaurant or activity) and free-form
pins; airports, stations and car pickup were deliberately excluded. The
agent asks about accommodation one city per turn, in trip order, and
only once a real itinerary exists.

Two implementation details are worth understanding because they encode
the project's values.

First, honesty about location. `geocodePlace` returns `null` on a miss
rather than throwing, and a miss is explicitly not a tool failure: the
pin is saved and flagged "מיקום לא אומת", and the traveler places it by
clicking the map or dragging the pin. Guessing the city centre was ruled
out by name. A wrong location is worse than a missing one.

Second, structural rather than filtered safety. `executeAgentTool` is
synchronous, so the async geocode happens up in `route.ts` (making
`add_pin` the second async tool after `explore_destination`) and the
resolved coordinates are handed to the executor as a **separate fifth
parameter, never inside `input`**. There is therefore no path by which
the model can supply coordinates at all. That is a property of the
signature, not a validation step that could be forgotten.

A stay pin also writes `booking.stay = 'have'`, so the existing booking
logic stops asking about accommodation for that trip, and
`serializeTripForModel` exposes existing pins with a `locatedOnMap` flag
so the agent can see what it already has.

The geocoder is **not verified live**. It was written with
`GEOCODE_NOMINATIM` and `GEOCODE_PHOTON` environment overrides so it can
be pointed at a stub in a unit test, but no such test exists yet and
sandbox egress is blocked. First real verification happens in
production.

## Open work

**Catalog and photos.** Many places still have no photo, which Netanel
called out as the priority. `TODO.md` carries the pending list. Catalog
expansion is also meant to continue, with the grounding index measured
against its ceiling before and during each batch. A hard-won lesson: the
Wikimedia Commons search top hit is frequently the wrong subject, so
look at the image itself and not merely at the HTTP status. France and
Paris, Athens to Delphi, and Kazakhstan's Kolsai and Kaindy lakes are
blocked with an explicit "do NOT estimate coordinates" marker.

There is a scheduled nightly catalog task,
`trig_01BiLQXCrg2YcgNbGkWmYqUh`, currently disabled.

**Testing.** The geocode path has no automated coverage. A unit test
against a stubbed endpoint is the honest way to close that.

**Waiting on Netanel personally**, recorded in TODO.md: run
`supabase-premium.sql`; add `SUPABASE_SERVICE_ROLE_KEY`; create the
Stripe product and price and fill in `STRIPE_SECRET_KEY`,
`STRIPE_PRICE_ID` and `STRIPE_WEBHOOK_SECRET`; confirm the 19.90 ₪ per
month price; live-test a real Google My Maps link; run
`supabase-community.sql`. These need his own hands on his own accounts.

## Security posture

Credentials are never entered into third-party dashboards on Netanel's
behalf. If something needs a key pasted into Stripe or Supabase, he does
it himself. A GitHub token and a Resend API key were once pasted into
chat and both should be treated as compromised and rotated. The Supabase
publishable key is public by design, with row-level security protecting
the data.

Community search is opt-in only and never exposes email, phone or trips.
Email lookup is exact-match only, specifically to prevent address
scanning. Uploaded images, such as the booking screenshot that motivated
the image-attachment feature, contain real personal data and must stay
out of the repo and out of logs.

## Working style Netanel expects

Never use em dashes. Use a single hyphen or commas.

Be honest about what was not verified rather than quietly shipping a
guess. Every session log entry in CLAUDE.md has a section on what was
not tested, and that is on purpose.
