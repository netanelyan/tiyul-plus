# Search titles and descriptions - change log

## 2026-10-10 - rewrite of titles, meta descriptions and headings

Branch `seo/snippet-rewrite`. Not deployed until approved. **Write the deploy date
here when it ships:** `____-__-__`

### Why

Search Console, 17 Sep - 5 Oct 2026: 2,253 impressions, 6 clicks, average position
about 37. Google was already showing the pages and almost nobody clicked. Six
destination pages sat on page one (positions 6.6-9.9) with no clicks at all. The
destination template was one long line Google cut off in Hebrew results, it did not
use the words people searched, and it gave no reason to pick us.

### What changed (titles, descriptions, headings only)

| Page type | Before | After |
|---|---|---|
| Destination title | `{city}, {country}: מה לעשות, כמה ימים ומסלול מוכן \| טיול+` | `{city} לישראלים: {up to two reasons} \| טיול+` |
| Domestic destination | (same as above) | `טיול ב{city}: {reasons} \| טיול+` - never flights, visas or "לישראלים" |
| Country title | `טיול ל{country}: יעדים, ויזה ומידע למטייל הישראלי \| טיול+` | `טיול ל{country}: {visa answer or "מידע על ויזה"}, {N} יעדים עם מסלול מוכן \| טיול+` |
| Itinerary title | `מסלול {N} ימים ב{city} · מסלול יום-יום עם מפה \| טיול+` | `טיול ל{city} {N} ימים: מסלול יום-יום עם {stops} עצירות \| טיול+` |
| Destination H1 | `{city}` | `{city} לישראלים` (domestic: `טיול ב{city}`) |
| Country H1 | `{country}` | `טיול ל{country}` (Israel: `טיול בישראל`; entry refused: `{country} לישראלים`) |
| Country H2 (new) | - | `צריך ויזה ל{country}?` followed by `practical.visa` exactly as written, first sentence in bold. The visa card moved out of the practical grid so it is not said twice. Not shown on Israel. |
| Itinerary H1 | `מסלול {N} ימים ב{city}` | `טיול ל{city} {N} ימים: מסלול יום-יום` |
| Descriptions | tagline + summary, cut at 155 | facts first, 140-155 chars (all 289 within 140-157) |

Open Graph and Twitter titles/descriptions are the same strings on every catalog
page (verified in the built HTML for all 289).

**Title reasons, in priority order, first two that fit 55 characters:** direct flight
and its length, kosher restaurants, itinerary length, recommended season. Countries:
the visa answer, then the number of destinations with a ready itinerary.

**Where Israelis cannot enter** (Oman) the title says so instead of giving reasons, and
the description opens with the catalog's own sentence. **Where entry is restricted**
(Indonesia, Malaysia - no diplomatic relations) the title says to check entry on an
Israeli passport and the description opens with the catalog's warning. A title that
says "X לישראלים" must not read as an all-clear.

**Also fixed on the way, because it was in titles and headings:** Hebrew drops the
definite article after ב/ל/כ, and the code did not. The Philippines country title read
"טיול להפיליפינים", the Dolomites itinerary "מסלול 5 ימים בהדולומיטים", and three H2s
on these pages had the same bug. `hePrefix` now knows the 11 catalog names that open
with the article (`DEFINITE_FIRST_WORDS` in `src/lib/hebrew.ts`). This also corrects the
same names wherever else the app prefixes them (agent chips, planner query, labels).

### The fact rule

Nothing in a title or description is a fact the page's data does not state. Facts
come from `src/lib/seo/facts.ts`, which only accepts narrow shapes and returns nothing
otherwise:

- **Direct flight**: only when the first sentence of `practical.flights` says so, the
  flight lands at this destination (not a gateway: Interlaken-Zurich, Samarkand-Tashkent
  and five others were caught and excluded), and it is not seasonal. Length is printed
  only when stated without a range or extra minutes.
- **Visa**: "ללא ויזה עד N יום" only when the first sentence of `practical.visa` says
  visa-free for a span, without a hedge, and no online pre-registration (ESTA, eTA,
  ETA, TDAC, eTravel, arrival card) appears anywhere in the text. Otherwise the title
  says "מידע על ויזה" and the description quotes the first sentence verbatim if short.
