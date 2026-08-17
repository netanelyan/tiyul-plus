// Validating the "what changes a trip" calendar. The only rule that genuinely matters here is the
// dates rule: datesConfirmed=true must come with real dates and a source, and false must come with
// a window in words and no date at all. The check exists so an estimated date cannot slip in
// quietly under the "confirmed" flag - that is all that separates a fact from a guess here.
import { calendar } from '../src/data/calendar.ts';
import { destinations } from '../src/data/destinations.ts';
import { countries } from '../src/data/countries.ts';

let errors = 0;
const err = (m) => { console.log('ERROR ' + m); errors++; };
const ids = new Set();
const destSlugs = new Set(destinations.map((d) => d.slug));
const countrySlugs = new Set(countries.map((c) => c.slug));
const ISO = /^\d{4}-\d{2}-\d{2}$/;
// Anything that looks like a date, to catch a date smuggled into a free-text field
const DATEISH = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/;

for (const e of calendar) {
  const w = `calendar/${e.id}`;
  if (ids.has(e.id)) err(`${w}: duplicate id`);
  ids.add(e.id);
  if (!['event', 'closure'].includes(e.kind)) err(`${w}: bad kind`);
  if (!['closures', 'crowds', 'both'].includes(e.impact)) err(`${w}: bad impact`);
  if (!countrySlugs.has(e.countrySlug)) err(`${w}: unknown countrySlug ${e.countrySlug}`);
  for (const s of e.destinationSlugs ?? [])
    if (!destSlugs.has(s)) err(`${w}: unknown destinationSlug ${s}`);
  if (!e.source?.url || !e.source?.title || !ISO.test(e.source?.checked ?? ''))
    err(`${w}: every entry needs a source with url, title and an ISO checked date`);
  if (!e.note || e.note.length < 20) err(`${w}: note is the whole point - write what it means for a traveller`);

  if (e.datesConfirmed) {
    if (!e.dates?.length) err(`${w}: datesConfirmed=true but no dates - confirmed means published AND recorded`);
    for (const d of e.dates ?? []) {
      if (!ISO.test(d.start) || !ISO.test(d.end)) err(`${w}: dates must be ISO YYYY-MM-DD`);
      else if (d.end < d.start) err(`${w}: end ${d.end} is before start ${d.start}`);
    }
  } else {
    if (e.dates?.length)
      err(`${w}: datesConfirmed=false but dates present - an unconfirmed date is exactly what this data forbids`);
    if (!e.window || e.window.length < 10)
      err(`${w}: datesConfirmed=false needs a window in plain words`);
    if (DATEISH.test(e.window ?? ''))
      err(`${w}: the window contains something that looks like a specific date - windows are words, not dates`);
  }
}

const conf = calendar.filter((e) => e.datesConfirmed).length;
console.log(
  `\n${calendar.length} calendar entries - ${conf} confirmed, ${calendar.length - conf} windows, ` +
    `${calendar.filter((e) => e.kind === 'closure').length} closures, ` +
    `${calendar.filter((e) => e.kind === 'event').length} events - ${errors} errors`,
);
if (errors) process.exitCode = 1;
