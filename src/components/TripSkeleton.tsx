/**
 * שלד בצורת מסך הטיול, לטעינה הראשונה של הערים.
 *
 * עד עכשיו ההמתנה הזאת הציגה קופסה קטנה אחת עם "טוען את הטיולים שלך" -
 * מסך שלם מתחלף בכלום, ואז קופץ לתצוגה מלאה. השלד מצייר את **המבנה**
 * של מה שעומד להופיע - שורת כותרת, רצועת ימי טיול, מלבן מפה, שורות
 * עצירות - כך שהמסך "קיים" מהרגע הראשון והתוכן רק מתמלא לתוכו.
 *
 * אין כאן טקסט מזויף ואין נתונים מומצאים - רק צורות. הנצנוץ
 * (skeleton-block) מכבד prefers-reduced-motion וקופא לגוון סטטי.
 */
export default function TripSkeleton() {
  return (
    <div aria-label="טוען את הטיול" role="status" className="space-y-4">
      {/* שורת הכותרת: שם הטיול + כפתורי פעולה */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="skeleton-block h-8 w-56 rounded-xl" />
        <div className="flex gap-2">
          <div className="skeleton-block h-9 w-24 rounded-xl" />
          <div className="skeleton-block h-9 w-20 rounded-xl" />
          <div className="skeleton-block h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* רצועת בורר הימים: כרטיס עיר עם מספרי ימים */}
      <div className="flex gap-2">
        <div className="skeleton-block h-16 w-40 rounded-2xl" />
        <div className="skeleton-block h-16 w-28 rounded-2xl" />
      </div>

      {/* הגוף: מסלול + מפה, באותו פיצול כמו המסך האמיתי */}
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-2.5">
          <div className="skeleton-block h-6 w-32 rounded-lg" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-block h-14 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton-block h-72 rounded-2xl lg:h-96" />
      </div>
    </div>
  );
}