- **Kosher**: only the overview's own words ("מסעדות כשרות", "מאות/עשרות מקומות
  כשרים"), never a count of map entries - Rome has 2 kosher entries on our map and
  "more than a dozen kosher restaurants" in its overview.
- **Season**: the recommended months only when the sentence opens with nothing but
  months; region-qualified or conditional seasons are skipped.

`src/lib/seo/snippets.test.ts` re-checks every page: every number must appear in that
page's data (Hebrew number words included), visa-free claims must match the visa text
and its span, kosher wording must match the overview, direct-flight claims must match
the flight sentence. It was mutation-tested: a wrong flight length, a wrong visa span,
an invented kosher claim and an invented direct flight each fail it.

### Overrides

Hand-written in `src/data/seoOverrides.ts` (edit there; every override lists the exact
catalog quotes it rests on, and the test fails if a quote is not in its field).

| Page | Query it is written for | Title length | Description length |
|---|---|---|---|
| `/destinations/almaty` | אלמטי (78 impressions, position 9) | 50 | 146 |
| `/destinations/jutland` | יוטלנד (position 9.6) | 47 | 146 |
| `/destinations/fergana-valley` | עמק פרגנה (position 9.9) | 45 | 153 |
| `/destinations/vojvodina` | וויוודינה (position 7.3) | 50 | 152 |
| `/destinations/queenstown` | קווינסטאון (position 6.6) | 51 | 146 |
| `/destinations/dolomites` | דולומיטים / טיול לדולומיטים (position 9.3) | 50 | 144 |
| `/countries/oman` | עומאן (529 of 667 impressions, position 14) | 44 | 147 |
| `/countries/spain` | ספרד / טיול לספרד (101) | 51 | 147 |
| `/countries/iceland` | איסלנד / ויזה לאיסלנד (90; the visa query at 17) | 47 | 143 |
| `/destinations/prague` | פראג (86) | 51 | 153 |
| `/countries/mauritius` | מאוריציוס (70) | 51 | 155 |
| `/countries/thailand` | תאילנד (68) | 52 | 148 |
| `/destinations/tasmania` | טסמניה (52, position 15) | 48 | 143 |
| `/destinations/cappadocia` | קפדוקיה (47, position 14) | 45 | 152 |
| `/itinerary/sicily/5` | טיול לסיציליה 5 ימים (position 17) | 46 | 154 |

The other near-miss queries already land on template titles that open with the query
("ריגה לישראלים", "טיול לקרואטיה", "סיציליה לישראלים", "רומא לישראלים", "טיול לקזחסטן");
they are listed below. "טיול מאורגן לקזחסטן" is not claimed - we do not sell organised tours.

### How to measure it (28 days after deploy)

Impressions tripled during the baseline window, so raw clicks will rise on their own.
Compare **CTR and average position per page**, over two equal windows: the 28 days
before the deploy date and the 28 days after it. Search Console > Performance > Pages,
filter each URL, compare date ranges.

Baseline from the brief (17 Sep - 5 Oct, 19 days; fill the blanks from Pages.csv):

| Page | Impressions | Clicks | Position |
|---|---|---|---|
| `/countries/oman` | 667 | 2 | 14 |
| `/countries/spain` | 101 | | |
| `/countries/iceland` | 90 | | |
| `/destinations/prague` | 86 | | |
| `/destinations/almaty` | 78 | 0 | 9 |
| `/countries/mauritius` | 70 | | |
| `/countries/thailand` | 68 | | |
| `/destinations/tasmania` | 52 | | 15 |
| `/destinations/cappadocia` | 47 | | 14 |
| `/destinations/vojvodina` | | 0 | 7.3 |
| `/destinations/queenstown` | | 0 | 6.6 |
| `/destinations/dolomites` | | 0 | 9.3 |
| `/destinations/jutland` | | 0 | 9.6 |
| `/destinations/fergana-valley` | | 0 | 9.9 |
| `/itinerary/sicily/5` | | | 17 (query) |

After deploy, use URL Inspection > Request indexing on the 15 pages above so Google
picks up the new titles before the next routine crawl. `lastmod` in the sitemap was
deliberately not moved: the ledger tracks catalog content, and re-dating 289 pages
for a title change is the "stamp everything" pattern it exists to prevent.

### Things to verify before or after release

Every claim below is in our data; what I could not check is whether the data is still
current.

