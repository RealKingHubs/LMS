// ---------------------------------------------------------------------------
// RealKingHubs Academy service worker
// This file turns the LMS into an installable PWA shell by caching the core
// files needed to reopen the app faster and keep the base UI available offline.
// ---------------------------------------------------------------------------
const CACHE_NAME = 'rkh-academy-shell-v1';

// Keep this list focused on the app shell only.
// Dynamic API content should continue to load from the network at runtime.
const APP_SHELL = [
  './',
  './index.html',
  './app.webmanifest',
  './Page-Css/style.css',
  './Page-Js/data.js',
  './Page-Js/app.js',
  './Page-Js/lms-search.js',
  './Page-Assets/icon-192.svg',
  './Page-Assets/icon-512.svg'
];

self.addEventListener('install', event => {
  // Pre-cache the minimal app shell during install so the LMS can reopen
  // quickly after the first successful visit.
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Remove older cache versions so junior developers can bump the cache name
  // whenever they change the shell files and want a clean refresh.
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (event.request.mode === 'navigate') {
    // Navigation requests should prefer the network when possible, then fall
    // back to the main HTML shell if the learner is offline.
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (!isSameOrigin) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      // For same-origin static assets we cache the network response the first
      // time it is fetched, so later visits can load the shell more quickly.
      return fetch(event.request).then(networkResponse => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return networkResponse;
      });
    })
  );
});
