// Measure the live grounding index, so a figure quoted anywhere is measured and not
// assumed. CLAUDE.md's budget section is authoritative over any session-log number,
// and this is what produces the number it should carry.
import { buildGroundingIndex } from '../src/lib/server/grounding.ts';
import { destinations } from '../src/data/destinations.ts';

const CEILING = 280_000;
const on = buildGroundingIndex(true);
const off = buildGroundingIndex(false);
const places = destinations.reduce((n, d) => n + d.places.length, 0);

const fmt = (n) => n.toLocaleString('en-US');
console.log(`destinations : ${fmt(destinations.length)}`);
console.log(`places       : ${fmt(places)}`);
console.log(`index kosher on : ${fmt(on.length)} chars`);
console.log(`index kosher off: ${fmt(off.length)} chars`);
console.log(`ceiling ${fmt(CEILING)} -> headroom ${fmt(CEILING - on.length)} chars`);
console.log(`cost per place  : ${(on.length / places).toFixed(1)} chars`);
console.log(`room for about  : ${Math.floor((CEILING - on.length) / (on.length / places))} more places`);
