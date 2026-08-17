/**
 * A skeleton shaped like the trip screen, for the first load of the cities.
 *
 * Until now this wait showed one small box with a "loading your trips"
 * message - a whole screen swapping to nothing, then jumping to the full
 * view. The skeleton draws the **structure** of what is about to appear - a
 * title row, a day-tabs strip, a map rectangle, stop rows - so the screen
 * "exists" from the first moment and the content merely fills into it.
 *
 * No fake text here and no invented data - only shapes. The shimmer
 * (skeleton-block) respects prefers-reduced-motion and freezes to a static
 * tint.
 */
export default function TripSkeleton() {
  return (
    <div aria-label="טוען את הטיול" role="status" className="space-y-4">
      {/* The title row: trip name + action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="skeleton-block h-8 w-56 rounded-xl" />
        <div className="flex gap-2">
          <div className="skeleton-block h-9 w-24 rounded-xl" />
          <div className="skeleton-block h-9 w-20 rounded-xl" />
          <div className="skeleton-block h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* The day-switcher strip: a city card with day numbers */}
      <div className="flex gap-2">
        <div className="skeleton-block h-16 w-40 rounded-2xl" />
        <div className="skeleton-block h-16 w-28 rounded-2xl" />
      </div>

      {/* The body: itinerary + map, in the same split as the real screen */}
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-2.5">
          <div className="skeleton-block h-6 w-32 rounded-lg" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-block h-14 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton-block h-72 rounded-2xl lg:h-96" />
      </div>
    </div>
  );
}
