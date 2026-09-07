/**
 * Assembles the promoted destinations once, for the hub pages and for the
 * back-links on each destination guide.
 *
 * **Server-only by import**: it pulls the whole catalog and
 * `buildDestinationCards`, so importing it from a `'use client'` component would
 * ship ~2MB of data to the browser. That is the exact regression the session log
 * records for `label.ts` and `destinationCards.ts`, and the reason the card
 * builder was split out in the first place. Every consumer here is a server
 * component.
 */
import { destinations } from '@/data/destinations';
import { buildDestinationCards } from '@/lib/destinationCards';
import { isSeoDestination } from './selection';
import type { HubMember } from './hubs';

let cached: HubMember[] | null = null;

/**
 * The promoted 30 as `{ card, dest }` pairs.
 *
 * Cached at module level like `buildDestinationCards` itself - this runs once
 * per build for 30-odd static pages, and re-walking 166 destinations per page
 * would be pure waste.
 */
export function promotedMembers(): HubMember[] {
  if (cached) return cached;
  const bySlug = new Map(destinations.map((d) => [d.slug, d]));
  cached = buildDestinationCards()
    .filter((c) => isSeoDestination(c.slug))
    .map((card) => ({ card, dest: bySlug.get(card.slug)! }))
    .filter((m) => Boolean(m.dest));
  return cached;
}