- **Thailand, 60 days visa-free.** The catalog says 60 days plus TDAC. Thailand was
  reported in 2025 to be considering cutting visa-free stays to 30 days. Worth one
  check before the override ships, since the title states the number.
- **Moldova and Panama** template titles say "ללא ויזה עד 90 יום"; their visa texts
  add "נכון להיום ובכפוף לשינויים", which a title has no room for.
- **Mauritius override** title says "פטור מאשרה עד 90 יום"; the online entry form and
  "נכון להיום" are in the description, not the title.
- **New York** "טיסה ישירה של כ-12 שעות" is the westbound time; the catalog gives
  about 10.5 hours back.
- **Crete** "טיסה ישירה מנתב"ג": the catalog says about 29 flights a week "in season";
  it does not say whether any fly in winter.
- **Oman** title is a question ("אפשר להיכנס עם דרכון ישראלי?"); the description answers
  no in its first words. Honest, but it may draw clicks from people hoping for yes.
- **Taglines** are used as low-priority filler in descriptions. Taglines that make their
  own flight, visa or kosher claims are excluded, so those claims keep one checked
  source; the rest are catalog copy and were already in the old descriptions.

### Before / after: the 15 overridden pages

**Titles**

| Page | Before | After |
|---|---|---|
| `/destinations/almaty` | אלמטי, קזחסטן: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | אלמטי לישראלים: טיסה ישירה, ללא ויזה ומסלול 4 ימים \| טיול+ |
| `/destinations/jutland` | יוטלנד, דנמרק: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | יוטלנד לישראלים: ויקינגים, דיונות ומסלול 5 ימים \| טיול+ |
| `/destinations/fergana-valley` | עמק פרגנה, אוזבקיסטן: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | עמק פרגנה לישראלים: משי, קרמיקה ומסלול 5 ימים \| טיול+ |
| `/destinations/vojvodina` | וויוודינה, סרביה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | וויוודינה לישראלים: נובי סאד, הדנובה ומסלול 4 ימים \| טיול+ |
| `/destinations/queenstown` | קווינסטאון והאי הדרומי, ניו זילנד: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | קווינסטאון לישראלים: פיורדים, קרחונים ומסלול 6 ימים \| טיול+ |
| `/destinations/dolomites` | הדולומיטים, איטליה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | טיול לדולומיטים: מסלול 6 ימים, אגמים ומסלולי הליכה \| טיול+ |
| `/countries/oman` | טיול לעומאן: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | עומאן לישראלים: אפשר להיכנס עם דרכון ישראלי? \| טיול+ |
| `/countries/spain` | טיול לספרד: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | טיול לספרד: טיסה ישירה, ללא ויזה ו-4 יעדים עם מסלול \| טיול+ |
| `/countries/iceland` | טיול לאיסלנד: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | טיול לאיסלנד: פטור מוויזה עד 90 יום ו-2 מסלולים \| טיול+ |
| `/destinations/prague` | פראג, צ׳כיה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | פראג לישראלים: טיסה ישירה של כ-4 שעות, מסעדות כשרות \| טיול+ |
| `/countries/mauritius` | טיול למאוריציוס: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | טיול למאוריציוס: פטור מאשרה עד 90 יום ומסלול 5 ימים \| טיול+ |
| `/countries/thailand` | טיול לתאילנד: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | טיול לתאילנד: ללא ויזה עד 60 יום, טיסה ישירה לבנגקוק \| טיול+ |
| `/destinations/tasmania` | טסמניה, אוסטרליה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | טסמניה לישראלים: מסלול 7 ימים, הרים וחופים ריקים \| טיול+ |
| `/destinations/cappadocia` | קפדוקיה, טורקיה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | קפדוקיה לישראלים: כדורים פורחים ומסלול 5 ימים \| טיול+ |
| `/itinerary/sicily/5` | מסלול 5 ימים בסיציליה · מסלול יום-יום עם מפה \| טיול+ | טיול לסיציליה 5 ימים: פלרמו, אגריג׳נטו והבארוק \| טיול+ |

**Descriptions** (before = what production serves today)

