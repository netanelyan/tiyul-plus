import { ImageResponse } from 'next/og';
import { destinations } from '@/data/destinations';
import { decodeTripShare } from '@/lib/server/shareDecode';
import { getSharedPayload } from '@/lib/trip/shareStore';
import { daysHe } from '@/lib/duration';
import { OG, ogFonts } from '@/lib/og/fonts';
import { hasUnsupportedRtl, toVisualOrder as v } from '@/lib/og/bidi';

/**
 * The share card for /t/<code> - the trip's own name, cities and size.
 *
 * ## Why this is worth a route of its own
 *
 * WhatsApp is the distribution channel for this product, and until now every
 * shared trip carried the same generic /og.png. Somebody forwarding "our Italy
 * trip" produced a card indistinguishable from a link to the homepage, so the
 * one moment the site is recommended by a real person was also the moment it
 * looked like an advert.
 *
 * ## No photograph on it, and that is a decision rather than a shortcut
 *
 * A city photograph would be more clickable. It would also mean fetching
 * upload.wikimedia.org from inside the scraper's request, and WhatsApp's
 * scraper gives up quickly - so the failure mode is not "a card without a
 * picture", it is **no card at all**, which is worse than what we have today.
 * A typographic card renders from data already in memory and cannot time out.
 *
 * ## Falling back rather than 500-ing
 *
 * An unknown, expired or malformed code still gets a card - the brand one,
 * with no trip details on it. A share route that throws hands the scraper an
 * error page, and a broken link that at least looks like a real site beats a
 * broken link that looks like nothing.
 */

export const alt = 'טיול משותף בטיול+';
export const size = { width: OG.width, height: OG.height };
export const contentType = 'image/png';

/**
 * Scrapers refetch the same link repeatedly. Rendering is the expensive part
 * of this route, and /t/ has no rate limit by an earlier deliberate decision -
 * it is the viral surface and many people share one address behind NAT. So the
 * answer here is caching rather than a limit: identical work, once.
 */
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let name: string | null = null;
  let line: string | null = null;
  try {
    const payload = /^[a-zA-Z0-9]{6,12}$/.test(code) ? await getSharedPayload(code) : code;
    const shared = payload ? decodeTripShare(payload) : null;
    if (shared && !hasUnsupportedRtl(shared.name)) {
      name = shared.name;
      const cities = [...new Set(shared.days.map((d) => d.citySlug))]
        .map((s) => destinations.find((x) => x.slug === s)?.name)
        .filter(Boolean);
      const stops = shared.days.reduce((n, d) => n + d.placeIds.length, 0);
      // Three cities is where the line stops being readable at this size; the
      // count that follows is the honest way to say there are more.
      const shown = cities.slice(0, 3).join(' · ');
      const rest = cities.length > 3 ? ` +${cities.length - 3}` : '';
      line = `${daysHe(shared.days.length)} · ${stops} עצירות · ${shown}${rest}`;
    }
  } catch {
    // Same as an unknown code: the brand card, never an error page.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: OG.night,
          fontFamily: 'Heebo',
          padding: '64px 72px',
          /*
            ltr, and every Hebrew string below goes through `v()` first.
            Satori has no bidi pass at all, so `direction: rtl` would only
            right-align the blocks and leave the letters mirrored - measured
            against Chrome, not assumed. The strings arrive already in visual
            order, so the renderer's job is to place them left to right.

            Alignment is therefore set per block with flex, not inherited from
            a direction.
          */
          direction: 'ltr',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div
            style={{
              display: 'flex',
              background: OG.sunset,
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 700,
              borderRadius: 999,
              padding: '8px 22px',
            }}
          >
            {v('טיול משותף')}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 40,
              fontSize: name && name.length > 26 ? 68 : 86,
              fontWeight: 700,
              color: OG.cream,
              lineHeight: 1.15,
              // Two lines at most. A trip name is user text and can be long;
              // letting it run pushes the counts off the card.
              maxHeight: 220,
              overflow: 'hidden',
            }}
          >
            {v(name ?? 'מסלול שנבנה בטיול+')}
          </div>
          {line ? (
            <div style={{ display: 'flex', marginTop: 26, fontSize: 34, color: OG.zest }}>
              {v(line)}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', background: OG.sunset, height: 6, width: 160 }} />
          {/* row-reverse, so the mark sits on the right where the brand belongs */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row-reverse',
              alignItems: 'baseline',
              gap: 18,
              marginTop: 24,
            }}
          >
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: OG.cream }}>
              {v('טיול+')}
            </div>
            <div style={{ display: 'flex', fontSize: 28, color: OG.muted }}>
              {v('סוכן הנסיעות החכם לישראלים')}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
