'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Trip } from './types';
import { useTrip } from './TripContext';
import { loadChat, saveChat, type StoredChatMessage } from './chatStorage';

/**
 * מצב השיחה עם הסוכן - הוצא מ-AgentWorkspace כדי שהתצוגה המאוחדת
 * (TripWorkspace) תוכל להחזיק שיחה אחת ולהציג אותה בשני מקומות: פאנל
 * הצד בדסקטופ ומגירת השיחה במובייל. אותו state, אותו טיול, בלי עותקים:
 * כל אירוע {trip} מהשרת נכנס ל-upsertTrip של אותו Trip object.
 *
 * שמירה/טעינה של ההיסטוריה היא per-trip-id (chatStorage), כדי שמעבר בין
 * טאבי טיולים ישחזר גם את השיחה.
 */

export type ChatMessage = StoredChatMessage;

export interface TripChat {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  /** מונה עדכוני טיול שהגיעו מהסוכן - כדי לסמן "התוכנית עודכנה" ב-UI */
  tripUpdates: number;
  send: (text: string, kosher?: boolean) => void;
  /** ניקוי השיחה המקומית (התחלת טיול חדש) */
  reset: () => void;
}

export function useTripChat(options?: {
  /** טקסט שנשלח פעם אחת עם העלייה (הגעה מדף הבית עם ?q=) */
  initialQuery?: string;
  /** טוגל הכשרות שנבחר לפני השליחה הראשונה */
  initialKosher?: boolean;
}): TripChat {
  const trip = useTrip();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tripUpdates, setTripUpdates] = useState(0);
  // טוגל הכשרות מה-UI: עובר לשרת בשקט עד שהוא נטמע ב-Trip.preferences
  const [kosherHint, setKosherHint] = useState(Boolean(options?.initialKosher));

  // מעקב הטיול הפעיל לצורך שמירה/טעינה של השיחה:
  // initializedRef - עיגון חד-פעמי אחרי הידרציה, לפני שמגיבים לשינויים.
  // lastSyncedIdRef - הטיול שהשיחה המקומית מסונכרנת אליו כרגע.
  // selfUpsertRef - "השינוי הבא ב-currentId מקורו בטיול שהשיחה הזו עצמה
  //   יצרה/עדכנה עכשיו" - כדי לא לדרוס את ההודעות המקומיות בטעינה.
  // suppressSaveRef - מדלג על שמירה אחת אחרי טעינה, כדי לא לשמור מחדש
  //   טקסט ישן מעל החדש.
  const initializedRef = useRef(false);
  const lastSyncedIdRef = useRef<string | null>(null);
  const selfUpsertRef = useRef<string | null>(null);
  const suppressSaveRef = useRef(false);
  const sentInitialRef = useRef(false);
  // הטיול והשיחה העדכניים - כדי ש-send לא יסתמך על closure ישן
  const tripRef = useRef(trip);
  tripRef.current = trip;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const send = useCallback(async (text: string, kosherArg?: boolean) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const kosher = kosherArg ?? kosherHint;
    if (kosherArg) setKosherHint(true);

    const next: ChatMessage[] = [...messagesRef.current, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    let appended = false;
    const patchLast = (patch: (msg: ChatMessage) => ChatMessage) =>
      setMessages((m) => [...m.slice(0, -1), patch(m[m.length - 1])]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          trip: tripRef.current.currentTrip,
          kosher: kosher || undefined, // רמז ה-UI - השרת מטמיע אותו בטיול
        }),
      });
      if (!res.ok || !res.body) throw new Error('bad response');

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
          };
          try {
            event = JSON.parse(line.slice(5));
          } catch {
            continue;
          }
          if (event.type === 'text' && event.text) {
            const chunk = event.text;
            if (!appended) {
              appended = true;
              setLoading(false);
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
            // הטיול נוצר/עודכן מתוך השיחה הזו - כשה-currentId ישתנה בעקבות
            // זה, לא טוענים מחדש מהאחסון (זה ידרוס את ההודעות העדכניות).
            selfUpsertRef.current = event.trip.id;
            tripRef.current.upsertTrip(event.trip);
            setTripUpdates((n) => n + 1);
            // ההעדפה נטמעה בטיול - הרמז כבר לא נחוץ (הטוגל בממשק גובר)
            if (event.trip.preferences?.kosher) setKosherHint(false);
            if (appended && event.actions && event.actions.length > 0) {
              const actions = event.actions;
              patchLast((msg) => ({ ...msg, actions }));
            }
          } else if (event.type === 'quickReplies' && appended && event.replies?.length) {
            const quickReplies = event.replies;
            patchLast((msg) => ({ ...msg, quickReplies }));
          }
        }
      }
      if (!appended) throw new Error('empty stream');
    } catch {
      if (!appended) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'אופס, משהו השתבש. נסו שוב.' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [kosherHint, loading]);

  // שליחה ראשונה אוטומטית (הגעה מדף הבית עם ?q=) - פעם אחת בלבד
  useEffect(() => {
    const q = options?.initialQuery?.trim();
    if (!q || sentInitialRef.current) return;
    sentInitialRef.current = true;
    send(q, options?.initialKosher);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.initialQuery]);

  // סנכרון השיחה עם הטיול הפעיל: בעלייה טוענים את ההיסטוריה של הטיול
  // הנוכחי (אלא אם התחלנו עכשיו שיחה חדשה עם ?q=), ובכל החלפת טאב טיול
  // טוענים את השיחה השמורה שלו.
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

  // שמירת השיחה per-trip - מדלגת פעם אחת מיד אחרי טעינה
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

  return { messages, input, setInput, loading, tripUpdates, send, reset };
}
