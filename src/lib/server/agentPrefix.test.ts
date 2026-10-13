/**
 * The cached prefix, and when it may be warmed.
 *
 * Two claims are tested here, and both are about money:
 *
 * 1. **The prefix is built in one place.** A prefix that differs by one
 *    character is a different cache, i.e. a warm-up that pays for itself
 *    and warms nothing - and that is a completely silent failure: nothing
 *    breaks, you simply pay twice.
 * 2. **Warming refuses in most situations.** Three of `warmDecision`'s
 *    four answers are "no", and that is the behavior Netanel asked for:
 *    the feature switches itself off as the site gets busy.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CACHE_TTL,
  SYSTEM_PROMPT,
  WARM_QUIET_MS,
  WARM_STALE_MS,
  cachedPrefix,
  cachedTools,
  warmDecision,
} from './agentPrefix.ts';

/* ---------- The prefix ---------- */

test('הקידומת היא פרומפט המערכת ואז האינדקס, בסדר הזה', () => {
  const p = cachedPrefix(false);
  assert.equal(p.length, 2);
  assert.equal(p[0].text, SYSTEM_PROMPT);
  assert.equal(p[0].cache_control, undefined, 'רק הבלוק האחרון נושא את נקודת השבירה');
  assert.ok(p[1].cache_control);
  assert.ok(p[1].text.length > 100_000, 'האינדקס הוא הבלוק הגדול');
});

test('אותה קריאה מחזירה קידומת זהה בייט-בבייט', () => {
  assert.equal(JSON.stringify(cachedPrefix(false)), JSON.stringify(cachedPrefix(false)));
  assert.equal(JSON.stringify(cachedTools()), JSON.stringify(cachedTools()));
});

/**
 * The kosher variant used to be a second, separate ~118k-token cache, because the
 * two index variants differed from their first line. It is now the shared prefix
 * plus a small layer, so it reads what everyone else (and the warm-up) keeps warm.
 */
test('the kosher prefix starts with the shared prefix, byte for byte', () => {
  const off = cachedPrefix(false);
  const on = cachedPrefix(true);
  assert.equal(on.length, off.length + 1, 'the kosher layer is one extra block');
  assert.equal(JSON.stringify(on.slice(0, off.length)), JSON.stringify(off));
  const layer = on[on.length - 1];
  assert.ok(layer.cache_control, 'the layer carries its own breakpoint');
  assert.ok(layer.text.includes('KOSHER INDEX'));
  // Small next to the shared index - this is the whole point of the split
  assert.ok(layer.text.length * 20 < off[1].text.length, `layer ${layer.text.length} chars`);
});

test('the prefix leaves room for the conversation breakpoints', () => {
  // The API allows four markers. The prefix may use at most two of them, so the
  // tail and the end of the history always get one each (see agentRequest.ts).
  for (const kosherOk of [false, true]) {
    const marks = cachedPrefix(kosherOk).filter((b) => b.cache_control).length;
    assert.ok(marks <= 2, `kosher=${kosherOk}: ${marks} markers`);
  }
});

test('פרומפט המערכת קבוע לחלוטין - שום דבר אישי לא נכנס לקידומת', () => {
  // Injecting a date, name or identifier here would have invalidated the cache for every user
  assert.ok(!/\$\{/.test(SYSTEM_PROMPT), 'אין אינטרפולציה');
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(SYSTEM_PROMPT), 'אין תאריך');
});

test('ttl נכתב רק כשהוא קיים', () => {
  const cc = cachedPrefix(false)[1].cache_control;
  assert.equal(cc?.type, 'ephemeral');
  assert.equal(cc?.ttl, CACHE_TTL ?? undefined);
});

/**
 * **The class guard.** Both routes must build the prefix from here. If
 * somebody reintroduces `buildGroundingIndex` with `cache_control`
 * directly into a route, warming will keep running and paying - warming a
 * prefix nobody sends anymore.
 */
test('אף נתיב לא בונה קידומת משלו', () => {
  for (const file of ['src/app/api/chat/route.ts', 'src/app/api/internal/warm/route.ts']) {
    const src = readFileSync(file, 'utf8');
    assert.ok(src.includes('cachedPrefix'), `${file} חייב להשתמש ב-cachedPrefix`);
    assert.ok(
      !/buildGroundingIndex\s*\([^)]*\)[\s\S]{0,120}cache_control/.test(src),
      `${file} בונה בלוק מטמון בעצמו`,
    );
  }
});

/* ---------- The warm decision ---------- */

const NOW = 1_800_000_000_000;
const ago = (ms: number) => NOW - ms;

test('תנועה אמיתית לאחרונה => לא מחממים (זה הבזבוז שנתנאל הצביע עליו)', () => {
  assert.equal(warmDecision(ago(0), NOW), 'recent_traffic');
  assert.equal(warmDecision(ago(5 * 60_000), NOW), 'recent_traffic');
  assert.equal(warmDecision(ago(WARM_QUIET_MS - 1), NOW), 'recent_traffic');
});

test('שקט בתוך תוקף המטמון => מחממים, וזה המקרה היחיד', () => {
  assert.equal(warmDecision(ago(WARM_QUIET_MS), NOW), 'warm');
  assert.equal(warmDecision(ago(55 * 60_000), NOW), 'warm');
  assert.equal(warmDecision(ago(WARM_STALE_MS), NOW), 'warm');
});

test('מטמון שכבר פג => לא מחממים, כי זו כתיבה מלאה עבור אף אחד', () => {
  assert.equal(warmDecision(ago(WARM_STALE_MS + 1), NOW), 'cache_expired');
  assert.equal(warmDecision(ago(24 * 60 * 60_000), NOW), 'cache_expired');
  // A whole day without a single visitor produces not even one warm-up
  let warms = 0;
  for (let m = 71; m <= 24 * 60; m++) if (warmDecision(ago(m * 60_000), NOW) === 'warm') warms++;
  assert.equal(warms, 0);
});

test('בלי ידיעה על תנועה => לא מוציאים', () => {
  assert.equal(warmDecision(null, NOW), 'unknown_traffic');
});

test('בתוקף של חמש דקות הפיצ׳ר מכבה את עצמו', () => {
  assert.equal(warmDecision(ago(50 * 60_000), NOW, null), 'short_ttl');
  assert.equal(warmDecision(null, NOW, null), 'short_ttl');
});

test('החלון צר - לכל היותר חימום אחד לשעה', () => {
  // The window's width in minutes is what determines the maximum frequency
  const windowMinutes = (WARM_STALE_MS - WARM_QUIET_MS) / 60_000;
  assert.ok(windowMinutes <= 40, `${windowMinutes} דקות זה חלון רחב מדי`);
  assert.ok(WARM_STALE_MS < 60 * 60_000 * 1.25, 'החלון חייב להסתיים בסביבות תוקף המטמון');
});
