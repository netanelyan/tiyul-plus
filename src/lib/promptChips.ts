/**
 * מאגר צ׳יפים לקלט הפתיחה - במקום מסלולים קנויים, הצ׳יפים מלמדים מה
 * הקלט מבין: מצבי חיים, יכולות של הסוכן ושאלות. הקטגוריה שקופה למשתמש.
 * months = רלוונטיות עונתית (1-12); צ׳יפ עונתי מוצג רק בחודשים שלו.
 * pinned = מופיע בכל הגרלה (הטיול הגדול). fill = הטקסט שממלא את הקלט
 * כשהוא שונה מהטקסט המוצג על הגלולה.
 */

export interface PromptChip {
  emoji: string;
  text: string;
  category: 'situation' | 'capability' | 'question';
  months?: number[]; // 1-12
  pinned?: boolean;
  fill?: string; // ברירת מחדל: text
}

export const CHIP_POOL: PromptChip[] = [
  // מצבים
  {
    emoji: '🎖️',
    text: 'הטיול הגדול אחרי צבא',
    category: 'situation',
    pinned: true,
    fill: 'סיימתי צבא, מתכננים טיול גדול של כמה שבועות באירופה, תקציב קטן, כמה מדינות',
  },
  { emoji: '💍', text: 'ירח דבש באירופה, משהו רומנטי', category: 'situation' },
  { emoji: '👶', text: 'טיול ראשון עם תינוק, בקצב רגוע', category: 'situation' },
  { emoji: '🎒', text: 'סופ״ש ספונטני בתקציב קטן', category: 'situation' },
  { emoji: '☀️', text: 'בורחים מהחורף לשמש', category: 'situation', months: [11, 12, 1, 2] },
  { emoji: '🧳', text: 'חופשה עם ההורים, בלי הרבה הליכה', category: 'situation' },
  { emoji: '🕎', text: 'חנוכה באירופה', category: 'situation', months: [11, 12] },
  { emoji: '🏖️', text: 'בריחה מהחום של אוגוסט', category: 'situation', months: [7, 8] },
  // הדגמות יכולת
  { emoji: '👨‍👩‍👧‍👦', text: '5 ימים, בלי מוזיאונים, עם שני ילדים', category: 'capability' },
  { emoji: '🍽️', text: 'משהו רגוע עם הרבה אוכל טוב', category: 'capability' },
  { emoji: '🌍', text: 'שבוע בשתי מדינות, טבע ושופינג', category: 'capability' },
  { emoji: '🏛️', text: '4 ימים, היסטוריה ואוכל כשר', category: 'capability' },
  { emoji: '🍝', text: 'טיול אוכל ושווקים, תקציב בינוני', category: 'capability' },
  // שאלות
  { emoji: '❄️', text: 'לאן הכי שווה לטוס בדצמבר?', category: 'question', months: [10, 11, 12] },
  { emoji: '💸', text: 'איפה הכי זול באירופה עכשיו?', category: 'question' },
  { emoji: '✈️', text: 'לאן טסים לסופ״ש ארוך?', category: 'question' },
  { emoji: '🎡', text: 'איפה הכי כיף עם ילדים?', category: 'question' },
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
 * בוחר 6 צ׳יפים: המוצמדים (pinned) תמיד בפנים, והשאר מאוזנים בין
 * הקטגוריות (2 מכל אחת, כולל המוצמדים במניין). עונתיים של החודש קודמים,
 * עונתיים מחוץ לעונה לא מוצגים, והסדר אקראי.
 * לקרוא רק בצד הלקוח (אחרי mount) - התוצאה אקראית ותשבור הידרציה ב-SSR.
 */
export function pickChips(date = new Date()): PromptChip[] {
  const month = date.getMonth() + 1;
  const pinned = CHIP_POOL.filter((c) => c.pinned);
  const picked: PromptChip[] = [...pinned];
  for (const category of ['situation', 'capability', 'question'] as const) {
    const quota = 2 - pinned.filter((c) => c.category === category).length;
    if (quota <= 0) continue;
    const pool = CHIP_POOL.filter((c) => c.category === category && !c.pinned);
    const inSeason = shuffle(pool.filter((c) => c.months?.includes(month)));
    const evergreen = shuffle(pool.filter((c) => !c.months));
    picked.push(...[...inSeason, ...evergreen].slice(0, quota));
  }
  return shuffle(picked);
}
