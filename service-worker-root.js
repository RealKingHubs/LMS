// ---------------------------------------------------------------------------
// Root-scoped service worker loader
// This small wrapper keeps the real implementation inside install-as-app/
// while still letting the PWA control the whole LMS from the site root.
// ---------------------------------------------------------------------------
importScripts('./install-as-app/service-worker.js');