| Page | Before | After |
|---|---|---|
| `/destinations/almaty` | עיר למרגלות הרים מושלגים - שער לקניון צ׳ארין ולאגמי טיאן שאן · אלמטי, העיר הגדולה של קזחסטן, יושבת למרגלות הרי טיאן שאן המושלגים - ומשלבת עיר ירוקה ונעימה... | אלמטי: טיסה ישירה מנתב"ג של כ-6 שעות, ללא ויזה עד 30 יום, ומסלול 4 ימים לעיר, להרים, לקניון צ׳ארין ולאגמי קולסאי. בית חב"ד עם חנות כשרה וחדר אוכל. |
| `/destinations/jutland` | החצי היבשתי של דנמרק: אבני הוויקינגים, דיונות נודדות ומקום שבו שני ימים נפגשים · רוב מי שטס לדנמרק רואה את קופנהגן ואת צפון זילנד. יוטלנד היא חצי האי... | יוטלנד, החצי היבשתי של דנמרק: מסלול 5 ימים מאורהוס והוויקינגים ועד הדיונות וקצה דנמרק. טסים לקופנהגן וממשיכים ברכבת כשלוש שעות. העונה: מאי-ספטמבר. |
| `/destinations/fergana-valley` | ארמון ח׳אן, בתי מלאכה של משי וקרמיקה, ועמק חקלאי צפוף שכמעט אין בו תיירים · עמק פרגנה במזרח אוזבקיסטן הוא האזור הצפוף והפורה במרכז אסיה, מוקף הרים משלושה... | עמק פרגנה: מסלול 5 ימים מקוקנד דרך מרגילן והמשי ועד נמנגן, בעמק שכמעט אין בו תיירים. טסים לטשקנט וממשיכים ברכבת מהירה. העונה: אפריל-יוני, ספטמבר-אוקטובר. |
| `/destinations/vojvodina` | מבצר על הדנובה, יקבי קטן וערים אוסטרו-הונגריות · וויוודינה היא החבל הצפוני של סרביה, מישור חקלאי עצום שנשלט מאות שנים בידי האימפריה האוסטרו-הונגרית ולכן... | וויוודינה, סרביה: מסלול 4 ימים מנובי סאד והמבצר על הדנובה דרך יקבים ומנזרים. טסים לבלגרד, כשעה נסיעה מנובי סאד. אין מסעדה כשרה. העונה: מאי-יוני וספטמבר. |
| `/destinations/queenstown` | פיורדים, קרחונים ואגמים - בירת הטבע והאדרנלין · קווינסטאון יושבת על גדת אגם ואקטיפו בין רכסי הרים, והיא נקודת המוצא לטבע של האי הדרומי: פיורד מילפורד... | קווינסטאון והאי הדרומי: מסלול 6 ימים למילפורד סאונד, ואנאקה והר קוק. אין טיסה ישירה: כ-28-32 שעות עם שתי החלפות. יש בית חב"ד. העונה: דצמבר-פברואר. |
| `/destinations/dolomites` | אגמי אלפים טורקיז, פסגות סלע ומסלולי הליכה - צפון איטליה · הדולומיטים הם רכס האלפים הדרומי בצפון איטליה, אתר מורשת עולמית - עולם של פסגות סלע ורודות, אחו... | הדולומיטים: מסלול 6 ימים מבראייס ושלוש הפסגות דרך ואל גרדנה ועד אגם סוראפיס. טסים ישירות לוונציה וממשיכים כ-2-2.5 שעות ברכב. העונה: יוני-ספטמבר. |
| `/countries/oman` | מדינת מפרץ שנראית כמו עומאן ולא כמו קניון · עומאן היא ההפך מדובאי. אין כאן מגדלים ואין קניונים ענקיים, אלא מצודות חימר, שווקים מקורים, ואדיות עם בריכות... | נכון להיום דרכון ישראלי אינו מתקבל לכניסה לעומאן, ואין יחסים דיפלומטיים. מה לבדוק אם יש לכם אזרחות זרה, ומסלול 5 ימים במסקאט ובצפון לאוקטובר-אפריל. |
| `/countries/spain` | גאודי, טאפאס וחופים - וההיסטוריה של יהדות ספרד · ספרד מציעה שילוב נדיר של אמנות, חוף ים ואנרגיה עירונית - לצד ההיסטוריה העמוקה של יהדות ספרד, מהרבעים... | ישראלים נכנסים לספרד ללא ויזה עד 90 יום. טיסה ישירה מנתב"ג למדריד (כ-5 שעות) ולברצלונה (כ-4.5), ומסלולים יום-יום למדריד, ברצלונה, מיורקה ואנדלוסיה. |
| `/countries/iceland` | מפלים, קרחונים וגייזרים - ארץ האש והקרח · איסלנד היא יעד טבע קיצוני ונגיש בו-זמנית: מפלים ענקיים, שדות לבה, גייזרים, לגונות קרחונים וחופים שחורים - כולם... | ישראלים פטורים מוויזה לאיסלנד עד 90 יום (מרחב שנגן), עם דרכון בתוקף. מסלולים יום-יום לריקיאוויק והחוף הדרומי ולצפון איסלנד. העונה: יוני-אוגוסט. |
| `/destinations/prague` | עיר הזהב: גשרים, טירות והרובע היהודי המפורסם בעולם · היעד האהוב על ישראלים במרכז אירופה, ובצדק: עיר יפה להפליא שכולה מהלכת, הרובע היהודי העתיק עם בית... | פראג: טיסה ישירה של כ-4 שעות, מסלול 7 ימים עם 37 מקומות על מפה, ושתי מסעדות כשרות ברובע היהודי. העונה: אפריל-יוני, ספטמבר-אוקטובר. פותחים במתכנן ועורכים. |
| `/countries/mauritius` | אי אחד באוקיינוס ההודי שבו לגונה, הר געש ויער גשם נמצאים בשעת נסיעה · מאוריציוס היא אי געשי באוקיינוס ההודי, כאלפיים קילומטרים ממזרח לאפריקה, ובגודל של... | ישראלים פטורים מאשרה עד 90 יום, נכון להיום, וממלאים טופס כניסה מקוון. אין טיסה ישירה: 12-16 שעות דרך דובאי או איסטנבול. אין מסעדות כשרות. העונה: מאי-דצמבר. |
| `/countries/thailand` | מקדשים, אוכל רחוב ברמה עולמית - והיעד הראשון של טיול+ מחוץ לאירופה · תאילנד היא הכניסה הטבעית לישראלים לדרום-מזרח אסיה: טיסה ישירה יציבה מנתב"ג, פטור... | ישראלים נכנסים לתאילנד ללא ויזה עד 60 יום, עם הרשמה מקוונת ל-TDAC עד 72 שעות לפני הנחיתה. טיסה ישירה לבנגקוק ולפוקט (כ-11 שעות) ומסלולים ל-4 אזורים. |
| `/destinations/tasmania` | האי הדרומי: הרים, חופים ריקים ומורשת קולוניאלית קשה · טסמניה היא אי בגודל אירלנד מדרום ליבשת, והיא מרגישה כמו מדינה אחרת: קרירה, ירוקה, עם אוכלוסייה קטנה... | טסמניה: מסלול 7 ימים מהובארט ופורט ארתור ועד מפרץ האש והר קרייל. אין טיסה ישירה: 25-30 שעות בדרך, אז מתכננים יום התאוששות. העונה: דצמבר-פברואר. |
| `/destinations/cappadocia` | עמקי טוף, ערים תת-קרקעיות וזריחה מעל כדורים פורחים · קפדוקיה יושבת במרכז אנטוליה, כשעה טיסה מאיסטנבול, והנוף שלה נוצר מאפר וולקני שנשחק לצורות שנראות... | קפדוקיה: מסלול 5 ימים לגורמה, כדור פורח, ערים תת-קרקעיות ועמק הוורדים. אין קו ישיר: טסים לאיסטנבול ומשם כשעה לנבשהיר. העונה: אפריל-יוני, ספטמבר-אוקטובר. |
| `/itinerary/sicily/5` | מסלול מוכן 5 ימים בסיציליה: 17 עצירות, יום-יום, עם מפה, עונה מומלצת וטיסות מתל אביב. אפשר לפתוח אותו במתכנן ולערוך לתאריכים שלכם. | מסלול 5 ימים בסיציליה, יום אחרי יום: פלרמו ומונראלה, אגריג׳נטו, הפסיפסים והבארוק של הדרום-מזרח. טיסה ישירה לקטניה בקיץ. העונה: אפריל-יוני, ספטמבר-אוקטובר. |

