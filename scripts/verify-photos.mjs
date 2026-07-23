// אימות כל כתובות התמונות בדאטה: כל photo חייב להחזיר HTTP 200.
// מריצים לפני קומיט של תוכן: node scripts/verify-photos.mjs
// יציאה עם קוד 1 אם תמונה כלשהי נכשלה - מוחקים או מחליפים אותה.
import { readFileSync } from 'node:fs';

const FILES = ['src/data/destinations.ts', 'src/data/countries.ts'];
const urls = new Map(); // url -> where

for (const file of FILES) {
  const src = readFileSync(file, 'utf8');
  const re = /photo:\s*\n?\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (!urls.has(m[1])) urls.set(m[1], file);
  }
}

console.log(`checking ${urls.size} photo URLs...`);
const failed = [];
const entries = [...urls.entries()];
const CONCURRENCY = 8;

async function check(url, file) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'tiyul-plus-photo-verify/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      // לא מורידים את הגוף - רק סטטוס
      await res.body?.cancel?.();
      if (res.status === 200) return;
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      failed.push(`${res.status} ${url} (${file})`);
      return;
    } catch (e) {
      if (attempt === 1) failed.push(`ERR ${url} (${file}): ${e.message}`);
    }
  }
}

for (let i = 0; i < entries.length; i += CONCURRENCY) {
  await Promise.all(entries.slice(i, i + CONCURRENCY).map(([u, f]) => check(u, f)));
  process.stdout.write(`\r${Math.min(i + CONCURRENCY, entries.length)}/${entries.length}`);
}
console.log('');

if (failed.length > 0) {
  console.error(`\n${failed.length} FAILED:`);
  for (const f of failed) console.error('  ' + f);
  process.exit(1);
}
console.log('all photo URLs OK ✓');
