# RealKingHubs Academy - About This Site

## Purpose

This project is a browser-based Learning Management System for RealKingHubs Academy.

It was built to support:

- Cloud Engineering learners
- Frontend Engineering learners
- Backend Engineering learners
- learner authentication and profile management
- semester-by-semester curriculum delivery
- week-by-week lesson progress tracking
- community communication by track
- announcements by track
- certificates after full programme completion
- install-as-app support through a Progressive Web App setup
- a separate `/uc-admin/` workspace for backend-style administration

This file is the main junior-developer guide for understanding how the site was built.
Whenever new platform features are added, this file should be updated so the guide stays current.

## Project Structure

Root folder:

- [index.html](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/index.html)
- [README.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/README.md)
- [Page-Js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js)
- [Page-Css](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Css)
- [Page-Assets](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Assets)
- [Database](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Database)
- [Guide-MD](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD)
- [uc-admin](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin)
- [install-as-app](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/install-as-app)

Folder purpose:

- `Page-Js` stores the learner-side JavaScript files.
- `Page-Css` stores the learner-side stylesheet.
- `Page-Assets` stores app icons and visual assets.
- `Database` stores the SQL setup file used in Supabase.
- `Guide-MD` stores internal documentation and change notes.
- `uc-admin` stores the separate admin dashboard UI and logic.
- `install-as-app` stores the PWA manifest and service worker.

## Main Files And What They Do

### 1. Learner HTML shell

File:

- [index.html](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/index.html)

What it does:

- defines the landing page
- defines the auth page
- defines the learner app shell
- loads the shared stylesheet
- loads the learner JavaScript files
- loads the installable app manifest
- exposes the install button and scroll-to-top button

How it works:

1. The landing page is shown first.
2. The auth page is shown when a user chooses sign in or register.
3. The dashboard shell is shown after login.
4. `app.js` swaps the current LMS page into the `appContent` container.

### 2. Learner styling

File:

- [style.css](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Css/style.css)

What it does:

- holds the visual design system
- defines colors, shadows, spacing, and typography
- styles the landing page, auth pages, dashboard, curriculum, community, resources, and certificates
- contains the responsive mobile behavior

How to update it:

1. Change tokens in `:root` first when changing the color system.
2. Change layout sections only after checking which page block they belong to.
3. Keep responsive changes inside the media-query sections near the bottom.

### 3. Shared learner data

File:

- [data.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js/data.js)

What it does:

- stores the base LMS content
- defines track metadata
- defines semesters, months, and weeks
- defines base video libraries
- defines starter announcements and starter community messages

How curriculum data is built:

1. Track-specific video libraries are defined first.
2. Curriculum builders generate learning months and hands-on lab months.
3. Each track is created with 3 semesters.
4. Each semester contains 4 months.
5. Each month contains weekly items.

Important note:

- Base curriculum lives in `data.js`.
- Admin changes do not rewrite `data.js`.
- Admin changes are stored in Supabase override tables and merged at runtime by `app.js`.

### 4. Learner application logic

File:

- [app.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js/app.js)

What it does:

- controls the whole learner LMS flow
- handles auth state
- renders pages
- tracks progress
- merges remote admin overrides
- loads community messages and announcements
- manages certificates
- manages resources page content
- handles PWA install button behavior

High-level flow inside `app.js`:

1. `init()` starts the app.
2. The file binds DOM references.
3. It restores local learner state.
4. It starts Supabase-backed sync where needed.
5. It renders the current page.

Major sections inside `app.js`:

- startup and DOM binding
- storage and normalization helpers
- Supabase sync helpers
- page rendering
- curriculum rendering
- community rendering
- resources rendering
- profile rendering
- certificate rendering
- utility actions

### 5. LMS search

File:

- [lms-search.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Js/lms-search.js)

What it does:

- searches only inside LMS content
- reads the current learner context from `app.js`
- searches pages, semesters, months, lessons, messages, announcements, and resources

How it works:

1. It waits for the topbar search input.
2. It builds a temporary search index from the current LMS context.
3. It scores the results.
4. It opens the related page or lesson when a result is selected.

### 6. Admin dashboard

Files:

- [uc-admin/index.html](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin/index.html)
- [uc-admin/admin.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin/admin.js)
- [uc-admin/admin.css](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/uc-admin/admin.css)

What the admin dashboard does:

- authenticates admins through Supabase Auth
- moderates community messages
- publishes announcements
- edits month and week curriculum overrides
- manages semester resources
- manages learner tracks
- manages learner public profile data

How curriculum editing works:

1. Base curriculum still comes from `data.js`.
2. Admin chooses track, semester, month, and week.
3. Admin saves override values into Supabase.
4. Learner LMS fetches those overrides.
5. Learner LMS merges those values into the live curriculum.

How semester resources work:

1. Admin chooses a track.
2. Admin chooses a semester.
3. Admin enters multiple links, one per line.
4. Admin saves the links into `lms_semester_resources`.
5. Learners see those links inside the Resources page.