**Main heading (H1)**

| Page | Before | After |
|---|---|---|
| `/destinations/almaty` | אלמטי | אלמטי לישראלים |
| `/destinations/jutland` | יוטלנד | יוטלנד לישראלים |
| `/destinations/fergana-valley` | עמק פרגנה | עמק פרגנה לישראלים |
| `/destinations/vojvodina` | וויוודינה | וויוודינה לישראלים |
| `/destinations/queenstown` | קווינסטאון והאי הדרומי | קווינסטאון והאי הדרומי לישראלים |
| `/destinations/dolomites` | הדולומיטים | טיול לדולומיטים |
| `/countries/oman` | עומאן | עומאן לישראלים |
| `/countries/spain` | ספרד | טיול לספרד |
| `/countries/iceland` | איסלנד | טיול לאיסלנד |
| `/destinations/prague` | פראג | פראג לישראלים |
| `/countries/mauritius` | מאוריציוס | טיול למאוריציוס |
| `/countries/thailand` | תאילנד | טיול לתאילנד |
| `/destinations/tasmania` | טסמניה | טסמניה לישראלים |
| `/destinations/cappadocia` | קפדוקיה | קפדוקיה לישראלים |
| `/itinerary/sicily/5` | מסלול 5 ימים בסיציליה | טיול לסיציליה 5 ימים: מסלול יום-יום |

