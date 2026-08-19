/**
 * Audit of the kosher layer as it actually is, measured against the real catalog.
 *
 * Every number this prints is counted, never estimated. Run:
 *   node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/kosher-audit.mjs
 *   ... --json    machine-readable
 *
 * Note the stdout trap recorded in the session log: do NOT call process.exit()
 * after a large console.log, it truncates when stdout is a pipe.
 */
import { destinations } from '../src/data/destinations.ts';

const JSON_OUT = process.argv.includes('--json');

const EATING = new Set(['cafe', 'food', 'kosher-food']);
const KOSHER_CAT = (c) => c.startsWith('kosher');
// "Kosher-relevant" = a traveller who keeps kosher needs to know about it before
// walking in. Eating places plus food shops. A clothes shop is not relevant.
const RELEVANT = new Set([
  'cafe',
  'food',
  'kosher-food',
  'kosher-market',
  'market',
]);

const all = [];
for (const d of destinations) {
  for (const p of d.places) {
    all.push({ ...p, _dest: d.slug, _destName: d.name, _country: d.countrySlug });
  }
}

const report = {};

// ---------------------------------------------------------------- 1. scope
const kosherCat = all.filter((p) => KOSHER_CAT(p.category));
const withNote = all.filter((p) => p.kosherNote);
const withVerification = all.filter((p) => p.kosherVerification);
const withStatusField = all.filter((p) => p.kosherStatus);
// "carries any kosher information" = anything at all that speaks to kashrut
const anyKosherInfo = all.filter(
  (p) =>
    KOSHER_CAT(p.category) || p.kosherNote || p.kosherVerification || p.kosherStatus,
);

report.totals = {
  places: all.length,
  destinations: destinations.length,
  kosherCategoryPlaces: kosherCat.length,
  withKosherNote: withNote.length,
  withVerification: withVerification.length,
  withKosherStatusField: withStatusField.length,
  anyKosherInformation: anyKosherInfo.length,
};

// ------------------------------------------------- 2. the verification record
const lastCheckedValues = {};
const sourceValues = {};
const supervisionValues = {};
for (const p of withVerification) {
  const v = p.kosherVerification;
  lastCheckedValues[v.lastChecked] = (lastCheckedValues[v.lastChecked] ?? 0) + 1;
  sourceValues[v.source] = (sourceValues[v.source] ?? 0) + 1;
  supervisionValues[v.supervision] = (supervisionValues[v.supervision] ?? 0) + 1;
}
report.verification = {
  count: withVerification.length,
  lastCheckedValues,
  sourceValues,
  distinctSupervisionStrings: Object.keys(supervisionValues).length,
  supervisionValues,
  // a real date is one that parses AND is not the placeholder
  withRealDate: withVerification.filter(
    (p) =>
      p.kosherVerification.lastChecked !== 'pending-review' &&
      !Number.isNaN(Date.parse(p.kosherVerification.lastChecked)),
  ).length,
};

// ------------------------------------------- 3. gaps in relevant categories
const relevant = all.filter((p) => RELEVANT.has(p.category));
const relevantNoInfo = relevant.filter(
  (p) => !KOSHER_CAT(p.category) && !p.kosherNote && !p.kosherStatus,
);
const eating = all.filter((p) => EATING.has(p.category));
const eatingNoStatus = eating.filter(
  (p) => !KOSHER_CAT(p.category) && !p.kosherStatus,
);
report.gaps = {
  relevantCategoryPlaces: relevant.length,
  relevantWithNoKosherDataAtAll: relevantNoInfo.length,
  eatingPlaces: eating.length,
  eatingWithNoStatus: eatingNoStatus.length,
  byCategory: {},
};
for (const c of RELEVANT) {
  const inCat = all.filter((p) => p.category === c);
  report.gaps.byCategory[c] = {
    total: inCat.length,
    withStatusOrDerived: inCat.filter((p) => KOSHER_CAT(p.category) || p.kosherStatus)
      .length,
    withNote: inCat.filter((p) => p.kosherNote).length,
    withVerification: inCat.filter((p) => p.kosherVerification).length,
  };
}

// ------------------------------------------------ 4. field value consistency
const statusValues = {};
for (const p of withStatusField) {
  statusValues[p.kosherStatus] = (statusValues[p.kosherStatus] ?? 0) + 1;
}
report.fieldValues = {
  kosherStatus: statusValues,
  // Consistency problems worth naming:
  kosherCategoryButExplicitStatus: kosherCat
    .filter((p) => p.kosherStatus)
    .map((p) => ({ id: p.id, status: p.kosherStatus })),
  kosherCategoryWithoutVerification: kosherCat
    .filter((p) => !p.kosherVerification)
    .map((p) => ({ id: p.id, dest: p._dest, name: p.name })),
  kosherCategoryWithoutNote: kosherCat.filter((p) => !p.kosherNote).length,
  // a non-kosher place carrying a kosherNote is a WARNING to the traveller,
  // which is legitimate - count it so it is not mistaken for a data error
  nonKosherCatWithNote: withNote.filter((p) => !KOSHER_CAT(p.category)).length,
  statusKosherButNotKosherCategory: all
    .filter((p) => !KOSHER_CAT(p.category) && p.kosherStatus === 'kosher')
    .map((p) => ({ id: p.id, dest: p._dest, name: p.name })),
};

