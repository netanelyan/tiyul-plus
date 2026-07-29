import type { DailyCost } from '@/lib/types';

/**
 * הוצאה יומית טיפוסית לאדם, לפי סגנון נסיעה, במטבע המקומי.
 *
 * **מאיפה המספרים.** כולם הועתקו מטבלת ה-budget / mid-range / luxury
 * שמפרסם Budget Your Trip לכל עיר, שנבנית מדיווחי הוצאות של מטיילים
 * קודמים. כל תא כאן הוא **ציטוט של תא בטבלה** - לא ממוצע שחישבנו, לא
 * המרה, ולא עיגול. הערכים הלא-שלמים (7.09, 8.78, 9.34...) נשמרים בדיוק
 * כפי שהודפסו, כי ברגע שמתחילים "לסדר" מספר מסודר, אי אפשר עוד להשוות
 * אותו למקור.
 *
 * **מה לא נשמר כאן, וזו החלטה ולא השמטה.** הטבלה במקור כוללת גם לינה
 * וגם אלכוהול. שניהם לא הועתקו: לינה מוחרגת מהפיצ׳ר במפורש (ולכן
 * הדרך הבטוחה להחריג אותה היא פשוט לא להחזיק אותה), ואלכוהול היא
 * הוצאה שרבים לא מוציאים בכלל, ולכן היא לא "הוצאה טיפוסית".
 *
 * **עיר בלי רשומה כאן לא מקבלת הערכה.** היא פשוט לא מציגה מספר, והסכום
 * של הטיול אומר במפורש שהוא חלקי. שלוש ערים בקטלוג נבדקו ונשארו בחוץ
 * בדיוק מהסיבה הזאת - קרקוב, בוקרשט וסופיה מוגשות במקור בתבנית ישנה
 * יותר שאין בה פילוח לפי סגנון נסיעה (ולקרקוב אין בכלל שורת אטרקציות).
 * ממוצע יחיד אינו התשובה לשאלה "כמה מוציא מטייל חסכוני", ולכן לא נלקח.
 *
 * **להוסיף עיר:** לקרוא את דף העיר במקור, להעתיק שלוש שורות בלבד
 * (Local Transportation / Food / Entertainment) בשלושת הטורים, לרשום
 * את המטבע כפי שהודפס ואת התאריך שבו הדף נקרא בפועל. אם אין טבלה
 * מפולחת - לא להוסיף. כל 21 הרשומות כאן נקראו פעמיים בקריאות בלתי
 * תלויות, ושמונה מהן עברו ביקורת שלישית נפרדת (8/8 זהות).
 *
 * שימו לב: הדף במקור מוגש לפעמים בתבנית מצומצמת עם מספרים אחרים
 * לגמרי וללא הטבלה. הכותרת היא הסימן - התבנית הנכונה נקראת
 * "X Travel Cost - Average Price of a Vacation to X".
 */

const CHECKED = '2026-07-29';

const src = (city: string, url: string) => ({
  url,
  title: `Budget Your Trip - ${city} travel costs`,
  checked: CHECKED,
});

