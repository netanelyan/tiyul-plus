/**
 * The workspace header is sent only when configured. A user-scoped key is
 * refused without it; a workspace key must keep sending exactly what it
 * sent before, or production changes behaviour for nothing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { anthropicHeaders } from './anthropicHeaders.ts';

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('בלי מזהה סביבת עבודה - אותן כותרות כמו תמיד', () => {
  withEnv({ ANTHROPIC_API_KEY: 'k', ANTHROPIC_WORKSPACE_ID: undefined }, () => {
    assert.deepEqual(anthropicHeaders(), {
      'Content-Type': 'application/json',
      'x-api-key': 'k',
      'anthropic-version': '2023-06-01',
    });
  });
});

test('ערך ריק או רווחים לא שולחים כותרת', () => {
  withEnv({ ANTHROPIC_API_KEY: 'k', ANTHROPIC_WORKSPACE_ID: '  ' }, () => {
    assert.equal('anthropic-workspace-id' in anthropicHeaders(), false);
  });
});

test('עם מזהה סביבת עבודה - הכותרת נשלחת', () => {
  withEnv({ ANTHROPIC_API_KEY: 'k', ANTHROPIC_WORKSPACE_ID: ' wrkspc_abc ' }, () => {
    assert.equal(anthropicHeaders()['anthropic-workspace-id'], 'wrkspc_abc');
  });
});

test('כל קריאה ל-Anthropic עוברת דרך anthropicHeaders', () => {
  for (const file of [
    'src/app/api/chat/route.ts',
    'src/app/api/generate-trip/route.ts',
    'src/app/api/internal/warm/route.ts',
  ]) {
    const src = readFileSync(file, 'utf8');
    assert.equal(src.includes("'x-api-key'"), false, `${file} builds its own headers`);
    assert.ok(src.includes('anthropicHeaders()'), `${file} does not use anthropicHeaders`);
  }
});
