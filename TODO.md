# tiyul+ — TODO (deferred work)

Running list of things scoped but not yet done. Follow the same rigor as the
existing entries (see CLAUDE.md hard rules): verify every place/coordinate
(Wikipedia coords API + Nominatim) and every photo (Wikimedia Commons API,
HTTP-verified, and eyeball hero/landmark/nature shots for correct subject);
kosher only where it genuinely exists (else say so honestly); `npm run build`
+ `node scripts/verify-photos.mjs` must pass; commit + push per city; update
the CLAUDE.md session log.

## ⚠️ BLOCKED: chat grounding already past the scale guardrail — read before adding more destinations

**2026-07-25, branch `data/expansion-3`:** before adding anything, measured
the current catalog against the three scale guardrails from the expansion
brief. Two are fine; one is already tripped:

- Static pages: 93 (limit ~250) — fine.
- Largest client JS chunk: ~572 KB (limit ~1.5 MB) — fine.
- **Chat grounding (`buildGrounding()` in `src/app/api/chat/route.ts`):
  47 destinations / 562 places serialize to 258,544 chars ≈ 65,000-80,000
  tokens by char-count heuristics (÷4 and ÷3.2 respectively) — already
  30-60% over the ~50k-token guideline, with ZERO new destinations added
  this session.** This block is sent (cached) on every `/api/chat` call.

Per the brief's own instruction ("Stop adding and flag for Netanel... do
NOT attempt that refactor in this session"), **this session did not add
any destinations** and stopped here instead. `data/expansion-3` has no
data changes — only this note.

