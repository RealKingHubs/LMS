# RealKingHubs Academy - Change Log

This file records what changed in the LMS and why it changed.
Whenever a new feature, fix, refactor, or backend update is added, append a new dated entry here.

## 2026-06-28

### Fix: Semester Count Not Applied to Track Structure

What changed:

- updated [admin.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin/admin.js) — fixed `getResolvedTrack` to rebuild the semesters array when `semesterCount` from admin settings differs from the base track's hardcoded count
- updated [app.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js/app.js) — same fix applied on the learner side

Why it changed:

- `getResolvedTrack` was always using `baseTrack.semesters` (the hardcoded array from `data.js`) even when the admin had set a different `semesterCount` in the database
- this meant changing the "Total semesters" input saved the value but the track structure never reflected it
- the fix checks if `settings.semesterCount` differs from the base track's actual semester count and, when it does, calls `buildFallbackTrack` to generate the correct number of semesters before applying overrides

> **Action required**: Run this SQL in your Supabase console if you have not already:
> ```sql
> ALTER TABLE lms_track_settings
>   ADD COLUMN IF NOT EXISTS semester_count INTEGER NOT NULL DEFAULT 3;
> ```

### Fix: GitHub Actions Test Glob Pattern

What changed:

- updated [package.json](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/package.json) — changed test script glob from `tests/**/*.test.js` to `tests/*.test.js`

Why it changed:

- on Linux (the GitHub Actions Ubuntu runner), the shell (`/bin/sh`) does not support `**` globbing by default (`globstar` is disabled)
- the shell was passing the literal string `tests/**/*.test.js` to Node instead of expanding it, causing a "Could not find" error and a failing CI run
- switching to a single `*` glob works on both Windows and Linux, and all 3 JSDOM tests still pass locally

### Automated Testing & CI/CD Setup

What changed:

- created [package.json](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/package.json) to configure dependencies and npm scripts
- created [tests/lms.test.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/tests/lms.test.js) containing JSDOM-based HTML and data layer unit tests
- created [.github/workflows/test.yml](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/.github/workflows/test.yml) to configure the GitHub Actions workflow
- created [.eslintrc.json](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/.eslintrc.json) to configure ESLint code quality rules
- updated [admin.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin/admin.js) to fix an undefined reference bug (`LOGS_REST_HEADERS` -> `SUPABASE_REST_HEADERS`) discovered by the linter
- updated [about-site.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD/about-site.md) to document the new testing and CI/CD architecture

Why it changed:

- to prevent regressions and verify that HTML and JS files load and execute correctly before changes are pushed to production
- to automate syntax checks, code quality linting, and testing on every GitHub push and pull request

### Customizable Track Semester Count

What changed:

- updated [index.html](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin/index.html) to add a "Total semesters" input field in the track creation form
- updated [admin.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin/admin.js) to fetch, render, save, and dynamically generate track structures based on `semester_count`
- updated [app.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js/app.js) to fetch and dynamically build the correct number of semesters on the learner side
- updated [supabase-community-messages.sql](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Database/supabase-community-messages.sql) with the new `semester_count` column and SQL migration helper
- updated [about-site.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD/about-site.md) to document customizable semesters for custom tracks

Why it changed:

- newly added tracks were previously locked to a hardcoded 1-semester/1-month/1-week structure.
- admins need to be able to create custom tracks of varying lengths (e.g. 2 semesters) directly from the dashboard.

## 2026-06-10

### Landing and dashboard visual refresh

What changed:

- updated [index.html](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/index.html) to use the new Inter font import and cleaned landing navigation copy
- updated [style.css](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Css/style.css) with a KodeKloud-inspired navy, blue, and purple visual system
- restyled the landing header, hero, panels, buttons, dashboard sidebar, topbar, KPI cards, and progress accents
- removed the public programme-card area and demo-account shortcut flow from the landing experience
- updated [app.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js/app.js) so old local demo accounts are ignored and stale demo sessions are cleared

Why it changed:

- the landing page and dashboard needed a cleaner course-platform style with stronger structure, softer cards, brighter action colors, and more modern typography
- demo login shortcuts should not appear in the public learner experience

### Register track dropdown fix

What changed:

- updated [app.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js/app.js) so the registration track dropdown always falls back to the base track list if remote settings return no enabled tracks
- added a visible `Select your track` placeholder and preserved the learner's current selection during repopulation
- updated [style.css](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Css/style.css) so native dropdown options render with readable text and background colors

Why it changed:

- the track dropdown could appear blank when no enabled track options were available after settings sync

## 2026-06-04

### Supabase project URL update

What changed:

- replaced the old Supabase base URL in [app.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js/app.js)
- replaced the old Supabase base URL in [admin.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin/admin.js)
- updated the admin troubleshooting URL in [about-site.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD/about-site.md)

Why it changed:

- the previous project hostname was not resolving, so Supabase Auth and backend requests could not start
- the LMS and `/uc-admin/` now point to `https://nigzxgzzvyzecezhstdi.supabase.co`

### Admin login error handling

What changed:

- updated [admin.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin/admin.js) to configure Supabase Auth session handling explicitly
- added a Supabase reachability check when admin sign-in returns `Failed to fetch`
- changed the admin login message so network, blocker, origin, and backend setup problems are easier to understand
- updated [about-site.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD/about-site.md) with admin login troubleshooting notes

Why it changed:

- the raw `Failed to fetch` message does not explain whether the issue is credentials, backend setup, internet access, or a blocked request
- clearer admin errors help junior developers and administrators debug `/uc-admin/` without guessing

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
