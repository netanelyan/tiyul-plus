/**
 * Heebo, as font buffers, for the share cards rendered by `next/og`.
 *
 * ## Why the font is in the repo at all
 *
 * The site loads Heebo through `next/font/google`, which downloads and
 * self-hosts it AT BUILD TIME into `.next/static/media` under a hashed name.
 * That is exactly right for the browser and useless here: Satori (what
 * `ImageResponse` renders with) needs the bytes, at request time, and there is
 * no stable path to reach them. Without a Hebrew font it does not fall back -
 * it draws nothing, so a share card for a Hebrew trip would come out blank.
 *
 * These are four Fontsource subsets totalling 48KB, not a dependency.
 *
 * ## Four files rather than one, and why both scripts are needed
 *
 * Hebrew carries the trip name; Latin carries the digits, the `·` separators
 * and the `+` in the brand mark. Satori resolves a missing glyph by trying the
 * next font of the same family, so handing it both subsets under one family
 * name is how a stats line of the shape "8 days · 22 stops" renders whole.
 * With the Hebrew subset alone the numbers come out as tofu.
 *
 * WOFF deliberately, not WOFF2: Satori cannot read WOFF2.
 *
 * ## `new URL(..., import.meta.url)` to locate, `fs` to read
 *
 * The URL form is what the bundler statically resolves: it emits each font as
 * a build asset and rewrites the URL to point at it, so the file is genuinely
 * present in the deployment. A path assembled at runtime is exactly what
 * Vercel's file tracing cannot see - the same trap that decided how the email
 * templates are stored.
 *
 * But the URL it produces is a `file://` one, and **`fetch` cannot read
 * `file://` in the Node runtime** - it throws "not implemented... yet...",
 * which surfaces as a bare 500 on the image route and nothing else. The
 * `fetch(new URL(...))` shape that the Next docs show works on the Edge
 * runtime; here the locating and the reading have to be separate steps.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

type FontWeight = 400 | 700;

interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: 'normal';
}

/** Read once per process; a scraper hitting several links should pay this once. */
let cached: Promise<OgFont[]> | null = null;

async function read(url: URL): Promise<ArrayBuffer> {
  const buf = await readFile(fileURLToPath(url));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export function ogFonts(): Promise<OgFont[]> {
  cached ??= Promise.all([
    read(new URL('./fonts/heebo-hebrew-400.woff', import.meta.url)),
    read(new URL('./fonts/heebo-latin-400.woff', import.meta.url)),
    read(new URL('./fonts/heebo-hebrew-700.woff', import.meta.url)),
    read(new URL('./fonts/heebo-latin-700.woff', import.meta.url)),
  ]).then(([he400, la400, he700, la700]): OgFont[] => [
    { name: 'Heebo', data: he400, weight: 400, style: 'normal' },
    { name: 'Heebo', data: la400, weight: 400, style: 'normal' },
    { name: 'Heebo', data: he700, weight: 700, style: 'normal' },
    { name: 'Heebo', data: la700, weight: 700, style: 'normal' },
  ]);
  return cached;
}

/** The brand values the cards paint with, kept out of the JSX so both agree. */
export const OG = {
  night: '#241b4d',
  cream: '#fdf6ec',
  sunset: '#ff5941',
  zest: '#ffc531',
  muted: '#b9b2d9',
  width: 1200,
  height: 630,
} as const;
