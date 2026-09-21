/**
 * Deriving widths for Wikimedia images, at render time.
 *
 * **The one rule that matters here: only shrink.** Wikimedia serves a thumbnail narrower
 * than the source, never wider - so widening from 500 to 960 returns 404. That is exactly
 * the bug that killed 170 URLs in entry (k) and was documented in entry (q): "a narrower
 * thumbnail always exists; a wider one does not necessarily". This function refuses to
 * widen, so that class of bug cannot come back through it.
 *
 * URLs that are not Wikimedia thumbs (Unsplash, for example) are returned unchanged.
 */
const WIKI_THUMB = /^(https:\/\/upload\.wikimedia\.org\/\S*\/)(\d+)px-([^/]+)$/;

/** The widths the catalog validates against - see scripts/validate-catalog.mjs */
export type ThumbWidth = 250 | 330 | 500 | 960;

/** The thumbnail width the URL currently asks for, or null if it is not a thumb URL */
export function thumbWidth(url: string): number | null {
  const m = url.match(WIKI_THUMB);
  return m ? Number(m[2]) : null;
}

export function thumb(url: string, width: ThumbWidth): string {
  const m = url.match(WIKI_THUMB);
  if (!m) return url;
  // Never widen - see the explanation above
  if (width >= Number(m[2])) return url;
  return `${m[1]}${width}px-${m[3]}`;
}

/**
 * A srcSet from the widths smaller than the source only. The browser picks by `sizes` and
 * by screen density, so an ordinary screen downloads 250/330 instead of 500 - and a dense
 * screen still gets the sharp original.
 */
export function thumbSrcSet(
  url: string,
  widths: ThumbWidth[] = [250, 330, 500, 960],
  /**
   * The width of the ORIGINAL file on Commons, when it is known.
   *
   * Without it this could only offer widths smaller than the one already in
   * the URL, and almost every catalog URL is a 500px thumb - so a card on a 3x
   * phone asking for ~480px got 500 and there was never anything sharper to
   * pick, even though the original is usually several thousand pixels wide.
   *
   * Wikimedia refuses a thumb wider than the source, which is what produced
   * 170 dead URLs in an earlier session, so widening is only safe with this
   * number in hand. `lib/server/photoCredit.ts` supplies it from the Commons
   * manifest; callers without it keep exactly the old behaviour.
   */
  sourceWidth?: number | null,
): string | undefined {
  const current = thumbWidth(url);
  if (current === null) return undefined;
  const ceiling = sourceWidth && sourceWidth > 0 ? sourceWidth : current;
  const usable = widths.filter((w) => w <= ceiling && w !== current);
  if (usable.length === 0) return undefined;
  /*
    The URL we already have is emitted verbatim at its own width, and the
    others are derived - so the variant the catalog verified is always in the
    set, whatever else is offered alongside it.
  */
  const entries = [
    ...usable.map((w) => ({ w: w as number, src: thumb(url, w) })),
    { w: current, src: url },
  ].sort((a, b) => a.w - b.w);
  return entries.map((e) => `${e.src} ${e.w}w`).join(', ');
}
