# tiyul+ — TODO (deferred work)

Running list of things scoped but not yet done. Follow the same rigor as the
existing entries (see CLAUDE.md hard rules): verify every place/coordinate
(Wikipedia coords API + Nominatim) and every photo (Wikimedia Commons API,
HTTP-verified, and eyeball hero/landmark/nature shots for correct subject);
kosher only where it genuinely exists (else say so honestly); `npm run build`
+ `node scripts/verify-photos.mjs` must pass; commit + push per city; update
the CLAUDE.md session log.

## Second-city / nature expansion (in progress)

Goal: map each country beyond its one big city, nature-forward
(hiking / lakes / nature). Audit result: most countries still have ONE city.

**Done so far (this program):** Greece→Crete, Germany→Munich+Bavarian Alps,
Italy→Dolomites, Austria→Salzburg+Salzkammergut, Spain→Mallorca. (Plus
earlier 2nd cities: Thailand→Phuket, Georgia→Batumi, Montenegro→Budva.)

**Still ONE city — next candidates (nature-forward):**
- [ ] **Czechia → Bohemian Switzerland NP** (Pravčická brána arch, hiking) or
      **Český Krumlov** (from Prague; direct PRG flights).
- [ ] **Hungary → Lake Balaton** (Tihany peninsula, Balaton-felvidék NP;
      ~1.5h from Budapest).
- [ ] **Slovakia → High Tatras** (Štrbské Pleso, Tatra lakes, hiking) — from
      Bratislava/Vienna/Poprad.
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
      the catalog — replace with real verification dates when someone
      actually confirms status with the venues.
