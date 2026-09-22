# tiyul+ — TODO (deferred work)

Running list of things scoped but not yet done. Follow the same rigor as the
existing entries (see CLAUDE.md hard rules): verify every place/coordinate
(Wikipedia coords API + Nominatim) and every photo (Wikimedia Commons API,
HTTP-verified, and eyeball hero/landmark/nature shots for correct subject);
kosher only where it genuinely exists (else say so honestly); `npm run build`
+ `node scripts/verify-photos.mjs` must pass; commit + push per city; update
the CLAUDE.md session log.

## ⚠️ WHAT ONLY NETANEL CAN DO - see `1.MD` for step-by-step (added 2026-09-22)

`1.MD` is the authoritative launch checklist, verified against production
rather than against these notes. Nine items, roughly in order of value. The
short version, so this file points at them too:

- [ ] **Google Analytics**: create the property, set `NEXT_PUBLIC_GA_ID` in
      Vercel, redeploy. The code is built, deployed and inert until that
      variable exists. Then raise Data Retention from 2 to 14 months - that
      default cannot be applied retroactively. (`1.MD` section 3)
- [ ] **Viator to production**: `VIATOR_API_KEY` + `VIATOR_MODE=production`.
      The integration is finished and switched off; this is the shortest path
      to the first shekel the site ever earns. (1.1)
- [ ] **The four affiliate programmes**: apply now, they take days. Each one
      then needs BOTH an env var and its `affiliate` template filled in
      `src/lib/booking.ts` - the env var alone does nothing. (1.2)
- [ ] **Uptime monitor** on `https://www.tiyulplus.com/api/health`. (2.1)
- [ ] **Press the alert-test button** in `/admin` once against production. (2.2)
- [ ] **Take the first backup** (`npm run backup`) and keep it off the laptop.
      The local service-role key is currently rejected with 401 - replace it
      first. (2.3, 5.5)
- [ ] **Check Supabase backup retention / PITR** - the only path back for
      `auth.users`. (2.4)
- [ ] **Populate the photo mirror**, then set `NEXT_PUBLIC_PHOTO_MIRROR_BASE`.
      3,309 places currently depend on files we do not own, and a file cannot
      be mirrored after it is deleted. (4.1)
- [ ] **Small ones**: send a test mail to support@, delete the QA share code
      `T4R4Cwqk`, run `sql/supabase-check.sql`, tighten DMARC once the reports
      look clean. (5.1-5.4)

## Current state (updated 2026-08-29)

**Monetization is LIVE.** `/premium` sells Free, Premium (19.90 ILS/mo), Pro
(89.90 ILS/mo) and the a-la-carte pre-departure check (29.90 ILS/trip), all
through **PayPal Subscriptions**. Stripe is a legacy code path only - no
subscription was ever charged through it, and the Stripe items further down
this file are SUPERSEDED, not pending. The travel-agent enquiry section is
also live on `/premium`.

`SUPABASE_SERVICE_ROLE_KEY` is set locally; the admin zone items below are
done. **Affiliates are deferred by decision** - not blocked on code. The
booking layer stays as built: real links to the providers' public sites with
no invented tracking params.

Anything below this block predates it. Where the two disagree, this block wins.

## Sourcing coordinates from this sandbox

**READ THIS BEFORE DECLARING A PLACE BLOCKED.** Three sources work through
WebFetch, in this order of preference:

1. `https://dbpedia.org/data/<Article>.json` - one call returns thumbnail,
   depictions, `geo:lat` and `geo:long`. Best for small and medium articles.
   Truncates on very large ones (Eiffel Tower, British Museum), which is what
   made Paris and London look blocked for weeks.
2. `https://dbpedia.org/page/<Article>` - the HTML rendering of the same
   record. Slower and more timeout-prone, but it survives truncation on large
   articles, so it is the rescue path when (1) comes back without images.
   It does NOT reliably expose coordinates. **Prompt technique that matters:**
   do not ask for `dbo:thumbnail`. Ask "Search the whole page for strings
   containing Special:FilePath. List every distinct filename." That reliably
   pulls images out of a page the fetcher otherwise truncates.
3. `https://www.geonames.org/search.html?q=<name>&country=<ISO2>` -
   coordinates only, no photos, never truncates, and covers places with no
   Wikipedia article at all.

