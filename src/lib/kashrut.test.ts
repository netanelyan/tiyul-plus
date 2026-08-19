import assert from 'node:assert/strict';
import { test } from 'node:test';

import { destinations } from '@/data/destinations';
import { isKosher } from '@/lib/categories';
import {
  describeCertifications,
  kashrutCaveat,
  kashrutForModel,
  kashrutIsShippable,
  kashrutSummary,
} from '@/lib/kashrut';
import type { KashrutRecord } from '@/lib/types';

const legacy: KashrutRecord = {
  knowledge: 'certified',
  certifications: [{ body: 'רבנות פראג' }],
  provenance: { source: 'x', sourceType: 'legacy-unverified', checked: null },
};
const real: KashrutRecord = {
  knowledge: 'certified',
  certifications: [{ body: 'KLBD', bodyLatin: 'KLBD' }],
  provenance: { source: 'https://klbd.org.uk/', sourceType: 'certifier', checked: '2026-08-19' },
};

// ---------------------------------------------------------------- shippable

test('a record with no check date is NOT shippable, however confident it looks', () => {
  assert.equal(kashrutIsShippable(legacy), false);
  assert.equal(kashrutIsShippable(real), true);
  assert.equal(kashrutIsShippable(undefined), false);
});

test('a date without a source, or a source without a date, is not shippable either', () => {
  assert.equal(
    kashrutIsShippable({ ...real, provenance: { ...real.provenance, checked: null } }),
    false,
  );
  assert.equal(
    kashrutIsShippable({ ...real, provenance: { ...real.provenance, source: '' } }),
    false,
  );
});

// ---------------------------------------------------------------- no judging

test('a certification is never graded, ranked or reordered - names only', () => {
  const two: KashrutRecord = {
    ...real,
    certifications: [
      { body: 'רבנות מקומית' },
      { body: 'בד"ץ', descriptors: ['מהדרין'] },
    ],
  };
  const out = describeCertifications(two);
  // both present, in the order given, with no verdict attached
  assert.ok(out.includes('רבנות מקומית'));
  assert.ok(out.includes('בד"ץ'));
  assert.ok(out.indexOf('רבנות מקומית') < out.indexOf('בד"ץ'), 'order must be preserved');
  assert.doesNotMatch(out, /מספיק|אמין|מומלץ|עדיף|טוב יותר|קפדני/);
});

test('the instruction not to judge rides with the DATA, not only in the prompt', () => {
  const m = kashrutForModel(real);
  assert.match(m.mayNotJudge, /NEVER say a certification is sufficient/);
  assert.equal(m.verified, true);
  assert.equal(m.checked, '2026-08-19');
});

// ---------------------------------------------------------------- caveats

test('every knowledge state produces a caveat - a kashrut fact is never bare', () => {
  for (const k of ['certified', 'none-found', 'unknown'] as const) {
    const c = kashrutCaveat({ ...legacy, knowledge: k });
    assert.ok(c.length > 0, `${k} produced no caveat`);
  }
  assert.ok(kashrutCaveat(undefined).length > 0);
});

test('the caveat gets MORE specific with better provenance, not more generic', () => {
  const weak = kashrutCaveat(legacy);
  const strong = kashrutCaveat(real);
  assert.match(weak, /לא אומתה על ידינו|אין לנו תאריך/);
  assert.match(strong, /2026-08-19/);
  assert.notEqual(weak, strong);
});

test('"we found none" and "we have not checked" say different things', () => {
  const none = kashrutCaveat({ ...real, knowledge: 'none-found' });
  const unknown = kashrutCaveat({ ...real, knowledge: 'unknown' });
  assert.notEqual(none, unknown);
  assert.match(none, /לא מצאנו/);
  assert.match(unknown, /לא בדקנו/);
  // "we have not checked" must not be readable as "there is none"
  assert.match(unknown, /לא אומר שאין/);
});

// ---------------------------------------------------------------- summary

test('certified with no named body says so instead of implying a name', () => {
  const unnamed: KashrutRecord = { ...legacy, certifications: [] };
  assert.equal(kashrutSummary(unnamed), 'יש השגחה');
  assert.equal(describeCertifications(unnamed), '');
});

// ------------------------------------------------- the real catalog, as data

test('every kosher-category place in the catalog carries a kashrut record', () => {
  const missing: string[] = [];
  for (const d of destinations) {
    for (const p of d.places) {
      if (isKosher(p.category) && !p.kashrut) missing.push(`${d.slug}/${p.id}`);
    }
  }
  assert.deepEqual(missing, [], `kosher places with no kashrut record: ${missing.join(', ')}`);
});

test('no migrated record invented a check date', () => {
  // The old model recorded "pending-review" for all 53. Nothing in the catalog
  // may carry a date-shaped value that nobody actually established, and the
  // placeholder string must not survive anywhere.
  const bad: string[] = [];
  for (const d of destinations) {
    for (const p of d.places) {
      const c = p.kashrut?.provenance.checked;
      if (c === undefined) continue;
      if (c === null) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c)) bad.push(`${d.slug}/${p.id}: ${c}`);
    }
  }
  assert.deepEqual(bad, [], `non-ISO check dates: ${bad.join(', ')}`);
});

test('every record migrated from the old supervision string kept it verbatim', () => {
  // Only the 53 records that HAD a supervision string are in scope. The four
  // district/institution entries (rue des Rosiers, Golders Green, the Antwerp
  // quarter, Maghain Aboth) never had one - they carried no verification
  // record at all, because the old model could not express "an area where
  // several bodies operate" - so there is nothing for them to preserve.
  const migrated = destinations
    .flatMap((d) => d.places)
    .filter((p) => p.kashrut?.provenance.source === 'קטלוג טיול+ (דיווח קודם)');
  assert.equal(migrated.length, 53, 'expected all 53 migrated records');
  for (const p of migrated) {
    assert.ok(
      p.kashrut?.legacySupervision,
      `${p.id} lost its original supervision string in the migration`,
    );
  }
});

test('the four district entries name their bodies and say supervision varies', () => {
  // The case the old model could not hold: an area, not a venue. Each names the
  // bodies its own kosherNote already named, and each says explicitly that the
  // certificate has to be checked per business - because that is the truth on
  // the ground and a single "kosher: yes" would misrepresent it.
  const ids = ['par-rosiers', 'lon-golders', 'sg-synagogue', 'be-antwerp-jewish'];
  for (const id of ids) {
    const p = destinations.flatMap((d) => d.places).find((x) => x.id === id);
    assert.ok(p?.kashrut, `${id} has no kashrut record`);
    assert.ok(
      (p!.kashrut!.certifications ?? []).length > 0,
      `${id} names no certifying body`,
    );
    assert.ok(p!.kashrut!.arrangement, `${id} does not say supervision varies`);
  }
});
