import { Skeleton, SkeletonScreen } from '@/components/Skeleton';

/**
 * The wait a friend sees on /join/<code>, in the shape of the screen that is
 * coming: the dark invitation header, the "are you coming / which dates"
 * card, the suggest box, and day cards with stops and their vote buttons.
 *
 * This wait is a real one - it is two sequential requests (join, then read
 * the trip), each of which goes to Supabase - and it is opened by someone who
 * has just tapped a link from a friend and has never seen this site.
 *
 * It is deliberately shown only once we know the visitor is signed in. Before
 * that the screen could still turn out to be "you have been invited, please
 * sign in", and drawing a trip that then does not appear would be a promise
 * broken half a second later.
 */
export default function JoinSkeleton() {
  return (
    <SkeletonScreen label="טוען את הטיול המשותף" className="mx-auto max-w-2xl pb-16">
      {/* The night header - light shapes, since the surface itself is dark */}
      <div className="rounded-3xl bg-night px-6 py-8 text-center">
        <Skeleton invert className="mx-auto h-3 w-40 rounded-full" />
        <Skeleton invert className="mx-auto mt-3 h-8 w-56 max-w-full rounded-xl" />
        <Skeleton invert className="mx-auto mt-3 h-3 w-72 max-w-full rounded-full" />
      </div>

      {/* Who is coming / which days work */}
      <div className="mt-5 space-y-3 rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        <Skeleton className="h-3 w-24 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
      </div>

      {/* Proposing a place */}
      <div className="mt-4 rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="mt-3 h-11 w-full rounded-lg" />
      </div>

      {/* Two day cards with their stops - the vote buttons included, because
          they are the thing this screen is for */}
      <div className="mt-5 space-y-4">
        {[0, 1].map((d) => (
          <section key={d} className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <Skeleton className="h-4 w-44 rounded-full" />
            <div className="mt-4 space-y-4">
              {[0, 1].map((s) => (
                <div key={s} className="flex items-start gap-3">
                  <Skeleton className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-40 max-w-full rounded-full" />
                    <Skeleton className="mt-2 h-3 w-full rounded-full" />
                    <Skeleton className="mt-1.5 h-3 w-2/3 rounded-full" />
                    <div className="mt-2 flex gap-2">
                      <Skeleton className="h-11 w-16 rounded-full" />
                      <Skeleton className="h-11 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </SkeletonScreen>
  );
}
