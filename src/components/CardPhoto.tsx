import { thumbSrcSet } from '@/lib/photo';

/**
 * The background photo of a destination/city card - as an `<img>` and not as a `background-image`.
 *
 * **This is not a cosmetic refactor.** A `background-image` is not lazily loaded at all, so the
 * `/countries` page sent 166 image requests the moment it opened, before the user had scrolled a
 * single pixel - roughly 8-14 MB on a phone. `loading="lazy"` on an `<img>` brings that down to
 * the few cards visible on screen, and `srcSet` lets an ordinary screen download 250/330 instead
 * of 500.
 *
 * The dark gradient stays a separate layer above the image, with exactly the same values as
 * before, so the card looks identical. When there is no photo, `photo-bg` alone draws the brand
 * gradient, exactly as before.
 */
/** The default is exactly the gradient that was on the destination cards */
const DEFAULT_OVERLAY = 'linear-gradient(180deg, rgba(15,14,26,0) 40%, rgba(15,14,26,0.72) 100%)';

export default function CardPhoto({
  photo,
  className = 'photo-bg relative h-40',
  sizes = '(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 94vw',
  overlay = DEFAULT_OVERLAY,
  imgClassName = '',
  children,
}: {
  photo?: string;
  className?: string;
  sizes?: string;
  /** null = no darkening layer (when the card draws a gradient of its own) */
  overlay?: string | null;
  imgClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            srcSet={thumbSrcSet(photo)}
            sizes={sizes}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
          />
          {overlay && <div className="absolute inset-0" style={{ backgroundImage: overlay }} />}
        </>
      )}
      {children}
    </div>
  );
}
