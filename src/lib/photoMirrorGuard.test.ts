/**
 * A catalog photograph may only be rendered by `CatalogImage`.
 *
 * This guards the class rather than the instances, because the failure is
 * invisible: a component that renders `place.photo` straight into an element
 * still shows a picture. What it silently gives up is everything the mirror is
 * for - a photograph that survives a Commons rename, a sharp variant on a dense
 * screen, and (measured, not assumed) not funnelling thousands of Wikimedia
 * fetches through one server IP until Wikimedia starts answering 429.
 *
 * The rules are deliberately syntactic and dumb. A subtle guard is one nobody
 * trusts, and this one is checked against its own bypass in the last test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

function sourceFiles(root: string, ext: RegExp): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (ext.test(name)) out.push(full);
    }
  };
  walk(root);
  return out;
}

const SRC = join(process.cwd(), 'src');

const rel = (f: string) => relative(SRC, f).split(sep).join('/');

/** Comments are prose about the rule, not instances of breaking it. */
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/**
 * The only places allowed to resolve a photo URL themselves. An allowlist rather
 * than a ban, so adding a fourth is a decision somebody writes down.
 *
 * Both exceptions are real rather than oversights. `PhotoLightbox`'s overlay
 * sizes the photograph by its own aspect ratio, which `fill` cannot express, so
 * it renders a plain element and resolves the URL at the call site. `MapInner`
 * builds a Leaflet marker icon from an HTML string, so it cannot be a React
 * component at all.
 */
const RESOLVERS = [
  'components/CatalogImage.tsx',
  'components/PhotoLightbox.tsx',
  'components/MapInner.tsx',
];

test('no component renders a catalog photo except CatalogImage', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC, /\.tsx$/)) {
    if (RESOLVERS.includes(rel(file))) continue;
    const code = stripComments(readFileSync(file, 'utf8'));
    for (const m of code.matchAll(/<(?:img|Image)\b/g)) {
      // The element's own attributes. A window rather than a parser: JSX
      // attribute values contain both braces and '>', so there is no cheap
      // regex for "this element", and over-reading only risks a false alarm
      // that a human reads once.
      const window = code.slice(m.index, m.index + 300);
      if (/\bphoto\b/i.test(window)) {
        const line = code.slice(0, m.index).split('\n').length;
        offenders.push(`${rel(file)}:${line}`);
      }
    }
  }
  assert.deepEqual(offenders, [], 'render catalog photos with <CatalogImage>');
});

test('photoSrc is called only where it is meant to be', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC, /\.tsx?$/)) {
    const name = rel(file);
    if (name.endsWith('.test.ts') || name === 'lib/photoMirror.ts') continue;
    if (RESOLVERS.includes(name)) continue;
    if (stripComments(readFileSync(file, 'utf8')).includes('photoSrc(')) offenders.push(name);
  }
  assert.deepEqual(offenders, [], 'go through <CatalogImage> instead of calling photoSrc');
});

test('no component hard-codes the Commons host', () => {
  // The catalog data legitimately stores these URLs; a component writing one is
  // always a bug, because it means a photograph nobody can move.
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC, /\.tsx$/)) {
    if (stripComments(readFileSync(file, 'utf8')).includes('upload.wikimedia.org')) {
      offenders.push(rel(file));
    }
  }
  assert.deepEqual(offenders, []);
});

test('the guard is looking at something', () => {
  // A rule that matches nothing passes forever. Several surfaces render catalog
  // photographs and all of them must be visible to the scan above.
  let uses = 0;
  for (const file of sourceFiles(SRC, /\.tsx$/)) {
    if (rel(file) === 'components/CatalogImage.tsx') continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (line.includes('<CatalogImage')) uses++;
    }
  }
  assert.ok(uses >= 4, `expected several CatalogImage render sites, found ${uses}`);
});
