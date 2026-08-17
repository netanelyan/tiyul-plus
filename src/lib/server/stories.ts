/**
 * The trip story - the server side. **Creating is premium, viewing is free.**
 *
 * ## Three principles
 *
 * 1. **The snapshot is built on the server from the real trip**, not from the request
 *    body: the trip is read with `findOwnTrip` (the primitive every money-touching
 *    route uses - filtered on user_id) and the place names come from the catalog. A
 *    client cannot publish a "story" containing content that was not in their trip.
 * 2. **A public page reads only a snapshot.** Editing the trip after publishing does
 *    not change the story, and deleting the trip does not break it.
 * 3. **Photos go through the server** after shape validation - the same strict
 *    data-URL check as the chat images - and are stored in storage with the service
 *    role. There is no public write policy on the bucket at all.
 */

import { destinations } from '@/data/destinations';
import type { Place, PlaceCategory } from '@/lib/types';
import { findOwnTrip } from '@/lib/server/userTrips';
import { adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';

export const MAX_STORY_PHOTOS = 40;
export const MAX_PHOTO_DATAURL = 1_800_000; // ~1.3MB in practice after base64

export interface StoryStop {
  /** The catalog id - needed for votes on a group trip; public information anyway */
  id: string;
  name: string;
  lat: number;
  lng: number;
  mustSee?: boolean;
}
export interface StoryDay {
  dayNumber: number;
  cityName: string;
  stops: StoryStop[];
}
export interface StorySnapshot {
  name: string;
  startDate?: string;
  endDate?: string;
  days: StoryDay[];
}
export interface StoryPhoto {
  path: string;
  caption?: string;
}
export interface StoryRow {
  slug: string;
  user_id: string;
  trip_id: string;
  title: string;
  trip_data: StorySnapshot;
  photos: StoryPhoto[];
  published: boolean;
  created_at: string;
}

/** A public slug: short, random, with no ambiguous characters - like the share codes */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function newStorySlug(): string {
  let s = 'st';
  for (let i = 0; i < 9; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** Building the snapshot from the server-stored trip + the catalog. Unrecognised places are skipped. */
export function buildSnapshot(trip: {
  name: string;
  startDate?: string;
  endDate?: string;
  days: { citySlug: string; placeIds: string[] }[];
}): StorySnapshot {
  const days: StoryDay[] = trip.days.map((d, i) => {
    const dest = destinations.find((x) => x.slug === d.citySlug);
    const stops: StoryStop[] = d.placeIds
      .map((pid) => dest?.places.find((p) => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, ...(p.mustSee ? { mustSee: true } : {}) }));
    return { dayNumber: i + 1, cityName: dest?.name ?? d.citySlug, stops };
  });
  return {
    name: String(trip.name).slice(0, 80),
    ...(trip.startDate ? { startDate: trip.startDate } : {}),
    ...(trip.endDate ? { endDate: trip.endDate } : {}),
    days,
  };
}

/* ---------- Catalog content for the public page ---------- */

/**
 * A stop plus the catalog content the public story page displays.
 *
 * **Why this is resolved at render time and not stored in the snapshot.** The
 * snapshot exists so that editing or deleting the traveller's TRIP cannot change
 * or break a published story - see principle 2 at the top of this file. A photo
 * and a description are not trip data: they are our own curated catalog content,
 * which is static per deploy and identical for everyone. Resolving them by `id`
 * (already stored on every stop) means stories published before this feature get
 * their photos immediately, with nobody having to press "refresh", and a photo URL
 * we later repair propagates to every story instead of staying dead in dozens of
 * frozen snapshots.
 *
 * **The name is never re-resolved.** It stays exactly as the snapshot recorded it,
 * so a place renamed in the catalog does not silently rewrite somebody's published
 * story. Only the illustrative fields are enriched.
 *
 * A stop whose place is no longer in the catalog keeps its name and coordinates and
 * simply has no photo - the same graceful state as a place that never had one.
 */
export interface EnrichedStop extends StoryStop {
  category: PlaceCategory;
  description?: string;
  photo?: string;
}
export interface EnrichedStoryDay extends Omit<StoryDay, 'stops'> {
  stops: EnrichedStop[];
}
export interface EnrichedSnapshot extends Omit<StorySnapshot, 'days'> {
  days: EnrichedStoryDay[];
}

/** Every catalog place by id, built once per process - the data is static. */
let placeById: Map<string, Place> | null = null;
function catalogPlace(id: string): Place | undefined {
  if (!placeById) {
    placeById = new Map();
    for (const d of destinations) for (const p of d.places) placeById.set(p.id, p);
  }
  return placeById.get(id);
}

export function enrichSnapshot(snapshot: StorySnapshot): EnrichedSnapshot {
  return {
    ...snapshot,
    days: snapshot.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => {
        const p = s.id ? catalogPlace(s.id) : undefined;
        return {
          ...s,
          // 'attraction' is the neutral default already used for the story map pins
          category: p?.category ?? 'attraction',
          ...(p?.description ? { description: p.description } : {}),
          ...(p?.photo ? { photo: p.photo } : {}),
        };
      }),
    })),
  };
}

