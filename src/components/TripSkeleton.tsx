import { Skeleton, SkeletonScreen } from './Skeleton';

/**
 * A skeleton shaped like the trip screen, for the first load of the cities.
 *
 * Until now this wait showed one small box with a "loading your trips"
 * message - a whole screen swapping to nothing, then jumping to the full
 * view. The skeleton draws the **structure** of what is about to appear - a
 * title row, a day-tabs strip, a map rectangle, stop rows - so the screen
 * "exists" from the first moment and the content merely fills into it.
 *
 * No fake text here and no invented data - only shapes. The shapes come from
 * the shared primitives in Skeleton.tsx, which own the shimmer and the
 * prefers-reduced-motion fallback.
 */
export default function TripSkeleton() {
  return (
    <SkeletonScreen label="טוען את הטיול" className="space-y-4">
      {/* The title row: trip name + action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* The day-switcher strip: a city card with day numbers */}
      <div className="flex gap-2">
        <Skeleton className="h-16 w-40 rounded-2xl" />
        <Skeleton className="h-16 w-28 rounded-2xl" />
      </div>

      {/* The body: itinerary + map, in the same split as the real screen */}
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-2.5">
          <Skeleton className="h-6 w-32 rounded-lg" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl lg:h-96" />
      </div>
    </SkeletonScreen>
  );
}
