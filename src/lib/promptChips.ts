/**
 * The pool of chips for the opening input - instead of off-the-shelf itineraries, the
 * chips teach what the input understands: life situations, the agent's capabilities and
 * questions. The category is invisible to the user.
 * months = seasonal relevance (1-12); a seasonal chip is shown only in its months.
 * pinned = appears in every draw (the big post-army trip). fill = the text that fills
 * the input when it differs from the text shown on the pill.
 */

export interface PromptChip {
  emoji: string;
  text: string;
  category: 'situation' | 'capability' | 'question';
  months?: number[]; // 1-12
  pinned?: boolean;
  fill?: string; // default: text
}

export const CHIP_POOL: PromptChip[] = [
  // Situations
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
  // Capability demonstrations
  { emoji: '👨‍👩‍👧‍👦', text: '5 ימים, בלי מוזיאונים, עם שני ילדים', category: 'capability' },
  { emoji: '🍽️', text: 'משהו רגוע עם הרבה אוכל טוב', category: 'capability' },
  { emoji: '🌍', text: 'שבוע בשתי מדינות, טבע ושופינג', category: 'capability' },
  { emoji: '🏛️', text: '4 ימים, היסטוריה ואוכל כשר', category: 'capability' },
  { emoji: '🍝', text: 'טיול אוכל ושווקים, תקציב בינוני', category: 'capability' },
  // Questions
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
 * Picks 6 chips: the pinned ones are always in, and the rest are balanced across the
 * categories (2 from each, counting the pinned ones). Seasonal chips for the current
 * month come first, out-of-season ones are not shown, and the order is shuffled.
 * Call only on the client (after mount) - the result is random and would break
 * hydration in SSR.
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
  const result = shuffle(picked);
  // The component shows 4 by default - make sure the pinned ones are among the 4 visible
  for (let i = 4; i < result.length; i++) {
    if (result[i].pinned) {
      const j = Math.floor(Math.random() * 4);
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
}
