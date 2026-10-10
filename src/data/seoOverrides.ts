/**
 * Hand-written search titles and descriptions for the pages that need better
 * than the template. Edit freely - this file is meant to be edited by hand.
 *
 * Keys are page paths. `title` is written WITHOUT the site-name suffix
 * (`TITLE_SUFFIX` in `@/lib/seo/snippets`), which is added for you. `h1` is
 * optional and replaces the page's main heading.
 *
 * ## The fact rule still applies here
 *
 * An override is free to choose words, not facts. Every fact in it must be one
 * the page's own data states, and `facts` lists each one with the exact catalog
 * text it rests on. `src/lib/seo/snippets.test.ts` checks that every quote is
 * really in the named field, that every number in the title and description
 * appears in the page's data, and that visa and kosher wording matches what the
 * catalog says. If you change a fact, change its quote too, or the test fails.
 *
 * `source` names the field the quote is read from, on the page this key belongs to:
 * - 'flights', 'bestSeason', 'kosherOverview', 'summary', 'tagline': the destination
 *   (on a destination or itinerary page). 'itinerary' is the day titles - on an
 *   itinerary page, only the days that page shows.
 * - 'visa', 'country.summary', 'country.tagline': the country (on any page type).
 * - '<city-slug>.flights' (or .bestSeason, .kosherOverview, .itinerary): one of a
 *   country's cities, on a country page.
 *
 * Written 2026-10-10 against Search Console data for 17 Sep - 5 Oct 2026; see
 * docs/seo-changes.md for the queries each override answers and the numbers to
 * compare against 28 days after release.
 */

export interface SnippetOverride {
  /** The query this override is written for, as Search Console reported it. */
  query: string;
  title: string;
  description: string;
  h1?: string;
  facts: { source: string; quote: string }[];
}

