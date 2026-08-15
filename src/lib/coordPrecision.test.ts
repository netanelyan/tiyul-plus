/**
 * שומר-דיוק: מונע מרשימת הקואורדינטות הגסות לגדול בשקט.
 *
 * ## למה נעילה (baseline) ולא "אפס מותר"
 *
 * 68 מקומות-נקודה בקטלוג כבר גסים (≤2 ספרות עשרוניות, ~1.1 ק"מ שגיאה
 * ומעלה) - חוב דאטה קיים, לא באג בקוד. חסימת כל קומיט עד שהוא יירד
 * לאפס הייתה עוצרת כל עבודה שאינה קשורה, בדיוק מה שהתיעוד של
 * `coarse-coords.mjs` מזהיר מפניו. אבל "אל תחסום" זה לא אותו דבר כמו
 * "אל תשגיח" - מי שביקש את הטסט הזה היה מפורש: "אני לא רוצה שזה ייסוג
 * אחורה". הפתרון: הרשימה הנוכחית חייבת להיות **תת-קבוצה** של הרשימה
 * שנעולה כאן. מקום גס חדש (או מקום ישן שהחמיר משטח לנקודה) נכשל מיד
 * ובשם; מקום שתוקן פשוט נעלם מהרשימה, בלי לעדכן טסט.
 *
 * ## למה רק 'point'
 *
 * שטח (פארק לאומי, אגם) עם מרכז גס הוא לגיטימי במובהק - ראו התיעוד
 * ב-`coordPrecision.ts`. הבסיס הזה עוקב רק אחרי המקרה שבאמת מזיק.
 *
 * ## איך לעדכן את הבסיס בכוונה
 *
 * תיקנתם מקום? הוא ייעלם מהרשימה מעצמו - שום עדכון פה לא נדרש. הוספתם
 * מקום *עם קואורדינטה מדויקת* וקיבלתם כישלון בטעות? לא אמור לקרות - הבדיקה
 * רק מזהה גסות, לא ISO משהו. הכישלון האמיתי היחיד שאמור לקרות כאן הוא
 * מקום-נקודה חדש עם קואורדינטה גסה, ואז הפתרון הוא לתקן את הקואורדינטה,
 * לא להוסיף אותו לבסיס.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coarseCoordRows } from './coordPrecision.ts';
import { destinations } from '../data/destinations.ts';

/**
 * הבסיס הנעול, נכון ל-2026-08-12 (ביקורת קישורי Google Maps) - 68
 * מקומות-נקודה. נוצר ע"י `coarse-coords.mjs --json` ומסונן ל-shape='point'.
 */