**Throttle to 2-3 concurrent WebFetch calls.** 502s and read timeouts cluster
hard above that. Retrying the identical URL after a timeout often works; give
up after two failures and move on.

**Five dbpedia traps, all confirmed by example. Always read the returned
filename before using it:**

- **Coat of arms instead of a photograph.** Nearly every small European town:
  `Pt-prg1.png`, `Banskogerb.jpg`, `Coat_of_Arms_of_Sigulda.svg`,
  `Sombor-grb.png`, `Kuldiga_COA.svg`, `Flag_of_Krujë.gif`, `Grb_Cazina.svg`.
  For towns, skip the thumbnail entirely and go straight to depictions.
- **Corporate logo instead of a photograph.** `British_Museum_logo.svg`,
  `Musée_d'Orsay_logo.svg`, `Skansen Logo.svg`, `Keukenhoflogo.svg`,
  `Legoland_Billund_logo.svg`, `Anne_Frank_House_logo_SVG_replacement.svg`.
- **WRONG CITY, same article name.** The dangerous one, because the data looks
  confident. `Palace_of_the_Inquisition` returns the *Mexico City* palace;
  `Cartagena_Cathedral` returns the *Spanish* Cartagena's. Check that the
  depiction filenames name the city you meant.
- **Montage or composite instead of a photograph.** `Marsaxlokk_montage.png`,
  `Montaje_Cartagena,_Colombia.jpg`, `Valladolid_Yucatan_collage.jpg`.
- **Ambiguous image.** Montmartre's thumbnail is a generic Paris rooftop view.
  Leave the place photoless rather than shipping a picture of nothing.

**GeoNames trap:** when GeoNames has no record it silently falls back to
Wikipedia results for a *different* place - it returned Kortrijk for a
"Markt Brugge" query. Always check the returned name matches what you asked.

Sources confirmed blocked, do not retry them: `www.wikidata.org/w/api.php`,
`query.wikidata.org/sparql`, `dbpedia.org/sparql`,
`commons.wikimedia.org/w/api.php` (all cache-only or 403), nominatim, photon,
the Wikipedia REST API, every language-specific dbpedia (SSL hostname
mismatch), and `dbpedia.org/data/X.ntriples` (unreadable binary). bash has no
outbound network in this sandbox at all.

**Not a TODO, recorded so it stops being re-raised:** an audit flagged 134
places with descriptions under 100 characters. They were reviewed on
2026-07-27 and they are dense and correct, not stubs. Padding them adds noise
and invites invented detail. Leave them alone.

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

## Coverage audit vs the real Israeli market (added 2026-07-27, session (s))

Netanel asked for depth and roundness across the 17 countries Israelis actually fly
to. Measured against the catalog rather than guessed. **The headline finding is not
thin place-lists - it is that the top markets are missing their flagship cities.**

Market ranking (Israel Airports Authority, 2025, by passengers): Greece ~2.2M,
USA ~1.6M, UAE ~1.5M, Italy ~1.2M, Cyprus ~1.2M. Winter 2025/26 (PassportCard):
Thailand 1st, Hungary 2nd, Romania/Czechia/Poland rising, Argentina 9th.
Ranks 6-15 are NOT published anywhere reachable - do not invent them. The full CBS
table is at cbs.gov.il/he/mediarelease/DocLib/2026/007/28_26_007b.pdf (robots-blocked
from this sandbox; Netanel can paste it).

### Priority 1 - missing flagship cities (agreed order)

| gap | why it matters |
|---|---|
| **Dubai** | UAE is the #3 market. Catalog has Abu Dhabi + uae-mountains only. Dubai is where Israelis actually go. |
| **New York** | USA is #2. Catalog has grand-canyon + new-england only, and USA is 14 nature places vs 2 attractions. |
| **Greek islands** (Santorini / Mykonos / Rhodes) | Greece is #1 by a wide margin. Catalog has athens, crete, meteora-epirus. No Cyclades at all. |
| **Venice + Florence** | Italy is #4 and has only rome, dolomites, sicily. |
| **Nice / Riviera** | France is a top market with **Paris only**, 15 places. |
| (UK is london only, 13 places - Edinburgh is the obvious second city) | |

