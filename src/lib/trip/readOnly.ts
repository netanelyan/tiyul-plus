'use client';

import type { TripApi } from './TripContext';
import type { Trip } from './types';

/**
 * מצב קריאה-בלבד ללא רשת, כרשת ביטחון מתחת לממשק.
 *
 * **ההחלטה שמאחורי הקובץ הזה, במפורש:** בלי חיבור, טיול נקרא ולא
 * נערך. האלטרנטיבה - לאפשר עריכה ולסנכרן בחזרה - נשמעת נדיבה יותר
 * ונכשלת בשקט: הסנכרון לחשבון מכריע "המאוחר מנצח" לפי `updatedAt`,
 * שהוא **שעון המכשיר**. טלפון בחו"ל עם שעון שגוי, או מכשיר שני
 * שערך את אותו טיול בינתיים, הופכים את זה למחיקה שקטה של עבודה של
 * מישהו. עריכה שנעלמת גרועה מעריכה שלא התאפשרה, וזה הכיוון שנבחר.
 *
 * הממשק מכבה את הפקדים בעצמו, ולכן הפונקציות כאן כמעט לעולם לא
 * נקראות. הן קיימות כדי שפקד שנשכח, קיצור מקלדת או קוד עתידי לא
 * יוכלו לכתוב בכל זאת - **הגנה מבנית, לא הודעה למשתמש.**
 *
 * שתי פעולות **אינן** חסומות כאן במכוון:
 * `setCurrentId` - מעבר בין טיולים שמורים הוא קריאה, וחייב לעבוד
 * גם בלי רשת; ו-`applyRemoteTrips`/`applyRemoteDeletions`, שנקראות
 * רק כשיש רשת ממילא (הן *התוצאה* של סנכרון, לא עריכה מקומית).
 */

/** טיול ריק שמוחזר מ-`createTrip` החסום. הוא לא נשמר בשום מקום -
 *  הוא קיים רק כדי שקורא שמצפה ל-`Trip` לא יקבל `undefined`. */
function noTrip(): Trip {
  return { id: '', name: '', citySlugs: [], days: [], createdAt: 0 };
}

export function readOnlyIfOffline(api: TripApi, offline: boolean): TripApi {
  if (!offline) return api;
  return {
    ...api,
    createTrip: noTrip,
    createTripFrom: () => {},
    upsertTrip: () => {},
    duplicateTrip: () => {},
    deleteTrip: () => {},
    renameTrip: () => {},
    setTripDates: () => {},
    addDay: () => {},
    removeDay: () => {},
    setDayNotes: () => {},
    // `addPlace` מחזיר { dayIndex } - קורא שמצפה לאובייקט לא יקבל
    // undefined ויתפוצץ, ולכן מחזירים צורה תקינה.
    addPlace: () => ({ dayIndex: 0 }),
    removePlace: () => {},
    movePlace: () => {},
    movePlaceToDay: () => {},
  };
}
