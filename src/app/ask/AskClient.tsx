'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatPanel from '@/components/ChatPanel';
import { useFreeChat } from '@/lib/trip/useFreeChat';

const ASK_STARTERS = [
  'מה כדאי לראות באיטליה בסתיו?',
  'לאן משתלם לטוס לשבוע עם ילדים ותקציב נמוך?',
  'איפה יש אוכל כשר בברצלונה?',
  'מה ההבדל בין פראג לוינה לזוג צעיר?',
];

/**
 * `/ask` - a free conversation with the agent, with no trip. The easy way into the site: you
 * ask, you get a real answer from the catalog, and that is it - there is no itinerary, no map
 * and no login here.
 *
 * `useFreeChat` is what sends `trip: null` throughout the conversation, so the agent never
 * creates a trip by itself here - see the explanation there and in the system prompt
 * ("CREATING THE FIRST TRIP NEEDS A CLEAR YES"). The moment one is created - because the user
 * asked, or accepted the agent's offer - `builtTripId` is filled, and from then on this is
 * `/chat`'s job: we navigate there, with the conversation already there (useFreeChat stored it
 * under the trip id, before the navigation happened).
 */
export default function AskClient() {
  const chat = useFreeChat();
  const router = useRouter();

  useEffect(() => {
    if (chat.builtTripId) router.push(`/chat?trip=${chat.builtTripId}`);
  }, [chat.builtTripId, router]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-3xl text-night sm:text-4xl">שאל את הסוכן</h1>
      <p className="mt-3 max-w-xl leading-relaxed text-night/60">
        שאלות על יעדים, בעברית - בלי לפתוח טיול ובלי להתחבר. אם מתוך השיחה יתגבש טיול, הסוכן יציע לבנות
        אותו במפה - בלחיצה אחת, לא לפני.
      </p>

      <div className="mt-5 h-[70vh] min-h-[480px]">
        <ChatPanel
          chat={chat}
          autoFocus
          className="flex h-full"
          starters={ASK_STARTERS}
          emptyHint="שאלו אותי כל דבר על יעד - ואם ירקם מזה טיול, אציע לבנות אותו."
          clearConfirmMessage="לנקות את השיחה?"
          headerLabel="שאל את הסוכן"
          headerHint="בלי טיול, בלי לחץ - רק שאלות"
          placeholder="שאלו על יעד, ימים, תקציב, כשרות…"
        />
      </div>
    </div>
  );
}
