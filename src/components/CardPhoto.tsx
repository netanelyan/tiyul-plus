import { thumbSrcSet } from '@/lib/photo';

/**
 * תמונת הרקע של כרטיס יעד/עיר - כ`<img>` ולא כ-`background-image`.
 *
 * **זה לא רפקטור קוסמטי.** `background-image` בכלל לא נטענת בעצלתיים,
 * ולכן דף `/countries` שלח 166 בקשות תמונה ברגע הפתיחה, לפני שהמשתמש
 * גלל פיקסל אחד - בערך 8-14 מגה על טלפון. `loading="lazy"` על `<img>`
 * מוריד את זה לכמה כרטיסים שנראים במסך, ו-`srcSet` נותן למסך רגיל
 * להוריד 250/330 במקום 500.
 *
 * הגרדיאנט הכהה נשאר שכבה נפרדת מעל התמונה, עם בדיוק אותם ערכים כמו
 * קודם, כדי שהכרטיס ייראה זהה. כשאין תמונה - `photo-bg` לבדה מציירת
 * את גרדיאנט המותג, בדיוק כמו קודם.
 */
/** ברירת המחדל היא בדיוק הגרדיאנט שהיה על כרטיסי היעדים */
const DEFAULT_OVERLAY = 'linear-gradient(180deg, rgba(15,14,26,0) 40%, rgba(15,14,26,0.72) 100%)';

export default function CardPhoto({
  photo,
  className = 'photo-bg relative h-40',
  sizes = '(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 94vw',
  overlay = DEFAULT_OVERLAY,
  imgClassName = '',
  children,
}: {
  photo?: string;
  className?: string;
  sizes?: string;
  /** null = בלי שכבת כהות (כשהכרטיס מצייר גרדיאנט משלו) */
  overlay?: string | null;
  imgClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            srcSet={thumbSrcSet(photo)}
            sizes={sizes}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
          />
          {overlay && <div className="absolute inset-0" style={{ backgroundImage: overlay }} />}
        </>
      )}
      {children}
    </div>
  );
}
