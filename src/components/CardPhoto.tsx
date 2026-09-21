import CatalogImage from '@/components/CatalogImage';

/**
 * The background photo of a destination/city card - as an image element and not as a
 * `background-image`.
 *
 * **This is not a cosmetic refactor.** A `background-image` is not lazily loaded at all, so the
 * `/countries` page sent 166 image requests the moment it opened, before the user had scrolled a
 * single pixel - roughly 8-14 MB on a phone. Lazy loading brings that down to the few cards
 * visible on screen.
 *
 * The dark gradient stays a separate layer above the image, with exactly the same values as
 * before, so the card looks identical. When there is no photo, `photo-bg` alone draws the brand
 * gradient, exactly as before.
 *
 * ## Why `next/image` rather than a hand-built srcSet
 *
 * The old version derived a srcSet from the widths Commons happens to offer (250/330/500/960),
 * which meant the sharpest thing a DPR 3 phone could be given was 500px for a card that wants
 * ~1080. `next/image` resizes from the 1200px mirrored original to whatever `sizes` says the
 * card is, so the same card is sharper AND the file is smaller than the 500px Commons thumb it
 * replaces.
 *
 * `fill` needs a positioned ancestor. Every caller's `className` already carries `relative` or
 * `absolute inset-0` - that was true when this drew an absolutely-positioned img too, so nothing
 * new is being asked of them.
 *
 * ## The no-photo case is the local fallback, deliberately
 *
 * A card with no photograph, or whose photograph fails to load, shows the brand gradient
 * `photo-bg` draws. That is a designed state rather than a placeholder image, and it says more
 * than a generic broken-picture icon would - so `photo-unavailable.svg` is reserved for the
 * surfaces that have nothing of their own to fall back to.
 */
/** The default is exactly the gradient that was on the destination cards */
const DEFAULT_OVERLAY = 'linear-gradient(180deg, rgba(15,14,26,0) 40%, rgba(15,14,26,0.72) 100%)';

/**
 * The darkening a page hero uses - stronger and angled, because a hero carries a
 * whole paragraph over the photograph rather than one line. Exported so the
 * destination and country heroes cannot drift apart; they were two copies of the
 * same value written as inline background layers before.
 */
export const HERO_OVERLAY =
  'linear-gradient(200deg, rgba(18,16,32,0.4) 0%, rgba(18,16,32,0.8) 85%)';

export default function CardPhoto({
  photo,
  className = 'photo-bg relative h-40',
  sizes = '(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 94vw',
  overlay = DEFAULT_OVERLAY,
  imgClassName = '',
  priority = false,
  children,
}: {
  photo?: string;
  className?: string;
  /**
   * How wide this image is on screen, per breakpoint. Required reading for the
   * browser: with `fill` there is no intrinsic width, so a wrong `sizes` is
   * either a blurry card or a phone downloading a hero-sized file.
   */
  sizes?: string;
  /** null = no darkening layer (when the card draws a gradient of its own) */
  overlay?: string | null;
  imgClassName?: string;
  /**
   * For an above-the-fold hero only. It opts the image out of lazy loading and
   * preloads it, which is right for the LCP element and wasteful for anything
   * else on the page.
   */
  priority?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      {photo && (
        <>
          <CatalogImage src={photo} alt="" sizes={sizes} priority={priority} className={imgClassName} />
          {overlay && <div className="absolute inset-0" style={{ backgroundImage: overlay }} />}
        </>
      )}
      {children}
    </div>
  );
}