### Before / after: the near-miss queries (template, not overridden)

| Page | Before | After |
|---|---|---|
| `/destinations/riga` | ריגה, לטביה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | ריגה לישראלים: טיסה ישירה של כ-4 שעות, מסלול 3 ימים \| טיול+ |
| `/countries/kazakhstan` | טיול לקזחסטן: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | טיול לקזחסטן: ללא ויזה עד 30 יום, 2 יעדים עם מסלול מוכן \| טיול+ |
| `/countries/croatia` | טיול לקרואטיה: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | טיול לקרואטיה: ללא ויזה עד 90 יום, 3 יעדים עם מסלול \| טיול+ |
| `/destinations/sicily` | סיציליה, איטליה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | סיציליה לישראלים: מסלול 9 ימים \| טיול+ |
| `/destinations/rome` | רומא, איטליה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | רומא לישראלים: טיסה ישירה של כ-3.5 שעות, מסעדות כשרות \| טיול+ |

| Page | Before | After |
|---|---|---|
| `/destinations/riga` | עיר הנזאית עם רובע ארט נובו, ועמק נהר עם טירות במרחק שעה · ריגה יושבת על נהר דאוגאבה סמוך לשפכו לים הבלטי, והייתה עיר סוחרים הנזאית גדולה. הליבה שלה היא... | ריגה: טיסה ישירה מנתב"ג של כ-4 שעות, מסלול מוכן ל-3 ימים עם 19 מקומות על מפה. העונה המומלצת: מאי-ספטמבר. אפשר לפתוח במתכנן ולערוך. כולל מצב הכשרות ביעד. |
| `/countries/kazakhstan` | הרי טיאן שאן, קניונים ואגמים - שער מרכז אסיה לישראלים · קזחסטן היא יעד טבע יוצא דופן שרק מתחיל להתגלות לישראלים: טיסה ישירה, פטור מוויזה, ואלמטי - העיר... | ישראלים נכנסים לקזחסטן ללא ויזה עד 30 יום. 2 יעדים עם מסלול יום-יום ומפה: אלמטי, טורקסטן ודרום קזחסטן. יש טיסה ישירה מנתב"ג לאלמטי של כ-6 שעות. |
| `/countries/croatia` | אגמי מפלים, איים אדריאטיים וערים ונציאניות · קרואטיה משלבת שני עולמות: פנים הארץ עם אגמי פליטביצה ומפלי קרקה - מהיפים באירופה - וחוף אדריאטי ארוך עם אלף... | ישראלים נכנסים לקרואטיה ללא ויזה עד 90 יום. 3 יעדים עם מסלול יום-יום ומפה: פליטביצה והחוף הדלמטי, איסטריה, דלמטיה - ספליט והאיים. כולל מטבע, סים ותשלומים. |
| `/destinations/sicily` | מקדשים יווניים, פסיפסים רומיים ובארוק זהוב על אי שהוא עולם בפני עצמו · סיציליה אספה שכבה על שכבה: יוונים שבנו כאן מקדשים גדולים מאלה שבאתונה, רומאים... | סיציליה: מסלול מוכן ל-9 ימים עם 25 מקומות על מפה. העונה המומלצת: אפריל-יוני וספטמבר-אוקטובר. פותחים במתכנן ומתאימים לתאריכים שלכם. כולל מצב הכשרות ביעד. |
| `/destinations/rome` | העיר הנצחית: קולוסיאום, פסטה - והגטו היהודי הכי טעים באירופה · רומא היא מוזיאון פתוח של 2,500 שנה - ובשביל ישראלים יש בה בונוס ענק: הגטו היהודי, הקהילה... | רומא: טיסה ישירה מנתב"ג של כ-3.5 שעות, מסלול מוכן ל-7 ימים עם 38 מקומות על מפה, יש מסעדות כשרות. העונה המומלצת: מרץ-מאי, ספטמבר-נובמבר. כולל מצב הכשרות. |

