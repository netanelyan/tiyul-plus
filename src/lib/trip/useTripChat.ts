'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clientIdHeader } from '@/lib/clientId';
import type { Trip } from './types';
import type { Destination } from '@/lib/types';
import { useTrip } from './TripContext';
import { clearChat, loadChat, saveChat, type StoredChatMessage } from './chatStorage';
import { loadExplored, saveExplored } from '@/lib/explore/storage';
import { authHeader } from '@/lib/auth/client';
import type { BookingSearchCard } from '@/lib/bookingSearch';

/**
 * The conversation state with the agent - extracted out of AgentWorkspace so the
 * unified view (TripWorkspace) can hold one conversation and render it in two
 * places: the side panel on desktop and the chat drawer on mobile. Same state,
 * same trip, no copies: every {trip} event from the server goes into upsertTrip
 * of the same Trip object.
 *
 * History save/load is per-trip-id (chatStorage), so switching between trip tabs
 * also restores the conversation.
 */

export type ChatMessage = StoredChatMessage;

/**
 * A non-ok HTTP response - the status is kept so the message to the user is
 * accurate. Exported because `useFreeChat` (the free-conversation page, no trip)
 * repeats the same streaming loop and wants the same failure message - instead
 * of duplicating it.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterSec: number,
  ) {
    super(`http ${status}`);
    this.name = 'HttpError';
  }
}

/**
 * A failure message based on the real cause.
 *
 * A generic "oops, something went wrong" on a rate limit is not just inaccurate -
 * it is harmful: the traveler reads it as "worth retrying immediately", which is
 * exactly what extends the block.
 */
export function failureMessage(err: unknown): string {
  const status = err instanceof HttpError ? err.status : 0;
  if (status === 429) {
    const wait = err instanceof HttpError && err.retryAfterSec > 0 ? err.retryAfterSec : 60;
    return `שלחתי יותר מדי בקשות בזמן קצר 🙏 חכו בבקשה ${wait} שניות ונסו שוב - הטיול שלכם שמור.`;
  }
  if (status === 413) {
    return 'ההודעה כבדה מדי בשבילי 😅 נסו בלי התמונה, או עם תמונה קטנה יותר.';
  }
  if (status >= 500) {
    return 'השרת שלי לא זמין כרגע 🙏 הטיול שלכם שמור - נסו לשלוח את ההודעה שוב בעוד רגע.';
  }
  if (status >= 400) {
    return 'משהו בבקשה לא היה תקין 🙏 נסו לנסח מחדש, או לרענן את הדף אם זה חוזר.';
  }
  // Network/stream error - no status
  return 'נראה שהחיבור נקטע 🙏 הטיול שלכם שמור - בדקו את החיבור ונסו שוב.';
}

export interface TripChat {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  /** Text is still streaming from the server (after the first word, before the stream closes) - so a message that stopped mid-way reads as stuck rather than finished */
  streaming: boolean;
  /** What the agent is doing right now (arrives as a status event from the server) */
  status: string | null;
  /** Counter of trip updates that arrived from the agent - to mark "the plan was updated" in the UI */
  tripUpdates: number;
  /** Auto-explored destinations (AI Explorer) - for rendering cities not in the catalog */
  explored: Destination[];
  /** Adding an explored destination from outside (map import from My Maps) - saved and rendered immediately */
  addExplored: (dest: Destination) => void;
  /** Send. image is a downscaled data URL (imageAttach.ts) - optional */
  send: (text: string, kosher?: boolean, image?: string) => void;
  /** Clear the local conversation (start a new trip) */
  reset: () => void;
  /** Clear the current trip's conversation (including storage) - the trip stays */
  clearConversation: () => void;
}