const BASELINE_COARSE_POINT_IDS: readonly string[] = [
  'amman-north/amn-madaba',
  'athens/ath-plaka',
  'balaton/blt-balatonfured',
  'bergen-fjords/nor-bergen',
  'bratislava/bts-castle',
  'cape-town/zaf-robben',
  'cartagena/co-getsemani',
  'chisinau-moldova/md-cricova',
  'colca-titicaca/pe-chivay',
  'cultural-triangle/lk-polonnaruwa',
  'dalmatia-split/hr-diocletian',
  'dalmatia-split/hr-hvar',
  'dalmatia-split/hr-korcula',
  'dolomites/dol-bolzano',
  'douro/pt-foz-coa',
  'douro/pt-lamego',
  'dubai/dxb-bastakiya',
  'finnish-lapland/fla-rovaniemi',
  'garden-route/zaf-oudtshoorn',
  'gdansk-pomerania/pl-frombork',
  'gyeongju-busan/kr-bulguksa',
  'gyeongju-busan/kr-gyeongju',
  'gyeongju-busan/kr-jagalchi',
  'halong/vnm-chabad',
  'halong/vnm-hanoi',
  'interlaken/int-hoheweg',
  'kathmandu/npl-kathmandu',
  'kathmandu/npl-swayambhu',
  'lisbon/lis-alfama',
  'lycian-coast/tr-kas',
  'mostar-sarajevo/bih-bascarsija',
  'new-york/nyc-williamsburg',
  'north-iceland/is-husavik',
  'north-zealand/nzl-roskilde-cathedral',
  'northern-bulgaria/bg-tryavna',
  'panama-canal-bocas-boquete/pa-boquete',
  'penang-perak/my-taiping',
  'petra/pet-wadimusa',
  'phnom-penh-coast/kh-battambang',
  'plitvice/hrv-diocletian',
  'plitvice/hrv-split',
  'prague/prg-castle',
  'prague/prg-josefov',
  'quito-cotopaxi-andes/ec-quito',
  'quito-cotopaxi-andes/ecu-mercado-central',
  'riga/rga-sigulda',
  'rila-pirin/rlp-bansko',
  'rila-pirin/rlp-melnik',
  'salzburg/szg-oldtown',
  'santorini-mykonos/cyc-fira',
  'santorini-mykonos/cyc-mykonos-museum',
  'saxon-switzerland/sax-bad-schandau',
  'saxon-switzerland/sax-rathen',
  'sofia/sof-market-hall',
  'sofia/sof-synagogue',
  'south-albania/alb-saranda',
  'taiwan-island-loop/tw-beitou',
  'tasmania/au-port-arthur',
  'tbilisi/tbs-metekhi',
  'tbilisi/tbs-synagogue',
  'tian-shan-issyk-kul/kg-naryn',
  'valais-zermatt/ch-zermatt',
  'vienna/vie-bahur-tov',
  'vienna/vie-belvedere',
  'warsaw/war-barbican',
  'west-estonia-islands/ee-kuressaare',
  'west-ireland/irw-poulnabrone',
  'yerevan/arm-tatev',
];

test('רשימת המקומות-נקודה עם קואורדינטה גסה לא גדלה מעבר לבסיס הנעול', () => {
  const baseline = new Set(BASELINE_COARSE_POINT_IDS);
  const current = coarseCoordRows(destinations, 2).filter((r) => r.shape === 'point');

  const regressed = current.filter((r) => !baseline.has(`${r.destination}/${r.id}`));
  assert.deepEqual(
    regressed.map((r) => `${r.destination}/${r.id}  ${r.name}  (${r.lat},${r.lng})`),
    [],
    `${regressed.length} מקום/מקומות-נקודה חדשים עם קואורדינטה גסה (≤2 ספרות עשרוניות). ` +
      `זה כנראה מקום חדש שנוסף בלי קואורדינטת GPS אמיתית - יש לתקן את הדאטה, לא את הטסט.`,
  );

  // תיעוד חי: כמה מהבסיס עדיין באמת גס, לעומת תוקן. לא נכשל על ירידה -
  // ירידה היא ההתקדמות שהבדיקה הזאת בכלל קיימת כדי לאפשר.
  const fixed = BASELINE_COARSE_POINT_IDS.length - current.filter((r) => baseline.has(`${r.destination}/${r.id}`)).length;
  if (fixed > 0) {
    console.log(`(${fixed} מקומות מהבסיס הנעול תוקנו מאז - כל הכבוד, אין צורך לעדכן את הטסט)`);
  }
});

test('שטחים (nature/viewpoint) לא נכנסים לבדיקת הגסות - זה לגיטימי עבורם', () => {
  const rows = coarseCoordRows(destinations, 2);
  const areaRows = rows.filter((r) => r.shape === 'area');
  assert.ok(areaRows.length > 0, 'הצפי הוא שיהיו כמה - זה מוודא שהסינון בכלל פעיל ולא שקוף');
  for (const r of areaRows) {
    assert.ok(
      r.category === 'nature' || r.category === 'viewpoint',
      `${r.destination}/${r.id} סווג כ-area אבל הקטגוריה שלו היא ${r.category}`,
    );
  }
});