### Before / after: 10 random pages (seeded sample, 5 destinations, 3 countries, 2 itineraries)

| Page | Before | After |
|---|---|---|
| `/destinations/mostar-sarajevo` | מוסטר וסרייבו, בוסניה והרצגובינה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | מוסטר וסרייבו לישראלים: מסלול 6 ימים \| טיול+ |
| `/destinations/mallorca` | מיורקה, ספרד: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | מיורקה לישראלים: מסלול 5 ימים \| טיול+ |
| `/destinations/mitzpe-ramon` | מצפה רמון והנגב, ישראל: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | טיול במצפה רמון והנגב: מסלול 3 ימים \| טיול+ |
| `/destinations/bali-lesser-sunda` | באלי ואיי סונדה הקטנים, אינדונזיה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | באלי ואיי סונדה הקטנים לישראלים: לבדוק כניסה בדרכון \| טיול+ |
| `/destinations/chisinau-moldova` | קישינב ומולדובה, מולדובה: מה לעשות, כמה ימים ומסלול מוכן \| טיול+ | קישינב ומולדובה לישראלים: מסלול 5 ימים \| טיול+ |
| `/countries/seychelles` | טיול לסיישל: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | טיול לסיישל: מסלול 5 ימים ומידע על ויזה \| טיול+ |
| `/countries/ecuador` | טיול לאקוודור: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | טיול לאקוודור: מסלול 5 ימים ומידע על ויזה \| טיול+ |
| `/countries/panama` | טיול לפנמה: יעדים, ויזה ומידע למטייל הישראלי \| טיול+ | טיול לפנמה: ללא ויזה עד 90 יום, מסלול 5 ימים \| טיול+ |
| `/itinerary/bohemian-switzerland/4` | מסלול 4 ימים בשווייץ הבוהמית · מסלול יום-יום עם מפה \| טיול+ | טיול לשווייץ הבוהמית 4 ימים: מסלול יום-יום עם 15 עצירות \| טיול+ |
| `/itinerary/meteora-epirus/5` | מסלול 5 ימים במטאורה ואפירוס · מסלול יום-יום עם מפה \| טיול+ | טיול למטאורה ואפירוס 5 ימים: מסלול יום-יום עם 12 עצירות \| טיול+ |

