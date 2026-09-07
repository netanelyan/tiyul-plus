# SEO - what needs you

Everything in this file needs either your Google account or a decision only you
can make. The code side is done and committed; nothing here is waiting on more
engineering.

**Do these in order.** Steps 1-3 take about twenty minutes in total. Step 4
onward is watching, not doing.

---

## 0. First: deploy

None of this works until the branch is deployed, because `robots.txt` and
`sitemap.xml` are generated at build time and do not exist on the live site
today. Deploy, then check both of these return something:

- https://www.tiyulplus.com/robots.txt
- https://www.tiyulplus.com/sitemap.xml

The sitemap should list **70 URLs**. If it 404s, the deploy did not include the
new build - nothing else in this file will work until it does.

---

## 1. Google Search Console - use the DNS method, not the HTML tag

Go to https://search.google.com/search-console and add a property.

**Choose "Domain" (the left-hand box), not "URL prefix".** Enter `tiyulplus.com`
with no `https://` and no `www`.

### Why DNS, specifically for this site

Your site answers on **two hostnames**: `tiyulplus.com` 308-redirects to
`www.tiyulplus.com` (I checked - that is live behaviour today). A "URL prefix"
property covers exactly one hostname and one protocol, so you would need up to
four separate properties to see the whole picture, and each would show you a
fraction of your data. A Domain property covers every hostname, every subdomain
and both protocols in one place. Given that both hostnames genuinely resolve,
this is the difference between complete data and confusing data.

DNS verification also survives redeploys, hosting changes and any future code
change. An HTML tag is one bad deploy away from unverifying you.

### How to do it

Google will show you a **TXT record** that looks like
`google-site-verification=<long string>`.

Where you add it depends on where `tiyulplus.com`'s nameservers are:

- **If the domain is on Vercel** (Vercel dashboard → Domains → `tiyulplus.com` →
  it says "Nameservers" and lists `ns1.vercel-dns.com`): add it in Vercel, under
  that domain → **DNS Records** → Add. Type `TXT`, Name `@`, Value = the whole
  `google-site-verification=...` string.
- **If the domain is still at your registrar** (GoDaddy, Namecheap, Israeli
  registrars etc.): add the same TXT record in the registrar's DNS panel.

Then press Verify in Search Console. DNS usually propagates in minutes; if it
fails, wait an hour and press Verify again rather than changing anything.

### If you would rather use the HTML tag

It is wired and ready, and you would only be choosing this if DNS is genuinely
not available to you.

1. In Search Console pick **URL prefix** and enter `https://www.tiyulplus.com`
   (with the `www` - that is the hostname that serves 200).
2. Choose the "HTML tag" method. Google shows
   `<meta name="google-site-verification" content="ABC123..." />`.
3. Copy **only the `content` value** - `ABC123...`, not the whole tag.
4. Vercel → your project → Settings → Environment Variables → Add:
   - Name: `NEXT_PUBLIC_GSC_VERIFICATION`
   - Value: the string from step 3
   - Environments: Production
5. **Redeploy.** The value is baked in at build time, so it will not appear until
   you do.
6. Press Verify.

If you leave that variable unset, no verification tag is emitted at all - that is
deliberate, because an empty one is read by Google and rejected.

*(Unrelated, so it does not confuse you: there is already an
`impact-site-verification` tag in the site's `<head>`. That is the affiliate
network, not Google. Leave it alone.)*

---

## 2. Submit the sitemap

In Search Console → **Sitemaps** (left menu) → enter:

```
sitemap.xml
```

The full URL is **https://www.tiyulplus.com/sitemap.xml** — but the field is
relative, so type just `sitemap.xml`. Press Submit.

Within a day or two it should read "Success" and **70 discovered URLs**. If it
says "Couldn't fetch", re-check step 0 first: nine times out of ten the sitemap
simply is not deployed yet.

You only ever do this once. The sitemap regenerates itself on every build from
the catalog.

---

## 3. What is actually in that sitemap, so the numbers make sense later

| | count |
|---|---|
| core pages (home, countries, kosher, collections, about, contact) | 6 |
| collection hubs | 12 |
| destination guides | 30 |
| country pages (only those containing a promoted destination) | 22 |
| **total** | **70** |

**Your site has more pages than that, on purpose.** There are 166 destination
pages and 83 country pages live; 70 are submitted. The other ~180 are still
crawlable and still have proper titles and descriptions - they are simply not
being pushed. The reasoning is in `SEO_PLAN.md`: a domain with no history that
submits 250 pages of uneven depth risks being judged thin *as a whole site*, and
that judgement is much harder to undo than it is to avoid. Step 6 is how you
expand.

---

## 4. How to check indexing

**Do not use `site:tiyulplus.com` in Google.** It is not a reliable index count -
it is approximate, it excludes plenty of indexed pages, and watching it will
mislead you. Use Search Console:

- **Page indexing report** (left menu → Indexing → Pages). This is the real
  number. It splits into "Indexed" and "Not indexed", and the "Not indexed"
  reasons are the useful part:
  - *Discovered - currently not indexed* → Google knows about it and has not got
    to it. Normal early on. Wait.
  - *Crawled - currently not indexed* → Google looked and chose not to index. A
    few is normal. **If most of the 30 land here, stop and tell me** - that is a
    quality signal, not a patience problem, and it changes what to do next.
  - *Duplicate, Google chose a different canonical* → should not happen now that
    every page declares its own canonical, but if it does, send me the URL pair.
