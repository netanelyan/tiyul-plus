import { Skeleton, SkeletonScreen } from '@/components/Skeleton';

/**
 * The personal area while the profile row is on its way.
 *
 * The wait here is a real network one - the session is verified against
 * GoTrue and then the profile row is read - and what comes back is a
 * two-column screen of cards, so a single centred spinner made the whole page
 * appear to arrive in one jump.
 *
 * Used only when the visitor is already known to be signed in. Before the
 * session resolves, the answer could still be the "sign in" invitation
 * instead, and this shape would be a promise of the wrong screen.
 */
function Card({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:p-6 ${className}`}>
      <Skeleton className="h-5 w-40 rounded-lg" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded-full" />
        ))}
      </div>
    </div>
  );
}

export default function AccountSkeleton() {
  return (
    <SkeletonScreen label="טוען את האזור האישי">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Profile: the banner, the avatar over it, then name and phone */}
          <div className="overflow-hidden rounded-3xl bg-shell ring-1 ring-night/10">
            <Skeleton className="h-24 w-full rounded-none" />
            <div className="p-5 sm:p-6">
              <Skeleton className="-mt-12 h-20 w-20 rounded-2xl" />
              <Skeleton className="mt-4 h-11 w-full rounded-xl" />
              <Skeleton className="mt-3 h-11 w-full rounded-xl" />
            </div>
          </div>
          <Card lines={3} />
        </div>

        <div className="space-y-6">
          {/* The passport: counter, progress bar, and the country chips */}
          <div className="rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:p-6">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="mt-4 h-10 w-28 rounded-xl" />
            <Skeleton className="mt-3 h-3 w-full rounded-full" />
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-full" />
              ))}
            </div>
          </div>
          <Card lines={2} />
          <Card lines={3} />
        </div>
      </div>
    </SkeletonScreen>
  );
}
