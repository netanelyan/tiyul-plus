/**
 * Conversation history per trip (localStorage, keyed by trip id) - so that switching
 * between tabs in the navigation (SiteNav) restores both the conversation and the trip
 * data. A thin layer like storage.ts - when there is a backend, only this file changes.
 */

import type { BookingSearchCard } from '@/lib/bookingSearch';

export interface StoredChatMessage {
  role: 'user' | 'assistant';
  content: string;
  destinationSlug?: string;
  placeIds?: string[];
  actions?: string[];
  quickReplies?: string[];
  /**
   * Search cards the agent opened in this message. Stored so they are still there
   * after a refresh - a traveller who closed the tab and reopened it expects to find
   * the link, not to start the conversation over. The card is data built on the
   * server, with no model text.
   */
  searches?: BookingSearchCard[];
  /** An image attached to the message (a downscaled data URL) - see imageAttach.ts */
  image?: string;
}

const PREFIX = 'tiyul-plus:chat:';

/**
 * How many of the most recent messages keep the image attached to them. An image is
 * hundreds of KB and localStorage has a few MB in total, so a long history with images
 * would blow the storage and lose the whole conversation. Older messages are stored
 * without the image - the text stays, only the preview disappears after a refresh.
 */
const KEEP_IMAGES_IN_LAST = 4;

export function loadChat(tripId: string): StoredChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + tripId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredChatMessage[]) : [];
  } catch {
    return [];
  }
}

/**
 * Deletes one trip's conversation, leaving the trip itself.
 *
 * Created from a traveller's report: the "this conversation is too long" message
 * suggested refreshing the page, and they replied "when I refresh, the chat stays".
 * They were right - `loadChat` restores from localStorage on every load, and `reset()`
 * in useTripChat cleared only the in-memory state (and nothing called it either). So
 * there was no way at all to clear a conversation, and the advice given on exceeding
 * the context window simply did not work.
 */
export function clearChat(tripId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PREFIX + tripId);
  } catch {
    // Storage blocked - the in-memory conversation has been cleared anyway
  }
}

export function saveChat(tripId: string, messages: StoredChatMessage[]): void {
  if (typeof window === 'undefined') return;
  const cutoff = messages.length - KEEP_IMAGES_IN_LAST;
  const trimmed = messages.map((m, i) =>
    m.image && i < cutoff ? { ...m, image: undefined } : m,
  );
  try {
    window.localStorage.setItem(PREFIX + tripId, JSON.stringify(trimmed));
  } catch {
    // Storage full or blocked - ignore silently, the conversation stays in memory only
  }
}
