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
import { HttpError, failureMessage, type TripChat } from './useTripChat';

/**
 * Free conversation - `/ask`, with no trip. The same agent, the same honesty
 * rules, the same quotas (identical to `/api/chat` in every parameter - see
 * route.ts, there is no branch there that depends on a trip existing), except
 * that it **never sends an existing trip to the server**: `trip: null` on
 * every request, for the whole conversation. The agent answers, recommends,
 * explores - and creates nothing, until the user asks for a trip explicitly
 * or accepts its offer (see SYSTEM_PROMPT, "CREATING THE FIRST TRIP NEEDS A
 * CLEAR YES").
 *
 * **What happens when a trip IS created, the moment the user asks or
 * approves.** The `trip` event from the server is caught, the whole
 * conversation so far (including this turn) is saved under the new trip's id
 * (`chatStorage`, the exact same key `useTripChat` reads from on /chat) - so
 * the conversation **continues** rather than starting from scratch - and the
 * trip enters `TripContext`. The actual navigation to `/chat?trip=<id>` is
 * not here: `builtTripId` is exposed as state, and the component holding the
 * page is the one that navigates (separation of responsibility between state
 * and routing, like everywhere else on the site).
 */

const ASK_CHAT_ID = 'ask';

export type ChatMessage = StoredChatMessage;

export interface FreeChat extends TripChat {
  /** id of a trip built from this conversation - null as long as nothing was built */
  builtTripId: string | null;
}

export function useFreeChat(): FreeChat {
  const trip = useTrip();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [tripUpdates, setTripUpdates] = useState(0);
  const [explored, setExplored] = useState<Destination[]>([]);
  const [builtTripId, setBuiltTripId] = useState<string | null>(null);

  // Initial load only after mount (storage does not exist in SSR) - a
  // previous conversation that never became a trip (e.g. after a refresh)
  // continues from where it stopped.
  const loadedRef = useRef(false);
  useEffect(() => {
    setExplored(loadExplored());
    setMessages(loadChat(ASK_CHAT_ID));
    loadedRef.current = true;
  }, []);

  const exploredRef = useRef(explored);
  exploredRef.current = explored;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const send = useCallback(async (text: string, _kosher?: boolean, image?: string) => {
    const trimmed = text.trim();
    if ((!trimmed && !image) || loading) return;

    const next: ChatMessage[] = [
      ...messagesRef.current,
      { role: 'user', content: trimmed, ...(image ? { image } : {}) },
    ];
    setMessages(next);
    setInput('');
    setLoading(true);
    setStatus(null);
    let appended = false;
    // Built here too, alongside the state: the one moment the final message
    // is needed as an object (for saving under the trip id, not just for
    // rendering) is after the stream ends, and async state cannot be relied
    // on for that.
    let builtMsg: ChatMessage = { role: 'assistant', content: '' };
    const patchLast = (next: ChatMessage) => setMessages((m) => [...m.slice(0, -1), next]);
    let createdTrip: Trip | null = null;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...clientIdHeader(),
          ...(await authHeader()),
        },
        body: JSON.stringify({
          messages: next.map(({ role, content, image }, i) => ({
            role,
            content,
            ...(image && i >= next.length - 2 ? { image } : {}),
          })),
          // Free conversation page: there is not, and never will be, an
          // existing trip in this request - that is what guarantees the agent
          // is not "editing" something we never saw it create.
          trip: null,
          explored: exploredRef.current.length > 0 ? exploredRef.current : undefined,
        }),
      });
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
            builtMsg = { ...builtMsg, content: builtMsg.content + event.text };
            if (!appended) {
              appended = true;
              setLoading(false);
              setStreaming(true);
              setMessages((m) => [...m, builtMsg]);
            } else {
              patchLast(builtMsg);
            }
          } else if (event.type === 'meta' && appended) {
            builtMsg = { ...builtMsg, destinationSlug: event.destinationSlug, placeIds: event.placeIds };
            patchLast(builtMsg);
          } else if (event.type === 'trip' && event.trip) {
            // Kept for the moment after the stream ends - see the note above.
            // TripContext is never touched mid-stream.
            createdTrip = event.trip;
            if (appended && event.actions && event.actions.length > 0) {
              builtMsg = { ...builtMsg, actions: event.actions };
              patchLast(builtMsg);
            }
          } else if (event.type === 'explored' && event.destination) {
            setExplored(saveExplored(event.destination));
          } else if (event.type === 'search' && event.search) {
            const search = event.search;
            builtMsg = { ...builtMsg, searches: [...(builtMsg.searches ?? []), search] };
            if (appended) {
              patchLast(builtMsg);
            } else {
              appended = true;
              setLoading(false);
              setStreaming(true);
              setMessages((m) => [...m, builtMsg]);
            }
          } else if (event.type === 'quickReplies' && appended && event.replies?.length) {
            builtMsg = { ...builtMsg, quickReplies: event.replies };
            patchLast(builtMsg);
          }
        }
      }
      if (!appended) throw new Error('empty stream');

      /*
        This conversation became a real trip. Three things, in this order:
        1. The full conversation (including the current turn) is saved under
           the trip id, so the unified view (/chat?trip=<id>) continues
           precisely from here.
        2. The temporary copy under the 'ask' key is cleaned up - it has
           already "moved house".
        3. upsertTrip also sets currentId; the navigation itself happens in
           the page component.
      */
      if (createdTrip) {
        saveChat(createdTrip.id, [...next, builtMsg]);
        clearChat(ASK_CHAT_ID);
        trip.upsertTrip(createdTrip);
        setTripUpdates((n) => n + 1);
        setBuiltTripId(createdTrip.id);
      }
    } catch (err) {
      console.error('[ask] request failed', err);
      if (!appended) {
        setMessages((m) => [...m, { role: 'assistant', content: failureMessage(err) }]);
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      setStatus(null);
    }
  }, [loading, trip]);

  // Saving the conversation under the 'ask' key - as long as no trip was
  // built from it (once one was, it was already saved under the trip's own
  // id in send(), and there is nothing to add here).
  useEffect(() => {
    if (!loadedRef.current || builtTripId) return;
    saveChat(ASK_CHAT_ID, messages);
  }, [messages, builtTripId]);

  const reset = useCallback(() => {
    clearChat(ASK_CHAT_ID);
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
    clearConversation: reset,
    builtTripId,
  };
}
