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
 * `/ask` - שיחה חופשית עם הסוכן, בלי טיול. הכניסה הקלה לאתר: שואלים,
 * מקבלים תשובה אמיתית מהקטלוג, וזהו - אין כאן מסלול, מפה או התחברות.
 *
 * `useFreeChat` הוא זה ששולח `trip: null` לאורך כל השיחה, כך שהסוכן
 * לעולם לא יוצר טיול מעצמו כאן - ראו ההסבר שם ובפרומפט המערכת
 * ("CREATING THE FIRST TRIP NEEDS A CLEAR YES"). ברגע שהוא כן נוצר -
 * כי המשתמש ביקש, או קיבל את ההצעה של הסוכן - `builtTripId` מתמלא
 * וממנו והלאה זו כבר עבודה של `/chat`: מנווטים לשם, עם השיחה שכבר
 * שם (useFreeChat שמר אותה תחת מזהה הטיול, לפני שהניווט קרה).
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
