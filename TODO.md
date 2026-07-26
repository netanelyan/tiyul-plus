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
- [x] **UAE → Hatta / Jebel Jais / Liwa desert** (mountains, wadis, dunes) —
      day-trips from the existing Abu Dhabi entry, or a Dubai/RAK hub.
- [x] **Azerbaijan → Sheki / Qabala / Caucasus** (mountains, waterfalls,
      Laza) — from Baku.
- [ ] **Kazakhstan → Kolsai & Kaindy Lakes / Charyn** — a 2nd Almaty-area
      nature entry (Charyn is already IN Almaty; Kolsai/Kaindy are further).
      BLOCKED on coordinates: `Kolsai_Lakes` and `Kaindy_Lake` on dbpedia
      return an empty JSON object. Needs another source. Do NOT estimate.
- [x] **Jordan → Dead Sea + Wadi Mujib + Amman/Jerash** (2nd Jordan entry,
      north; land crossing note like Petra).
- [x] **Cyprus → Paphos + Akamas/Avakas Gorge** (2nd Cyprus entry; direct
      PFO flights) — nature: Avakas Gorge, Blue Lagoon, Baths of Aphrodite.

**Photos pending (added without `photo`, UI falls back to the gradient):**
the sandbox has no egress to Wikimedia, so no image URL could be HTTP-verified
and none was invented. Re-run `scripts/verify-photos.mjs` from a normal network
and fill photos for: country `portugal`; destination `lisbon`; places
`lis-jeronimos`, `lis-belem-tower`, `lis-sao-jorge`, `lis-alfama`, `lis-se`,
`lis-comercio`, `lis-santa-justa`, `lis-oceanario`, `lis-pena`, `lis-mouros`,
`lis-cabo-roca`, `vie-melk`, `vie-durnstein`, `prg-karlstejn`,
`prg-kutna-hora`, `prg-sedlec`; country `poland`; destination `krakow`;
places `kra-rynek`, `kra-mariacki`, `kra-wawel`, `kra-kazimierz`,
`kra-schindler`, `kra-auschwitz`, `kra-wieliczka`, `kra-kosciuszko`,
`kra-ojcow`, `kra-zakopane`, `rom-villa-deste`, `rom-villa-adriana`,
`ath-sounion`, `bcn-montserrat`; destination `paphos` and places
`paf-archaeological`, `paf-tombs`, `paf-castle`, `paf-romiou`, `paf-akamas`,
`paf-coral-bay`, `paf-troodos`, `paf-kykkos`; country `netherlands`;
destination `amsterdam`; places `ams-anne-frank`,
`ams-portuguese-synagogue`, `ams-rembrandt-house`, `ams-begijnhof`,
`ams-vondelpark`, `ams-zaanse-schans`, `ams-volendam`, `ams-keukenhof`,
`ams-kinderdijk`; destination `amman-north`; places `amn-jerash`,
`amn-citadel`, `amn-roman-theatre`, `amn-madaba`, `amn-nebo`, `amn-mujib`,
`amn-umm-qais`, `amn-ajloun`, `amn-maghtas`; destination `sheki-caucasus`;
places `she-palace`, `she-old-town`, `she-qabala`, `she-qirmizi`,
`she-khinalug`, `she-shamakhi`; destination `uae-mountains`; places
`uae-hatta`, `uae-jebel-jais`, `uae-liwa`, `uae-jebel-hafeet`, `uae-jahili`;
places `bcn-tossa`, `bcn-cadaques`, `bud-szentendre`, `bud-visegrad`,
`bts-devin`; country `romania`; destination `transylvania`; places
`trn-bran`, `trn-peles`, `trn-sighisoara`, `trn-corvin`,
`trn-transfagarasan`, `trn-balea`; country `turkey`; destination
`cappadocia`; places `cpd-goreme`, `cpd-uchisar`, `cpd-urgup`,
`cpd-derinkuyu`, `cpd-avanos`, `cpd-nevsehir`; country `ireland`;
destination `west-ireland`; places `irw-moher`, `irw-galway`,
`irw-kylemore`, `irw-connemara`, `irw-dun-aonghasa`, `irw-poulnabrone`;
country `bulgaria`; destination `rila-pirin`; places `rlp-rila`,
`rlp-seven-lakes`, `rlp-bansko`, `rlp-melnik`, `rlp-sandanski`; country
`sweden`; destination `stockholm`; places `sth-gamla-stan`, `sth-vasa`,
`sth-skansen`, `sth-djurgarden`, `sth-city-hall`, `sth-palace`,
`sth-fotografiska`, `sth-drottningholm`; country `denmark`; destination
`north-zealand`; places `nzl-frederiksborg`, `nzl-louisiana`,
`nzl-roskilde-cathedral`, `nzl-viking-ships`, `nzl-fredensborg`,
`nzl-frilandsmuseet`, `nzl-bakken`; country `finland`; destination
`finnish-lapland`; places `fla-rovaniemi`, `fla-pyha-luosto`, `fla-levi`,
`fla-saariselka`, `fla-ukk`, `fla-inari`, `fla-ranua`, `fla-kemi`; country
`lithuania`; destination `vilnius`; places `vln-cathedral`, `vln-gediminas`,
`vln-st-anne`, `vln-gate-of-dawn`, `vln-uzupis`, `vln-paneriai`, `vln-trakai`;
country `estonia`; destination `tallinn`; places `tln-toompea`, `tln-nevsky`,
`tln-st-olaf`, `tln-kadriorg`, `tln-kumu`, `tln-lahemaa`; country `latvia`;
destination `riga`; places `rga-blackheads`, `rga-st-peters`, `rga-cathedral`,
`rga-freedom-monument`, `rga-sigulda`, `rga-turaida`, `rga-gauja`; country
`albania`; destination `south-albania`; places `alb-butrint`, `alb-ksamil`,
`alb-saranda`, `alb-porto-palermo`, `alb-llogara`, `alb-berat`. Country `bosnia`; destination `mostar-sarajevo`; places `bih-mostar`, `bih-blagaj`, `bih-kravica`, `bih-bascarsija`, `bih-tunnel`. Country `serbia`; destination `vojvodina`; places `rs-petrovaradin`, `rs-synagogue`, `rs-karlovci`, `rs-fruska-gora`, `rs-palic`, `rs-sombor`, `rs-vrsac`. Country `mexico`; destination `yucatan`; places `mx-merida`, `mx-uxmal`, `mx-chichen-itza`, `mx-valladolid`, `mx-izamal`, `mx-rio-lagartos`, `mx-celestun`. Country `south-korea`; destination `gyeongju-busan`; places `kr-gyeongju`, `kr-bulguksa`, `kr-seokguram`, `kr-hahoe`, `kr-yonggungsa`, `kr-gamcheon`, `kr-jagalchi`. Country `australia`; destination `tasmania`; places `au-mona`, `au-kunanyi`, `au-port-arthur`, `au-bruny`, `au-freycinet`, `au-bay-of-fires`, `au-cradle-mountain`. Country `indonesia`; destination `java`; places `id-borobudur`, `id-prambanan`, `id-kraton`, `id-merapi`, `id-parangtritis`, `id-bromo`, `id-ijen`. Country `malaysia`; destination `penang-perak`; places `my-fort-cornwallis`, `my-kek-lok-si`, `my-penang-hill`, `my-taiping`, `my-kellies-castle`, `my-cameron-highlands`. Destination `douro` (Portugal); places `pt-peso-da-regua`, `pt-lamego`, `pt-foz-coa`, `pt-mateus-palace`, `pt-amarante`, `pt-mesao-frio`, `pt-alijo`. Destination `gdansk-pomerania` (Poland); places `pl-solidarity-centre`, `pl-westerplatte`, `pl-oliwa-cathedral`, `pl-malbork`, `pl-stutthof`, `pl-hel`, `pl-frombork`. Destination `colca-titicaca` (Peru); places `pe-misti`, `pe-salinas-reserve`, `pe-chivay`, `pe-colca-canyon`, `pe-sillustani`, `pe-puno`. Destination `hoi-an-central` (Vietnam); places `vn-hoi-an`, `vn-my-son`, `vn-hai-van`, `vn-lang-co`, `vn-thien-mu`, `vn-ba-na-hills`. Destination `lycian-coast` (Turkey); places `tr-fethiye`, `tr-oludeniz`, `tr-xanthos`, `tr-patara`, `tr-kas`, `tr-kekova`, `tr-myra`. Destination `nova-scotia` (Canada); places `ca-cabot-trail`, `ca-cape-breton-park`, `ca-louisbourg`, `ca-grand-pre`, `ca-annapolis-royal`, `ca-kejimkujik`. Destination `new-england` (USA); places `us-acadia`, `us-franconia-notch`, `us-stowe`, `us-mount-mansfield`, `us-green-mountains`, `us-cape-cod`. Destination `north-iceland` (Iceland); places `is-godafoss`, `is-myvatn`, `is-dimmuborgir`, `is-dettifoss`, `is-asbyrgi`, `is-husavik`, `is-seydisfjordur`. Destination `bucovina-maramures` (Romania); places `ro-voronet`, `ro-sucevita`, `ro-moldovita`, `ro-humor`, `ro-barsana`, `ro-merry-cemetery`, `ro-sighet`. Destination `south-holland` (Netherlands); places `nl-mauritshuis`, `nl-binnenhof`, `nl-madurodam`, `nl-nieuwe-kerk-delft`, `nl-gouda`, `nl-euromast`, `nl-cube-houses`. Destination `valais-zermatt` (Switzerland); places `ch-zermatt`, `ch-gornergrat`, `ch-saas-fee`, `ch-aletsch`, `ch-leukerbad`, `ch-zinal`, `ch-crans-montana`. Destination `swedish-lapland` (Sweden); places `se-abisko`, `se-kiruna`, `se-jukkasjarvi`, `se-kebnekaise`, `se-sarek`, `se-jokkmokk`, `se-gammelstad`. Destination `istria` (Croatia); places `hr-rovinj`, `hr-pula-arena`, `hr-euphrasian`, `hr-motovun`, `hr-groznjan`, `hr-brijuni`, `hr-opatija`. Destination `ireland-ancient-east` (Ireland); places `ie-newgrange`, `ie-glendalough`, `ie-powerscourt`, `ie-kilkenny-castle`, `ie-hook-lighthouse`, `ie-cobh`, `ie-blarney-castle`. Destination `jutland` (Denmark); places `dk-aros`, `dk-den-gamle-by`, `dk-jelling`, `dk-legoland`, `dk-ribe`, `dk-rabjerg-mile`, `dk-grenen`. Destination `north-island-nz` (New Zealand); places `nz-whakarewarewa`, `nz-huka-falls`, `nz-tongariro`, `nz-hobbiton`, `nz-taranaki`, `nz-waitangi`. Destination `slovenia-karst-east` (Slovenia); places `si-skocjan`, `si-cerknica`, `si-sneznik-castle`, `si-idrija`, `si-velika-planina`, `si-logarska`, `si-ptujska-gora`. Destination `finnish-lakeland` (Finland); places `fi-savonlinna`, `fi-olavinlinna`, `fi-punkaharju`, `fi-linnansaari`, `fi-koli`, `fi-repovesi`, `fi-verla`. Destination `west-estonia-islands` (Estonia); places `ee-kuressaare`, `ee-kaali`, `ee-panga`, `ee-vilsandi`, `ee-haapsalu`, `ee-matsalu`, `ee-soomaa`. Destination `kurzeme-zemgale` (Latvia); places `lv-rundale`, `lv-bauska`, `lv-kuldiga`, `lv-ventspils`, `lv-kolka`, `lv-slitere`, `lv-liepaja`. Destination `western-lithuania` (Lithuania); places `lt-curonian-spit`, `lt-nida`, `lt-hill-of-crosses`, `lt-palanga`, `lt-zemaitija`, `lt-nemunas-delta`, `lt-rambynas`. Destination `northern-bulgaria` (Bulgaria); places `bg-belogradchik`, `bg-madara`, `bg-ivanovo`, `bg-devetashka`, `bg-tryavna`, `bg-shipka`, `bg-buzludzha`. Destination `lori-tavush` (Armenia); places `am-haghpat`, `am-sanahin`, `am-akhtala`, `am-odzun`, `am-kobayr`, `am-haghartsin`, `am-goshavank`. Destination `oaxaca` (Mexico); places `mx-oaxaca-city`, `mx-monte-alban`, `mx-mitla`, `mx-hierve-el-agua`, `mx-tule`, `mx-yagul`, `mx-puerto-escondido`. Destination `fergana-valley` (Uzbekistan); places `uz-kokand`, `uz-margilan`, `uz-fergana`, `uz-quva`, `uz-andijan`, `uz-namangan`, `uz-chust`. Destination `lumbini-terai` (Nepal); places `np-lumbini`, `np-tilaurakot`, `np-bardiya`, `np-nepalgunj`, `np-tansen`, `np-janakpur`, `np-koshi-tappu`. Destination `zanzibar-swahili-coast` (Tanzania); places `tz-stone-town`, `tz-changuu`, `tz-jozani`, `tz-nungwi`, `tz-pemba`, `tz-bagamoyo`, `tz-kilwa-kisiwani`. Destination `malaysian-borneo` (Malaysia); places `my-kinabalu-park`, `my-sepilok`, `my-kinabatangan`, `my-sipadan`, `my-mulu`, `my-bako`. Destination `bali-lesser-sunda` (Indonesia); places `id-tanah-lot`, `id-uluwatu`, `id-goa-gajah`, `id-batur`, `id-besakih`, `id-rinjani`, `id-komodo`.

**Blocked on coordinates - France / Paris.** France is the biggest
remaining country gap, but dbpedia's `/data/*.json` for very famous
articles (Eiffel Tower, Louvre, Notre-Dame) is too large and the
coordinates get truncated out of the fetched page; the dbpedia SPARQL
endpoint returns 403 through the proxy, wikidata and commons are
cache-only, nominatim is robots-disallowed, and fr.dbpedia has no
coordinates either. Build Paris when a working coordinate source exists
(e.g. a run from a normal network). Do NOT estimate the coordinates.

**Also worth doing:** enrich the original 8 European CITY entries with a
nature day-trip place or two each (Vienna→Wachau DONE: Melk + Dürnstein;
Prague→Karlštejn + Kutná Hora + Sedlec DONE; Rome→Tivoli DONE (Villa d'Este
+ Villa Adriana); Athens→Sounion DONE; Barcelona→Montserrat DONE;
Barcelona→Costa Brava DONE (Tossa de Mar + Cadaqués); Budapest→Danube Bend
DONE (Szentendre + Visegrád); Bratislava→Devín DONE. Athens→Delphi is
BLOCKED: `Delphi` on dbpedia has no geo:lat/geo:long. Do NOT estimate). Lower priority than net-new destinations.

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
