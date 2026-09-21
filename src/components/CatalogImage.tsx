import Image from 'next/image';
import { mirrorEnabled, photoSrc, thumbShrinkSrcSet } from '@/lib/photoMirror';

/**
 * A catalog photograph, filling its (positioned) parent.
 *
 * Every catalog photo on the site renders through here, so there is one answer
 * to "where does this image come from" instead of six.
 *
 * ## Why this branches instead of always using `next/image`
 *
 * `next/image` is the right thing **once the photographs are in our own store**,
 * and the wrong thing while they are still on Commons - which was measured
 * rather than reasoned about, and it is the single most important thing in this
 * file.
 *
 * Today every browser fetches Commons thumbnails directly, so a thousand
 * visitors are a thousand different client addresses. Routing them through
 * `next/image` funnels every one of those fetches through **our server's** IP,
 * and Wikimedia rate-limits that: rendering five destination pages through the
 * optimiser against Commons produced `429` on most of the ~150 distinct files,
 * while the same URLs fetched a few at a time all returned `200`. In production
 * that is a cold region rendering a page and getting a screen of broken
 * pictures - worse than the blurriness it was meant to fix.
 *
 * So: mirror configured -> `next/image`, resized per device from the 1280px copy
 * in our Blob store, which we may fetch as hard as we like. Mirror not
 * configured -> exactly what the site does today, a lazily-loaded element
 * pointing at Commons. One env var moves the whole site between the two, and
 * `mirrorEnabled()` is a build-time constant, so the branch costs nothing at
 * runtime and only one side is ever in the bundle.
 *
 * The fallback's `srcSet` only ever offers widths **narrower** than the URL
 * already names. Widening is what killed 170 catalog URLs in an earlier session
 * - Commons serves no thumbnail wider than its source - and the mirror is how
 * the wide variants come back, safely, because we will have stored them.
 */
export default function CatalogImage({
  src,
  alt,
  sizes,
  className = '',
  priority = false,
  onError,
}: {
  src: string;
  /** Empty when an adjacent heading already names the place - see GuideThumb. */
  alt: string;
  /** How wide this image is on screen. Required: `fill` has no intrinsic size. */
  sizes: string;
  className?: string;
  /** Above-the-fold heroes only. Preloads instead of lazy-loading. */
  priority?: boolean;
  onError?: () => void;
}) {
  const resolved = photoSrc(src);

  if (mirrorEnabled()) {
    return (
      <Image
        src={resolved}
        alt={alt}
        {...(alt === '' ? { 'aria-hidden': true } : {})}
        fill
        sizes={sizes}
        priority={priority}
        onError={onError}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      srcSet={thumbShrinkSrcSet(resolved)}
      sizes={sizes}
      alt={alt}
      {...(alt === '' ? { 'aria-hidden': true } : {})}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onError={onError}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
    />
  );
}