export const SNIPPET_OVERRIDES: Record<string, SnippetOverride> = {
  // ---------- Page one, no clicks ----------

  '/destinations/almaty': {
    query: 'אלמטי (78 חשיפות, מיקום 9)',
    title: 'אלמטי לישראלים: טיסה ישירה, ללא ויזה ומסלול 4 ימים',
    description:
      'אלמטי: טיסה ישירה מנתב"ג של כ-6 שעות, ללא ויזה עד 30 יום, ומסלול 4 ימים לעיר, להרים, לקניון צ׳ארין ולאגמי קולסאי. בית חב"ד עם חנות כשרה וחדר אוכל.',
    facts: [
      { source: 'flights', quote: 'אייר אסטנה מפעילה טיסה ישירה מנתב"ג לאלמטי' },
      { source: 'flights', quote: 'טיסה של כ-6 שעות' },
      { source: 'visa', quote: 'ישראלים פטורים מוויזה לקזחסטן לשהות של עד 30 יום' },
      { source: 'itinerary', quote: 'קניון צ׳ארין' },
      { source: 'itinerary', quote: 'אגמי קולסאי' },
      { source: 'kosherOverview', quote: 'חנות כשרה וחדר אוכל' },
    ],
  },

  '/destinations/jutland': {
    query: 'יוטלנד (מיקום 9.6)',
    title: 'יוטלנד לישראלים: ויקינגים, דיונות ומסלול 5 ימים',
    description:
      'יוטלנד, החצי היבשתי של דנמרק: מסלול 5 ימים מאורהוס והוויקינגים ועד הדיונות וקצה דנמרק. טסים לקופנהגן וממשיכים ברכבת כשלוש שעות. העונה: מאי-ספטמבר.',
    facts: [
      { source: 'tagline', quote: 'החצי היבשתי של דנמרק: אבני הוויקינגים, דיונות נודדות' },
      { source: 'itinerary', quote: 'אורהוס' },
      { source: 'itinerary', quote: 'צפונה לדיונות' },
      { source: 'itinerary', quote: 'קצה דנמרק' },
      { source: 'flights', quote: 'טיסה לקופנהגן ומשם רכבת לאורהוס בכשלוש שעות' },
      { source: 'bestSeason', quote: 'מאי עד ספטמבר' },
    ],
  },

  '/destinations/fergana-valley': {
    query: 'עמק פרגנה (מיקום 9.9)',
    title: 'עמק פרגנה לישראלים: משי, קרמיקה ומסלול 5 ימים',
    description:
      'עמק פרגנה: מסלול 5 ימים מקוקנד דרך מרגילן והמשי ועד נמנגן, בעמק שכמעט אין בו תיירים. טסים לטשקנט וממשיכים ברכבת מהירה. העונה: אפריל-יוני, ספטמבר-אוקטובר.',
    facts: [
      { source: 'tagline', quote: 'בתי מלאכה של משי וקרמיקה' },
      { source: 'tagline', quote: 'שכמעט אין בו תיירים' },
      { source: 'itinerary', quote: 'מטשקנט לקוקנד' },
      { source: 'itinerary', quote: 'מרגילן והמשי' },
      { source: 'itinerary', quote: 'נמנגן' },
      { source: 'flights', quote: 'טסים לטשקנט' },
      { source: 'flights', quote: 'רכבת מהירה' },
      { source: 'bestSeason', quote: 'אפריל עד יוני וספטמבר עד אוקטובר' },
    ],
  },

  '/destinations/vojvodina': {
    query: 'וויוודינה (מיקום 7.3)',
    title: 'וויוודינה לישראלים: נובי סאד, הדנובה ומסלול 4 ימים',
    description:
      'וויוודינה, סרביה: מסלול 4 ימים מנובי סאד והמבצר על הדנובה דרך יקבים ומנזרים. טסים לבלגרד, כשעה נסיעה מנובי סאד. אין מסעדה כשרה. העונה: מאי-יוני וספטמבר.',
    facts: [
      { source: 'itinerary', quote: 'נובי סאד והמבצר' },
      { source: 'itinerary', quote: 'יקבים ומנזרים' },
      { source: 'tagline', quote: 'מבצר על הדנובה' },
      { source: 'flights', quote: 'שדה התעופה הרלוונטי הוא בלגרד, כשעה נסיעה דרומית מנובי סאד' },
      { source: 'kosherOverview', quote: 'אין בוויוודינה מסעדה כשרה' },
      { source: 'bestSeason', quote: 'מאי עד יוני וספטמבר' },
    ],
  },

  '/destinations/queenstown': {
    query: 'קווינסטאון (מיקום 6.6)',
    title: 'קווינסטאון לישראלים: פיורדים, קרחונים ומסלול 6 ימים',
    description:
      'קווינסטאון והאי הדרומי: מסלול 6 ימים למילפורד סאונד, ואנאקה והר קוק. אין טיסה ישירה: כ-28-32 שעות עם שתי החלפות. יש בית חב"ד. העונה: דצמבר-פברואר.',
    facts: [
      { source: 'tagline', quote: 'פיורדים, קרחונים ואגמים' },
      { source: 'itinerary', quote: 'מילפורד סאונד' },
      { source: 'itinerary', quote: 'ואנאקה' },
      { source: 'itinerary', quote: 'הר קוק' },
      { source: 'flights', quote: 'אין ולא הייתה טיסה ישירה מנתב"ג לניו זילנד' },
      { source: 'flights', quote: 'בדרך כלל שתי החלפות' },
      { source: 'flights', quote: 'כ-28-32 שעות' },
      { source: 'kosherOverview', quote: 'בקווינסטאון פועל בית חב"ד' },
      { source: 'bestSeason', quote: 'דצמבר-פברואר' },
    ],
  },

  '/destinations/dolomites': {
    query: 'דולומיטים / טיול לדולומיטים (מיקום 9.3)',
    title: 'טיול לדולומיטים: מסלול 6 ימים, אגמים ומסלולי הליכה',
    h1: 'טיול לדולומיטים',
    description:
      'הדולומיטים: מסלול 6 ימים מבראייס ושלוש הפסגות דרך ואל גרדנה ועד אגם סוראפיס. טסים ישירות לוונציה וממשיכים כ-2-2.5 שעות ברכב. העונה: יוני-ספטמבר.',
    facts: [
      { source: 'tagline', quote: 'אגמי אלפים טורקיז, פסגות סלע ומסלולי הליכה' },
      { source: 'itinerary', quote: 'בראייס ושלוש הפסגות' },
      { source: 'itinerary', quote: 'ואל גרדנה' },
      { source: 'itinerary', quote: 'אגם סוראפיס' },
      { source: 'flights', quote: 'טסים ישירות מנתב"ג לוונציה' },
      { source: 'flights', quote: 'וממשיכים ברכב כ-2-2.5 שעות' },
      { source: 'bestSeason', quote: 'יוני-ספטמבר' },
    ],
  },

  // ---------- Most impressions ----------

  '/countries/oman': {
    query: 'עומאן (529 חשיפות מתוך 667, מיקום 14)',
    title: 'עומאן לישראלים: אפשר להיכנס עם דרכון ישראלי?',
    description:
      'נכון להיום דרכון ישראלי אינו מתקבל לכניסה לעומאן, ואין יחסים דיפלומטיים. מה לבדוק אם יש לכם אזרחות זרה, ומסלול 5 ימים במסקאט ובצפון לאוקטובר-אפריל.',
    facts: [
      { source: 'visa', quote: 'נכון להיום דרכון ישראלי אינו מתקבל לכניסה לעומאן' },
      { source: 'visa', quote: 'עומאן וישראל אינן מקיימות יחסים דיפלומטיים' },
      { source: 'visa', quote: 'מי שמחזיק גם באזרחות זרה צריך לבדוק את מדיניות האשרות העדכנית' },
      { source: 'muscat-north-oman.bestSeason', quote: 'אוקטובר עד אפריל בלבד' },
    ],
  },

  '/countries/spain': {
    query: 'ספרד / טיול לספרד (101 חשיפות)',
    title: 'טיול לספרד: טיסה ישירה, ללא ויזה ו-4 יעדים עם מסלול',
    description:
      'ישראלים נכנסים לספרד ללא ויזה עד 90 יום. טיסה ישירה מנתב"ג למדריד (כ-5 שעות) ולברצלונה (כ-4.5), ומסלולים יום-יום למדריד, ברצלונה, מיורקה ואנדלוסיה.',
    facts: [
      { source: 'visa', quote: 'ללא ויזה לישראלים עד 90 יום' },
      { source: 'madrid.flights', quote: 'טיסות ישירות מנתב״ג למדריד (MAD), כחמש שעות' },
      { source: 'barcelona.flights', quote: 'טיסות ישירות מנתב"ג (אל על, ווִאלינג, ישראייר) - כ-4.5 שעות' },
    ],
  },

  '/countries/iceland': {
    query: 'איסלנד / ויזה לאיסלנד (90 חשיפות; "ויזה לאיסלנד" במיקום 17)',
    title: 'טיול לאיסלנד: פטור מוויזה עד 90 יום ו-2 מסלולים',
    description:
      'ישראלים פטורים מוויזה לאיסלנד עד 90 יום (מרחב שנגן), עם דרכון בתוקף. מסלולים יום-יום לריקיאוויק והחוף הדרומי ולצפון איסלנד. העונה: יוני-אוגוסט.',
    facts: [
      { source: 'visa', quote: 'איסלנד במרחב שנגן - ישראלים פטורים מוויזה עד 90 יום. דרכון בתוקף.' },
      { source: 'reykjavik.bestSeason', quote: 'יוני-אוגוסט' },
    ],
  },

  '/destinations/prague': {
    query: 'פראג / טיול לפראג (86 חשיפות)',
    title: 'פראג לישראלים: טיסה ישירה של כ-4 שעות, מסעדות כשרות',
    description:
      'פראג: טיסה ישירה של כ-4 שעות, מסלול 7 ימים עם 37 מקומות על מפה, ושתי מסעדות כשרות ברובע היהודי. העונה: אפריל-יוני, ספטמבר-אוקטובר. פותחים במתכנן ועורכים.',
    facts: [
      { source: 'flights', quote: 'טיסות ישירות מנתב"ג (אל על, סמארטווינגס ועוד) - כ-4 שעות' },
      { source: 'kosherOverview', quote: 'שתי מסעדות כשרות ברובע היהודי' },
      { source: 'bestSeason', quote: 'אפריל-יוני, ספטמבר-אוקטובר' },
    ],
  },

  '/countries/mauritius': {
    query: 'מאוריציוס (70 חשיפות)',
    title: 'טיול למאוריציוס: פטור מאשרה עד 90 יום ומסלול 5 ימים',
    description:
      'ישראלים פטורים מאשרה עד 90 יום, נכון להיום, וממלאים טופס כניסה מקוון. אין טיסה ישירה: 12-16 שעות דרך דובאי או איסטנבול. אין מסעדות כשרות. העונה: מאי-דצמבר.',
    facts: [
      { source: 'visa', quote: 'ישראלים פטורים מאשרה לשהייה של עד 90 יום, נכון להיום ובכפוף לשינויים' },
      { source: 'visa', quote: 'יש למלא באינטרנט את טופס הכניסה הממשלתי המאוחד' },
      { source: 'mauritius-island.flights', quote: 'אין טיסות ישירות מישראל' },
      { source: 'mauritius-island.flights', quote: 'שתים עשרה עד שש עשרה שעות' },
      { source: 'mauritius-island.flights', quote: 'דובאי, אבו דאבי, איסטנבול' },
      { source: 'mauritius-island.kosherOverview', quote: 'אין מסעדות כשרות' },
      { source: 'mauritius-island.bestSeason', quote: 'מאי עד דצמבר' },
    ],
  },

  '/countries/thailand': {
    query: 'תאילנד / טיול לתאילנד (68 חשיפות)',
    title: 'טיול לתאילנד: ללא ויזה עד 60 יום, טיסה ישירה לבנגקוק',
    description:
      'ישראלים נכנסים לתאילנד ללא ויזה עד 60 יום, עם הרשמה מקוונת ל-TDAC עד 72 שעות לפני הנחיתה. טיסה ישירה לבנגקוק ולפוקט (כ-11 שעות) ומסלולים ל-4 אזורים.',
    facts: [
      { source: 'visa', quote: 'ישראלים פטורים מוויזה לשהות של עד 60 יום' },
      { source: 'visa', quote: '(TDAC) עד 72 שעות לפני הנחיתה' },
      { source: 'bangkok.flights', quote: 'אל על מטיסה ישירה מנתב"ג לבנגקוק' },
      { source: 'phuket.flights', quote: 'אל על מפעילה טיסה ישירה מנתב"ג לפוקט' },
      { source: 'bangkok.flights', quote: 'כ-11 שעות' },
    ],
  },

  '/destinations/tasmania': {
    query: 'טסמניה (52 חשיפות, מיקום 15)',
    title: 'טסמניה לישראלים: מסלול 7 ימים, הרים וחופים ריקים',
    description:
      'טסמניה: מסלול 7 ימים מהובארט ופורט ארתור ועד מפרץ האש והר קרייל. אין טיסה ישירה: 25-30 שעות בדרך, אז מתכננים יום התאוששות. העונה: דצמבר-פברואר.',
    facts: [
      { source: 'tagline', quote: 'הרים, חופים ריקים' },
      { source: 'itinerary', quote: 'הובארט' },
      { source: 'itinerary', quote: 'פורט ארתור' },
      { source: 'itinerary', quote: 'מפרץ האש' },
      { source: 'itinerary', quote: 'הר קרייל' },
      { source: 'flights', quote: 'אין טיסה ישירה מישראל לאוסטרליה' },
      { source: 'flights', quote: 'עשרים וחמש עד שלושים שעות, אז תכננו יום התאוששות מלא' },
      { source: 'bestSeason', quote: 'דצמבר עד פברואר' },
    ],
  },

  '/destinations/cappadocia': {
    query: 'קפדוקיה (47 חשיפות, מיקום 14)',
    title: 'קפדוקיה לישראלים: כדורים פורחים ומסלול 5 ימים',
    description:
      'קפדוקיה: מסלול 5 ימים לגורמה, כדור פורח, ערים תת-קרקעיות ועמק הוורדים. אין קו ישיר: טסים לאיסטנבול ומשם כשעה לנבשהיר. העונה: אפריל-יוני, ספטמבר-אוקטובר.',
    facts: [
      { source: 'tagline', quote: 'זריחה מעל כדורים פורחים' },
      { source: 'itinerary', quote: 'גורמה והעמקים' },
      { source: 'itinerary', quote: 'כדור פורח והעיר התת-קרקעית' },
      { source: 'itinerary', quote: 'עמק הוורדים' },
      { source: 'flights', quote: 'אין קו ישיר מישראל לקפדוקיה' },
      { source: 'flights', quote: 'טיסה לאיסטנבול' },
      { source: 'flights', quote: 'לנבשהיר (NAV) או לקייסרי (ASR), כשעה טיסה' },
      { source: 'bestSeason', quote: 'אפריל-יוני וספטמבר-אוקטובר' },
    ],
  },

  // ---------- A query within reach ----------

  '/itinerary/sicily/5': {
    query: 'טיול לסיציליה 5 ימים (מיקום 17)',
    title: 'טיול לסיציליה 5 ימים: פלרמו, אגריג׳נטו והבארוק',
    description:
      'מסלול 5 ימים בסיציליה, יום אחרי יום: פלרמו ומונראלה, אגריג׳נטו, הפסיפסים והבארוק של הדרום-מזרח. טיסה ישירה לקטניה בקיץ. העונה: אפריל-יוני, ספטמבר-אוקטובר.',
    facts: [
      { source: 'itinerary', quote: 'פלרמו ומונראלה' },
      { source: 'itinerary', quote: 'אגריג׳נטו' },
      { source: 'itinerary', quote: 'פסיפסים בלב האי' },
      { source: 'itinerary', quote: 'הבארוק של הדרום-מזרח' },
      { source: 'flights', quote: 'יש טיסות ישירות מתל אביב לקטניה (CTA) בעונת הקיץ' },
      { source: 'bestSeason', quote: 'אפריל עד יוני וספטמבר עד אוקטובר' },
    ],
  },
};
