// כתיבת התמונות מ-photo-report.json אל src/data/destinations.ts.
// הסקריפט הזה לא נוגע ברשת בכוונה: כל האימות כבר נעשה ב-fetch-photos.mjs,
// וההפרדה הזו היא שמאפשרת להריץ את האיתור על מחשב עם רשת ואת העריכה
// בסביבה שבה הריפו חי.
//
//   node scripts/apply-photos.mjs                  רק רשומות status=ok
//   node scripts/apply-photos.mjs --include-review גם מה שסומן לבדיקה
//   node scripts/apply-photos.mjs --dry-run        בלי לכתוב
//
// אחרי הריצה: npx prettier --write src/data/destinations.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { parsePlaces, DESTINATIONS_FILE } from './lib/parse-places.mjs';

const argv = process.argv.slice(2);
const includeReview = argv.includes('--include-review');
const dryRun = argv.includes('--dry-run');
const REPORT = 'photo-report.json';

const report = JSON.parse(readFileSync(REPORT, 'utf8'));
const wanted = new Set(includeReview ? ['ok', 'review'] : ['ok']);
const entries = (report.results ?? []).filter((r) => wanted.has(r.status) && r.photo);

const { places, lines } = parsePlaces();
const byId = new Map(places.map((p) => [p.id, p]));

const applied = [];
const skipped = [];

for (const entry of entries) {
  const place = byId.get(entry.id);
  if (!place) {
    skipped.push(`${entry.id}: no such place in ${DESTINATIONS_FILE}`);
    continue;
  }
  // לעולם לא לדרוס תמונה קיימת - הרצה חוזרת חייבת להיות בטוחה
  if (place.hasPhoto) {
    skipped.push(`${entry.id}: already has a photo`);
    continue;
  }
  if (!entry.photo.startsWith('https://upload.wikimedia.org/')) {
    skipped.push(`${entry.id}: photo is not a Wikimedia URL`);
    continue;
  }
  if (entry.photo.includes("'")) {
    skipped.push(`${entry.id}: URL contains a quote`);
    continue;
  }
  applied.push({ entry, place });
}

// מוסיפים מלמטה למעלה כדי שמספרי השורות שנשמרו בפרסור יישארו נכונים
applied.sort((a, b) => b.place.idLine - a.place.idLine);

for (const { entry, place } of applied) {
  // אותו פורמט שכבר קיים בקובץ: photo: בשורה נפרדת והכתובת מתחתיה,
  // כי כתובות ויקימדיה תמיד ארוכות מ-printWidth של prettier.
  lines.splice(place.idLine + 1, 0, `${place.indent}photo:`, `${place.indent}  '${entry.photo}',`);
}

if (!dryRun && applied.length) {
  writeFileSync(DESTINATIONS_FILE, lines.join('\n'), 'utf8');
}

console.log(`${entries.length} entries in ${REPORT} (${[...wanted].join(' + ')})`);
console.log(`${applied.length} photos ${dryRun ? 'would be' : ''} written`);
if (skipped.length) {
  console.log(`${skipped.length} skipped:`);
  for (const s of skipped.slice(0, 40)) console.log(`  ${s}`);
  if (skipped.length > 40) console.log(`  ...and ${skipped.length - 40} more`);
}
if (!dryRun && applied.length) {
  console.log(`\nNow run: npx prettier --write ${DESTINATIONS_FILE}`);
}
