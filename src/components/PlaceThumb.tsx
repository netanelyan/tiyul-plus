'use client';

import { useState } from 'react';
import { categoryMeta } from '@/lib/categories';
import type { Place } from '@/lib/types';

/**
 * התמונה הקטנה של מקום - עם נפילה מסודרת כשאין תמונה.
 *
 * חלק מהמקומות בקטלוג פשוט אין להם תמונה חופשית: מסעדות כשרות,
 * בתי חב"ד, שווקים ובתי כנסת קטנים כמעט אף פעם לא מצולמים
 * בוויקישיתוף ברישיון פתוח. עד היום פשוט לא הצגנו כלום, וזה גרם
 * לרשימה להיראות שבורה - חלק מהכרטיסים עם ריבוע וחלק בלי.
 *
 * במקום זה מוצג כאן ריבוע בצבע הקטגוריה עם האימוג׳י שלה. הוא
 * נראה מכוון, שומר על אותה רוחב-גובה בכל הכרטיסים, ולא מתחזה
 * לתצלום של המקום.
 *
 * אותה נפילה תופסת גם כשכתובת תמונה קיימת אבל לא נטענת (onError),
 * כדי שקישור שבור לא יישאר כריבוע ריק.
 */
export default function PlaceThumb({
  place,
  className = '',
  rounded = 'rounded-xl',
}: {
  place: Place;
  /** מידות - נקבעות במקום הקריאה, למשל "h-20 w-20 shrink-0" */
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const meta = categoryMeta[place.category];
  const show = place.photo && !failed;

  if (show) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={place.photo}
        alt={place.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} ${rounded} object-cover ring-1 ring-night/10`}
      />
    );
  }

  return (
    <div
      className={`${className} ${rounded} flex items-center justify-center ring-1 ring-night/10`}
      style={{ backgroundColor: `${meta.color}1a` }}
      role="img"
      aria-label={meta.label}
      title={meta.label}
    >
      <span aria-hidden className="text-2xl opacity-80">
        {meta.emoji}
      </span>
    </div>
  );
}