### Priority 2 - thin countries (places today)

argentina 6 (1 city) · bulgaria 12 · romania 13 · united-kingdom 13 · france 15 ·
cyprus 17 · poland 17 · usa 19 · uae 22 · georgia 23. Target ~20 per city.

### Priority 3 - roundness, and these are systemic

- **`cafe` missing entirely in 12 of 17 countries.** Only hungary, czechia and
  thailand have any.
- **`kosher-market` missing in 16 of 17.** Only usa and thailand have one.
- **`museum` missing in 6**: argentina, bulgaria, romania, cyprus, georgia, usa.
- **`nightlife` tag missing in 6** countries; argentina is missing 4 of 7 tags and
  6 of 8 categories.

Empty categories mean the UI filters return nothing, silently - the same class of
invisible failure as the gradient photo fallback.

### Budget

The index ceiling was raised to **260,000 chars** on Netanel's decision (2026-07-27).
Index measured at 188,780 chars, so headroom is ~71,000 chars, about **495 places** at
the measured 143.8 chars/place, or roughly 24 new cities. **Budget is not the
constraint any more; verified research is.**

### Standing rule for this programme

Netanel chose **fully verified only**: no place ships without probed coordinates and a
confirmed photo. Do not relax this to hit a number - the 151 broken photos in session
(r)/(s) came from exactly that shortcut.

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
- [x] **UAE → Hatta / Jebel Jais / Liwa desert** (mountains, wadis, dunes) —
      day-trips from the existing Abu Dhabi entry, or a Dubai/RAK hub.
- [x] **Azerbaijan → Sheki / Qabala / Caucasus** (mountains, waterfalls,
      Laza) — from Baku.
- [x] **Kazakhstan → Kolsai & Kaindy Lakes / Charyn** — DONE. Coordinates came
      from GeoNames after dbpedia returned an empty object for both articles.
      Lake Kaindy itself is still photoless; retry when dbpedia is healthy.
- [x] **`samarkand` → `uzb-aral` placeholder coordinate - FIXED 2026-07-27.**
      It carried `lat: 45, lng: 60`, the rounded centroid of the Aral Sea,
      about 140km from Moynaq. dbpedia never answered for any spelling. Fixed
      from GeoNames (see the new source note below): Muynak is 43.76833,
      59.021389. The catalog validator now reports zero errors.
- [x] **London / United Kingdom** — DONE 2026-07-27. The article-truncation
      problem was real but not fatal: coordinates came from GeoNames and
      photos from the `dbpedia.org/page/` HTML endpoint. Same fix unblocked
      Paris and Delphi, which had been sitting on the same excuse.
- [x] **Re-try the whole blocked list against GeoNames.** Paris, London,
      Kolsai/Kaindy and Delphi all shipped. None of them were hard; they were
      only unreachable from the one source that was being used.
- [x] **Countries with no destination at all** - RESOLVED. Measured
      2026-09-19: **83 of 83 countries have at least one destination.** Every
      name on the old list here (Egypt, Oman, Mongolia, Bhutan, North
      Macedonia, Moldova, and the rest) has since shipped. Ukraine is the one
      that did not, and it was dropped deliberately rather than missed.
- [ ] **352 of 3,309 places carry no `photo`** (89% coverage, measured
      2026-09-19; the "78 of 1,216" that stood here was four catalog sizes ago).
      Roughly 60 of
      the remainder are Chabad houses and kosher restaurants with no freely
      licensed image anywhere - treat those as permanently blank, do not keep
      re-raising them. The tractable remainder: Cartagena (7, but dbpedia
      serves wrong-city articles for it), Paris (Montmartre, Champs-Élysées,
      Pompidou, Rue des Rosiers), London (Tower of London, Buckingham Palace,
      Golders Green), Singapore (Merlion, Botanic Gardens, Raffles), plus
      singles: Havelské tržiště, Café Louvre, New York Café, Samarkand,
      Tashkent, Blue Lagoon Iceland, Nemunas Delta, Quva, Chust, Ostrožac
      Castle, St John's Co-Cathedral, the Antwerp Jewish quarter, Lake Kaindy.
      **Get the current list with `node /tmp/photoless.mjs`** rather than
      trusting any hardcoded list in this file.