- **URL Inspection** (the search bar at the top). Paste one full URL, e.g.
  `https://www.tiyulplus.com/destinations/vienna`. It tells you whether that
  exact page is indexed. You can press "Request indexing" for a handful of
  important pages - it is worth doing for the top five or so destinations, and it
  is not worth doing for all thirty.

---

## 5. The one metric to watch, and why it is not the obvious one

**Watch Impressions** in Search Console → Performance. Not clicks, not average
position.

An impression means Google showed your page to a real person searching in
Hebrew. On a domain with no authority, that is the first thing that moves, and it
moves **weeks before clicks do**, because you will start out ranking on page 3-5
where almost nobody clicks. If you watch clicks you will see zero for a long time
and conclude it is not working while it is in fact working exactly on schedule.

Average position is the worst early metric: it is an average over queries you may
have only one impression for, so it swings wildly and means nothing at low
volume.

Two things to read alongside it:

- **Queries** (same report). What Hebrew phrases are you appearing for at all?
  This is the highest-value information you will get in the first months - it
  tells you which of the four heading patterns (`מה לעשות ב`, `כמה ימים ב`,
  `טיול משפחתי ל`, `מסלול ל`) actually match how people search, and that should
  drive what gets written next.
- **Indexed page count**, from step 4.

---

## 6. When it is safe to expand past the first 30

Do not expand on a date. Expand on evidence. **All three of these, together:**

1. **At least 24 of the 30 destination guides show as Indexed** in the Page
   indexing report (80%).
2. **Impressions are non-zero and trending up** over a four-week window - not one
   spike from you sharing a link.
3. **No pattern of "Crawled - currently not indexed"** across the guides. One or
   two is noise; ten is a verdict.

Realistically you are looking at **8-12 weeks** before you can judge that
honestly.

### How to actually expand

Open `src/lib/seo/selection.ts` and add slugs to `SEO_DESTINATION_SLUGS`. That is
the only edit. The guide sections, the hub membership, the sitemap entry, the
JSON-LD and the internal links all follow from it automatically.

**Add ~20 at a time, then wait another 6-8 weeks before the next batch.** The
next candidates by data completeness, in order, are: `amsterdam`, `munich`,
`singapore`, `interlaken`, `cusco`, `plitvice`, `banff`, `sicily`, `larnaca`,
`phuket`.

Three of those (`amsterdam` 12 places, `munich` 12, `sicily` 11) are just under
the 13-place floor the current 30 all clear. They are still respectable pages;
just know you are relaxing the bar slightly. The test suite will tell you if you
relax it too far - `src/lib/seo/selection.test.ts` asserts the floors and will
fail the build naming any slug that does not clear them.

---

## 7. Two things only you can decide

### The seasonal hubs cannot be built yet, and it is a data problem

`יעדים לפסח` and `יעדים לחורף` are probably the two most valuable Hebrew search
terms available to this site, and I did not build them. They need to know which
months suit each destination.

- The numeric field for this, `bestMonths`, is **empty on all 166 destinations**.
- The prose field `bestSeason` is filled on all 166, but it **cannot be parsed
  safely**. I measured it: **20 of the 30 promoted destinations name months in
  that text as warnings rather than recommendations.** Athens reads *"March-June,
  September-November (July-August very hot)"*. A parser reading month names would
  put Athens in a summer collection and recommend it in August.

**What unblocks it:** populate `bestMonths` in `src/data/destinations.ts` - an
array of month numbers per destination. It is already on `TODO.md` as the
highest-value data task. It is a curation job, not a coding one, and once even
the 30 promoted destinations have it, a seasonal hub is a four-line addition.

If you want, that is a good task for a data session: 30 destinations, and each
one's `bestSeason` prose already tells you the answer - it just needs a human to
separate the recommended months from the warned-against ones, which is exactly
the judgement a parser cannot make.

### FAQ markup will probably not give you rich results, and that is fine

I added `FAQPage` structured data as specified. You should know what it will and
will not do, so you are not waiting for something that is not coming.

Google restricted FAQ rich results (the expandable questions under a search
result) to well-known government and health sites. A travel site will almost
certainly not get them. The markup is still worth having - it is a clean,
machine-readable statement of what the page answers, and that increasingly
matters for AI-generated search answers and assistants, which is a real and
growing source of Hebrew travel traffic.

Google's rich-result policies change. The live check is the
[Rich Results Test](https://search.google.com/test/rich-results) - paste
`https://www.tiyulplus.com/destinations/vienna` into it. It will confirm the
markup is valid regardless of whether it currently earns a visual treatment.

---

## 8. Worth doing, not urgent

- **Bing Webmaster Tools** (https://www.bing.com/webmasters). Takes five minutes,
  and it can import your Search Console property directly rather than
  re-verifying. Bing is a small share of Israeli search, but it also feeds
  ChatGPT's web results, which is worth more than its search share suggests.
- **Re-run the Rich Results Test after any future change** to the guide layout,
  since the FAQ markup is generated from the same content the page renders and
  they must stay in step.

---

## 9. What I could not verify, stated plainly

- **Nothing here was tested against the live site**, because the code is not
  deployed yet. Everything was verified against a local production build: 70
  sitemap URLs, valid JSON-LD on every page type, unique titles and canonicals,
  and RTL with zero horizontal overflow at 1400px and 390px in a real browser.
- **I did not touch DNS, Search Console, or anything in your Google or Vercel
  accounts**, and I did not deploy. All of that is deliberate - it needs your
  credentials and, for DNS, it affects the whole domain.
- **No SQL was run and no production data was touched.** This work does not use
  the database at all: the catalog it reads is TypeScript modules compiled into
  the build.