**What actually needs to happen next (architectural, not a data task):**
one of — (a) ground the agent per-relevant-destination instead of the
whole catalog (e.g. a lightweight retrieval/keyword pre-filter over
country+city names before the full grounding block is built), (b) split
`destinations.ts` per region and only import/ground the regions in play,
or (c) move the catalog behind a DB and have `PlacesProvider` fetch just
what's needed. Any of these unblocks further content growth. Until one
lands, further destinations should NOT be added — each one makes an
already-oversized, already-cached prompt larger and costlier without a
proportional product benefit (the agent already struggles to use 47
destinations' worth of grounding well).

**Untouched and still valid:** the second-city/nature TODO items below,
and the new-country wishlist in the expansion brief, are still good
targets for content work — just gated on the grounding fix landing first.

## Second-city / nature expansion (in progress)

Goal: map each country beyond its one big city, nature-forward
(hiking / lakes / nature). Audit result: most countries still have ONE city.

**Done so far (this program):** Greece→Crete, Germany→Munich+Bavarian Alps,
Italy→Dolomites, Austria→Salzburg+Salzkammergut, Spain→Mallorca. (Plus
earlier 2nd cities: Thailand→Phuket, Georgia→Batumi, Montenegro→Budva.)
**Added in the 2026-07-25 overnight run:** Czechia→Bohemian Switzerland,
Hungary→Lake Balaton, Slovakia→High Tatras.

**Still ONE city — next candidates (nature-forward):**
- [x] **Czechia → Bohemian Switzerland NP** — DONE (overnight run): Pravčická
      brána, Kamenice gorges, Jetřichovice viewpoints, Tisá, + Bastei.
- [x] **Hungary → Lake Balaton** — DONE (overnight run): Tihany, Badacsony,
      Hévíz thermal lake, Szigliget, Tapolca cave lake, Balaton Uplands NP.
- [x] **Slovakia → High Tatras** — DONE (overnight run): Štrbské Pleso,
      Popradské pleso, Lomnický štít, Slovenský raj, Demänovská cave.
- [ ] **UAE → Hatta / Jebel Jais / Liwa desert** (mountains, wadis, dunes) —
      day-trips from the existing Abu Dhabi entry, or a Dubai/RAK hub.
- [ ] **Azerbaijan → Sheki / Qabala / Caucasus** (mountains, waterfalls,
      Laza) — from Baku.
- [ ] **Kazakhstan → Kolsai & Kaindy Lakes / Charyn** — a 2nd Almaty-area
      nature entry (Charyn is already IN Almaty; Kolsai/Kaindy are further).
- [ ] **Jordan → Dead Sea + Wadi Mujib + Amman/Jerash** (2nd Jordan entry,
      north; land crossing note like Petra).
- [ ] **Cyprus → Paphos + Akamas/Avakas Gorge** (2nd Cyprus entry; direct
      PFO flights) — nature: Avakas Gorge, Blue Lagoon, Baths of Aphrodite.

**Also worth doing:** enrich the original 8 European CITY entries with a
nature day-trip place or two each (e.g. Vienna→Wachau/Vienna Woods,
Prague→Karlštejn/Bohemian Paradise, Rome→Tivoli/Castelli, Athens→Sounion/
Delphi, Barcelona→Montserrat/Costa Brava, Budapest→Danube Bend, Bratislava→
Devín/Small Carpathians). Lower priority than net-new destinations.

## Skipped / blocked (need a decision or a data source)

- [ ] **Marrakech (Morocco):** direct TLV flights unverifiable — Royal Air
      Maroc suspended TLV through Feb 2025, no confirmed 2026 resumption.
      Revisit only when active direct service is confirmed. (Do NOT claim
      direct flights otherwise — no-fabrication rule.)
- [ ] **Sri Lanka, Zanzibar:** verify current TLV charter/flight reality
      before building; both were flagged thin/uncertain.

## Product / features (from earlier scoping — need Netanel's input)

- [ ] **Affiliate wiring:** the homepage services grid
      (`src/lib/services.ts`) has NO real affiliate links — all
      `affiliateUrl: null`, falling back to public provider sites (car =
      "בקרוב"). Drop real affiliate IDs/links into that config when available.
- [ ] **Accessibility statement** (`src/app/accessibility/page.tsx`): fill
      the `[למילוי]` placeholders — real accessibility-coordinator name,
      contact (email/phone), and last-tested date. Do NOT invent these.
- [ ] **Accessibility gaps** flagged (not yet fixed): muted text
      (`text-night/40-45` on cream) and small white-on-sunset text fall below
      WCAG AA 4.5:1; Leaflet map markers aren't keyboard-reachable; no global
      visible focus ring (only the a11y button has one). A focus-ring +
      muted-text-contrast pass would close most of it.
- [ ] **Link-extraction (Reels/TikTok/YouTube):** only YouTube is
      realistically extractable, and it needs a paid transcript API or a
      fragile scrape dependency (Netanel's call per hard-rule 6).
      Instagram/TikTok/Facebook block external-URL content reads per ToS.
      The `/start` link tab currently detects the platform and says so
      honestly — no extractor built.

## Content follow-ups

- [ ] Kosher `lastChecked` is `pending-review` on every kosher entry across
      the catalog — **37 entries as of 2026-07-25**. The UI now marks every
      one of them explicitly as "לא מאומת - לוודא מול המקום" (see
      `src/components/KosherBadge.tsx`), so nothing looks verified while it
      isn't — what's still open is doing the real verification. (the overnight run added
      11 of them: Tokyo, Arusha, Cusco, Queenstown, Las Vegas, Reykjavík,
      Zagreb, Kathmandu, Hanoi, Cape Town/Sea Point, plus Munich earlier).
      Replace with real verification dates when someone actually confirms
      status with the venues.
- [x] The 8 original European city entries — FIXED (2026-07-25): all of
      Vienna, Bratislava, Prague, Budapest, Rome, Athens, Barcelona and
      Berlin now carry an `editorialRating` with an honest drawback in the
      verdict. Every destination in the catalog is rated.
- [x] Wide-span destinations — FIXED (2026-07-25): `lofoten` and
      `cape-town` were split into compact hubs. Norway: `lofoten` (Arctic
      north) + `bergen-fjords` (west fjords). South Africa: `cape-town`
      (city + peninsula + winelands), `kruger` (safari + Panorama Route)
      and a new `garden-route` entry. Every place is now within ~700 km of
      its destination centre (audit warning cleared).
- [ ] `budva` reuses three places that also appear in `kotor` (Lovćen, Sveti
      Stefan, Budva old town coordinates) — same real sites in two hubs.
      Fine today; worth deduping if a "seen this already" view is built.