### 7. Database setup

File:

- [supabase-community-messages.sql](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Database/supabase-community-messages.sql)

What it does:

- creates the database tables used by the LMS
- creates row-level security policies
- creates admin-only access rules
- creates announcement, curriculum, profile, and semester-resource tables
- creates helper functions for admin auth and learner profile sync

How to use it:

1. Open Supabase SQL Editor.
2. Copy the SQL file contents.
3. Run the file in the correct project.
4. Refresh the LMS and `/uc-admin/`.

Important rule:

- Whenever a new backend feature is added, this SQL file and this guide must both be updated.

### 8. Installable app setup

Files:

- [app.webmanifest](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/install-as-app/app.webmanifest)
- [service-worker.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/install-as-app/service-worker.js)
- [service-worker-root.js](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/service-worker-root.js)
- [icon-192.png](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Assets/icon-192.png)
- [icon-512.png](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Assets/icon-512.png)
- [icon-192.svg](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Assets/icon-192.svg)
- [icon-512.svg](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Page-Assets/icon-512.svg)

What they do:

- `app.webmanifest` tells browsers how to install the LMS like an app
- `service-worker.js` stores the real cache logic for the installable app
- `service-worker-root.js` gives the service worker root scope, which is required for installability when the real worker file lives inside `install-as-app`
- the PNG icons are the main install icons used by phones and Android browsers
- the SVG icons stay as scalable fallbacks for browsers that can use them

How the install flow works:

1. Browser reads the manifest from `index.html`.
2. `app.js` registers `service-worker-root.js` from the project root.
3. The root worker loads the real worker code from `install-as-app/service-worker.js`.
4. Browser decides if install prompt is available.
5. `app.js` shows the `Install app` button when the prompt is available.
6. On phones that do not expose the browser install prompt, the app shows a fallback button and tells the learner how to add the LMS to the home screen manually.

Important install note:

- When install files live in a subfolder, the manifest and worker paths must use root-aware URLs.
- If the worker only runs from the subfolder, it will not control `/index.html`, and browsers may refuse to install the LMS.

## Step-By-Step: How The LMS Was Built

### Step 1. Build the HTML shell

1. Create one main `index.html`.
2. Add sections for landing, auth, and app.
3. Add empty containers for app-rendered content.
4. Load CSS and JS files in the correct order.

### Step 2. Create the visual system

1. Define global tokens in `style.css`.
2. Build reusable classes for buttons, cards, lists, and sections.
3. Add page-specific blocks for landing and dashboard.
4. Add responsive rules for tablet and mobile.

### Step 3. Create the base LMS data

1. Build the track data in `data.js`.
2. Add video libraries.
3. Create helper functions for months and weeks.
4. Build the track objects with semesters and months.

### Step 4. Create the learner app logic

1. Start with DOM binding.
2. Add local storage helpers.
3. Add auth flow.
4. Add page render functions.
5. Add curriculum interactions.
6. Add community interactions.
7. Add progress and certificate logic.
8. Add resources and profile sections.

### Step 5. Add backend support

1. Create Supabase tables and policies.
2. Add learner profile sync functions.
3. Add community and announcement reads/writes.
4. Add admin-only tables and actions.

### Step 6. Add the admin workspace

1. Create a separate `uc-admin` HTML page.
2. Add a separate admin stylesheet.
3. Add a dedicated admin JS file.
4. Authenticate with Supabase Auth.
5. Load and save admin data.

### Step 7. Add install-as-app support

1. Create a manifest file.
2. Create a service worker.
3. Add icons.
4. Register the service worker in `app.js`.
5. Add install button behavior.

## How To Add New Features Safely

### If adding a new learner page

1. Add the page id to `navItems` in `data.js`.
2. Add an icon in `getNavIconMarkup()` in `app.js`.
3. Add topbar title/eyebrow text in `renderTopbar()` in `app.js`.
4. Add a renderer in `renderCurrentView()` in `app.js`.
5. Add styles in `style.css`.
6. Update this file, `changes.md`, and `IMPLEMENTATION_SUMMARY.md`.

### If adding a new admin tool

1. Add the HTML form or panel to `uc-admin/index.html`.
2. Bind the DOM in `uc-admin/admin.js`.
3. Bind the events in `uc-admin/admin.js`.
4. Add the Supabase table or RPC if needed.
5. Style it in `uc-admin/admin.css`.
6. Update this guide and the logs.

### If changing the database

1. Update the SQL file in `Database`.
2. Update the learner/admin JS that depends on it.
3. Run the SQL in Supabase.
4. Document the change in both markdown logs.

## Maintenance Rule

Whenever anything new is added to this LMS, update all three of these files:

- [about-site.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD/about-site.md)
- [changes.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD/changes.md)
- [IMPLEMENTATION_SUMMARY.md](/C:/Users/user/OneDrive/Documents/RealKingHubs%20Academy/Guide-MD/IMPLEMENTATION_SUMMARY.md)

That keeps the project understandable for junior developers and easier to maintain over time.
