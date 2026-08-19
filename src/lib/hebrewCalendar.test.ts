import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  chagimBetween,
  chagimOn,
  daysInHebrewYear,
  hebrewDateLabel,
  hebrewYearOf,
  isHebrewLeapYear,
} from '@/lib/hebrewCalendar';

/**
 * The load-bearing test in this file is the ICU cross-check below.
 *
 * Our implementation is the molad-plus-dechiyot arithmetic written out by
 * hand; ICU's is an entirely separate implementation shipped with the runtime.
 * Agreeing with it on every month for two centuries is a far stronger
 * statement than any number of hand-picked anchors, and it is the reason the
 * EPOCH_OFFSET constant can be trusted rather than merely asserted.
 */

const HEB = new Intl.DateTimeFormat('en-u-ca-hebrew', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

/** ICU's Hebrew year for a Gregorian ISO date, or null if ICU data is absent. */
function icuHebrewYear(iso: string): number | null {
  const [y, m, d] = iso.split('-').map(Number);
  const parts = HEB.formatToParts(new Date(Date.UTC(y, m - 1, d)));
  const year = parts.find((p) => p.type === 'year')?.value;
  if (!year) return null;
  const n = Number(year.replace(/\D/g, ''));
  return Number.isFinite(n) ? n : null;
}

function icuHebrewDay(iso: string): number | null {
  const [y, m, d] = iso.split('-').map(Number);
  const parts = HEB.formatToParts(new Date(Date.UTC(y, m - 1, d)));
  const day = parts.find((p) => p.type === 'day')?.value;
  return day ? Number(day) : null;
}

const ICU_AVAILABLE = icuHebrewYear('2025-09-23') === 5786;

test('ICU Hebrew calendar data is present (this file is meaningless without it)', () => {
  // Stated as its own assertion rather than silently skipping: a cross-check
  // that quietly does nothing is worse than no cross-check, because it reports
  // green. If this fails on some runtime, the suite says so out loud.
  assert.equal(ICU_AVAILABLE, true, 'ICU has no Hebrew calendar data on this runtime');
});

test('agrees with ICU on the Hebrew year for every month from 1900 to 2100', () => {
  let checked = 0;
  const mismatches: string[] = [];
  for (let gy = 1900; gy <= 2100; gy += 1) {
    for (let gm = 1; gm <= 12; gm += 1) {
      const iso = `${gy}-${String(gm).padStart(2, '0')}-15`;
      const mine = hebrewYearOf(iso);
      const theirs = icuHebrewYear(iso);
      if (theirs === null) continue;
      checked += 1;
      if (mine !== theirs) mismatches.push(`${iso}: ours ${mine} vs ICU ${theirs}`);
    }
  }
  assert.ok(checked > 2000, `expected a wide sweep, checked only ${checked}`);
  assert.deepEqual(mismatches.slice(0, 5), [], `${mismatches.length} mismatches`);
});

test('agrees with ICU on the day-of-month across a long continuous run', () => {
  // Every single day for four years, which crosses leap years, deficient and
  // complete years, and both Adars.
  const start = Date.UTC(2025, 0, 1);
  const mismatches: string[] = [];
  for (let i = 0; i < 365 * 4; i += 1) {
    const iso = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    const theirs = icuHebrewDay(iso);
    if (theirs === null) continue;
    const label = hebrewDateLabel(iso);
    const ours = Number(label.split(' ')[0]);
    if (ours !== theirs) mismatches.push(`${iso}: ours ${ours} vs ICU ${theirs}`);
  }
  assert.deepEqual(mismatches.slice(0, 5), [], `${mismatches.length} day mismatches`);
});

// ------------------------------------------------------- internal coherence

test('year lengths are only the six legal values', () => {
  const legal = new Set([353, 354, 355, 383, 384, 385]);
  for (let y = 5700; y <= 5900; y += 1) {
    const len = daysInHebrewYear(y);
    assert.ok(legal.has(len), `year ${y} has illegal length ${len}`);
    assert.equal(len > 380, isHebrewLeapYear(y), `year ${y} leap/length disagree`);
  }
});

test('Rosh Hashanah never falls on Sunday, Wednesday or Friday (lo ADU rosh)', () => {
  for (let y = 5700; y <= 5900; y += 1) {
    const rh = chagimBetween(`${y - 3761}-08-01`, `${y - 3760}-11-01`).find(
      (c) => c.name === 'ראש השנה',
    );
    if (!rh) continue;
    const dow = new Date(rh.date).getUTCDay();
    assert.ok(![0, 3, 5].includes(dow), `RH ${y} fell on weekday ${dow} (${rh.date})`);
  }
});

test('Yom Kippur is always nine days after Rosh Hashanah', () => {
  const all = chagimBetween('2026-01-01', '2032-12-31');
  const rh = all.filter((c) => c.name === 'ראש השנה');
  const yk = all.filter((c) => c.name === 'יום כיפור');
  assert.ok(rh.length >= 5);
  for (const r of rh) {
    const match = yk.find(
      (k) =>
        (Date.parse(k.date) - Date.parse(r.date)) / 86_400_000 === 9,
    );
    assert.ok(match, `no Yom Kippur nine days after ${r.date}`);
  }
});

// ------------------------------------------------------------ travel impact

test('the diaspora second day is flagged, never silently decided', () => {
  const c = chagimBetween('2026-01-01', '2026-12-31');
  const secondDays = c.filter((x) => x.diasporaOnly);
  assert.ok(secondDays.length >= 4, 'expected several second-day yom tov');
  // Both days are returned. Whether an Israeli abroad keeps the second is a
  // real dispute and this module reports it rather than resolving it.
  const pesach1 = c.find((x) => x.name === 'פסח');
  const pesach2 = c.find((x) => x.name === 'פסח (יום שני)');
  assert.ok(pesach1 && pesach2);
  assert.equal(pesach1!.diasporaOnly, false);
  assert.equal(pesach2!.diasporaOnly, true);
  assert.equal(
    (Date.parse(pesach2!.date) - Date.parse(pesach1!.date)) / 86_400_000,
    1,
  );
});

test('chol hamoed does not rest like Shabbat, yom tov and Yom Kippur do', () => {
  const c = chagimBetween('2026-01-01', '2026-12-31');
  for (const day of c) {
    if (day.kind === 'cholhamoed' || day.kind === 'fast' || day.kind === 'minor') {
      assert.equal(day.restsLikeShabbat, false, `${day.name} should not rest`);
    }
    if (day.kind === 'yomtov') {
      assert.equal(day.restsLikeShabbat, true, `${day.name} should rest`);
    }
  }
});

test('a Pesach trip finds the festival on the right day', () => {
  // 15 Nisan 5786 is 2026-04-02 per ICU (asserted independently above).
  const on = chagimOn('2026-04-02');
  assert.ok(on.some((c) => c.name === 'פסח'));
  assert.match(hebrewDateLabel('2026-04-02'), /15 בניסן 5786/);
});

test('an ordinary day returns nothing rather than something vague', () => {
  assert.deepEqual(chagimOn('2026-05-20'), []);
});

test('two full years of coverage, which is what a trip planned ahead needs', () => {
  const c = chagimBetween('2026-08-19', '2028-08-19');
  const names = new Set(c.map((x) => x.name));
  for (const must of ['ראש השנה', 'יום כיפור', 'סוכות', 'פסח', 'שבועות', 'תשעה באב']) {
    assert.ok(names.has(must), `${must} missing from a two-year window`);
  }
  // Every festival in the window carries a real Hebrew date label. The month
  // name may itself contain a space - Adar II is two words - so this
  // cannot be \S+.
  for (const day of c) assert.match(day.hebrewDate, /^\d{1,2} ב.+ \d{4}$/);
});
