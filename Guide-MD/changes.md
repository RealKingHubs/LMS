# RealKingHubs Academy - Change Log

This file records what changed in the LMS and why it changed.
Whenever a new feature, fix, refactor, or backend update is added, append a new dated entry here.

## 2026-04-17

### PWA install flow fix

What changed:

- fixed the manifest paths in [app.webmanifest](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/install-as-app/app.webmanifest)
- updated the real worker cache paths in [service-worker.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/install-as-app/service-worker.js)
- added [service-worker-root.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/service-worker-root.js) so the app can be controlled from the site root
- updated [app.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js/app.js) to register the root worker and show fallback install guidance on phones
- added PNG install icons in [icon-192.png](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Assets/icon-192.png) and [icon-512.png](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Assets/icon-512.png)
- updated [index.html](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/index.html) to use the PNG icon for favicon and Apple touch icon

Why it changed:

- the old manifest still pointed to icon paths as if it was stored at the project root
- that caused `404` icon errors and made the service worker cache install fail
- the service worker was also registered from the `install-as-app` folder, which meant it could not control the root LMS page properly
- fixing the scope and icon setup makes the LMS installable as a mobile app again

### Documentation update

What changed:

- updated [about-site.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD/about-site.md) with the new root-worker explanation
- created this [changes.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD/changes.md) file for ongoing maintenance logging

Why it changed:

- junior developers need a running history of why the install setup is structured this way
- future PWA changes should be easier to track and maintain
