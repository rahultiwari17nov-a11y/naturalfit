/**
 * Bulletproof Zero Cache-Trap Service Worker for NFT Gym ERP
 * Strategy:
 *  - HTML & Page Navigation: Network-First with Cache Fallback (guarantees fresh deploy HTML)
 *  - JS / CSS / Code Bundles: Network-First with Cache Fallback (never serves stale code chunks)
 *  - API & Data Routes (/api/*, Supabase): Network-Only (no stale member/attendance/payment data)
 *  - Static Media & Icons (/icons/*, fonts): Stale-While-Revalidate
 *  - Lifecycle: self.skipWaiting() on install, clients.claim() on activate
 */

const CACHE_VERSION = 'nft-erp-v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Core assets to pre-cache on install for offline boot
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/crm.html',
  '/manifest.json',
  '/style.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/balsyahi-logo.svg'
];

// 1. INSTALL EVENT
self.addEventListener('install', (event) => {
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Use cache.addAll with individual catch to prevent one 404 from blocking install
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((response) => {
              if (response.ok) {
                return cache.put(url, response);
              }
            })
            .catch((err) => {
              console.warn(`[PWA SW] Precache skipped for ${url}:`, err);
            })
        )
      );
    })
  );
});

// 2. ACTIVATE EVENT - Clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log(`[PWA SW] Purging obsolete cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all open pages immediately
      return self.clients.claim();
    })
  );
});

// 3. FETCH EVENT - Strict Network-First Strategy (Zero Cache-Trap)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // A. Skip non-GET requests (POST, PUT, DELETE, PATCH must always hit network directly)
  if (request.method !== 'GET') {
    return;
  }

  // B. Bypass API routes, Database endpoints, and Supabase calls (NEVER cache transactional data)
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/auth/') ||
    url.pathname.includes('/sync')
  ) {
    // Pure Network-Only for database and real-time operations
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'Offline',
            message: 'Network connection lost. Changes will sync once back online.'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // C. HTML Pages & Navigation: Strict NETWORK-FIRST with Cache Fallback
  // This guarantees that after a deployment, users always fetch the new HTML pointing to new bundle hashes
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // If network is down, serve cached version
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          // Fallback to cached index.html or root
          return (await caches.match('/index.html')) || (await caches.match('/'));
        })
    );
    return;
  }

  // D. Application JS & CSS Assets: Strict NETWORK-FIRST with Cache Fallback
  // Prevents stale bundle traps when Vite/bundler outputs new hash names
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return new Response('Asset unavailable offline', { status: 503 });
        })
    );
    return;
  }

  // E. Static Images, Icons, Fonts: Stale-While-Revalidate for instant render speed
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. MESSAGE EVENT - Allow client to trigger skipWaiting manually if desired
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