- [ ] **131 of 166 destinations contain no kosher place** (35 do; measured
      2026-09-19, was "103 of 137"). Some of that is
      honest (there is no kosher food in Torres del Paine) and the copy should
      say so; some of it is just unresearched. Worth a pass that separates the
      two rather than treating every blank the same.

- [x] **Jordan → Dead Sea + Wadi Mujib + Amman/Jerash** (2nd Jordan entry,
      north; land crossing note like Petra).
- [x] **Cyprus → Paphos + Akamas/Avakas Gorge** (2nd Cyprus entry; direct
      PFO flights) — nature: Avakas Gorge, Blue Lagoon, Baths of Aphrodite.

**Photos pending - RESOLVED as a list.** This section used to carry a
hand-maintained inventory of every photoless place. It went stale the moment
the photo sweep started and it is now deleted rather than half-corrected.
The live count is 78 of 1,216 and the live list comes from
`node /tmp/photoless.mjs`. See the photo bullet above for what is tractable
and what is permanently blank.

**~~Blocked on coordinates - France / Paris.~~ RESOLVED 2026-07-27.** France
and Paris shipped. The truncation diagnosis was right but the conclusion was
wrong: GeoNames supplies the coordinates and `dbpedia.org/page/` supplies the
photos, both from inside this sandbox. Kept here as a reminder that "blocked"
in this file has twice meant "one source was tried".

**Also worth doing:** enrich the original 8 European CITY entries with a
nature day-trip place or two each (Vienna→Wachau DONE: Melk + Dürnstein;
Prague→Karlštejn + Kutná Hora + Sedlec DONE; Rome→Tivoli DONE (Villa d'Este
+ Villa Adriana); Athens→Sounion DONE; Barcelona→Montserrat DONE;
Barcelona→Costa Brava DONE (Tossa de Mar + Cadaqués); Budapest→Danube Bend
DONE (Szentendre + Visegrád); Bratislava→Devín DONE; Athens→Delphi DONE via
GeoNames). Lower priority than net-new destinations.

## Skipped / blocked (need a decision or a data source)

- [ ] **Marrakech (Morocco):** direct TLV flights unverifiable — Royal Air
      Maroc suspended TLV through Feb 2025, no confirmed 2026 resumption.
      Revisit only when active direct service is confirmed. (Do NOT claim
      direct flights otherwise — no-fabrication rule.)
- [ ] **Sri Lanka, Zanzibar:** verify current TLV charter/flight reality
      before building; both were flagged thin/uncertain.

## Product / features (from earlier scoping — need Netanel's input)

- [~] **Affiliate IDs - DEFERRED (2026-08-29), not being pursued for now.** The
  config is `src/lib/booking.ts` - one source of truth for the homepage
  services grid AND the "מה עוד חסר לטיול" panel inside a trip. To wire a
  real partner: fill `affiliate: { template, idKey }` for that provider and
  put the ID in `NEXT_PUBLIC_AFFILIATE_*` (see `.env.example`). Nothing else
  changes. Current state: Skyscanner / Booking.com / GetYourGuide / Airalo
  link to their PUBLIC sites with no tracking params; insurance and car
  rental have no provider chosen at all and render as "בקרוב".
- [~] **Affiliate wiring - DEFERRED (2026-08-29).** The homepage services grid
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

## ✅ RESOLVED 2026-09-20: routes that were shorter than their own content

Eleven destinations advertised a route far shorter than the places behind it -
Nicosia offered "a ready route for 1 day" over 18 places and used five; Kruger
had 3 days over 17, Plovdiv 2 over 16. All eleven under 70% coverage were
rebuilt from their own geography and now sit at 72% or above.

**Deliberately NOT framed as "303 orphan places", and that matters for whoever
picks this up next.** The catalog validator's own comment says places outside
the route are by design - "the places list is meant to be broader than the
suggested route" - and it is right. A route is a recommendation, not an index.
So the remaining 228 orphans are **not a backlog**; they are alternates. The
thing worth watching is the ratio, not the count.

Two pre-existing errors surfaced while regrouping: a Kampot pepper farm sat in a
Phnom Penh city day 130km away, and a Tallinn day ran Kadriorg to Paldiski,
110km east to west.

