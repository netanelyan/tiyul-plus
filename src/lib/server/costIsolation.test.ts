/**
 * The cost numbers never reach the model. Period.
 *
 * The requirement is that "the AI does not generate, correct or describe these
 * numbers". A rule in the prompt is a request; this test is the proof. It checks
 * the only three pipes through which data reaches the model - the grounding
 * index, the detail block, and the trip state - and verifies that none of them
 * carries a cost figure.
 *
 * This is tested against the real catalog and not against a fixture, because
 * what is tested here is exactly what actually gets sent.
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
  // A destination with no record stays without the field - not an empty object someone fills by mistake
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
    // `dailyBudget` sits **inside** the catalog, so the risk of it leaking into
    // the grounding block is greater than for a separate file - this check is the guard.
    assert.equal(block.includes('dailyBudget'), false);
    assert.equal(/budgetyourtrip|nomadicmatt/i.test(block), false);
    for (const slug of CITIES) {
      const c = DAILY_COSTS[slug];
      if (!c) continue;
      // A large, distinctive number from each of the three rows of every style
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
  // And the rest of the preferences were not harmed along the way
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
