import { ImageResponse } from 'next/og';
import { decodeTripShare } from '@/lib/server/shareDecode';
import { getSharedPayload } from '@/lib/trip/shareStore';
import { sharePreview } from '@/lib/trip/sharePreview';
import { daysHe } from '@/lib/duration';
import { inHe } from '@/lib/hebrew';
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

  let headline: string | null = null;
  let line: string | null = null;
  /** One dot per day, for the route strip. Capped - see the strip itself. */
  let dayCount = 0;
  try {
    const payload = /^[a-zA-Z0-9]{6,12}$/.test(code) ? await getSharedPayload(code) : code;
    const shared = payload ? decodeTripShare(payload) : null;
    if (shared) {
      /*
        **The headline is generated, not the trip's name.** It used to be
        `shared.name`, which is the owner's own words - a surname, an inside
        joke, sometimes a person's full name - and the card is the part of a
        shared link that gets forwarded onward into groups the owner never
        chose. `sharePreview` builds the same facts the page's og:title uses,
        so the card and the text beside it in WhatsApp agree by construction.

        It also removes the reason `hasUnsupportedRtl` was consulted about the
        name: catalog city names are Hebrew we control. The guard stays on the
        final string because a card with mirrored glyphs is worse than a plain
        one, and it now protects a string we assembled rather than one a user
        typed.
      */
      const preview = sharePreview(shared);
      dayCount = preview.dayCount;
      const city = preview.cityLabel;
      const candidate = city ? `${daysHe(preview.dayCount)} ${inHe(city)}` : 'מסלול שנבנה בטיול+';
      headline = hasUnsupportedRtl(candidate) ? null : candidate;
      const places = preview.topPlaces.slice(0, 2).join(' · ');
      const tail = places ? ` · ${places}` : '';
      const stopsLine = `${preview.stopCount} עצירות${tail}`;
      line = hasUnsupportedRtl(stopsLine) ? null : stopsLine;
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
              fontSize: headline && headline.length > 26 ? 68 : 86,
              fontWeight: 700,
              color: OG.cream,
              lineHeight: 1.15,
              // Two lines at most. The headline is generated now and so is
              // bounded, but a long city label still must not push the counts
              // off the card.
              maxHeight: 220,
              overflow: 'hidden',
            }}
          >
            {v(headline ?? 'מסלול שנבנה בטיול+')}
          </div>
          {line ? (
            <div style={{ display: 'flex', marginTop: 26, fontSize: 34, color: OG.zest }}>
              {v(line)}
            </div>
          ) : null}
          {/*
            The route strip - one dot per day on a line, which is the cheapest
            honest picture of "this is a multi-day plan". **Not a map**: a real
            map means fetching tiles from inside the scraper's request, and
            WhatsApp gives up quickly enough that the failure mode would be no
            card at all rather than a card without a map. Same reasoning as the
            photograph this card already refuses, recorded above.

            row-reverse so day 1 is on the right, where a Hebrew reader starts.
            Capped at 10 so a three-week trip does not produce a grey smear.
          */}
          {dayCount > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row-reverse',
                alignItems: 'center',
                marginTop: 30,
              }}
            >
              {/*
                Flat siblings, not a dot nested with its own connector. In a
                row-reverse row the first child is placed rightmost and each
                next one to its left, so alternating dot/connector/dot as
                siblings lays out correctly; nesting [connector, dot] pairs put
                two dots adjacent and the connectors in the wrong gaps.
              */}
              {Array.from({ length: Math.min(dayCount, 10) }).flatMap((_, i) => [
                ...(i > 0
                  ? [
                      <div
                        key={`c${i}`}
                        style={{ display: 'flex', width: 34, height: 4, background: OG.muted }}
                      />,
                    ]
                  : []),
                <div
                  key={`d${i}`}
                  style={{
                    display: 'flex',
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: i === 0 ? OG.sunset : OG.cream,
                  }}
                />,
              ])}
              {dayCount > 10 ? (
                <div style={{ display: 'flex', marginRight: 16, fontSize: 26, color: OG.muted }}>
                  {v(`+${dayCount - 10}`)}
                </div>
              ) : null}
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
            {/*
              "Built with tiyul+" rather than the tagline. On a card that now
              carries no trip name, the sentence worth spending the line on is
              the one that says a person made this here - which is also the
              badge the page itself shows, so the card and the page say the
              same thing.
            */}
            <div style={{ display: 'flex', fontSize: 28, color: OG.muted }}>
              {v('נבנה עם טיול+ · סוכן הנסיעות החכם לישראלים')}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