| Page | Before | After |
|---|---|---|
| `/destinations/mostar-sarajevo` | גשר עות׳מאני מעל נהר ירוק, בזאר סרייבו, ומלחמה שעדיין בקירות · הרצגובינה בדרום נותנת את הנהרות והאבן: מוסטר עם הגשר העתיק והעיר העתיקה סביבו, בלגאי עם... | מוסטר וסרייבו: מסלול מוכן ל-6 ימים עם 19 מקומות על מפה. העונה המומלצת: מאי-יוני וספטמבר-אוקטובר. פותחים במתכנן ומתאימים לתאריכים שלכם. כולל מצב הכשרות. |
| `/destinations/mallorca` | הרי טרמונטנה, מפרצי טורקיז וכפרי אבן - אי הים התיכון · מיורקה, הגדול באיי הבלארים, הוא הרבה יותר מחופים: רכס הרי טרמונטנה (אתר מורשת עולמית) עם מסלולי... | מיורקה: מסלול מוכן ל-5 ימים עם 24 מקומות על מפה. העונה המומלצת: מאי-יוני וספטמבר-אוקטובר. הרי טרמונטנה, מפרצי טורקיז וכפרי אבן - אי הים התיכון. |
| `/destinations/mitzpe-ramon` | מכתש באורך ארבעים קילומטר, ושמי לילה בלי זיהום אור · מכתש רמון הוא התופעה הגאולוגית הגדולה בארץ ואין כמותו במקום אחר בעולם. מצפה רמון יושבת בדיוק על השפה... | מצפה רמון והנגב: מסלול מוכן ל-3 ימים עם 10 מקומות על מפה. העונה המומלצת: אוקטובר-אפריל. פותחים במתכנן ומתאימים לתאריכים שלכם. כולל מצב הכשרות ומידע פרקטי. |
| `/destinations/bali-lesser-sunda` | מקדשים על צוקים, הרי געש בשחר ודרקוני קומודו: האי ההינדי של אינדונזיה והשכנים שלו · אינדונזיה היא אלפי איים, ובאלי הוא היחיד שנשאר הינדי אחרי שהאסלאם... | כניסה לבעלי דרכון ישראלי היא סוגיה מורכבת, וצריך לבדוק לפני הזמנה. באלי ואיי סונדה הקטנים: מסלול מוכן ל-5 ימים עם 19 מקומות על מפה. כולל מצב הכשרות ביעד. |
| `/destinations/chisinau-moldova` | מרתפי יין אינסופיים, מנזרי סלע ועיר עם היסטוריה יהודית כבדה · קישינב היא בירה ירוקה ונמוכה, עם שדרות רחבות, פארקים ענקיים ומחירים שנעלמו מכל מקום אחר... | קישינב ומולדובה: מסלול מוכן ל-5 ימים עם 18 מקומות על מפה. העונה המומלצת: מאי-אוקטובר. מרתפי יין אינסופיים, מנזרי סלע ועיר עם היסטוריה יהודית כבדה. |
| `/countries/seychelles` | סלעי גרניט ורודים על חול לבן, ואי אחד קטן מהשני · סיישל היא ארכיפלג של יותר ממאה איים באוקיינוס ההודי, כאלף וחצי קילומטרים ממזרח לאפריקה, ורק כמה מהם... | סיישל: מסלול מוכן ל-5 ימים בסיישל: מאהה, פרלין ולה דיג, יום אחרי יום על מפה. אין טיסה ישירה מישראל. כולל ויזה, מטבע, סים, תשלומים ומצב הכשרות בכל יעד. |
| `/countries/ecuador` | שדרת הרי געש, קו המשווה, והכל במדינה בגודל של רבע ישראל כפול ארבע · אקוודור היא הקטנה שבמדינות האנדים, וזה בדיוק היתרון שלה: בתוך כמה שעות נסיעה עוברים... | ישראלים פטורים מאשרה לשהייה של עד 90 יום בשנה קלנדרית, נכון להיום ובכפוף לשינויים. מסלול מוכן ל-5 ימים בקיטו, קוטופחשי והאנדים, יום אחרי יום על מפה. |
| `/countries/panama` | תעלה שמחברת שני אוקיינוסים, ואיים קריביים בלי מלונות · פנמה היא רצועה צרה שמחברת בין שתי אמריקות ומפרידה בין שני אוקיינוסים, ובשעתיים נסיעה אפשר לעבור בה... | ישראלים נכנסים לפנמה ללא ויזה עד 90 יום. מסלול מוכן ל-5 ימים בפנמה: התעלה, בוקאס ובוקטה, יום אחרי יום על מפה. אין טיסה ישירה מישראל. כולל מטבע וסים. |
| `/itinerary/bohemian-switzerland/4` | מסלול מוכן 4 ימים בשווייץ הבוהמית: 15 עצירות, יום-יום, עם מפה, עונה מומלצת וטיסות מתל אביב. אפשר לפתוח אותו במתכנן ולערוך לתאריכים שלכם. | מסלול 4 ימים בשווייץ הבוהמית, יום אחרי יום: 15 עצירות על מפה. העונה המומלצת: מאי-אוקטובר. שערי סלע, נקיקים ויערות - שעה וחצי מפראג. נפתח במתכנן לעריכה. |
| `/itinerary/meteora-epirus/5` | מסלול מוכן 5 ימים במטאורה ואפירוס: 12 עצירות, יום-יום, עם מפה, עונה מומלצת וטיסות מתל אביב. אפשר לפתוח אותו במתכנן ולערוך לתאריכים שלכם. | מסלול 5 ימים במטאורה ואפירוס, יום אחרי יום: 12 עצירות על מפה, אין טיסה ישירה מישראל. העונה המומלצת: מאי-יוני וספטמבר-אוקטובר. כולל ויזה ומצב הכשרות. |