`scripts/apply-itineraries.mjs` + `scripts/itinerary-plan.json` are the tooling.
The script validates every place id against the catalog before writing anything
and refuses the whole run on one bad id, which is what makes hand-typed ids safe.

## ✅ RESOLVED 2026-09-20: the agent inventing numbers about our own coverage

Asked how many nature destinations we have in Europe, it answered "66" in bold.
Europe holds 84 and 30 are nature; 66 is the sum of Asia's lists. Two layers now:
the counts are handed over in the index (`byCharacterCounts`, and a per-country
count on every country row), and `priceGuard` gained a `coverage` category backed
by `coverageFacts.ts` - a closed set of numbers we can actually count to, plus a
scope check for "N destinations in X" that catches a true number wearing the
wrong label.

## ⚠️ The prompt sits at 91% of the context window (measured 2026-09-20)

Not a task, a standing constraint that should be re-measured rather than assumed.

The worst case - the six cities with the largest detail blocks, a history at its
full 50,000-char budget, kosher on - was **207,822 tokens against a 200,000
window**, i.e. already over, and was fixed to **181,967 (91.0%)** by capping the
detail block by characters instead of by city count. Measured with Anthropic's
own tokenizer, not a chars-to-tokens estimate.

**What this means for data work:** the index grows with the catalog, and at 91%
there is roughly 18,000 tokens of slack for everything. `groundingBudget.test.ts`
fails if the sum crosses the ceiling, and the right response to that failure is to
lower `MAX_DETAIL_CHARS` or shrink the index - **not** to raise the number in the
test. The index compaction lever (tuple format) has already been spent.

## Deferred by decision, not blocked - `/premium` visual redesign

Investigated 2026-09-20 and **closed without changes.** It had been carried as
"the last page that reads like a book - 7,395 chars, zero images". Measured
properly it has 52 visible text blocks and three over 140 characters, against
/countries' zero - and the eleven "long paragraphs" an earlier count reported
were answers inside collapsed `details` elements that no reader sees. Looked at
in a browser at 1400 and 390 it is three priced cards, a chooser strip, a
comparison table and a FAQ.

Characters and image count were a proxy for structure and measured the wrong
thing. If it is revisited, the open question is **height** (5,092px at 390px),
not prose density - and a pricing page having no photographs is a normal choice,
not a defect.

## ✅ RESOLVED 2026-09-19: חודשים מומלצים לכל יעד

The season filter, the seasonal hubs and "where should I go in March" were all
waiting on `bestMonths`, which was empty on 166 of 166. It is now **derived**
rather than authored: `src/lib/seasonMonths.ts` reads the months out of each
destination's own `bestSeason` sentence, so the two can never disagree.

The trap this had to avoid, which is why it had sat open: **a month named in
`bestSeason` is often a warning**, in 97 of the 166 sentences. Athens reads
"March-June, September-November (July-August very hot)". Only the leading,
recommending part of the sentence is read; everything from the first
parenthesis, full stop or free-standing dash onward is discarded. 161 of 166
parse, the rest return empty rather than a guess.

The season filter needed no UI change (it was already gated on the data), and
the two seasonal hubs - `/collections/pesach` and `/collections/winter` - now
exist, matched on months rather than season bands.

An explicit `bestMonths` array on a `Destination` still wins if a data session
ever adds one, so hand-authoring specific destinations remains possible and is
worth it where the prose is vague - the five that parse to nothing, and the
places where the season is genuinely critical (Lapland, Iceland, Patagonia,
New Zealand, the Tanzania safari, the Alps).

## Waiting on Netanel - the four-tier pricing page (added 2026-08-22; the page itself is LIVE, see Current state)

1. **Run `sql/supabase-agent-leads.sql`** in the Supabase SQL Editor. Until it
   runs, the travel-agent enquiry form on `/premium` answers honestly that it
   could not save (never a false "thanks"), and the admin card says the table
   is missing rather than showing an empty inbox. `sql/supabase-check.sql`
   reports it.
2. **Run `sql/supabase-promo-plan.sql`** if you want promo codes that hand out
   pro. Without it every code still grants premium exactly as before - the
   redeem route falls back to premium when the column is missing, so nothing
   breaks, it just cannot offer pro.

