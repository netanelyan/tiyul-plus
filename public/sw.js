/*
 * Service worker של טיול+ - קיים בשביל דבר אחד: שהאפליקציה תיפתח
 * בלי רשת ותצייר את המסלול שכבר נפתח פעם אחת מחוברים.
 *
 * נכתב ביד ולא דרך ספרייה (workbox / next-pwa) - חוק קשיח 6, בלי
 * תלויות כבדות חדשות. הוא בכוונה קטן ושמרני:
 *
 *  - **שומר רק מה שנצפה.** אין precache של הקטלוג ואין רשימת כתובות
 *    לרוץ עליה בהתקנה. מה שהמשתמש פתח - נשמר; השאר לא.
 *  - **לא נוגע בשום דבר שאינו GET**, ולא בנתיבי ה-AI, החשבון או
 *    התשלומים. תשובה של מודל אינה משהו שמגישים מהמטמון.
 *  - **לא ממציא הצלחה.** בקשה שאין לה תשובה שמורה נכשלת כמו שהיא
 *    נכשלת; ה-UI הוא זה שאומר "אין חיבור", לא ה-SW.
 */

const VERSION = 'v1';
const SHELL = `tiyul-shell-${VERSION}`; // HTML של מסכים שנצפו
const ASSETS = `tiyul-assets-${VERSION}`; // _next/static, פונטים, אייקונים
const PHOTOS = `tiyul-photos-${VERSION}`; // תמונות שכבר נראו
const DATA = `tiyul-data-${VERSION}`; // /api/cities בלבד

/** תקרה לתמונות: ~300 תמונות בגודל כרטיס הן עשרות מגה, וזה הגבול */
const MAX_PHOTOS = 300;

/**
 * תקרה לנכסי הבילד. שמותיהם נושאים hash, ולכן נכסים של בילד ישן לא
 * נדרסים לעולם - בלי תקרה, כל deploy שהמשתמש ביקר בו מוסיף שכבה
 * שלמה ולא מפנה כלום. הגיזום הוא לפי סדר הכנסה, כלומר הבילדים הישנים
 * יוצאים ראשונים. **המספר גדול בכוונה:** גיזום אגרסיבי מדי היה יכול
 * למחוק דווקא את ה-chunks של הבילד הנוכחי, ואז האפליקציה לא נפתחת
 * בלי רשת בכלל - כישלון חמור בהרבה מכמה מגה מיותרים.
 */
const MAX_ASSETS = 250;

/** מארחי תמונות שמותר לשמור. רשימה סגורה במכוון. */
const PHOTO_HOSTS = ['upload.wikimedia.org', 'images.unsplash.com', 'flagcdn.com'];

/** נתיבים שאסור לגעת בהם - חיים, אישיים או כספיים */
const NEVER = [
  '/api/chat',
  '/api/generate-trip',
  '/api/share',
  '/api/import-map',
  '/api/explore',
  '/api/admin',
  '/api/billing',
  '/api/promo',
  '/auth',
];

self.addEventListener('install', (event) => {
  // אין precache: אנחנו לא יודעים כאן את שמות ה-chunks של הבילד, וגם
  // לא רוצים להוריד מסכים שהמשתמש לא ביקש. skipWaiting כדי שגרסה
  // חדשה תיכנס לתוקף בלי שהמשתמש יצטרך לסגור את כל הטאבים.
  event.waitUntil(self.skipWaiting());
});

/**
 * שלושת המסכים שמהם נפתח טיול. **זה לא precache של הקטלוג** - אלה שלושה
 * מסמכי HTML של כמה עשרות kB, בלי דאטה של ערים ובלי מקומות.
 *
 * למה זה הכרחי: ה-SW נרשם בטעינה הראשונה אבל **לא הגיש אותה**, ולכן
 * אחרי ביקור יחיד מטמון המסכים ריק לגמרי - נמדד: 0 מסכים ו-2 נכסים.
 * מי שנכנס פעם אחת ואז יורד לרכבת התחתית היה מקבל את דינוזאור הניתוק
 * של הדפדפן, כלומר בדיוק את הכישלון שהפיצ׳ר הזה בא למנוע.
 */
