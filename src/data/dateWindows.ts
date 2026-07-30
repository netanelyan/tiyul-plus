// ---------- מה קורה בעיר בתאריכים של המטייל ----------
//
// אירועים ותקופות סגירה שידועים לנו, לפי עיר. הקובץ הזה הוא **מקור
// האמת היחיד** שממנו האתר או הסוכן אומרים משהו על אירוע: אין מסלול
// שבו תאריך, הרכב אמנים, מחיר כרטיס או "האם זה מתקיים השנה" מגיעים
// מהידע של המודל. אין כאן - אין תשובה, וזו תשובה לגיטימית.
//
// ## שלוש דרגות ודאות, ולא אחת
//
// - `exact`   - תאריכים שפורסמו לשנה מסוימת. מוצגים כתאריך.
// - `annual`  - תאריך קבוע שחוזר כל שנה (15 באוגוסט, 27 באפריל).
//               גם הוא ודאי - "בדרך כלל באמצע אוגוסט" על פרראגוסטו
//               היה זלזול בקורא, לא זהירות.
// - `typical` - **לא ודאי.** חלון שבו האירוע נופל בדרך כלל, כשהתאריכים
//               לשנה הזו עוד לא פורסמו. מוצג במפורש ככזה, אף פעם לא
//               כתאריך.
//
// ## כללי כתיבה לרשומה חדשה
//
// 1. **מקור לכל רשומה**, עם התאריך שבו נבדק. בלי מקור אין רשומה.
// 2. `note` היא שורה אחת על **מה זה אומר למטייל בתאריכים שלו** - לא
//    תיאור של האירוע ולא שכנוע ללכת אליו. בלי "כדאי", בלי "שווה",
//    בלי קישור לכרטיסים.
// 3. סגירות נכתבות כמידע מעשי ולא כאזהרה: "הרבה חנויות ומסעדות סגורות"
//    ולא "שימו לב! העיר משותקת".
// 4. אין מחירים ואין הרכב אמנים. גם אם המקור מפרסם אותם.

import type { CityDateWindow } from '@/lib/trip/dateWindows';