3. **Create the PayPal plan for `pro` (89.90 ILS).** Nothing manual is needed -
   the first `/api/billing/checkout` with `{"plan":"pro"}` creates the Product
   and Plan and stores the id under `paypal_plan_id_<mode>_pro`. The premium
   plan keeps its existing unsuffixed key and its existing subscribers.
4. **Test the upgrade flow in the PayPal sandbox.** Premium -> pro now goes
   through PayPal's `revise` on the stored `paypal_subscription_id`, so there
   is only ever one subscription and nobody is billed twice. Built and unit
   tested against a mock; **never run against real PayPal**. What to check:
   subscribe to premium, upgrade to pro, confirm PayPal shows ONE subscription
   at 89, and confirm the account shows pro (that last step depends on the
   BILLING.SUBSCRIPTION.UPDATED webhook arriving - the same www-vs-non-www
   trap as every other webhook here).
   **Downgrades (pro -> premium) are still manual, deliberately** - proration
   and refunds for the unused remainder are a money decision, not a coding
   one.
5. **Decided, not pending** (2026-08-22, second pass - Netanel: "just make up
   something reasonable"): premium's cap moved 2.00 -> 2.50 USD so the card can
   honestly say "a full trip a month, however much you edit it" - at 2.00 a long
   single session was 102% of the cap. Both paid tiers now sit at ~37% gross
   margin, which is one structure rather than two numbers, and a test enforces
   that they do not drift apart. Pro's cap stays at 12.00.
   Agent pricing is ~15 ILS per planned trip with a 249 ILS/month floor - the
   bands and the pilot suggestion are in the /admin leads card, where they are
   read at the moment a lead is answered.

## להפעלת אזור הניהול (נוסף 2026-07-27)
- [ ] להריץ את `supabase-admin.sql` ב-SQL Editor. הוא מוסיף role/plan_until/
      plan_source, יומן ביקורת, קודי הטבה, דגלי מערכת - **וזורע את
      natikyan153@gmail.com כ-owner**. אם עוד לא התחברת לאתר אף פעם עם
      המייל הזה, הקובץ יגיד זאת בהודעה וצריך להריץ אותו שוב אחרי
      ההתחברות הראשונה (הוא אידמפוטנטי).
- [x] (2026-08-29) להוסיף `SUPABASE_SERVICE_ROLE_KEY` ל-.env.local ול-Vercel. **בלי
      המפתח הזה אזור הניהול כבוי לגמרי** - וזה מצב מכוון ובטוח: הנתיבים
      מחזירים 404 והאתר עובד כרגיל.
- [ ] בדיקה חיה: להתחבר, לפתוח את "אזור הניהול" מתפריט החשבון, לחפש את
      המייל של עצמך ולראות פרימיום/תפקיד.

## להפעלת המכסות המלאות והפרימיום (נוסף 2026-07-25) - ברובו לא רלוונטי, ראו Current state
- [ ] להריץ את `supabase-premium.sql` ב-SQL Editor (עמודת plan מוקשחת +
      טבלת usage_daily). בלי זה: המכסות עובדות בזיכרון בלבד והפרימיום
      לא נשמר.
- [x] (2026-08-29) להוסיף `SUPABASE_SERVICE_ROLE_KEY` ל-.env.local ול-Vercel (סוד
      שרת בלבד! Settings → API → service_role).
- [~] SUPERSEDED (2026-08-29) - החיוב עובר ב-PayPal, לא ב-Stripe. Stripe: ליצור מוצר "טיול+ פרימיום" עם Price חודשי, ולמלא
      `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
      (endpoint: /api/billing/webhook; אירועים: checkout.session.completed,
      customer.subscription.deleted, customer.subscription.updated).
- [ ] **לאשר את המחיר**: העמוד מציג 19.90 ₪/חודש (PREMIUM_PRICE_ILS
      ב-src/lib/plans.ts) - זו הצעה של הסשן, לא החלטה. לוודא התאמה בין
      המספר בקוד ל-Price שנוצר ב-Stripe.
- [ ] לבדוק חי ייבוא מפה אמיתית מ-My Maps (הסנדבוקס חסום לגוגל - נבדק
      מול מוק KML מלא בלבד).
