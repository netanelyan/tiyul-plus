# tiyul+ — TODO (deferred work)

Running list of things scoped but not yet done. Follow the same rigor as the
existing entries (see CLAUDE.md hard rules): verify every place/coordinate
(Wikipedia coords API + Nominatim) and every photo (Wikimedia Commons API,
HTTP-verified, and eyeball hero/landmark/nature shots for correct subject);
kosher only where it genuinely exists (else say so honestly); `npm run build`
+ `node scripts/verify-photos.mjs` must pass; commit + push per city; update
the CLAUDE.md session log.

## ✅ RESOLVED: the chat-grounding scale guardrail (was BLOCKED)

**2026-07-25, `data/expansion-3`** measured the whole catalog serializing
into every `/api/chat` call: 258,544 chars ≈ 65k-80k tokens by char
heuristics, 30-60% over the ~50k guideline, and flagged further
destinations as blocked until the grounding was refactored. It listed
option (a) - "ground per-relevant-destination instead of the whole
catalog" - as the fix.

**That fix landed the same day** on `perf/trip-build-progress` (merged,
see the session log). `buildGrounding()` is now two blocks:
`buildGroundingIndex()` (every city + place id/name/category/tags -
static, the only one carrying `cache_control`) and
`buildGroundingDetail(slugs)` (summaries/practical/itineraries/
descriptions for only the cities the conversation touches, chosen by
`relevantCitySlugs()`).

**Measured from the API's own usage numbers, not a char heuristic:**
cached prefix 144,863 → **34,005 tokens**, plus 3.5k-5.3k of
per-request detail - roughly **38k total, under the ~50k guideline**.
Quality was re-verified after the change (country-only prompts still
build, follow-up edits work, uncovered cities still refused honestly).

**Content expansion is therefore unblocked.** The index grows ~700
tokens per new destination while the detail block stays flat, so the
practical ceiling is now far higher. Re-measure (dev console logs one
usage line per model call) if the catalog roughly doubles again.

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

**Photos pending (added without `photo`, UI falls back to the gradient):**
the sandbox has no egress to Wikimedia, so no image URL could be HTTP-verified
and none was invented. Re-run `scripts/verify-photos.mjs` from a normal network
and fill photos for: country `portugal`; destination `lisbon`; places
`lis-jeronimos`, `lis-belem-tower`, `lis-sao-jorge`, `lis-alfama`, `lis-se`,
`lis-comercio`, `lis-santa-justa`, `lis-oceanario`, `lis-pena`, `lis-mouros`,
`lis-cabo-roca`, `vie-melk`, `vie-durnstein`, `prg-karlstejn`,
`prg-kutna-hora`, `prg-sedlec`.

**Also worth doing:** enrich the original 8 European CITY entries with a
nature day-trip place or two each (Vienna→Wachau DONE: Melk + Dürnstein;
Prague→Karlštejn + Kutná Hora + Sedlec DONE; Rome→Tivoli/Castelli, Athens→Sounion/
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

- [ ] **Affiliate IDs (the booking layer is built and waiting on these):** the
  config is `src/lib/booking.ts` - one source of truth for the homepage
  services grid AND the "מה עוד חסר לטיול" panel inside a trip. To wire a
  real partner: fill `affiliate: { template, idKey }` for that provider and
  put the ID in `NEXT_PUBLIC_AFFILIATE_*` (see `.env.example`). Nothing else
  changes. Current state: Skyscanner / Booking.com / GetYourGuide / Airalo
  link to their PUBLIC sites with no tracking params; insurance and car
  rental have no provider chosen at all and render as "בקרוב".
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

## להפעלת המכסות המלאות והפרימיום (נוסף 2026-07-25, סשן המכסות)
- [ ] להריץ את `supabase-premium.sql` ב-SQL Editor (עמודת plan מוקשחת +
      טבלת usage_daily). בלי זה: המכסות עובדות בזיכרון בלבד והפרימיום
      לא נשמר.
- [ ] להוסיף `SUPABASE_SERVICE_ROLE_KEY` ל-.env.local ול-Vercel (סוד
      שרת בלבד! Settings → API → service_role).
- [ ] Stripe: ליצור מוצר "טיול+ פרימיום" עם Price חודשי, ולמלא
      `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
      (endpoint: /api/billing/webhook; אירועים: checkout.session.completed,
      customer.subscription.deleted, customer.subscription.updated).
- [ ] **לאשר את המחיר**: העמוד מציג 19.90 ₪/חודש (PREMIUM_PRICE_ILS
      ב-src/lib/plans.ts) - זו הצעה של הסשן, לא החלטה. לוודא התאמה בין
      המספר בקוד ל-Price שנוצר ב-Stripe.
- [ ] לבדוק חי ייבוא מפה אמיתית מ-My Maps (הסנדבוקס חסום לגוגל - נבדק
      מול מוק KML מלא בלבד).
