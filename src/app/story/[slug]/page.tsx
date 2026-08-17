import type { Metadata } from 'next';
import { cache } from 'react';
import { adminRpc } from '@/lib/server/supabaseAdmin';
import { enrichSnapshot, storyPhotoUrl, type StoryPhoto, type StorySnapshot } from '@/lib/server/stories';
import StoryView from './StoryView';

/**
 * /story/<slug> - the public trip-story page. Free viewing for anyone who
 * got a link (that is the growth engine); creation is premium, on the trip
 * screen.
 *
 * Reads a **snapshot only** through get_trip_story - a security definer
 * function that returns only published stories and only the display fields.
 * There is no access here to the live trip or the owner's identity.
 */

interface StoryPublic {
  title: string;
  trip_data: StorySnapshot;
  photos: StoryPhoto[];
  created_at: string;
}

const loadStory = cache(async (slug: string): Promise<StoryPublic | null> => {
  if (!/^st[a-z2-9]{6,12}$/.test(slug)) return null;
  const rows = await adminRpc<StoryPublic[]>('get_trip_story', { p_slug: slug });
  return rows?.[0] ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await loadStory(slug);
  if (!story) return { title: 'סיפור לא נמצא | טיול+' };
  const stops = story.trip_data.days.reduce((n, d) => n + d.stops.length, 0);
  return {
    title: `${story.title} | טיול+`,
    description: `סיפור טיול אמיתי: ${story.trip_data.days.length} ימים, ${stops} עצירות. תוכנן עם טיול+`,
    openGraph: {
      title: story.title,
      description: `סיפור טיול: ${story.trip_data.days.length} ימים · ${stops} עצירות`,
      type: 'article',
    },
    robots: { index: false, follow: true },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await loadStory(slug);

  if (!story) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="display text-3xl text-night">הסיפור לא נמצא</h1>
        <p className="mt-3 text-night/60">
          ייתכן שהקישור שגוי או שהסיפור עדיין לא פורסם.
        </p>
      </div>
    );
  }

  return (
    // The catalog photos and descriptions are attached HERE, on the server:
    // StoryView is a client component, and importing the catalog into it would
    // ship ~2MB to every viewer of a public story.
    <StoryView
      title={story.title}
      snapshot={enrichSnapshot(story.trip_data)}
      photos={story.photos.map((p) => ({ url: storyPhotoUrl(p.path), caption: p.caption ?? null }))}
    />
  );
}
