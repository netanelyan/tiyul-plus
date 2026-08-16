import { NextResponse } from 'next/server';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import {
  addStoryPhoto,
  findStory,
  setPublished,
  storyPhotoUrl,
  upsertStory,
} from '@/lib/server/stories';

/**
 * סיפור הטיול - יצירה, תמונות ופרסום. **פרימיום בלבד ליצירה**; הצפייה
 * הציבורית היא ב-/story/[slug] וחופשית לכולם.
 *
 * `caller.plan` מגיע מ-resolveCaller (טוקן מאומת → דאטהבייס), לעולם לא
 * מגוף הבקשה - אותו כלל כמו בבדיקה לפני הנסיעה.
 */

function storyView(s: NonNullable<Awaited<ReturnType<typeof findStory>>>) {
  return {
    slug: s.slug,
    title: s.title,
    published: s.published,
    photoCount: s.photos.length,
    photos: s.photos.map((p) => ({ url: storyPhotoUrl(p.path), caption: p.caption ?? null })),
    days: s.trip_data.days.length,
    stops: s.trip_data.days.reduce((n, d) => n + d.stops.length, 0),
  };
}

export async function GET(request: Request) {
  const caller = await resolveCaller(request);
  if (!caller.userId) return NextResponse.json({ story: null, error: 'auth-required' }, { status: 401 });
  const tripId = new URL(request.url).searchParams.get('tripId')?.slice(0, 100) ?? '';
  if (!tripId) return NextResponse.json({ story: null, error: 'bad-request' }, { status: 400 });
  const story = await findStory(caller.userId, tripId);
  return NextResponse.json({ story: story ? storyView(story) : null });
}

export async function POST(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('story-write', caller.id, 30, 10 * 60_000);
  if (!burst.ok) return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  if (!caller.userId) return NextResponse.json({ error: 'auth-required' }, { status: 401 });
  if (caller.plan !== 'premium') {
    // יצירת סיפור היא פיצ׳ר מנוי - נאמר במפורש, לא 404 עמום
    return NextResponse.json({ error: 'premium-required' }, { status: 403 });
  }

  let body: {
    tripId?: unknown;
    action?: unknown;
    title?: unknown;
    photo?: unknown;
    caption?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  const tripId = typeof body.tripId === 'string' ? body.tripId.trim().slice(0, 100) : '';
  if (!tripId) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'create') {
    const title = typeof body.title === 'string' ? body.title : undefined;
    const story = await upsertStory(caller.userId, tripId, title);
    if (!story) return NextResponse.json({ error: 'trip-not-found-or-empty' }, { status: 404 });
    return NextResponse.json({ story: storyView(story) });
  }

  if (action === 'photo') {
    if (typeof body.photo !== 'string') return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    const caption = typeof body.caption === 'string' ? body.caption : undefined;
    const story = await addStoryPhoto(caller.userId, tripId, body.photo, caption);
    if (!story) return NextResponse.json({ error: 'photo-rejected' }, { status: 400 });
    return NextResponse.json({ story: storyView(story) });
  }

  if (action === 'publish' || action === 'unpublish') {
    const done = await setPublished(caller.userId, tripId, action === 'publish');
    if (!done) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    const story = await findStory(caller.userId, tripId);
    return NextResponse.json({ story: story ? storyView(story) : null });
  }

  return NextResponse.json({ error: 'bad-action' }, { status: 400 });
}
