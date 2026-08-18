import { Skeleton, SkeletonScreen } from '@/components/Skeleton';

/**
 * The wait on /t/<code>, drawn as the page that is coming.
 *
 * This route is the one page here that really does wait on the network
 * before it can render anything: a short code is a row in Supabase, fetched
 * on the server, and until it answers Next has nothing to stream. It is also
 * the link people send on WhatsApp - so it is opened cold, by someone who
 * has never seen this site, often on a phone on mobile data. A blank screen
 * there reads as a broken link, which is exactly the moment we cannot afford
 * to look broken.
 *
 * The shape is the real one: header card, map, day cards with numbered stop
 * rows. A code that turns out to be invalid falls to the honest error page
 * instead - the skeleton is a promise about the common case, not a
 * guarantee, and that is the trade a route-level loading state always makes.
 */
export default function LoadingSharedTrip() {
  return (
    <SkeletonScreen label="טוען את הטיול המשותף">
      {/* Header card: kicker, trip name, the day/stop/city line, the save button */}
      <div className="rounded-3xl bg-shell p-6 ring-1 ring-night/10 sm:p-8">
        <Skeleton className="h-3 w-40 rounded-full" />
        <Skeleton className="mt-3 h-8 w-64 rounded-xl" />
        <Skeleton className="mt-3 h-4 w-full max-w-sm rounded-full" />
        <Skeleton className="mt-4 h-12 w-64 rounded-xl" />
      </div>

      {/* The map */}
      <Skeleton className="mt-5 h-[320px] rounded-2xl sm:h-[400px]" />

      {/* Two day cards - enough to say "a list of days follows", without
          claiming how many days this particular trip has */}
      <div className="mt-5 space-y-4">
        {[0, 1].map((d) => (
          <section key={d} className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="mt-2 h-3 w-56 max-w-full rounded-full" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((s) => (
                <div key={s} className="flex items-start gap-3">
                  <Skeleton className="mt-0.5 h-6 w-6 shrink-0 rounded-lg" />
                  <Skeleton className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-44 max-w-full rounded-full" />
                    <Skeleton className="h-3 w-full rounded-full" />
                    <Skeleton className="h-3 w-2/3 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* The closing night band - a real surface, so its shapes are the light ones */}
      <div className="mt-6 rounded-2xl bg-night px-6 py-5 text-center">
        <Skeleton invert className="mx-auto h-4 w-72 max-w-full rounded-full" />
        <Skeleton invert className="mx-auto mt-3 h-10 w-44 rounded-xl" />
      </div>
    </SkeletonScreen>
  );
}