export const DAILY_COSTS: Record<string, DailyCost> = {
  vienna: {
    currency: 'EUR',
    budget: { transport: 7.09, food: 23, activities: 15 },
    mid: { transport: 19, food: 57, activities: 38 },
    comfort: { transport: 50, food: 142, activities: 97 },
    source: src('Vienna', 'https://www.budgetyourtrip.com/austria/vienna'),
  },
  prague: {
    currency: 'CZK',
    budget: { transport: 77, food: 439, activities: 152 },
    mid: { transport: 191, food: 1055, activities: 381 },
    comfort: { transport: 469, food: 2347, activities: 940 },
    source: src('Prague', 'https://www.budgetyourtrip.com/czech-republic/prague'),
  },
  budapest: {
    currency: 'HUF',
    budget: { transport: 1499, food: 5544, activities: 2952 },
    mid: { transport: 3861, food: 14708, activities: 7982 },
    comfort: { transport: 10145, food: 41088, activities: 23118 },
    source: src('Budapest', 'https://www.budgetyourtrip.com/hungary/budapest'),
  },
  rome: {
    currency: 'EUR',
    budget: { transport: 7.89, food: 33, activities: 13 },
    mid: { transport: 21, food: 84, activities: 36 },
    comfort: { transport: 60, food: 207, activities: 108 },
    source: src('Rome', 'https://www.budgetyourtrip.com/italy/rome'),
  },
  athens: {
    currency: 'EUR',
    budget: { transport: 11, food: 26, activities: 14 },
    mid: { transport: 27, food: 64, activities: 36 },
    comfort: { transport: 68, food: 158, activities: 87 },
    source: src('Athens', 'https://www.budgetyourtrip.com/greece/athens'),
  },
  barcelona: {
    currency: 'EUR',
    budget: { transport: 7.3, food: 24, activities: 13 },
    mid: { transport: 19, food: 58, activities: 33 },
    comfort: { transport: 52, food: 136, activities: 79 },
    source: src('Barcelona', 'https://www.budgetyourtrip.com/spain/barcelona'),
  },
  madrid: {
    currency: 'EUR',
    budget: { transport: 7.17, food: 23, activities: 13 },
    mid: { transport: 18, food: 59, activities: 33 },
    comfort: { transport: 48, food: 157, activities: 81 },
    source: src('Madrid', 'https://www.budgetyourtrip.com/spain/madrid'),
  },
  berlin: {
    currency: 'EUR',
    budget: { transport: 7.07, food: 34, activities: 8.78 },
    mid: { transport: 18, food: 90, activities: 22 },
    comfort: { transport: 45, food: 254, activities: 56 },
    source: src('Berlin', 'https://www.budgetyourtrip.com/germany/berlin'),
  },
  munich: {
    currency: 'EUR',
    budget: { transport: 8.07, food: 21, activities: 11 },
    mid: { transport: 19, food: 47, activities: 29 },
    comfort: { transport: 40, food: 91, activities: 71 },
    source: src('Munich', 'https://www.budgetyourtrip.com/germany/munich'),
  },
  paris: {
    currency: 'EUR',
    budget: { transport: 8.11, food: 28, activities: 27 },
    mid: { transport: 21, food: 72, activities: 76 },
    comfort: { transport: 60, food: 188, activities: 242 },
    source: src('Paris', 'https://www.budgetyourtrip.com/france/paris'),
  },
  london: {
    currency: 'GBP',
    budget: { transport: 10, food: 23, activities: 11 },
    mid: { transport: 26, food: 59, activities: 33 },
    comfort: { transport: 67, food: 157, activities: 104 },
    source: src('London', 'https://www.budgetyourtrip.com/united-kingdom/london'),
  },
  amsterdam: {
    currency: 'EUR',
    budget: { transport: 7.72, food: 32, activities: 15 },
    mid: { transport: 20, food: 80, activities: 36 },
    comfort: { transport: 51, food: 194, activities: 88 },
    source: src('Amsterdam', 'https://www.budgetyourtrip.com/netherlands/amsterdam'),
  },
  lisbon: {
    currency: 'EUR',
    budget: { transport: 9.62, food: 30, activities: 9.34 },
    mid: { transport: 25, food: 73, activities: 24 },
    comfort: { transport: 67, food: 172, activities: 63 },
    source: src('Lisbon', 'https://www.budgetyourtrip.com/portugal/lisbon'),
  },
  warsaw: {
    currency: 'PLN',
    budget: { transport: 7.5, food: 65, activities: 12 },
    mid: { transport: 19, food: 186, activities: 28 },
    comfort: { transport: 44, food: 587, activities: 54 },
    source: src('Warsaw', 'https://www.budgetyourtrip.com/poland/warsaw'),
  },
  venice: {
    currency: 'EUR',
    budget: { transport: 12, food: 43, activities: 37 },
    mid: { transport: 27, food: 112, activities: 101 },
    comfort: { transport: 54, food: 304, activities: 293 },
    source: src('Venice', 'https://www.budgetyourtrip.com/italy/venice'),
  },
  florence: {
    currency: 'EUR',
    budget: { transport: 9.48, food: 25, activities: 11 },
    mid: { transport: 22, food: 62, activities: 30 },
    comfort: { transport: 43, food: 151, activities: 85 },
    source: src('Florence', 'https://www.budgetyourtrip.com/italy/florence'),
  },
  bangkok: {
    currency: 'THB',
    budget: { transport: 72, food: 448, activities: 213 },
    mid: { transport: 209, food: 1156, activities: 572 },
    comfort: { transport: 677, food: 3052, activities: 1642 },
    source: src('Bangkok', 'https://www.budgetyourtrip.com/thailand/bangkok'),
  },
  tokyo: {
    currency: 'JPY',
    budget: { transport: 929, food: 3720, activities: 3582 },
    mid: { transport: 2667, food: 9877, activities: 10487 },
    comfort: { transport: 8561, food: 27636, activities: 34698 },
    source: src('Tokyo', 'https://www.budgetyourtrip.com/japan/tokyo'),
  },
  dubai: {
    currency: 'AED',
    budget: { transport: 16, food: 142, activities: 21 },
    mid: { transport: 47, food: 354, activities: 70 },
    comfort: { transport: 159, food: 863, activities: 281 },
    source: src('Dubai', 'https://www.budgetyourtrip.com/united-arab-emirates/dubai'),
  },
  'new-york': {
    currency: 'USD',
    budget: { transport: 18, food: 36, activities: 44 },
    mid: { transport: 49, food: 87, activities: 180 },
    comfort: { transport: 144, food: 199, activities: 846 },
    source: src(
      'New York City',
      'https://www.budgetyourtrip.com/united-states-of-america/new-york-city',
    ),
  },
  tbilisi: {
    currency: 'GEL',
    budget: { transport: 5.81, food: 15, activities: 16 },
    mid: { transport: 17, food: 37, activities: 39 },
    comfort: { transport: 53, food: 90, activities: 83 },
    source: src('Tbilisi', 'https://www.budgetyourtrip.com/georgia/tbilisi'),
  },
};

export function dailyCostFor(slug: string): DailyCost | undefined {
  return DAILY_COSTS[slug];
}
