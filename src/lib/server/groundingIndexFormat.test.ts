/**
 * The tuple index carries exactly the information of the object index.
 *
 * The compaction exists to fit more places under the prompt ceiling; the one
 * way it could go wrong silently is by dropping or shifting a field so the
 * model reads a duration as a price. So the test decodes every tuple back
 * into an object through the published legend order and deep-compares it to
 * the object form - id by id, both kosher variants - and then checks the
 * saving is real, because a compaction that does not compact is just a
 * format change with risk and no benefit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLACE_TUPLE_FIELDS, buildGroundingIndex, indexFormat } from './grounding.ts';

type ObjPlace = Record<string, unknown>;
type ObjCity = { slug: string; name: string; countrySlug: string; places: ObjPlace[] };
type TupCity = [string, string, string, unknown[][]];

function decodePlace(t: unknown[]): ObjPlace {
  const o: ObjPlace = {};
  PLACE_TUPLE_FIELDS.forEach((k, i) => {
    const v = t[i];
    if (k === 'mustSee') {
      if (v === 1) o.mustSee = true;
      return;
    }
    if (v !== null && v !== undefined) o[k] = v;
  });
  return o;
}

for (const kosherOk of [true, false]) {
  test(`tuple index is lossless against the object index (kosher ${kosherOk ? 'on' : 'off'})`, () => {
    const obj = JSON.parse(buildGroundingIndex(kosherOk, 'json'));
    const tup = JSON.parse(buildGroundingIndex(kosherOk, 'tuple'));

    assert.deepEqual(tup.coverage, obj.coverage);
    assert.deepEqual(
      tup.countries.map(([slug, name]: [string, string]) => ({ slug, name })),
      obj.countries,
    );
    assert.equal(tup.cities.length, obj.cities.length);
    const decoded: ObjCity[] = tup.cities.map(([slug, name, countrySlug, places]: TupCity) => ({
      slug,
      name,
      countrySlug,
      places: places.map(decodePlace),
    }));
    assert.deepEqual(decoded, obj.cities);
    // The legend the model reads names the same fields in the same order
    assert.ok(tup.note.includes(`[${PLACE_TUPLE_FIELDS.join(', ')}]`));
    assert.ok(tup.note.includes('Use these ids verbatim'));
  });
}

test('the tuple index is materially smaller than the object index', () => {
  const a = buildGroundingIndex(true, 'json').length;
  const b = buildGroundingIndex(true, 'tuple').length;
  assert.ok(b < a * 0.7, `tuple ${b} vs json ${a} - the saving should be at least 30%`);
});

test('the format switch defaults to tuple and honours the env rollback', () => {
  const prev = process.env.GROUNDING_INDEX_FORMAT;
  delete process.env.GROUNDING_INDEX_FORMAT;
  assert.equal(indexFormat(), 'tuple');
  process.env.GROUNDING_INDEX_FORMAT = 'json';
  assert.equal(indexFormat(), 'json');
  if (prev === undefined) delete process.env.GROUNDING_INDEX_FORMAT;
  else process.env.GROUNDING_INDEX_FORMAT = prev;
});
