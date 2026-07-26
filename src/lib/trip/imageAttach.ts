'use client';

/**
 * צירוף תמונה לשיחה עם הסוכן - צילום מסך של אישור הזמנה, כרטיס טיסה,
 * שלט או תפריט. הכל קורה בדפדפן, בלי ספרייה חדשה ובלי אחסון: הקובץ
 * מוקטן ל-data URL קטן (canvas, בדיוק כמו imageToAvatar בפרופיל) ונשלח
 * ל-/api/chat בגוף הבקשה בלבד. התמונה לא נשמרת בשרת ולא נכתבת ללוג.
 *
 * הרזולוציה נבחרה כדי שטקסט קטן בצילום מסך יישאר קריא למודל (1400px
 * בצלע הארוכה), אבל שהתמונה עדיין תישאר בסדר גודל של מאות KB.
 */

/** הצלע הארוכה אחרי ההקטנה - מספיק כדי לקרוא טקסט בצילום מסך */
const MAX_EDGE = 1400;
/** תקרת גודל אחרי ההקטנה (תווים של data URL) - השרת אוכף את אותו גבול */
export const MAX_IMAGE_CHARS = 1_400_000;
/** מה שהדפדפן מורשה לבחור מלכתחילה */
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
/** תקרת קובץ גולמי לפני הקטנה - הגנה מקבצים ענקיים */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export interface AttachError {
  /** הודעה בעברית להצגה למשתמש */
  message: string;
}

/**
 * ממיר קובץ שנבחר ל-data URL של JPEG מוקטן. מחזיר null כשהקובץ אינו
 * תמונה קריאה, גדול מדי, או שלא הצלחנו לדחוס אותו מספיק.
 */
export function fileToChatImage(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/') || file.size > MAX_SOURCE_BYTES) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      // רקע לבן: צילומי מסך עם שקיפות לא ייצאו שחורים ב-JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      // יורדים באיכות עד שנכנסים לתקרה - עדיף תמונה קצת רכה מכישלון
      for (const q of [0.82, 0.7, 0.6, 0.5]) {
        const data = canvas.toDataURL('image/jpeg', q);
        if (data.length <= MAX_IMAGE_CHARS) return resolve(data);
      }
      resolve(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
