import { Skeleton, SkeletonScreen } from '@/components/Skeleton';

/**
 * A traveller profile on its way: the banner card with the avatar over it,
 * the name and tier line, and the countries passport underneath.
 *
 * This one is reached almost entirely from the community search, which lists
 * only public profiles - so the profile really is what is coming. The
 * exception (a profile that turned private between the search and the click)
 * falls to the honest "private or does not exist" screen.
 */
export default function TravelerSkeleton() {
  return (
    <SkeletonScreen label="טוען פרופיל מטייל" className="mx-auto max-w-2xl">
      <section className="overflow-hidden rounded-3xl bg-shell ring-1 ring-night/10">
        <div className="h-24 bg-night" />
        <div className="px-6 pb-6">
          <Skeleton className="-mt-10 h-20 w-20 rounded-2xl" />
          <Skeleton className="mt-4 h-6 w-44 rounded-lg" />
          <Skeleton className="mt-2 h-3 w-56 max-w-full rounded-full" />
        </div>
      </section>

      <section className="mt-5 rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:p-6">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </section>
    </SkeletonScreen>
  );
}
