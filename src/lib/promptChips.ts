/**
 * מאגר צ׳יפים לקלט הפתיחה - במקום מסלולים קנויים, הצ׳יפים מלמדים מה
 * הקלט מבין: מצבי חיים, יכולות של הסוכן ושאלות. הקטגוריה שקופה למשתמש.
 * months = רלוונטיות עונתית (1-12); צ׳יפ עונתי מוצג רק בחודשים שלו.
 */

export interface PromptChip {
  text: string;
  category: 'situation' | 'capability' | 'question';
  months?: number[]; // 1-12
}

export const CHIP_POOL: PromptChip[] = [
  // מצבים
  { text: 'ירח דבש באירופה, משהו רומנטי', category: 'situation' },
  { text: 'טיול ראשון עם תינוק, בקצב רגוע', category: 'situation' },
  { text: 'סופ״ש ספונטני בתקציב קטן', category: 'situation' },
  { text: 'בורחים מהחורף לשמש', category: 'situation', months: [11, 12, 1, 2] },
  { text: 'חופשה עם ההורים, בלי הרבה הליכה', category: 'situation' },
  { text: 'חנוכה באירופה', category: 'situation', months: [11, 12] },
  { text: 'בריחה מהחום של אוגוסט', category: 'situation', months: [7, 8] },
  // הדגמות יכולת
  { text: '5 ימים, בלי מוזיאונים, עם שני ילדים', category: 'capability' },
  { text: 'משהו רגוע עם הרבה אוכל טוב', category: 'capability' },
  { text: 'שבוע בשתי מדינות, אוהבים טבע ושופינג', category: 'capability' },
  { text: '4 ימים בעיר אחת, חובבי היסטוריה, אוכל כשר', category: 'capability' },
  { text: 'טיול אוכל ושווקים, תקציב בינוני', category: 'capability' },
  // שאלות
  { text: 'לאן הכי שווה לטוס בדצמבר?', category: 'question', months: [10, 11, 12] },
  { text: 'איפה הכי זול באירופה עכשיו?', category: 'question' },
  { text: 'לאן טסים לסופ״ש ארוך?', category: 'question' },
  { text: 'איפה הכי כיף עם ילדים?', category: 'question' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * בוחר 6 צ׳יפים - 2 מכל קטגוריה. צ׳יפים עונתיים של החודש הנוכחי קודמים,
 * צ׳יפים עונתיים מחוץ לעונה לא מוצגים כלל, והסדר אקראי.
 * לקרוא רק בצד הלקוח (אחרי mount) - התוצאה אקראית ותשבור הידרציה ב-SSR.
 */
export function pickChips(date = new Date()): PromptChip[] {
  const month = date.getMonth() + 1;
  const picked: PromptChip[] = [];
  for (const category of ['situation', 'capability', 'question'] as const) {
    const pool = CHIP_POOL.filter((c) => c.category === category);
    const inSeason = shuffle(pool.filter((c) => c.months?.includes(month)));
    const evergreen = shuffle(pool.filter((c) => !c.months));
    picked.push(...[...inSeason, ...evergreen].slice(0, 2));
  }
  return shuffle(picked);
}
