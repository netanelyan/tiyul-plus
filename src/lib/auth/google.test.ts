import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { GIS_SCRIPT_URL, googleClientId, makeNonce, sha256Hex } from './google.ts';

const SRC = join(import.meta.dirname, '..', '..');
const ROOT = join(SRC, '..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

const rel = (p: string) => relative(SRC, p).split(sep).join('/');

test('sha256Hex מחזיר hex קטן לפי וקטור הבדיקה הידוע', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('nonce: הגרסה הגולמית הולכת ל-Supabase, ה-hash שלה ל-Google', async () => {
  const a = await makeNonce();
  const b = await makeNonce();
  assert.match(a.raw, /^[0-9a-f]{64}$/);
  assert.equal(a.hashed, await sha256Hex(a.raw));
  assert.notEqual(a.raw, a.hashed);
  assert.notEqual(a.raw, b.raw, 'two nonces must never repeat');
});

test('בלי client ID תקין הכפתור של Google לא מוצג', () => {
  const saved = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  try {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    assert.equal(googleClientId(), null);
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'GOCSPX-this-is-a-secret-not-an-id';
    assert.equal(googleClientId(), null);
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = ' 1234567890-abc123def456.apps.googleusercontent.com ';
    assert.equal(googleClientId(), '1234567890-abc123def456.apps.googleusercontent.com');
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    else process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = saved;
  }
});

/*
  /cookies says ordinary browsing loads nothing from Google for sign-in, and that
  g_state can only appear after the login modal opens. That holds only while the
  script is requested from one module and that module is only called by the modal.
*/
test('הסקריפט של Google נטען רק מחלון ההתחברות', () => {
  const files = sourceFiles(SRC);
  const naming = files.filter((f) => readFileSync(f, 'utf8').includes('accounts.google.com/gsi/client')).map(rel);
  assert.deepEqual(naming, ['lib/auth/google.ts'], 'only google.ts may name the GIS script URL');
  const loaders = files
    .filter((f) => !f.endsWith(join('auth', 'google.ts')))
    .filter((f) => /\bloadGis\s*\(/.test(readFileSync(f, 'utf8')))
    .map(rel);
  assert.deepEqual(loaders, ['components/LoginModal.tsx'], 'loadGis may only be called from the login modal');
});

test('ה-CSP מתיר את Google sign-in, ורק בנתיב /gsi/', () => {
  const config = readFileSync(join(ROOT, 'next.config.ts'), 'utf8');
  assert.ok(config.includes(GIS_SCRIPT_URL), 'script-src must allow the GIS script');
  assert.ok(config.includes('https://accounts.google.com/gsi/style'), 'style-src must allow the GIS stylesheet');
  assert.match(config, /"frame-src [^"]*https:\/\/accounts\.google\.com\/gsi\/"/, 'frame-src must allow the button iframe');
  assert.ok(/'https:\/\/accounts\.google\.com\/gsi\/'/.test(config), 'connect-src must allow the GIS calls');
  assert.ok(!/https:\/\/accounts\.google\.com['" ]/.test(config), 'never the whole accounts.google.com host');
});

test('שני מסלולי ההתחברות רושמים הסכמה לתנאים באותה פונקציה', () => {
  const ctx = readFileSync(join(SRC, 'lib', 'auth', 'AuthContext.tsx'), 'utf8');
  for (const call of ['verifyOtp(', 'signInWithIdToken(']) {
    const at = ctx.indexOf(call);
    assert.ok(at > 0, `${call} not found`);
    const end = ctx.indexOf('useCallback(', at);
    const body = ctx.slice(at, end === -1 ? undefined : end);
    assert.ok(body.includes('await afterSignIn()'), `${call} must be followed by afterSignIn()`);
  }
  const records = ctx.split('recordTermsAcceptance(').length - 1;
  assert.equal(records, 1, 'consent is recorded in exactly one place (afterSignIn)');
});
