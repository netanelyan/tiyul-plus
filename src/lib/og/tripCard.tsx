import { ImageResponse } from 'next/og';
import { daysHe } from '@/lib/duration';
import { inHe } from '@/lib/hebrew';
import type { SharePreview } from '@/lib/trip/sharePreview';
import { OG, ogFonts } from '@/lib/og/fonts';
import { hasUnsupportedRtl, toVisualOrder as v } from '@/lib/og/bidi';

/**
 * The trip card drawn for a link preview - shared by `/t/<code>` (a private
 * share link) and `/trips/<slug>` (a trip its owner published).
 *
 * It lives here rather than in either route because the two cards must stay
 * the same card: they are the same itinerary seen through two doors, and a
 * forwarded `/trips/` link used to arrive in WhatsApp with no picture at all,
 * because that page set its own `openGraph` and so dropped the site default.
 * Only the pill differs, so the reader can tell a private plan from a
 * published one.
 *
 * ## No photograph on it, and that is a decision rather than a shortcut
 *
 * A city photograph would be more clickable. It would also mean fetching
 * upload.wikimedia.org from inside the scraper's request, and WhatsApp's
 * scraper gives up quickly - so the failure mode is not "a card without a
 * picture", it is **no card at all**, which is worse than what we have today.
 * A typographic card renders from data already in memory and cannot time out.
 */

export const TRIP_CARD_SIZE = { width: OG.width, height: OG.height };

/** The card's text, derived from a preview. `null` fields fall back to the brand card. */
export interface TripCardText {
  headline: string | null;
  line: string | null;
  /** One dot per day, for the route strip. Capped - see the strip itself. */
  dayCount: number;
}

/**
 * **The headline is generated, not the trip's name.** The owner's own words -
 * a surname, an inside joke, sometimes a person's full name - would be
 * forwarded onward into groups the owner never chose. `sharePreview` builds
 * the same facts the page's og:title uses, so the card and the text beside it
 * in WhatsApp agree by construction.
 *
 * The RTL guard stays on the final strings because a card with mirrored
 * glyphs is worse than a plain one.
 */
export function tripCardText(preview: SharePreview): TripCardText {
  const city = preview.cityLabel;
  const candidate = city ? `${daysHe(preview.dayCount)} ${inHe(city)}` : 'מסלול שנבנה בטיול+';
  const places = preview.topPlaces.slice(0, 2).join(' · ');
  const tail = places ? ` · ${places}` : '';
  const stopsLine = `${preview.stopCount} עצירות${tail}`;
  return {
    headline: hasUnsupportedRtl(candidate) ? null : candidate,
    line: hasUnsupportedRtl(stopsLine) ? null : stopsLine,
    dayCount: preview.dayCount,
  };
}

export async function renderTripCard(pill: string, text: TripCardText | null): Promise<ImageResponse> {
  const headline = text?.headline ?? null;
  const line = text?.line ?? null;
  const dayCount = text?.dayCount ?? 0;

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
            {v(pill)}
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
              "Built with tiyul+" rather than the tagline. On a card that
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
    { ...TRIP_CARD_SIZE, fonts: await ogFonts() },
  );
}
