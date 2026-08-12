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
 * שיחה חופשית - `/ask`, בלי טיול. אותו סוכן, אותם כללי כנות, אותן
 * מכסות (זהות ל-`/api/chat` בכל הפרמטרים - ראו route.ts, אין שם שום
 * ענף שתלוי בקיום טיול), רק שהיא **לעולם לא שולחת טיול קיים לשרת**:
 * `trip: null` בכל בקשה, לאורך כל השיחה. הסוכן עונה, ממליץ, חוקר -
 * ולא יוצר כלום, עד שהמשתמש מבקש טיול בפירוש או מקבל את ההצעה שלו
 * (ראו SYSTEM_PROMPT, "CREATING THE FIRST TRIP NEEDS A CLEAR YES").
 *
 * **מה קורה כשבכל זאת נוצר טיול, ברגע שהמשתמש מבקש או מאשר.** ה-`trip`
 * event מהשרת נתפס, השיחה השלמה עד כה (כולל התור הזה) נשמרת תחת מזהה
 * הטיול החדש (`chatStorage`, אותו מפתח בדיוק ש-`useTripChat` קורא ממנו
 * ב-/chat) - כך שהשיחה **ממשיכה** ולא מתחילה מאפס - והטיול נכנס ל-
 * `TripContext`. הניווט בפועל ל-`/chat?trip=<id>` הוא לא כאן: `builtTripId`
 * נחשף כ-state, והרכיב שמחזיק את הדף הוא זה שמנווט (הפרדת אחריות בין
 * state לניתוב, כמו בכל שאר האתר).
 */

const ASK_CHAT_ID = 'ask';

export type ChatMessage = StoredChatMessage;

export interface FreeChat extends TripChat {
  /** id של טיול שנבנה מתוך השיחה הזו - null כל עוד לא נבנה כלום */
  builtTripId: string | null;
}

export function useFreeChat(): FreeChat {
  const trip = useTrip();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [tripUpdates, setTripUpdates] = useState(0);
  const [explored, setExplored] = useState<Destination[]>([]);
  const [builtTripId, setBuiltTripId] = useState<string | null>(null);

  // טעינה ראשונית אחרי mount בלבד (אחסון לא קיים ב-SSR) - שיחה קודמת
  // שלא הפכה לטיול (למשל אחרי רענון) ממשיכה מאיפה שהיא נעצרה.
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
    // נבנה גם כאן, לצד ה-state: הרגע היחיד שצריך את ההודעה הסופית
    // כאובייקט (לשמירה תחת מזהה הטיול, לא רק לרינדור) הוא אחרי שהזרם
    // נגמר, ואי אפשר לסמוך על state אסינכרוני לזה.
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
          // דף שיחה חופשי: אין ואף פעם לא יהיה טיול קיים בבקשה הזו -
          // זה מה שמבטיח שהסוכן לא "עורך" משהו שלא ראינו אותו יוצר.
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
              setMessages((m) => [...m, builtMsg]);
            } else {
              patchLast(builtMsg);
            }
          } else if (event.type === 'meta' && appended) {
            builtMsg = { ...builtMsg, destinationSlug: event.destinationSlug, placeIds: event.placeIds };
            patchLast(builtMsg);
          } else if (event.type === 'trip' && event.trip) {
            // נשמר לרגע שאחרי סוף הזרם - ראו ההערה למעלה. לא נוגעים
            // ב-TripContext תוך כדי סטרימינג.
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
        השיחה הזאת הפכה לטיול אמיתי. שלושה דברים, בסדר הזה:
        1. השיחה השלמה (כולל התור הנוכחי) נשמרת תחת מזהה הטיול, כך
           שהתצוגה המאוחדת (/chat?trip=<id>) ממשיכה מדויק מכאן.
        2. הגרסה הזמנית תחת מפתח ה-'ask' מתנקה - היא כבר "עברה דירה".
        3. upsertTrip קובע גם currentId; הניווט עצמו קורה ברכיב הדף.
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
      setStatus(null);
    }
  }, [loading, trip]);

  // שמירת השיחה תחת מפתח ה-'ask' - כל עוד לא נבנה ממנה טיול (ואז היא
  // כבר נשמרה תחת מזהה הטיול עצמו ב-send(), ואין מה להוסיף כאן).
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
