/**
 * המספרים של העלות לא מגיעים למודל. נקודה.
 *
 * הדרישה היא ש"ה-AI לא מייצר, לא מתקן ולא מתאר את המספרים האלה".
 * כלל בפרומפט הוא בקשה; הטסט הזה הוא ההוכחה. הוא בודק את שלושת
 * הצינורות היחידים שדרכם דאטה מגיעה למודל - אינדקס ההשענה, בלוק
 * הפירוט, ומצב הטיול - ומוודא שאף אחד מהם לא נושא נתון עלות.
 *
 * זה נבדק מול הקטלוג האמיתי ולא מול פיקסצ׳ר, כי מה שנבדק כאן הוא
 * בדיוק מה שנשלח בפועל.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGroundingDetail, buildGroundingIndex } from './grounding.ts';
import { serializeTripForModel, withoutTravelStyle } from '../trip/agent.ts';
import { DAILY_COSTS } from '../../data/dailyCosts.ts';
import { sampleProvider } from '../providers/sample.ts';
import type { Trip } from '../trip/types.ts';

const CITIES = ['vienna', 'prague', 'budapest', 'rome', 'tokyo', 'bangkok'];

test('הנתון בכלל מחובר לדסטינציה - אחרת הטסט הזה עובר סתם', async () => {
  const vienna = await sampleProvider.getDestination('vienna');
  assert.equal(vienna?.dailyCost?.currency, 'EUR');
  assert.equal(vienna?.dailyCost?.budget.transport, 7.09);
  // יעד בלי רשומה נשאר בלי השדה - לא אובייקט ריק שמישהו ימלא בטעות
  const dolomites = await sampleProvider.getDestination('dolomites');
  assert.equal(dolomites?.dailyCost, undefined);
});

test('אינדקס ההשענה ובלוק הפירוט לא נושאים אף מספר עלות', () => {
  const blocks = [
    buildGroundingIndex(true),
    buildGroundingIndex(false),
    buildGroundingDetail(CITIES, true),
    buildGroundingDetail(CITIES, false),
  ];
  for (const block of blocks) {
    assert.equal(block.includes('dailyCost'), false);
    assert.equal(/budgetyourtrip/i.test(block), false);
    for (const slug of CITIES) {
      const c = DAILY_COSTS[slug];
      if (!c) continue;
      // מספר גדול וייחודי מכל שלוש השורות של כל סגנון
      for (const style of ['budget', 'mid', 'comfort'] as const) {
        const food = String(c[style].food);
        if (food.length >= 4) {
          assert.equal(
            block.includes(food),
            false,
            `${slug}.${style}.food (${food}) הודלף לבלוק ההשענה`,
          );
        }
      }
    }
  }
});

test('מצב הטיול שנשלח למודל לא כולל את סגנון הנסיעה', () => {
  const trip: Trip = {
    id: 't1',
    name: 'וינה ופראג',
    citySlugs: ['vienna', 'prague'],
    createdAt: 1,
    preferences: { kosher: true, pace: 'relaxed', travelStyle: 'comfort' },
    days: [
      { id: 'd1', citySlug: 'vienna', placeIds: [] },
      { id: 'd2', citySlug: 'prague', placeIds: [] },
    ],
  };
  const seen = JSON.parse(serializeTripForModel(trip));
  assert.equal('travelStyle' in seen.preferences, false);
  // ושאר ההעדפות לא נפגעו בדרך
  assert.equal(seen.preferences.kosher, true);
  assert.equal(seen.preferences.pace, 'relaxed');
  assert.equal(serializeTripForModel(trip).includes('comfort'), false);
});

test('withoutTravelStyle לא משנה את המקור ומטפל בהעדפות חסרות', () => {
  const prefs = { kosher: true, travelStyle: 'mid' as const };
  const out = withoutTravelStyle(prefs);
  assert.equal(prefs.travelStyle, 'mid', 'המקור לא שונה');
  assert.deepEqual(out, { kosher: true });
  assert.deepEqual(withoutTravelStyle(undefined), {});
});