export const cityDateWindows: CityDateWindow[] = [
  /* ---------- אירועים עם תאריכים שפורסמו ---------- */
  {
    id: 'muc-oktoberfest-2026',
    citySlug: 'munich',
    kind: 'event',
    name: 'אוקטוברפסט',
    nameLocal: 'Oktoberfest',
    dates: { kind: 'exact', start: '2026-09-19', end: '2026-10-04' },
    note: 'שישה-עשר ימי פסטיבל בטרזיינוויזה, במרכז מינכן. העיר עמוסה לאורך כל התקופה, ובסופי השבוע במיוחד.',
    source: {
      title: 'האתר הרשמי של אוקטוברפסט',
      url: 'https://www.oktoberfest.de/en',
      checked: '2026-07-30',
    },
  },
  {
    id: 'edi-fringe-2026',
    citySlug: 'edinburgh',
    kind: 'event',
    name: 'פסטיבל הפרינג׳',
    nameLocal: 'Edinburgh Festival Fringe',
    dates: { kind: 'exact', start: '2026-08-07', end: '2026-08-31' },
    note: 'כשלושה שבועות שבהם כל העיר בפסטיבל, והמרכז ההיסטורי צפוף מהבוקר עד הלילה.',
    source: {
      title: 'Edinburgh Festival City - לוח הפסטיבלים הרשמי',
      url: 'https://www.edinburghfestivalcity.com/festivals/edinburgh-festival-fringe',
      checked: '2026-07-30',
    },
  },
  {
    id: 'ven-biennale-2026',
    citySlug: 'venice',
    kind: 'event',
    name: 'הביאנלה של ונציה - תערוכת האמנות',
    nameLocal: 'Venice Biennale',
    dates: { kind: 'exact', start: '2026-05-09', end: '2026-11-22' },
    note: 'תערוכה שנפרשת על ג׳רדיני, ארסנלה ומבנים ברחבי העיר לאורך כל התקופה.',
    source: {
      title: 'Venice Biennale - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Venice_Biennale',
      checked: '2026-07-30',
    },
  },

  /* ---------- תאריכים קבועים שחוזרים כל שנה ---------- */
  {
    id: 'it-ferragosto-rome',
    citySlug: 'rome',
    kind: 'closure',
    name: 'פרראגוסטו',
    nameLocal: 'Ferragosto',
    dates: { kind: 'annual', start: '08-15', end: '08-15' },
    note: 'חג לאומי באיטליה. חנויות, משרדים והרבה מסעדות שכונתיות סגורות, ורבים מהעסקים סוגרים לכשבועיים סביב התאריך.',
    source: {
      title: 'Ferragosto - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ferragosto',
      checked: '2026-07-30',
    },
  },
  {
    id: 'it-ferragosto-venice',
    citySlug: 'venice',
    kind: 'closure',
    name: 'פרראגוסטו',
    nameLocal: 'Ferragosto',
    dates: { kind: 'annual', start: '08-15', end: '08-15' },
    note: 'חג לאומי באיטליה. חנויות, משרדים והרבה מסעדות שכונתיות סגורות, ורבים מהעסקים סוגרים לכשבועיים סביב התאריך.',
    source: {
      title: 'Ferragosto - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ferragosto',
      checked: '2026-07-30',
    },
  },
  {
    id: 'it-ferragosto-florence',
    citySlug: 'florence',
    kind: 'closure',
    name: 'פרראגוסטו',
    nameLocal: 'Ferragosto',
    dates: { kind: 'annual', start: '08-15', end: '08-15' },
    note: 'חג לאומי באיטליה. חנויות, משרדים והרבה מסעדות שכונתיות סגורות, ורבים מהעסקים סוגרים לכשבועיים סביב התאריך.',
    source: {
      title: 'Ferragosto - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ferragosto',
      checked: '2026-07-30',
    },
  },
  {
    id: 'ams-kingsday',
    citySlug: 'amsterdam',
    kind: 'closure',
    name: 'יום המלך',
    nameLocal: 'Koningsdag',
    // 27 באפריל, ואם הוא חל בראשון - 26 בו. החלון מכסה את שניהם, וההערה
    // אומרת את הכלל, כדי שלא נציג תאריך אחד כאילו הוא ודאי בכל שנה.
    dates: { kind: 'annual', start: '04-26', end: '04-27' },
    note: 'ב-27 באפריל (וב-26 בו אם ה-27 חל בראשון): מרכז העיר סגור לרכבים, אין חשמליות במרכז, ורכבות בין-לאומיות עוצרות בתחנה פרברית במקום במרכז.',
    source: {
      title: 'Koningsdag - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Koningsdag',
      checked: '2026-07-30',
    },
  },
  {
    id: 'jp-golden-week-tokyo',
    citySlug: 'tokyo',
    kind: 'closure',
    name: 'שבוע הזהב',
    nameLocal: 'Golden Week',
    dates: { kind: 'annual', start: '04-29', end: '05-05' },
    note: 'תקופת החופשה הארוכה של השנה ביפן: תנועה פנימית ערה, חלק מהעסקים סגורים, ואתרים ותחבורה עמוסים.',
    source: {
      title: 'Golden Week (Japan) - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Golden_Week_(Japan)',
      checked: '2026-07-30',
    },
  },
  {
    id: 'jp-golden-week-kyoto',
    citySlug: 'kyoto',
    kind: 'closure',
    name: 'שבוע הזהב',
    nameLocal: 'Golden Week',
    dates: { kind: 'annual', start: '04-29', end: '05-05' },
    note: 'תקופת החופשה הארוכה של השנה ביפן: תנועה פנימית ערה, חלק מהעסקים סגורים, ואתרים ותחבורה עמוסים.',
    source: {
      title: 'Golden Week (Japan) - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Golden_Week_(Japan)',
      checked: '2026-07-30',
    },
  },

  /* ---------- חלונות אופייניים: התאריכים לשנה הזו לא פורסמו ---------- */
  {
    id: 'bud-sziget',
    citySlug: 'budapest',
    kind: 'event',
    name: 'פסטיבל סזיגט',
    nameLocal: 'Sziget Festival',
    dates: { kind: 'typical', start: '08-01', end: '08-12', typical: 'בשבוע הראשון של אוגוסט' },
    note: 'שבעה ימי פסטיבל על אי בדנובה. העיר עמוסה יותר בתקופה הזו.',
    source: {
      title: 'Sziget Festival - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Sziget_Festival',
      checked: '2026-07-30',
    },
  },
  {
    id: 'bcn-merce',
    citySlug: 'barcelona',
    kind: 'event',
    name: 'לה מרסה',
    nameLocal: 'La Mercè',
    dates: { kind: 'typical', start: '09-20', end: '09-25', typical: 'סביב 24 בספטמבר' },
    note: 'חג העיר: אירועים ברחובות ובכיכרות במשך כשבוע, וקטעי מרכז סגורים לתנועה.',
    source: {
      title: 'La Mercè - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/La_Merc%C3%A8',
      checked: '2026-07-30',
    },
  },
];
