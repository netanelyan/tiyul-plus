/*
 * tiyul+ service worker - exists for one thing: that the app opens
 * without a network and draws the itinerary that was already opened once
 * while connected.
 *
 * Written by hand and not through a library (workbox / next-pwa) - hard
 * rule 6, no new heavy dependencies. It is deliberately small and
 * conservative:
 *
 *  - **Caches only what was viewed.** No precache of the catalog and no URL
 *    list to run through on install. What the user opened is kept; the rest
 *    is not.
 *  - **Touches nothing that is not GET**, and none of the AI, account or
 *    billing routes. A model reply is not something to serve from a cache.
 *  - **Never invents success.** A request with no cached response fails the
 *    way it fails; the UI is what says "no connection", not the SW.
 */

/**
 * Bump this number **every time something in the site shell changes and
 * people must see it** - footer, navigation, legal text.
 *
 * Why this is needed: `activate` deletes every `tiyul-*` cache that does not
 * carry this version. As long as the number does not move, the HTML of
 * already-cached screens stays in the SHELL cache. Navigation is
 * network-first and therefore usually refreshes on its own - but "usually"
 * is not enough when it comes to a terms-of-use link: Netanel did not see
 * the new footer even though it was already in production, and that is
 * exactly the symptom.
 */
const VERSION = 'v2';
const SHELL = `tiyul-shell-${VERSION}`; // HTML of screens that were viewed
const ASSETS = `tiyul-assets-${VERSION}`; // _next/static, fonts, icons
const PHOTOS = `tiyul-photos-${VERSION}`; // photos already seen
const DATA = `tiyul-data-${VERSION}`; // /api/cities only

/** Photo ceiling: ~300 card-sized photos are tens of MB, and that is the limit */
const MAX_PHOTOS = 300;

/**
 * Ceiling for build assets. Their names carry a hash, so assets of an old
 * build are never overwritten - without a ceiling, every deploy the user
 * visited adds a whole layer and frees nothing. Pruning is by insertion
 * order, i.e. the old builds go out first. **The number is large on
 * purpose:** overly aggressive pruning could delete precisely the current
 * build's chunks, and then the app does not open offline at all - a far
 * worse failure than a few extra MB.
 */
const MAX_ASSETS = 250;

/** Photo hosts allowed to be cached. A deliberately closed list. */
const PHOTO_HOSTS = ['upload.wikimedia.org', 'images.unsplash.com', 'flagcdn.com'];

/** Paths that must never be touched - live, personal or financial */
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
  // No precache: we do not know the build's chunk names here, and we also
  // do not want to download screens the user did not ask for. skipWaiting
  // so a new version takes effect without the user having to close all
  // their tabs.
  event.waitUntil(self.skipWaiting());
});

/**
 * The three screens a trip opens from. **This is not a precache of the
 * catalog** - these are three HTML documents of a few tens of kB, with no
 * city data and no places.
 *
 * Why this is essential: the SW registers on the first load but **did not
 * serve it**, so after a single visit the screen cache is completely empty -
 * measured: 0 screens and 2 assets. Somebody who visited once and then went
 * down into the subway would get the browser's offline dinosaur, i.e.
 * exactly the failure this feature exists to prevent.
 */
const SHELL_ROUTES = ['/chat', '/planner', '/'];

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('tiyul-') && !k.endsWith(VERSION)).map((k) => caches.delete(k)),
      );
      // best-effort: a screen that does not respond simply is not cached, and that does not fail activation
      const cache = await caches.open(SHELL);
      await Promise.all(
        SHELL_ROUTES.map(async (path) => {
          try {
            const res = await fetch(path, { credentials: 'same-origin' });
            if (res && res.status === 200) await cache.put(path, res.clone());
          } catch {
            /* no network right now - it will be cached on the next navigation */
          }
        }),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * The page reports which build assets it actually loaded. Here too the
 * reason is that the first load did not pass through the SW: its chunks are
 * already in the browser's memory and not in our cache, and without them
 * there is cached HTML with no JavaScript to run it.
 * **Only** `/_next/static/` paths from the same origin are cached - the
 * page cannot ask us here to cache anything else.
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
          /* skip - this is warming, not a critical path */
        }
      }
      await trim(ASSETS, MAX_ASSETS);
    })(),
  );
});

/** Prunes a cache by insertion order (oldest goes out first) */
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
  // Only healthy responses. Caching a 404 or an error response is how a
  // failure gets immortalized.
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

  // Photos from known hosts: what was seen once stays available in the field.
  if (PHOTO_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, PHOTOS, MAX_PHOTOS).catch(() => Response.error()));
    return;
  }

  if (!sameOrigin) return;

  // Build assets: hashed names, therefore immutable - cache-first without worry.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(request, ASSETS, MAX_ASSETS));
    return;
  }

  // The trip's cities. There is also a localStorage cache (`cityStore`), and
  // this one here is a second belt: it also covers a new tab's first request.
  if (url.pathname === '/api/cities') {
    event.respondWith(networkFirst(request, DATA).catch(() => Response.error()));
    return;
  }

  // Screens: always try the network first (fresh content), and fall back to
  // the cached screen.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL).catch(async () => {
        const cache = await caches.open(SHELL);
        // This exact path was not cached? Try the trip screen, which is what
        // people look for in the field, then the homepage. If those are
        // missing too - the browser shows its own offline screen, which
        // beats a blank page of ours that pretends to be the app.
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

  // Next's RSC payloads (?_rsc=) and the rest of the GETs: network first, cache as fallback
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(networkFirst(request, ASSETS).catch(() => Response.error()));
  }
});