export async function findStory(userId: string, tripId: string): Promise<StoryRow | null> {
  const rows = await adminSelect<StoryRow>(
    'trip_stories',
    pgQuery(eq('user_id', userId), eq('trip_id', tripId), pgSelect(['slug', 'user_id', 'trip_id', 'title', 'trip_data', 'photos', 'published', 'created_at'])),
  );
  return rows?.[0] ?? null;
}

/**
 * Creating or refreshing the story for a trip. The snapshot is rebuilt from the
 * stored trip on every call - "refresh the story" after editing the trip is exactly
 * the same operation.
 */
export async function upsertStory(userId: string, tripId: string, title?: string): Promise<StoryRow | null> {
  const trip = await findOwnTrip(userId, tripId);
  if (!trip) return null;
  const snapshot = buildSnapshot(trip);
  if (snapshot.days.every((d) => d.stops.length === 0)) return null; // a story with no stops at all is not a story

  const existing = await findStory(userId, tripId);
  const cleanTitle = (title ?? existing?.title ?? snapshot.name).trim().slice(0, 80) || snapshot.name;
  const now = new Date().toISOString();

  if (existing) {
    const rows = await adminUpdate<StoryRow>(
      'trip_stories',
      pgQuery(eq('user_id', userId), eq('trip_id', tripId)),
      { title: cleanTitle, trip_data: snapshot, updated_at: now },
    );
    return rows?.[0] ?? null;
  }
  const rows = await adminInsert<StoryRow>('trip_stories', {
    slug: newStorySlug(),
    user_id: userId,
    trip_id: tripId,
    title: cleanTitle,
    trip_data: snapshot,
    photos: [],
    published: false,
    created_at: now,
    updated_at: now,
  });
  return rows?.[0] ?? null;
}

export async function setPublished(userId: string, tripId: string, published: boolean): Promise<boolean> {
  const rows = await adminUpdate<{ slug: string }>(
    'trip_stories',
    pgQuery(eq('user_id', userId), eq('trip_id', tripId)),
    { published, updated_at: new Date().toISOString() },
  );
  return Boolean(rows && rows.length > 0);
}

/** The same strict validation as the chat images - data URL shape only, not free content */
const DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

export function parsePhotoDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  if (dataUrl.length > MAX_PHOTO_DATAURL || !DATA_URL_RE.test(dataUrl)) return null;
  const comma = dataUrl.indexOf(',');
  const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
  try {
    return { mime, bytes: Buffer.from(dataUrl.slice(comma + 1), 'base64') };
  } catch {
    return null;
  }
}

/** Uploading a photo to the bucket + adding it to the story's photo list */
export async function addStoryPhoto(
  userId: string,
  tripId: string,
  dataUrl: string,
  caption?: string,
): Promise<StoryRow | null> {
  const story = await findStory(userId, tripId);
  if (!story) return null;
  if (story.photos.length >= MAX_STORY_PHOTOS) return null;
  const parsed = parsePhotoDataUrl(dataUrl);
  if (!parsed) return null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const ext = parsed.mime === 'image/png' ? 'png' : parsed.mime === 'image/webp' ? 'webp' : 'jpg';
  const path = `${story.slug}/${Date.now().toString(36)}-${story.photos.length}.${ext}`;
  try {
    const res = await fetch(`${url}/storage/v1/object/story-photos/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': parsed.mime },
      body: new Uint8Array(parsed.bytes),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.warn('[stories] photo upload failed', res.status);
      return null;
    }
  } catch {
    return null;
  }

  const photos: StoryPhoto[] = [
    ...story.photos,
    { path, ...(caption?.trim() ? { caption: caption.trim().slice(0, 140) } : {}) },
  ];
  const rows = await adminUpdate<StoryRow>(
    'trip_stories',
    pgQuery(eq('user_id', userId), eq('trip_id', tripId)),
    { photos, updated_at: new Date().toISOString() },
  );
  return rows?.[0] ?? null;
}

/** A public URL for a photo in the bucket (the bucket is public for reads) */
export function storyPhotoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''}/storage/v1/object/public/story-photos/${path}`;
}