export function useTripChat(options?: {
  /** Text sent once on mount (arriving from the homepage with ?q=) */
  initialQuery?: string;
  /** The kosher toggle chosen before the first send */
  initialKosher?: boolean;
}): TripChat {
  const trip = useTrip();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [tripUpdates, setTripUpdates] = useState(0);
  // Explored destinations - loaded after mount (localStorage does not exist in SSR)
  const [explored, setExplored] = useState<Destination[]>([]);
  useEffect(() => {
    setExplored(loadExplored());
  }, []);
  const exploredRef = useRef(explored);
  exploredRef.current = explored;
  // The kosher toggle from the UI: rides to the server silently until it is absorbed into Trip.preferences
  const [kosherHint, setKosherHint] = useState(Boolean(options?.initialKosher));

  // Tracking the active trip for conversation save/load purposes:
  // initializedRef - a one-time anchor after hydration, before reacting to changes.
  // lastSyncedIdRef - the trip the local conversation is currently synced to.
  // selfUpsertRef - "the next currentId change originates from a trip this very
  //   conversation just created/updated" - so we don't overwrite the local
  //   messages with a load.
  // suppressSaveRef - skips one save right after a load, so old text is not
  //   re-saved over the new.
  const initializedRef = useRef(false);
  const lastSyncedIdRef = useRef<string | null>(null);
  const selfUpsertRef = useRef<string | null>(null);
  const suppressSaveRef = useRef(false);
  const sentInitialRef = useRef(false);
  // The up-to-date trip and conversation - so send does not rely on a stale closure
  const tripRef = useRef(trip);
  tripRef.current = trip;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const send = useCallback(async (text: string, kosherArg?: boolean, image?: string) => {
    const trimmed = text.trim();
    // An image alone is a legitimate request ("here is the booking confirmation") - so no text is allowed
    if ((!trimmed && !image) || loading) return;
    const kosher = kosherArg ?? kosherHint;
    if (kosherArg) setKosherHint(true);

    const next: ChatMessage[] = [
      ...messagesRef.current,
      { role: 'user', content: trimmed, ...(image ? { image } : {}) },
    ];
    setMessages(next);
    setInput('');
    setLoading(true);
    setStatus(null);
    let appended = false;
    const patchLast = (patch: (msg: ChatMessage) => ChatMessage) =>
      setMessages((m) => [...m.slice(0, -1), patch(m[m.length - 1])]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        // Signed-in users get quotas by account/plan instead of by IP
        headers: {
          'Content-Type': 'application/json',
          // Browser identifier - so the anonymous quota is not counted by a
          // shared mobile-carrier IP. See lib/clientId.ts.
          ...clientIdHeader(),
          ...(await authHeader()),
        },
        body: JSON.stringify({
          // Images are sent only on the last two messages: they are expensive for
          // the model and the whole history is resent every turn, so without a
          // limit every image would be paid for over and over. The server
          // enforces the same rule itself.
          messages: next.map(({ role, content, image }, i) => ({
            role,
            content,
            ...(image && i >= next.length - 2 ? { image } : {}),
          })),
          trip: tripRef.current.currentTrip,
          kosher: kosher || undefined, // the UI hint - the server absorbs it into the trip
          // Previously explored destinations - so the agent validates existing trips against them
          explored: exploredRef.current.length > 0 ? exploredRef.current : undefined,
        }),
      });
      // The status code must reach the user-facing message. Until now every non-ok
      // response was thrown as 'bad response' and caught in an empty catch, so
      // **a rate limit (429) looked to the traveler exactly like a crash** - the
      // generic "oops, something went wrong" - and they tapped again, which only
      // worsened the limit. On the free plan the burst is 6 requests a minute, so
      // this is a path that actually happens.
      if (!res.ok || !res.body) {
        throw new HttpError(res.status, Number(res.headers.get('Retry-After')) || 0);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          let event: {
            type: string;
            text?: string;
            destinationSlug?: string;
            placeIds?: string[];
            trip?: Trip;
            actions?: string[];
            replies?: string[];
            destination?: Destination;
            search?: BookingSearchCard;
          };
          try {
            event = JSON.parse(line.slice(5));
          } catch {
            continue;
          }
          if (event.type === 'status' && event.text) {
            setStatus(event.text);
          } else if (event.type === 'text' && event.text) {
            const chunk = event.text;
            if (!appended) {
              appended = true;
              setLoading(false);
              setStreaming(true);
              setMessages((m) => [...m, { role: 'assistant', content: chunk }]);
            } else {
              patchLast((msg) => ({ ...msg, content: msg.content + chunk }));
            }
          } else if (event.type === 'meta' && appended) {
            patchLast((msg) => ({
              ...msg,
              destinationSlug: event.destinationSlug,
              placeIds: event.placeIds,
            }));
          } else if (event.type === 'trip' && event.trip) {
            // The trip was created/updated from within this conversation - when
            // currentId changes as a result, do not reload from storage (that
            // would overwrite the up-to-date messages).
            selfUpsertRef.current = event.trip.id;
            tripRef.current.upsertTrip(event.trip);
            setTripUpdates((n) => n + 1);
            // The preference was absorbed into the trip - the hint is no longer needed (the UI toggle wins)
            if (event.trip.preferences?.kosher) setKosherHint(false);
            if (appended && event.actions && event.actions.length > 0) {
              const actions = event.actions;
              patchLast((msg) => ({ ...msg, actions }));
            }
          } else if (event.type === 'explored' && event.destination) {
            // A new destination was explored - saved locally and immediately available for canvas rendering
            setExplored(saveExplored(event.destination));
          } else if (event.type === 'search' && event.search) {
            /**
             * The card can arrive **before** a single word of text has streamed
             * (the tool runs in the first iteration, the prose is written after
             * it), so we cannot rely on `appended` the way quickReplies does:
             * without this check the card would land on the user's message or
             * disappear.
             */
            const search = event.search;
            if (appended) {
              patchLast((msg) => ({ ...msg, searches: [...(msg.searches ?? []), search] }));
            } else {
              appended = true;
              setLoading(false);
              setStreaming(true);
              setMessages((m) => [...m, { role: 'assistant', content: '', searches: [search] }]);
            }
          } else if (event.type === 'quickReplies' && appended && event.replies?.length) {
            const quickReplies = event.replies;
            patchLast((msg) => ({ ...msg, quickReplies }));
          }
        }
      }
      if (!appended) throw new Error('empty stream');
    } catch (err) {
      // Without this log there is no way to know what failed for a real user
      console.error('[chat] request failed', err);
      if (!appended) {
        setMessages((m) => [...m, { role: 'assistant', content: failureMessage(err) }]);
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      setStatus(null);
    }
  }, [kosherHint, loading]);

  // Automatic first send (arriving from the homepage with ?q=) - once only
  useEffect(() => {
    const q = options?.initialQuery?.trim();
    if (!q || sentInitialRef.current) return;
    sentInitialRef.current = true;
    send(q, options?.initialKosher);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.initialQuery]);

  // Syncing the conversation with the active trip: on mount, load the current
  // trip's history (unless we just started a new conversation with ?q=), and on
  // every trip-tab switch load that trip's stored conversation.
  useEffect(() => {
    if (!trip.hydrated) return;
    const id = trip.currentId;
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSyncedIdRef.current = id;
      if (id && !options?.initialQuery) {
        suppressSaveRef.current = true;
        setMessages(loadChat(id));
      }
      return;
    }
    if (id === lastSyncedIdRef.current) return;
    if (selfUpsertRef.current && selfUpsertRef.current === id) {
      selfUpsertRef.current = null;
      lastSyncedIdRef.current = id;
      return;
    }
    suppressSaveRef.current = true;
    lastSyncedIdRef.current = id;
    setMessages(id ? loadChat(id) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.currentId, trip.hydrated]);

  // Per-trip conversation save - skips once immediately after a load
  useEffect(() => {
    if (suppressSaveRef.current) {
      suppressSaveRef.current = false;
      return;
    }
    const id = lastSyncedIdRef.current;
    if (id) saveChat(id, messages);
  }, [messages]);

  const reset = useCallback(() => {
    lastSyncedIdRef.current = null;
    setMessages([]);
    setInput('');
  }, []);

  /**
   * Clear the current trip's conversation, without touching the trip.
   *
   * `reset` alone cleared only the state, so a refresh restored everything from
   * localStorage - which is what a traveler reported. Here we also delete the
   * storage, and suppressSaveRef prevents the history-sync effect from
   * immediately writing the old state back on the same tick.
   */
  const clearConversation = useCallback(() => {
    const id = tripRef.current.currentId;
    if (id) clearChat(id);
    suppressSaveRef.current = true;
    setMessages([]);
    setInput('');
  }, []);

  const addExplored = useCallback((dest: Destination) => {
    setExplored(saveExplored(dest));
  }, []);

  return {
    messages,
    input,
    setInput,
    loading,
    streaming,
    status,
    tripUpdates,
    explored,
    addExplored,
    send,
    reset,
    clearConversation,
  };
}