// ------------------------------------------------- 5. per-destination spread
const perDest = destinations
  .map((d) => {
    const k = d.places.filter((p) => KOSHER_CAT(p.category));
    return {
      slug: d.slug,
      name: d.name,
      country: d.countrySlug,
      places: d.places.length,
      kosherPlaces: k.length,
      kosherFood: k.filter((p) => p.category === 'kosher-food').length,
      kosherMarket: k.filter((p) => p.category === 'kosher-market').length,
      hasKosherOverview: Boolean(d.practical?.kosherOverview),
      overviewLength: d.practical?.kosherOverview?.length ?? 0,
      eatingPlaces: d.places.filter((p) => EATING.has(p.category)).length,
    };
  })
  .sort((a, b) => b.kosherPlaces - a.kosherPlaces);
report.perDestination = perDest;
report.destinationSummary = {
  withAtLeastOneKosherPlace: perDest.filter((d) => d.kosherPlaces > 0).length,
  withNone: perDest.filter((d) => d.kosherPlaces === 0).length,
  withKosherOverviewText: perDest.filter((d) => d.hasKosherOverview).length,
  // the honest one: a city with an overview but no places
  overviewButNoPlaces: perDest.filter((d) => d.hasKosherOverview && d.kosherPlaces === 0)
    .length,
};

// countries
const byCountry = {};
for (const d of perDest) {
  byCountry[d.country] ??= { destinations: 0, kosherPlaces: 0 };
  byCountry[d.country].destinations += 1;
  byCountry[d.country].kosherPlaces += d.kosherPlaces;
}
report.countrySummary = {
  countries: Object.keys(byCountry).length,
  withAnyKosherPlace: Object.values(byCountry).filter((c) => c.kosherPlaces > 0).length,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const line = (s = '') => console.log(s);
  line('='.repeat(72));
  line('KOSHER LAYER AUDIT — counted, not estimated');
  line('='.repeat(72));
  line();
  line('1. SCOPE');
  line(`   catalog: ${report.totals.places} places / ${report.totals.destinations} destinations`);
  line(`   kosher-* category places:        ${report.totals.kosherCategoryPlaces}`);
  line(`   carry a kosherNote:              ${report.totals.withKosherNote}`);
  line(`   carry a kosherVerification:      ${report.totals.withVerification}`);
  line(`   carry an explicit kosherStatus:  ${report.totals.withKosherStatusField}`);
  line(`   ANY kosher information at all:   ${report.totals.anyKosherInformation}`);
  line();
  line('2. THE VERIFICATION RECORD');
  line(`   records: ${report.verification.count}`);
  line(`   with a real (parseable, non-placeholder) date: ${report.verification.withRealDate}`);
  line('   lastChecked values:');
  for (const [k, v] of Object.entries(report.verification.lastCheckedValues))
    line(`      ${JSON.stringify(k)}: ${v}`);
  line('   source values:');
  for (const [k, v] of Object.entries(report.verification.sourceValues))
    line(`      ${JSON.stringify(k)}: ${v}`);
  line(`   distinct supervision strings: ${report.verification.distinctSupervisionStrings}`);
  line();
  line('3. GAPS IN KOSHER-RELEVANT CATEGORIES');
  line(`   relevant-category places: ${report.gaps.relevantCategoryPlaces}`);
  line(`   of those, NO kosher data at all: ${report.gaps.relevantWithNoKosherDataAtAll}`);
  line(`   eating places: ${report.gaps.eatingPlaces}, without a status: ${report.gaps.eatingWithNoStatus}`);
  for (const [c, v] of Object.entries(report.gaps.byCategory))
    line(
      `      ${c.padEnd(14)} total ${String(v.total).padStart(4)}  status ${String(v.withStatusOrDerived).padStart(4)}  note ${String(v.withNote).padStart(4)}  verif ${String(v.withVerification).padStart(4)}`,
    );
  line();
  line('4. FIELD VALUES');
  line(`   kosherStatus: ${JSON.stringify(report.fieldValues.kosherStatus)}`);
  line(`   kosher-* category WITHOUT a verification record: ${report.fieldValues.kosherCategoryWithoutVerification.length}`);
  line(`   kosher-* category WITHOUT a note: ${report.fieldValues.kosherCategoryWithoutNote}`);
  line(`   non-kosher category carrying a note (a warning, legitimate): ${report.fieldValues.nonKosherCatWithNote}`);
  line(`   status='kosher' on a NON-kosher category: ${report.fieldValues.statusKosherButNotKosherCategory.length}`);
  line();
  line('5. SPREAD');
  line(`   destinations with >=1 kosher place: ${report.destinationSummary.withAtLeastOneKosherPlace} of ${report.totals.destinations}`);
  line(`   destinations with none:             ${report.destinationSummary.withNone}`);
  line(`   destinations with overview text:    ${report.destinationSummary.withKosherOverviewText}`);
  line(`   overview text but ZERO places:      ${report.destinationSummary.overviewButNoPlaces}`);
  line(`   countries with any kosher place:    ${report.countrySummary.withAnyKosherPlace} of ${report.countrySummary.countries}`);
  line();
  line('   top destinations by kosher places:');
  for (const d of perDest.filter((x) => x.kosherPlaces > 0))
    line(
      `      ${String(d.kosherPlaces).padStart(3)}  ${d.slug.padEnd(28)} food ${d.kosherFood} market ${d.kosherMarket}`,
    );
  line();
}