const SHELL_ROUTES = ['/chat', '/planner', '/'];

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('tiyul-') && !k.endsWith(VERSION)).map((k) => caches.delete(k)),
      );
      // best-effort: מסך שלא נענה פשוט לא נשמר, וזה לא מפיל את ההפעלה
      const cache = await caches.open(SHELL);
      await Promise.all(
        SHELL_ROUTES.map(async (path) => {
          try {
            const res = await fetch(path, { credentials: 'same-origin' });
            if (res && res.status === 200) await cache.put(path, res.clone());
          } catch {
            /* אין רשת בדיוק עכשיו - יישמר בניווט הבא */
          }
        }),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * הדף מדווח אילו נכסי בילד הוא באמת טען. גם כאן הסיבה היא שהטעינה
 * הראשונה לא עברה דרך ה-SW: ה-chunks שלה כבר בזיכרון הדפדפן ולא
 * במטמון שלנו, ובלעדיהם יש HTML שמור בלי JavaScript להפעיל אותו.
 * נשמרים **רק** נתיבי `/_next/static/` מאותו origin - הדף לא יכול
 * לבקש מכאן לשמור שום דבר אחר.
 */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'warm-assets' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ASSETS);
      for (const raw of data.urls.slice(0, 200)) {
        let url;
        try {
          url = new URL(raw, self.location.origin);
        } catch {
          continue;
        }
        if (url.origin !== self.location.origin) continue;
        if (!url.pathname.startsWith('/_next/static/') && !url.pathname.startsWith('/fonts/')) continue;
        if (await cache.match(url.href)) continue;
        try {
          const res = await fetch(url.href);
          if (res && res.status === 200) await cache.put(url.href, res.clone());
        } catch {
          /* מדלגים - זה חימום, לא נתיב קריטי */
        }
      }
      await trim(ASSETS, MAX_ASSETS);
    })(),
  );
});

/** גוזם מטמון לפי סדר הכנסה (הישן ביותר יוצא ראשון) */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // רק תשובות תקינות. שמירת 404 או תשובת שגיאה היא הדרך להנציח תקלה.
  if (res && res.status === 200) {
    await cache.put(request, res.clone());
    if (max) await trim(cacheName, max);
  }
  return res;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.status === 200) await cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && NEVER.some((p) => url.pathname.startsWith(p))) return;

  // תמונות מארחים מוכרים: מה שנראה פעם אחת נשאר זמין בשטח.
  if (PHOTO_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, PHOTOS, MAX_PHOTOS).catch(() => Response.error()));
    return;
  }

  if (!sameOrigin) return;

  // נכסי בילד: בעלי hash בשם, ולכן immutable - cache-first בלי חשש.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(request, ASSETS, MAX_ASSETS));
    return;
  }

  // הערים של הטיול. יש גם מטמון ב-localStorage (`cityStore`), וזה
  // כאן הוא חגורה שנייה: היא מכסה גם את הבקשה הראשונה של טאב חדש.
  if (url.pathname === '/api/cities') {
    event.respondWith(networkFirst(request, DATA).catch(() => Response.error()));
    return;
  }

  // מסכים: תמיד מנסים רשת קודם (תוכן טרי), ונופלים למסך השמור.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL).catch(async () => {
        const cache = await caches.open(SHELL);
        // אותו נתיב לא נשמר? מנסים את מסך הטיול, שהוא מה שמחפשים
        // בשטח, ואז את הבית. אם גם הם לא - הדפדפן יציג את מסך
        // הניתוק שלו, וזה עדיף על עמוד ריק משלנו שמתחזה לאפליקציה.
        return (
          (await cache.match('/planner')) ||
          (await cache.match('/chat')) ||
          (await cache.match('/')) ||
          Response.error()
        );
      }),
    );
    return;
  }

  // ה-RSC payloads של Next (?_rsc=) ושאר ה-GET: רשת קודם, מטמון כגיבוי
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(networkFirst(request, ASSETS).catch(() => Response.error()));
  }
});
