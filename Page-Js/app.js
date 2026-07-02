
(function () {
  // ---------------------------------------------------------------------------
  // RealKingHubs Academy LMS
  // This file controls the browser-side application flow:
  // 1. Auth and session state
  // 2. Landing page and founder content
  // 3. Dashboard rendering for every LMS section
  // 4. Community sync, uploads, and message actions
  // 5. Utility helpers used across the app
  // ---------------------------------------------------------------------------

  // Local storage keys keep user data and session data persistent between refreshes.
  
  const BOOKS_KEY = 'rkh_books_catalog';
  const BOOKS_TABLE = 'lms_books';
  const STATE_NAV_KEY = 'rkh_nav_state';
  const COMMUNITY_KEY = 'rkh_fresh_community';
  const SUPABASE_URL = window.RKH_CONFIG?.supabase?.url || '';
  const SUPABASE_ANON_KEY = window.RKH_CONFIG?.supabase?.anonKey || '';
  const COMMUNITY_SYNC_INTERVAL_MS = 15000;
  const COMMUNITY_ATTACHMENT_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;
  const COMMUNITY_ATTACHMENT_BUCKET = 'community-attachments';
  const FEEDBACK_IMAGE_LIMIT = 4;
  const FEEDBACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
  const ANNOUNCEMENTS_TABLE = 'lms_announcements';
  const FEEDBACK_TABLE = 'lms_feedback';
  const TRACK_SETTINGS_TABLE = 'lms_track_settings';
  const MONTH_OVERRIDES_TABLE = 'lms_curriculum_month_overrides';
  const WEEK_OVERRIDES_TABLE = 'lms_curriculum_week_overrides';
  const SEMESTER_RESOURCES_TABLE = 'lms_semester_resources';

  const COMMUNITY_STICKER_PACKS = [
    {
      id: 'celebrate',
      label: 'Celebrate',
      stickers: ['\u{1F389}', '\u{1F44F}', '\u{1F3C6}', '\u{1F3AB}', '\u{1F947}', '\u{2728}', '\u{1F389}']
    },
    {
      id: 'support',
      label: 'Support',
      stickers: ['\u{2705}', '\u{1F91D}', '\u{1F497}', '\u{1F4A1}', '\u{1F4AA}', '\u{1F49C}', '\u{1F64F}']
    },
    {
      id: 'study',
      label: 'Study',
      stickers: ['\u{1F4DA}', '\u{1F4BB}', '\u{1F4C4}', '\u{1F4D6}', '\u{270D}', '\u{1F4DD}', '\u{1F52C}']
    },
    {
      id: 'energy',
      label: 'Energy',
      stickers: ['\u{26A1}', '\u{1F31F}', '\u{1F4AA}', '\u{1F308}', '\u{1F526}', '\u{1F30C}', '\u{1F31B}']
    },
    {
      id: 'reaction',
      label: 'Reaction',
      stickers: ['\u{1F60A}', '\u{1F970}', '\u{1F60E}', '\u{1F642}', '\u{1F914}', '\u{1F441}', '\u{1F44C}']
    }
  ];

  // Founder profile content is centralized here so junior developers can update
  // the landing-page biography and support link without searching the whole app.
  const FOUNDER_PROFILE = {
    email: 'ucking480@gmail.com',
    displayName: 'Odo Kingsley Uchenna',
    role: 'Owner and Founder, RealKingHubs Academy',
    bio: 'RealKingHubs Academy was built to give learners a cleaner and more practical path into modern engineering careers across Cloud, Frontend, and Backend Engineering.',
    supportUrl: 'https://selar.com/showlove/realkinghubs',
    supportLabel: 'Buy me a coffee on Selar'
  };

  const state = {
    currentUser: null,
    currentUserId: null,
    currentView: 'dashboard',
    currentLessonId: null,
    currentLessonVideoIndex: 0,
    currentLiveClassId: null,
    currentCurriculumSemesterId: null,
    currentCurriculumMonthId: null,
    currentResourcesSemesterId: null,
    showOlderMessages: false,
    communityMessages: [],
    communityDraftText: '',
    communityStickerPackOpen: false,
    communitySelectedSticker: '',
    communityAttachment: null,
    communityComposerMessage: null,
    communityDeletingMessageId: null,
    assessmentMessage: null,
    communityTrackId: null,
    communitySyncError: '',
    communitySyncMode: 'local',
    feedbackDraftText: '',
    feedbackAttachment: null,
    feedbackComposerMessage: null,
    remoteAnnouncementsByTrack: {},
    announcementsLoadedByTrack: {},
    trackSettingsById: {},
    semesterResourcesByKey: {},
    curriculumMonthOverridesById: {},
    curriculumWeekOverridesById: {}
  };

  let communitySupabase = null;
  let communityChannel = null;
  let communityPollHandle = null;
  let remoteProfileSyncHealthy = true;
  let remoteProfileSyncWarningShown = false;
  let deferredInstallPrompt = null;
  let lastObservedAuthUserId = null;

  // Cached DOM references are stored here after startup so the app does not keep
  // querying the same elements every time a view changes.
  const dom = {};

  document.addEventListener('DOMContentLoaded', () => {
    void init();
  });
  window.addEventListener('storage', handleStorageSync);

  // Startup flow: connect to the DOM, restore data, initialize sync, and open
  // the correct surface depending on whether a learner is already signed in.
  async function init() {
    bindDom();
    void registerServiceWorker();
    seedStorage();
    hydrateState();
    initializeCommunitySync();
    renderFounderShowcase();
    populateRegisterTrackSelect();
    bindEvents();
    showAppShellReadyState(false);

    await bootstrapRemoteLmsData();

    // Supabase onAuthStateChange (set up in initializeCommunitySync) will
    // automatically restore the session if one exists and call openApp().
    // If no session is restored, the user stays on the landing page.
    if (getCurrentUser()) {
      const profileAvailable = await syncCurrentUserProfileFromRemote();
      if (profileAvailable === false) {
        showAuthPage('login');
        document.documentElement.classList.remove('preload-authenticated');
        return;
      }
      openApp(state.currentView || 'dashboard');
    } else {
      showLandingPage();
    }
    document.documentElement.classList.remove('preload-authenticated');
    showAppShellReadyState(true);
  }

  function bindDom() {
    dom.landingPage = document.getElementById('landingPage');
    dom.authPage = document.getElementById('authPage');
    dom.appPage = document.getElementById('appPage');
    dom.founderAvatar = document.getElementById('founderAvatar');
    dom.founderName = document.getElementById('founderName');
    dom.founderRole = document.getElementById('founderRole');
    dom.founderBio = document.getElementById('founderBio');
    dom.founderSupportLink = document.getElementById('founderSupportLink');
    dom.loginForm = document.getElementById('loginForm');
    dom.registerForm = document.getElementById('registerForm');
    dom.loginTab = document.getElementById('loginTab');
    dom.registerTab = document.getElementById('registerTab');
    dom.forgotTab = document.getElementById('forgotTab');
    dom.resetTab = document.getElementById('resetTab');
    dom.forgotPasswordForm = document.getElementById('forgotPasswordForm');
    dom.resetPasswordForm = document.getElementById('resetPasswordForm');
    dom.authMessage = document.getElementById('authMessage');
    dom.registerTrack = document.getElementById('registerTrack');
    dom.installAppBtn = document.getElementById('installAppBtn');
    dom.landingMenuToggle = document.getElementById('landingMenuToggle');
    dom.landingMenuDrawer = document.getElementById('landingMenuDrawer');
    dom.landingMenuOverlay = document.getElementById('landingMenuOverlay');
    dom.appSidebar = document.getElementById('appSidebar');
    dom.appSidebarOverlay = document.getElementById('appSidebarOverlay');
    dom.appSidebarToggle = document.getElementById('appSidebarToggle');
    dom.appNav = document.getElementById('appNav');
    dom.appContent = document.getElementById('appContent');
    dom.pageTitle = document.getElementById('pageTitle');
    dom.pageEyebrow = document.getElementById('pageEyebrow');
    dom.topbarAlerts = document.getElementById('topbarAlerts');
    dom.topbarProgress = document.getElementById('topbarProgress');
    dom.topbarAvatar = document.getElementById('topbarAvatar');
    dom.appFooterText = document.getElementById('appFooterText');
    dom.scrollTopButton = document.getElementById('scrollTopButton');
  }

  function bindEvents() {
    dom.loginForm?.addEventListener('submit', handleLogin);
    dom.registerForm?.addEventListener('submit', handleRegister);
    dom.forgotPasswordForm?.addEventListener('submit', handleForgotPassword);
    dom.resetPasswordForm?.addEventListener('submit', handleResetPassword);

    document.addEventListener('click', event => {
      const target = event.target.closest('[data-home-action], [data-action]');
      if (!target) return;

      const homeAction = target.getAttribute('data-home-action');
      if (homeAction === 'signin') {
        event.preventDefault();
        showAuthPage('login');
        return;
      }

      if (homeAction === 'register') {
        event.preventDefault();
        showAuthPage('register');
        return;
      }

      if (homeAction === 'install') {
        event.preventDefault();
        void installRkhApp();
        return;
      }

      const action = target.getAttribute('data-action');
      if (action === 'toggle-landing-menu') {
        event.preventDefault();
        toggleLandingMenu();
        return;
      }

      if (action === 'close-landing-menu') {
        event.preventDefault();
        closeLandingMenu();
        return;
      }

      if (action === 'show-landing') {
        event.preventDefault();
        showLandingPage();
        return;
      }

      if (action === 'switch-auth-mode') {
        event.preventDefault();
        switchAuthMode(target.getAttribute('data-auth-mode') || 'login');
        return;
      }

      if (action === 'toggle-password') {
        event.preventDefault();
        togglePasswordVisibility(target.getAttribute('data-password-input') || '', target);
        return;
      }

      if (action === 'close-app-sidebar') {
        event.preventDefault();
        closeAppSidebar();
        return;
      }

      if (action === 'logout') {
        event.preventDefault();
        void logoutUser();
        return;
      }

      if (action === 'toggle-app-sidebar') {
        event.preventDefault();
        toggleAppSidebar();
        return;
      }

      if (action === 'scroll-to-platform') {
        event.preventDefault();
        const platformSection = document.getElementById('platformFlow');
        platformSection?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    window.addEventListener('resize', handleViewportResize);
    window.addEventListener('scroll', handleScrollVisibility, { passive: true });
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('keydown', handleGlobalEscapes);

    dom.landingMenuDrawer?.querySelectorAll('a, button').forEach(element => {
      element.addEventListener('click', () => closeLandingMenu());
    });

    handleScrollVisibility();
    updateInstallButton();
  }

  function handleViewportResize() {
    if (window.innerWidth > 820) {
      closeLandingMenu();
      closeAppSidebar();
    }
  }

  function handleGlobalEscapes(event) {
    if (event.key !== 'Escape') return;
    closeLandingMenu();
    closeAppSidebar();
  }

  function handleScrollVisibility() {
    dom.scrollTopButton?.classList.toggle('scroll-top-visible', window.scrollY > 120);
  }

  function handleBeforeInstallPrompt(event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButton();
  }

  function handleAppInstalled() {
    deferredInstallPrompt = null;
    updateInstallButton();
  }

  function updateInstallButton() {
    if (!dom.installAppBtn) return;
    const canShowFallback = isInstallFallbackCandidate();
    dom.installAppBtn.classList.toggle('hidden', !deferredInstallPrompt && !canShowFallback);
    dom.installAppBtn.textContent = deferredInstallPrompt ? 'Install app' : 'Add to home screen';
  }

  function setOverlayLockState() {
    const hasOpenOverlay =
      dom.landingPage?.classList.contains('menu-open') ||
      dom.appPage?.classList.contains('sidebar-open');
    document.body.classList.toggle('overlay-open', Boolean(hasOpenOverlay));
  }

  // Mobile navigation is intentionally separate from the desktop layout so the
  // landing page does not collapse into a tall stacked header on small screens.
  function toggleLandingMenu(forceOpen) {
    if (!dom.landingPage) return;
    const nextState = typeof forceOpen === 'boolean'
      ? forceOpen
      : !dom.landingPage.classList.contains('menu-open');
    dom.landingPage.classList.toggle('menu-open', nextState);
    dom.landingMenuToggle?.setAttribute('aria-expanded', nextState ? 'true' : 'false');
    setOverlayLockState();
  }

  function closeLandingMenu() {
    toggleLandingMenu(false);
  }

  // The signed-in workspace uses its own drawer on mobile so the top bar stays
  // clean while still giving learners fast access to the full navigation.
  function toggleAppSidebar(forceOpen) {
    if (!dom.appPage) return;
    const nextState = typeof forceOpen === 'boolean'
      ? forceOpen
      : !dom.appPage.classList.contains('sidebar-open');
    dom.appPage.classList.toggle('sidebar-open', nextState);
    dom.appSidebarToggle?.setAttribute('aria-expanded', nextState ? 'true' : 'false');
    setOverlayLockState();
  }

  function closeAppSidebar() {
    toggleAppSidebar(false);
  }

  // A single helper keeps the password visibility behavior consistent across
  // sign-in and registration without duplicating button logic in the markup.
  function togglePasswordVisibility(inputId, triggerButton) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const shouldShowPassword = input.type === 'password';
    input.type = shouldShowPassword ? 'text' : 'password';

    if (triggerButton) {
      triggerButton.textContent = shouldShowPassword ? 'Hide' : 'Show';
      triggerButton.setAttribute('aria-pressed', shouldShowPassword ? 'true' : 'false');
    }
  }

  // ---------------------------------------------------------------------------
  // Data bootstrapping and normalization
  // These helpers prepare a stable app state from local storage.
  // ---------------------------------------------------------------------------
  function seedStorage() {
    if (!localStorage.getItem(COMMUNITY_KEY)) {
      localStorage.setItem(COMMUNITY_KEY, JSON.stringify(window.RKH_DATA.demoMessages));
    }
  }

  function hydrateState() {
    state.communityMessages = readJson(COMMUNITY_KEY, window.RKH_DATA.demoMessages)
      .map(normalizeCommunityMessage)
      .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));

    // Restore navigation state from localStorage so the user returns to
    // their last-open view after a page reload.
    const navState = readJson(STATE_NAV_KEY, null);
    if (navState) {
      state.currentView = navState.currentView || 'dashboard';
      state.currentLessonId = navState.currentLessonId || null;
      state.currentLessonVideoIndex = Number(navState.currentLessonVideoIndex) || 0;
      state.currentLiveClassId = navState.currentLiveClassId || null;
      state.currentCurriculumSemesterId = navState.currentCurriculumSemesterId || null;
      state.currentCurriculumMonthId = navState.currentCurriculumMonthId || null;
      state.currentResourcesSemesterId = navState.currentResourcesSemesterId || null;
    }
  }

  function normalizeUser(user) {
    return {
      ...user,
      completedLessonIds: Array.isArray(user.completedLessonIds) ? user.completedLessonIds : [],
      joinedClassIds: Array.isArray(user.joinedClassIds) ? user.joinedClassIds : [],
      assessmentSubmissions: user.assessmentSubmissions && typeof user.assessmentSubmissions === 'object' ? user.assessmentSubmissions : {},
      certificateIssuedAt: user.certificateIssuedAt || '',
      lastSeenCommunityAt: user.lastSeenCommunityAt || '',
      lastSeenAnnouncementsAt: user.lastSeenAnnouncementsAt || '',
      lastSeenAssessmentsAt: user.lastSeenAssessmentsAt || ''
    };
  }

  function readJson(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
      console.warn(`Failed to read ${key}`, error);
      return fallback;
    }
  }

  async function persistUsers() {
    const user = getCurrentUser();
    if (user && communitySupabase) {
      await syncUserProfileToRemote(user);
    }
  }

  // One-time utility: clear stored avatar data so the app uses generated photocard
  // Runs only once per browser (guarded by localStorage flag) to avoid repeated wipes.
  function clearStoredAvatars() {
    try {
      // Clear current user's avatar
      const user = getCurrentUser();
      if (user && user.avatar) {
        user.avatar = '';
        try { persistUsers(); } catch (e) {}
      }

      // Scan localStorage entries for any 'avatar' fields and clear them
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          let changed = false;

          function scrub(obj) {
            if (!obj || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) {
              return obj.map(item => scrub(item));
            }
            Object.keys(obj).forEach(k => {
              if (k === 'avatar' && (typeof obj[k] === 'string' && obj[k].length)) {
                obj[k] = '';
                changed = true;
              } else if (typeof obj[k] === 'object') {
                scrub(obj[k]);
              }
            });
            return obj;
          }

          const cleaned = scrub(parsed);
          if (changed) {
            localStorage.setItem(key, JSON.stringify(cleaned));
          }
        } catch (e) {
          // ignore non-JSON or read errors
        }
      }

      // Re-render UI to pick up changes
      try { renderAppShell(); } catch (e) {}
    } catch (e) {
      console.warn('clearStoredAvatars failed', e);
    }
  }

  try {
    if (!localStorage.getItem('rkh_avatars_cleared_v1')) {
      clearStoredAvatars();
      localStorage.setItem('rkh_avatars_cleared_v1', 'true');
    }
  } catch (e) {}

  function readStoredCommunityMessages() {
    return readJson(COMMUNITY_KEY, window.RKH_DATA.demoMessages)
      .map(normalizeCommunityMessage)
      .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
  }

  function writeStoredCommunityMessages(messages) {
    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(messages));
  }

  function setCommunityMessages(messages, options = {}) {
    const normalized = messages
      .map(normalizeCommunityMessage)
      .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));

    const previousSignature = state.communityMessages.map(message => `${message.id}:${message.createdAt}`).join('|');
    const nextSignature = normalized.map(message => `${message.id}:${message.createdAt}`).join('|');

    state.communityMessages = normalized;

    if (!options.silent && previousSignature !== nextSignature && getCurrentUser()) {
      renderAppShell();
    }
  }

  // Community messages can arrive in different shapes from local storage or
  // Supabase, so this normalizer gives the rest of the app one predictable format.
  function normalizeCommunityMessage(message) {
    const payload = parseCommunityPayload(message.content ?? message.body ?? '');
    const trackId = message.trackId || message.track_id || message.room || inferTrackId(message.authorTrack || message.author_track);
    const authorTrack = message.authorTrack || message.author_track || window.RKH_DATA.tracks[trackId]?.label || 'Community';
    const authorName = message.authorName || message.author_name || message.author_track || message.authorTrack || 'Learner';
    return {
      id: String(message.id),
      authorId: message.authorId || message.author_id || '',
      authorName,
      authorEmail: message.authorEmail || message.author_email || '',
      authorTrack,
      trackId,
      body: payload.body || '',
      sticker: payload.sticker || '',
      attachment: payload.attachment || null,
      createdAt: message.createdAt || message.created_at || new Date().toISOString()
    };
  }

  function normalizeAnnouncement(item, fallbackTrackId = '') {
    return {
      id: String(item.id),
      trackId: item.trackId || item.track_id || fallbackTrackId,
      title: item.title || 'Announcement',
      body: item.body || '',
      date: item.date || formatDateTime(item.createdAt || item.created_at),
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
      createdBy: item.createdBy || item.created_by || ''
    };
  }

  function setTrackAnnouncements(trackId, announcements, options = {}) {
    const normalized = announcements
      .map(item => normalizeAnnouncement(item, trackId))
      .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));

    const previousSignature = (state.remoteAnnouncementsByTrack[trackId] || [])
      .map(item => `${item.id}:${item.createdAt}`)
      .join('|');
    const nextSignature = normalized
      .map(item => `${item.id}:${item.createdAt}`)
      .join('|');

    state.remoteAnnouncementsByTrack[trackId] = normalized;
    state.announcementsLoadedByTrack[trackId] = true;

    if (!options.silent && previousSignature !== nextSignature && getCurrentUser() && getCurrentTrack()?.id === trackId) {
      renderAppShell();
    }
  }

  function getTrackAnnouncements(track) {
    if (!track) return [];
    if (state.announcementsLoadedByTrack[track.id]) {
      return state.remoteAnnouncementsByTrack[track.id] || [];
    }
    return [...(track.announcements || [])].sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
  }

  function getSemesterResources(trackId, semesterId) {
    return state.semesterResourcesByKey[`${trackId}::${semesterId}`] || [];
  }

  function buildResourceLabel(url, index) {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      return lastPart ? decodeURIComponent(lastPart) : parsed.hostname;
    } catch (error) {
      return `Resource link ${index + 1}`;
    }
  }


  function normalizeRemoteArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return trimmed.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
    }
  }
  function getYouTubeVideoId(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed) return '';

    const directMatch = trimmed.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
    if (directMatch) return directMatch[1];

    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
      if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        const videoId = parsed.searchParams.get('v');
        return /^[a-zA-Z0-9_-]{11}$/.test(videoId || '') ? videoId : '';
      }
    } catch (error) {
      return '';
    }

    return '';
  }

  function toEmbedUrl(url) {
    if (!url) return '';
    const trimmed = String(url).trim();

    // YouTube matches normal watch links, short links, embed links, Shorts, and Live URLs.
    const youtubeVideoId = getYouTubeVideoId(trimmed);
    if (youtubeVideoId) {
      return `https://www.youtube-nocookie.com/embed/${youtubeVideoId}`;
    }

    // Vimeo matches:
    // - https://vimeo.com/VIDEO_ID
    // - https://player.vimeo.com/video/VIDEO_ID
    const vimeoMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?([0-9]+)/i);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return trimmed;
  }
  // Weekly lesson content can come from the base curriculum or admin overrides.
  // These helpers normalize both sources into one consistent shape so the
  // learner player can support playlists and richer resources without knowing
  // where the data came from.
  function normalizeLessonVideoItems(videoItems, fallbackVideoUrl = '') {
    const resolved = Array.isArray(videoItems)
      ? videoItems
      : typeof videoItems === 'string'
        ? videoItems.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean)
        : [];
    const normalized = resolved
      .map((item, index) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          return trimmed ? { title: `Video ${index + 1}`, url: toEmbedUrl(trimmed) } : null;
        }

        if (item && typeof item === 'object') {
          const url = String(item.url || item.videoUrl || item.video_url || '').trim();
          if (!url) return null;
          return {
            title: String(item.title || `Video ${index + 1}`).trim(),
            url: toEmbedUrl(url)
          };
        }

        return null;
      })
      .filter(Boolean);

    if (normalized.length) return normalized;
    if (fallbackVideoUrl) {
      return [{ title: 'Lesson video', url: toEmbedUrl(fallbackVideoUrl) }];
    }
    return [];
  }

  function normalizeLessonResourceItems(resourceItems) {
    const normalized = (Array.isArray(resourceItems) ? resourceItems : [])
      .map((item, index) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (!trimmed) return null;
          return {
            title: trimmed,
            url: '',
            kind: index === 0 ? 'resource' : 'resource'
          };
        }

        if (item && typeof item === 'object') {
          const title = String(item.title || item.label || '').trim();
          const url = String(item.url || '').trim();
          const kind = String(item.kind || 'resource').trim();
          if (!title && !url) return null;
          return {
            title: title || 'Resource',
            url,
            kind
          };
        }

        return null;
      })
      .filter(Boolean);

    // These placeholders were useful in early mockups, but they should not
    // clutter the learner experience once real resources are being managed.
    return normalized.filter(item => {
      const lowered = item.title.toLowerCase();
      return !['lesson video', 'reading note', 'practice task', 'hands-on walkthrough', 'implementation checklist', 'build notes', 'testing guide', 'debug checklist', 'review notes', 'showcase guide', 'presentation template', 'reflection notes', 'lab brief', 'environment checklist', 'planning guide'].includes(lowered);
    });
  }

  function parseCommunityPayload(value) {
    if (typeof value !== 'string') {
      return { body: '', sticker: '', attachment: null };
    }

    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && ('body' in parsed || 'sticker' in parsed || 'attachment' in parsed)) {
        return {
          body: typeof parsed.body === 'string' ? parsed.body : '',
          sticker: typeof parsed.sticker === 'string' ? parsed.sticker : '',
          attachment: parsed.attachment && typeof parsed.attachment === 'object' ? parsed.attachment : null
        };
      }
    } catch (error) {
      return { body: value, sticker: '', attachment: null };
    }

    return { body: value, sticker: '', attachment: null };
  }

  function serializeCommunityPayload(payload) {
    return JSON.stringify({
      body: payload.body || '',
      sticker: payload.sticker || '',
      attachment: payload.attachment || null
    });
  }

  // ---------------------------------------------------------------------------
  // Current user helpers and shared identity rendering
  // ---------------------------------------------------------------------------
  function getCurrentUser() {
    return state.currentUser || null;
  }

  function getCurrentTrack() {
    const user = getCurrentUser();
    return user ? getResolvedTrack(user.trackId) : null;
  }

  // Track settings and curriculum overrides are merged into the static data layer
  // so the LMS can stay fast in the browser while still supporting admin edits.
  function getResolvedTracks() {
    const trackIds = Array.from(new Set([
      ...Object.keys(window.RKH_DATA?.tracks || {}),
      ...Object.keys(state.trackSettingsById || {})
    ]));

    return trackIds
      .map(trackId => getResolvedTrack(trackId))
      .filter(Boolean)
      .sort((left, right) => {
        const leftOrder = Number.isFinite(left.sortOrder) ? left.sortOrder : 0;
        const rightOrder = Number.isFinite(right.sortOrder) ? right.sortOrder : 0;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.label.localeCompare(right.label);
      });
  }

  function buildFallbackTrack(trackId, trackSettings = {}) {
    const semesters = [];
    const totalSemesters = Number(trackSettings.semesterCount || 3);
    for (let s = 1; s <= totalSemesters; s++) {
      const months = [];
      for (let m = 1; m <= 4; m++) {
        const weeks = [];
        for (let w = 1; w <= 4; w++) {
          weeks.push({
            id: `${trackId}-s${s}-m${m}-w${w}`,
            title: `Week ${w}: Lesson content`,
            objective: `Study the core concepts for week ${w} and complete the guided practice.`,
            type: m === 4 ? 'lab' : 'learning',
            videoUrl: '',
            videoUrls: [],
            resources: [],
            resourceItems: []
          });
        }
        months.push({
          id: `${trackId}-semester-${s}-month-${m}`,
          label: `Month ${m}`,
          title: m === 4 ? 'Hands-on Lab' : `Topic block ${m}`,
          summary: m === 4 ? 'A practical lab month focused on guided build work, testing, and final showcase delivery.' : `Curriculum block for Month ${m}.`,
          phase: m === 4 ? 'Hands-on Lab' : 'Learning',
          weeks
        });
      }
      semesters.push({
        id: `${trackId}-semester-${s}`,
        label: `Semester ${s}`,
        title: s === 1 ? 'Core Foundations' : s === 2 ? 'Advanced Delivery' : 'Production Integration',
        months
      });
    }

    return {
      id: trackId,
      label: trackSettings.label || 'Custom track',
      summary: trackSettings.summary || 'Custom programme track created from the admin dashboard.',
      outcomes: Array.isArray(trackSettings.outcomes) && trackSettings.outcomes.length
        ? trackSettings.outcomes
        : ['Track outcomes'],
      liveClasses: [],
      announcements: [],
      assessments: [],
      semesters
    };
  }

  function getAvailableTracks() {
    const resolvedTracks = getResolvedTracks();
    const enabledTracks = resolvedTracks.filter(track => track.isEnabled !== false);
    return enabledTracks.length ? enabledTracks : resolvedTracks;
  }

  function getResolvedTrack(trackId) {
    const trackSettings = state.trackSettingsById[trackId] || {};

    // Determine the effective semester count: prefer the admin-set value, otherwise
    // fall back to however many semesters the base track already has.
    const effectiveSemesterCount = Number.isFinite(trackSettings.semesterCount) ? trackSettings.semesterCount : null;

    // Resolve the base track. For custom (admin-created) tracks there is no entry in
    // RKH_DATA so we build a fallback. For predefined tracks we check whether the
    // admin has changed the semester count; if so we rebuild the semesters array to
    // match instead of using the hardcoded 3-semester structure from data.js.
    let baseTrack = window.RKH_DATA?.tracks?.[trackId] || null;
    if (baseTrack && effectiveSemesterCount !== null && baseTrack.semesters.length !== effectiveSemesterCount) {
      baseTrack = {
        ...baseTrack,
        semesters: buildFallbackTrack(trackId, { semesterCount: effectiveSemesterCount }).semesters
      };
    } else if (!baseTrack) {
      baseTrack = buildFallbackTrack(trackId, trackSettings);
    }

    if (!baseTrack) return null;

    const resolvedOutcomes = Array.isArray(trackSettings.outcomes) && trackSettings.outcomes.length
      ? trackSettings.outcomes
      : baseTrack.outcomes;

    return {
      ...baseTrack,
      label: trackSettings.label || baseTrack.label,
      summary: trackSettings.summary || baseTrack.summary,
      outcomes: resolvedOutcomes,
      isEnabled: trackSettings.isEnabled !== false,
      sortOrder: Number.isFinite(trackSettings.sortOrder) ? trackSettings.sortOrder : 0,
      semesterCount: effectiveSemesterCount ?? (baseTrack.semesters?.length || 3),
      semesters: baseTrack.semesters.map(semester => ({
        ...semester,
        months: semester.months.map(month => {
          const monthOverride = state.curriculumMonthOverridesById[month.id] || {};
          return {
            ...month,
            label: monthOverride.label || month.label,
            title: monthOverride.title || month.title,
            summary: monthOverride.summary || month.summary,
            phase: monthOverride.phase || month.phase,
            weeks: month.weeks.map(week => {
              const weekOverride = state.curriculumWeekOverridesById[week.id] || {};
              const videoItems = normalizeLessonVideoItems(
                weekOverride.videoUrls,
                weekOverride.videoUrl || week.videoUrl || ''
              );
              const resourceItems = normalizeLessonResourceItems(
                Array.isArray(weekOverride.resourceItems) && weekOverride.resourceItems.length
                  ? weekOverride.resourceItems
                  : Array.isArray(weekOverride.resources) && weekOverride.resources.length
                    ? weekOverride.resources
                    : week.resourceItems || week.resources || []
              );
              return {
                ...week,
                title: weekOverride.title || week.title,
                objective: weekOverride.objective || week.objective,
                type: weekOverride.type || week.type,
                videoUrl: videoItems[0]?.url || weekOverride.videoUrl || week.videoUrl,
                videoUrls: videoItems.map(item => item.url),
                videoItems,
                resourceItems,
                resources: resourceItems.map(item => item.title)
              };
            })
          };
        })
      }))
    };
  }

  function getFounderUser() {
    const user = getCurrentUser();
    if (user && user.email && user.email.toLowerCase() === FOUNDER_PROFILE.email.toLowerCase()) {
      return user;
    }
    return null;
  }

  // All fallback avatars are generated as inline SVG images so the interface
  // still shows a real picture even before a learner uploads a profile photo.
  // Generated avatar fallbacks let the LMS show a visual identity even when
  // a learner has not uploaded a profile image yet.
  function createGeneratedAvatar(fullName) {
    const initials = getNameInitials(fullName);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" role="img" aria-label="${escapeAttribute(fullName)}">
        <defs>
          <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
        </defs>
        <rect width="240" height="240" rx="72" fill="url(#avatarGradient)" />
        <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="84" font-weight="700" letter-spacing="6">
          ${escapeHtml(initials)}
        </text>
      </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function getAvatarSrc(user, fallbackName = '') {
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || fallbackName || 'Photocard';
    return user?.avatar || createGeneratedAvatar(fullName);
  }

  function renderFounderShowcase() {
    if (!dom.founderAvatar || !dom.founderName || !dom.founderRole || !dom.founderBio || !dom.founderSupportLink) {
      return;
    }

    const founderUser = getFounderUser();
    const founderName = founderUser
      ? `${founderUser.firstName} ${founderUser.lastName}`.trim()
      : FOUNDER_PROFILE.displayName;
    const founderBio = founderUser?.bio?.trim() || founderUser?.headline?.trim() || FOUNDER_PROFILE.bio;

    dom.founderAvatar.innerHTML = `<img src="${getAvatarSrc(founderUser, founderName)}" alt="${escapeAttribute(founderName)}" />`;
    dom.founderName.textContent = founderName;
    dom.founderRole.textContent = FOUNDER_PROFILE.role;
    dom.founderBio.textContent = founderBio;
    dom.founderSupportLink.href = FOUNDER_PROFILE.supportUrl;
    dom.founderSupportLink.textContent = FOUNDER_PROFILE.supportLabel;
  }

  // ---------------------------------------------------------------------------
  // Curriculum defaults and community sync setup
  // ---------------------------------------------------------------------------
  function ensureCurriculumDefaults(track) {
    const allSemesters = track.semesters || [];
    const allMonths = allSemesters.flatMap(semester => semester.months || []);

    if (!allSemesters.some(semester => semester.id === state.currentCurriculumSemesterId)) {
      state.currentCurriculumSemesterId = null;
    }

    if (!allMonths.some(month => month.id === state.currentCurriculumMonthId)) {
      state.currentCurriculumMonthId = null;
    }
  }

  function ensureCommunityFeedForTrack(track) {
    if (!track) return;

    if (!communitySupabase) {
      state.communityTrackId = track.id;
      const localMessages = readStoredCommunityMessages().filter(message => message.trackId === track.id);
      setCommunityMessages(localMessages, { silent: true });
      return;
    }

    if (state.communityTrackId !== track.id) {
      state.communityTrackId = track.id;
      const localMessages = readStoredCommunityMessages().filter(message => message.trackId === track.id);
      setCommunityMessages(localMessages, { silent: true });
      subscribeToCommunityTrack(track.id);
      void refreshCommunityMessages(track.id);
    }
  }

  function ensureAnnouncementsFeedForTrack(track) {
    if (!track || !communitySupabase) return;
    if (!state.announcementsLoadedByTrack[track.id]) {
      void refreshTrackAnnouncements(track.id, { silent: true });
    }
  }

  async function bootstrapRemoteLmsData() {
    if (!communitySupabase) return;

    await Promise.all([
      refreshTrackSettings({ silent: true }),
      refreshCurriculumOverrides({ silent: true }),
      refreshSemesterResources({ silent: true })
    ]);
  }

  function applyAuthenticatedSession(session) {
    if (!session?.user?.id) return false;

    const availableTrackIds = Object.keys(window.RKH_DATA?.tracks || {});
    const fallbackTrackId = window.RKH_AUTH_HELPERS?.resolveEffectiveTrackId(session?.user?.user_metadata || {}, availableTrackIds) || '';
    const userSnapshot = window.RKH_AUTH_HELPERS?.buildAuthenticatedUserSnapshot(session, fallbackTrackId) || null;

    if (!userSnapshot) return false;

    lastObservedAuthUserId = userSnapshot.id;
    state.currentUserId = userSnapshot.id;
    state.currentUser = userSnapshot;

    if (dom.landingPage && dom.landingPage.style.display !== 'none') {
      openApp(state.currentView || 'dashboard');
    }

    void syncCurrentUserProfileFromRemote();
    return true;
  }

  // The community layer prefers Supabase for cross-browser sync, but the app still
  // keeps local fallbacks so development and offline testing remain possible.
  function initializeCommunitySync() {
    if (!window.supabase?.createClient || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      state.communitySyncMode = 'local';
      return;
    }

    communitySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    state.communitySyncMode = 'remote';

    communitySupabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        showAuthPage('login');
        switchAuthMode('reset');
        return;
      }

      const action = window.RKH_AUTH_HELPERS?.resolveAuthEventAction(event, session, lastObservedAuthUserId) || 'keep-current';
      const sessionUserId = session?.user?.id || null;

      if (action === 'show-landing' && sessionUserId !== lastObservedAuthUserId) {
        state.currentUserId = null;
        state.currentUser = null;
        lastObservedAuthUserId = null;
        if (dom.appPage && dom.appPage.style.display === 'flex') {
          showLandingPage();
        }
        return;
      }

      if (action === 'open-dashboard' && sessionUserId) {
        applyAuthenticatedSession(session);
        return;
      }

      if (action === 'keep-current' && sessionUserId && sessionUserId === lastObservedAuthUserId) {
        return;
      }

      if (!sessionUserId && lastObservedAuthUserId) {
        state.currentUserId = null;
        state.currentUser = null;
        lastObservedAuthUserId = null;
        if (dom.appPage && dom.appPage.style.display === 'flex') {
          showLandingPage();
        }
      }
    });

    startCommunityPolling();
  }

  function startCommunityPolling() {
    if (communityPollHandle) {
      window.clearInterval(communityPollHandle);
    }

    communityPollHandle = window.setInterval(() => {
      const track = getCurrentTrack();
      if (!track) return;
      void refreshCommunityMessages(track.id, { silent: true });
      void refreshTrackAnnouncements(track.id, { silent: true });
      void refreshTrackSettings({ silent: true });
      void refreshCurriculumOverrides({ silent: true });
      void refreshSemesterResources({ silent: true });
      void fetchBooksCatalog();
    }, COMMUNITY_SYNC_INTERVAL_MS);
  }

  function subscribeToCommunityTrack(trackId) {
    if (!communitySupabase) return;

    if (communityChannel) {
      communitySupabase.removeChannel(communityChannel);
      communityChannel = null;
    }

    communityChannel = communitySupabase
      .channel(`community-room-${trackId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_messages',
          filter: `room=eq.${trackId}`
        },
        () => {
          void refreshCommunityMessages(trackId, { silent: true });
        }
      )
      .subscribe();
  }

  async function refreshCommunityMessages(trackId, options = {}) {
    if (!trackId) return;
    const previousError = state.communitySyncError;

    if (!communitySupabase) {
      const localMessages = readStoredCommunityMessages().filter(message => message.trackId === trackId);
      setCommunityMessages(localMessages, options);
      return;
    }

    const { data, error } = await communitySupabase
      .from('community_messages')
      .select('id, author_name, author_email, room, content, created_at')
      .eq('room', trackId)
      .order('created_at', { ascending: false });

    if (error) {
      state.communitySyncError = error.message;
      state.communitySyncMode = 'local';
      const localMessages = readStoredCommunityMessages().filter(message => message.trackId === trackId);
      setCommunityMessages(localMessages, options);
      if (previousError !== state.communitySyncError && getCurrentUser()) {
        renderAppShell();
      }
      return;
    }

    state.communitySyncError = '';
    state.communitySyncMode = 'remote';
    setCommunityMessages(data || [], options);
    if (previousError && !state.communitySyncError && getCurrentUser()) {
      renderAppShell();
    }
  }

  async function refreshTrackAnnouncements(trackId, options = {}) {
    if (!trackId || !communitySupabase) return;

    const { data, error } = await communitySupabase
      .from(ANNOUNCEMENTS_TABLE)
      .select('id, track_id, title, body, created_at, created_by')
      .eq('track_id', trackId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Announcement sync failed', error);
      return;
    }

    setTrackAnnouncements(trackId, (data || []).map(item => ({
      ...item,
      date: formatDateTime(item.created_at)
    })), options);
  }

  // Track settings and curriculum overrides come from public read-only tables so
  // the admin workspace can tune the LMS structure without changing data.js.
  async function refreshTrackSettings(options = {}) {
    if (!communitySupabase) return;

    const { data, error } = await communitySupabase
      .from(TRACK_SETTINGS_TABLE)
      .select('id, label, summary, outcomes, is_enabled, sort_order, semester_count')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Track settings sync failed', error);
      return;
    }

    const prevSignature = JSON.stringify(state.trackSettingsById);

    state.trackSettingsById = Object.fromEntries((data || []).map(item => [
      item.id,
      {
        label: item.label || '',
        summary: item.summary || '',
        outcomes: Array.isArray(item.outcomes) ? item.outcomes : [],
        isEnabled: item.is_enabled !== false,
        sortOrder: Number(item.sort_order || 0),
        semesterCount: Number(item.semester_count || 3)
      }
    ]));

    const nextSignature = JSON.stringify(state.trackSettingsById);

    if (prevSignature !== nextSignature || !options.silent) {
      populateRegisterTrackSelect();
      if (getCurrentUser()) renderAppShell();
    }
  }

  async function refreshCurriculumOverrides(options = {}) {
    if (!communitySupabase) return;

    const [{ data: monthData, error: monthError }, { data: weekData, error: weekError }] = await Promise.all([
      communitySupabase
        .from(MONTH_OVERRIDES_TABLE)
        .select('month_id, label, title, summary, phase'),
      communitySupabase
        .from(WEEK_OVERRIDES_TABLE)
        .select('week_id, title, objective, type, video_url, video_urls, resources, resource_items')
    ]);

    const prevSignature = JSON.stringify({
      months: state.curriculumMonthOverridesById,
      weeks: state.curriculumWeekOverridesById
    });

    if (monthError) {
      console.warn('Curriculum month override sync failed', monthError);
    } else {
      state.curriculumMonthOverridesById = Object.fromEntries((monthData || []).map(item => [
        item.month_id,
        {
          label: item.label || '',
          title: item.title || '',
          summary: item.summary || '',
          phase: item.phase || ''
        }
      ]));
    }

    if (weekError) {
      console.warn('Curriculum week override sync failed', weekError);
    } else {
      state.curriculumWeekOverridesById = Object.fromEntries((weekData || []).map(item => [
        item.week_id,
        {
          title: item.title || '',
          objective: item.objective || '',
          type: item.type || '',
          videoUrl: item.video_url || '',
          videoUrls: normalizeRemoteArray(item.video_urls),
          resources: normalizeRemoteArray(item.resources),
          resourceItems: normalizeRemoteArray(item.resource_items)
        }
      ]));
    }

    const nextSignature = JSON.stringify({
      months: state.curriculumMonthOverridesById,
      weeks: state.curriculumWeekOverridesById
    });

    if (prevSignature !== nextSignature || !options.silent) {
      if (getCurrentUser()) renderAppShell();
    }
  }

  async function refreshSemesterResources(options = {}) {
    if (!communitySupabase) return;

    const { data, error } = await communitySupabase
      .from(SEMESTER_RESOURCES_TABLE)
      .select('track_id, semester_id, resource_links');

    if (error) {
      console.warn('Semester resources sync failed', error);
      return;
    }

    const prevSignature = JSON.stringify(state.semesterResourcesByKey);

    state.semesterResourcesByKey = Object.fromEntries((data || []).map(item => [
      `${item.track_id}::${item.semester_id}`,
      Array.isArray(item.resource_links) ? item.resource_links : []
    ]));

    const nextSignature = JSON.stringify(state.semesterResourcesByKey);

    if (prevSignature !== nextSignature || !options.silent) {
      if (getCurrentUser()) renderAppShell();
    }
  }

  // Learner accounts authenticate with Supabase Auth, while profile and progress
  // details live in lms_public_profiles for cross-browser dashboard access.
  async function fetchRemotePublicProfile(email) {
    if (!communitySupabase || !email || !remoteProfileSyncHealthy) return null;

    const { data, error } = await communitySupabase.rpc('get_lms_public_profile', {
      profile_email: email
    });

    if (error) {
      handleRemoteProfileSyncError(error, 'fetch');
      return null;
    }

    const profile = Array.isArray(data) ? data[0] : data;
    if (!profile) return null;

    return {
      email: profile.email || email,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      trackId: profile.track_id || '',
      timezone: profile.timezone || 'Africa/Lagos',
      headline: profile.headline || '',
      bio: profile.bio || '',
      avatar: profile.avatar_url || '',
      completedLessonIds: Array.isArray(profile.completed_lesson_ids) ? profile.completed_lesson_ids : [],
      joinedClassIds: Array.isArray(profile.joined_class_ids) ? profile.joined_class_ids : [],
      lastSeenCommunityAt: profile.last_seen_community_at || '',
      lastSeenAnnouncementsAt: profile.last_seen_announcements_at || '',
      certificateIssuedAt: profile.certificate_issued_at || '',
      isActive: profile.is_active !== false,
      managedNote: profile.managed_note || ''
    };
  }

  async function syncUserProfileToRemote(user) {
    if (!communitySupabase || !user?.email || !remoteProfileSyncHealthy) return null;

    const { error } = await communitySupabase.rpc('upsert_lms_public_profile', {
      profile_email: user.email,
      profile_first_name: user.firstName,
      profile_last_name: user.lastName,
      profile_track_id: user.trackId,
      profile_timezone: user.timezone || 'Africa/Lagos',
      profile_headline: user.headline || '',
      profile_bio: user.bio || '',
      profile_avatar_url: user.avatar || '',
      profile_last_seen_at: new Date().toISOString(),
      profile_completed_lesson_ids: user.completedLessonIds || [],
      profile_joined_class_ids: user.joinedClassIds || [],
      profile_last_seen_community_at: user.lastSeenCommunityAt || null,
      profile_last_seen_announcements_at: user.lastSeenAnnouncementsAt || null,
      profile_certificate_issued_at: user.certificateIssuedAt || null
    });

    if (error) {
      handleRemoteProfileSyncError(error, 'sync');
      return null;
    }

    return true;
  }

  async function syncCurrentUserProfileFromRemote() {
    const user = getCurrentUser();
    if (!user) return false;
    if (!communitySupabase || !remoteProfileSyncHealthy) return true;

    const remoteProfile = await fetchRemotePublicProfile(user.email);
    if (!remoteProfile || !remoteProfileSyncHealthy) {
      if (user.trackId) {
        await syncUserProfileToRemote(user);
      }
      return true;
    }

    user.firstName = remoteProfile.firstName || user.firstName;
    user.lastName = remoteProfile.lastName || user.lastName;
    user.trackId = remoteProfile.trackId || user.trackId;
    user.timezone = remoteProfile.timezone || user.timezone;
    user.headline = remoteProfile.headline || user.headline;
    user.bio = remoteProfile.bio || user.bio;
    user.avatar = remoteProfile.avatar || user.avatar;
    user.completedLessonIds = remoteProfile.completedLessonIds || user.completedLessonIds;
    user.joinedClassIds = remoteProfile.joinedClassIds || user.joinedClassIds;
    user.lastSeenCommunityAt = remoteProfile.lastSeenCommunityAt || user.lastSeenCommunityAt;
    user.lastSeenAnnouncementsAt = remoteProfile.lastSeenAnnouncementsAt || user.lastSeenAnnouncementsAt;
    user.certificateIssuedAt = remoteProfile.certificateIssuedAt || user.certificateIssuedAt;
    // Note: intentionally removed persistUsers() here to prevent an infinite loop, since syncing pushes to DB.

    if (remoteProfile.isActive === false) {
      state.currentUserId = null;
      showAuthMessage('This learner account has been disabled by the academy admin.', 'error');
      showAuthPage('login');
      return false;
    }

    return true;
  }

  // Some learner environments may still be running against an older Supabase
  // function definition. If that backend shape is not healthy yet, we stop
  // retrying the RPC on every page load so mobile browsers do not fill the
  // console with the same backend error over and over again.
  function handleRemoteProfileSyncError(error, action) {
    const message = String(error?.message || '');
    const details = String(error?.details || '');
    const isSchemaMismatch = error?.code === '42702' || /ambiguous/i.test(message) || /ambiguous/i.test(details);

    if (isSchemaMismatch) {
      remoteProfileSyncHealthy = false;
      if (!remoteProfileSyncWarningShown) {
        console.info('Learner profile sync has been paused until the Supabase profile function is updated.', { action });
        remoteProfileSyncWarningShown = true;
      }
      return;
    }

    console.warn(`Learner profile ${action} failed`, error);
  }

  // ---------------------------------------------------------------------------
  // Page switching and auth-mode switching
  // ---------------------------------------------------------------------------
  function showLandingPage() {
    closeAppSidebar();
    closeLandingMenu();
    setActivePage('landing');
    showAppShellReadyState(true);
  }

  function showAuthPage(mode) {
    closeAppSidebar();
    closeLandingMenu();
    setActivePage('auth');
    switchAuthMode(mode);
    showAppShellReadyState(true);
  }

  function openApp(viewId) {
    state.currentView = viewId;
    if (viewId !== 'assessments') {
      state.assessmentMessage = null;
    }
    markSectionSeen(viewId);
    closeLandingMenu();
    closeAppSidebar();
    setActivePage('app');
    showAppShellReadyState(false);
    renderAppShell();
  }

  function setActivePage(pageName) {
    dom.landingPage.classList.toggle('page-active', pageName === 'landing');
    dom.authPage.classList.toggle('page-active', pageName === 'auth');
    dom.appPage.classList.toggle('page-active', pageName === 'app');
    handleScrollVisibility();
  }

  function showAppShellReadyState(isReady) {
    document.body.classList.toggle('app-shell-ready', isReady);
    document.documentElement.classList.toggle('app-shell-ready', isReady);
  }

  function scrollToTopPage() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function installRkhApp() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      updateInstallButton();
      return;
    }

    if (isIosInstallCandidate()) {
      window.alert('To install RealKingHubs Academy on iPhone: tap Share in Safari, then choose Add to Home Screen.');
      return;
    }

    if (isAndroidInstallFallbackCandidate()) {
      window.alert('To install RealKingHubs Academy on your phone: open the browser menu, then choose Install app or Add to Home screen.');
      return;
    }

    updateInstallButton();
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter(registration => {
            const scriptUrl =
              registration.active?.scriptURL ||
              registration.waiting?.scriptURL ||
              registration.installing?.scriptURL ||
              '';
            return scriptUrl.includes('/install-as-app/service-worker.js');
          })
          .map(registration => registration.unregister())
      );

      await navigator.serviceWorker.register('./service-worker-root.js');
    } catch (error) {
      console.warn('Service worker registration failed', error);
    }
  }

  function isIosInstallCandidate() {
    const isAppleMobileDevice = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    return isAppleMobileDevice && !isStandalone;
  }

  function isAndroidInstallFallbackCandidate() {
    const isAndroidDevice = /android/i.test(window.navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return isAndroidDevice && !isStandalone;
  }

  function isInstallFallbackCandidate() {
    return isIosInstallCandidate() || isAndroidInstallFallbackCandidate();
  }

  function switchAuthMode(mode) {
    const loginActive = mode === 'login';
    const registerActive = mode === 'register';
    const forgotActive = mode === 'forgot';
    const resetActive = mode === 'reset';

    if (dom.loginForm?.dataset.busy === 'true' || dom.registerForm?.dataset.busy === 'true' || dom.forgotPasswordForm?.dataset.busy === 'true' || dom.resetPasswordForm?.dataset.busy === 'true') {
      return;
    }

    dom.loginTab.classList.toggle('auth-tab-active', loginActive);
    dom.registerTab.classList.toggle('auth-tab-active', registerActive);
    if (dom.forgotTab) dom.forgotTab.classList.toggle('auth-tab-active', forgotActive);
    if (dom.resetTab) dom.resetTab.classList.toggle('auth-tab-active', resetActive);

    if (dom.forgotTab) dom.forgotTab.classList.toggle('auth-tab-hidden', !forgotActive);
    if (dom.resetTab) dom.resetTab.classList.toggle('auth-tab-hidden', !resetActive);
    dom.loginTab.classList.toggle('auth-tab-hidden', forgotActive || resetActive);
    dom.registerTab.classList.toggle('auth-tab-hidden', forgotActive || resetActive);

    dom.loginForm.classList.toggle('auth-form-active', loginActive);

    dom.registerForm.classList.toggle('auth-form-active', registerActive);

    if (dom.forgotPasswordForm) {
      dom.forgotPasswordForm.classList.toggle('auth-form-active', forgotActive);
    }

    if (dom.resetPasswordForm) {
      dom.resetPasswordForm.classList.toggle('auth-form-active', resetActive);
    }

    clearAuthMessage();
  }

  function showAuthMessage(text, type) {
    dom.authMessage.textContent = text;
    dom.authMessage.className = `form-message ${type}`;
    dom.authMessage.setAttribute('role', 'status');
    dom.authMessage.setAttribute('aria-live', 'polite');
  }

  function clearAuthMessage() {
    dom.authMessage.textContent = '';
    dom.authMessage.className = 'form-message';
    dom.authMessage.removeAttribute('role');
    dom.authMessage.removeAttribute('aria-live');
  }

  function setAuthFormBusy(form, isBusy, loadingLabel) {
    if (!form) return;

    form.dataset.busy = isBusy ? 'true' : 'false';
    form.setAttribute('aria-busy', String(isBusy));

    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.disabled = isBusy;
    });

    const submitButtons = form.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(button => {
      const originalText = button.dataset.originalText || button.textContent.trim();
      if (!button.dataset.originalText) {
        button.dataset.originalText = originalText;
      }
      button.disabled = isBusy;
      button.textContent = isBusy ? loadingLabel : originalText;
    });
  }

  // ---------------------------------------------------------------------------
  // Landing page rendering and auth actions
  // ---------------------------------------------------------------------------
  function populateRegisterTrackSelect() {
    if (!dom.registerTrack) return;

    const tracks = getAvailableTracks();
    const currentValue = dom.registerTrack.value;
    dom.registerTrack.innerHTML = [
      `<option value="" disabled ${currentValue ? '' : 'selected'}>Select your track</option>`,
      ...tracks.map(track => `<option value="${track.id}">${track.label}</option>`)
    ].join('');
    if (tracks.some(track => track.id === currentValue)) {
      dom.registerTrack.value = currentValue;
    }
  }

  function getLearnerAuthErrorMessage(error) {
    const message = error?.message || 'Authentication failed.';
    if (!/failed to fetch/i.test(message)) return message;

    if (window.location.protocol === 'file:') {
      return 'Open this site through a local web server such as http://localhost:8000 before signing in.';
    }

    if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) && window.location.protocol !== 'https:') {
      return 'Use an HTTPS address or localhost before signing in.';
    }

    return 'The authentication request could not reach Supabase. Refresh the page and try again.';
  }

  async function handleForgotPassword(event) {
    event.preventDefault();

    const form = event.currentTarget;
    if (form.dataset.busy === 'true') return;

    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    if (!email) {
      showAuthMessage('Enter your email address to continue.', 'error');
      return;
    }

    if (!communitySupabase) {
      showAuthMessage('Authentication service is not available.', 'error');
      return;
    }

    setAuthFormBusy(form, true, 'Sending reset link...');
    try {
      const { error } = await communitySupabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });

      if (error) {
        showAuthMessage(getLearnerAuthErrorMessage(error), 'error');
      } else {
        showAuthMessage('Check your email for the password reset link.', 'success');
        document.getElementById('forgotEmail').value = '';
      }
    } finally {
      setAuthFormBusy(form, false, 'Sending reset link...');
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    const form = event.currentTarget;
    if (form.dataset.busy === 'true') return;

    const newPassword = document.getElementById('resetPassword').value;
    if (newPassword.length < 8) {
      showAuthMessage('Password must be at least 8 characters.', 'error');
      return;
    }

    if (!communitySupabase) {
      showAuthMessage('Authentication service is not available.', 'error');
      return;
    }

    setAuthFormBusy(form, true, 'Updating password...');
    try {
      const { error } = await communitySupabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        showAuthMessage(getLearnerAuthErrorMessage(error), 'error');
      } else {
        showAuthMessage('Password successfully updated. You can now log in.', 'success');
        switchAuthMode('login');
        document.getElementById('resetPassword').value = '';
      }
    } finally {
      setAuthFormBusy(form, false, 'Updating password...');
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;
    if (form.dataset.busy === 'true') return;

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();

    console.log('handleLogin: submit', { email });

    if (!email || !password) {
      showAuthMessage('Enter your email and password to continue.', 'error');
      return;
    }

    if (!communitySupabase) {
      showAuthMessage('Authentication service is not available.', 'error');
      return;
    }

    setAuthFormBusy(form, true, 'Signing in...');
    try {
      const { data, error } = await communitySupabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        showAuthMessage(getLearnerAuthErrorMessage(error), 'error');
        return;
      }

      if (data?.session) {
        applyAuthenticatedSession(data.session);
      }
    } finally {
      setAuthFormBusy(form, false, 'Signing in...');
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    const form = event.currentTarget;
    if (form.dataset.busy === 'true') return;

    const firstName = document.getElementById('registerFirstName').value.trim();
    const lastName = document.getElementById('registerLastName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const trackId = document.getElementById('registerTrack').value;
    const timezone = document.getElementById('registerTimezone').value.trim() || 'Africa/Lagos';
    const headline = document.getElementById('registerHeadline').value.trim() || 'Learner at RealKingHubs Academy';
    const password = document.getElementById('registerPassword').value;

    console.log('handleRegister: submit', { firstName, lastName, email, trackId });

    if (!firstName || !lastName || !email || !trackId || password.length < 8) {
      showAuthMessage('Complete every registration field and use a password with at least 8 characters.', 'error');
      return;
    }

    if (!communitySupabase) {
      showAuthMessage('Authentication service is not available.', 'error');
      return;
    }

    setAuthFormBusy(form, true, 'Creating account...');
    try {
      const { data, error } = await communitySupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            track_id: trackId,
            timezone,
            headline
          }
        }
      });

      if (error) {
        showAuthMessage(getLearnerAuthErrorMessage(error), 'error');
        return;
      }

      if (data?.session) {
        applyAuthenticatedSession(data.session);
        showAuthMessage('Account created. Opening your dashboard...', 'success');
        return;
      }

      showAuthMessage('Account created. You can now sign in.', 'success');
      switchAuthMode('login');
    } finally {
      setAuthFormBusy(form, false, 'Creating account...');
    }
  }

  async function logoutUser() {
    if (communitySupabase) {
      await communitySupabase.auth.signOut();
    }
    state.currentUserId = null;
    state.currentUser = null;
    lastObservedAuthUserId = null;
    state.currentView = 'dashboard';
    state.currentLessonId = null;
    state.currentLessonVideoIndex = 0;
    state.currentLiveClassId = null;
    state.currentCurriculumSemesterId = null;
    state.currentCurriculumMonthId = null;
    state.currentResourcesSemesterId = null;
    state.showOlderMessages = false;
    localStorage.removeItem(STATE_NAV_KEY);
    showLandingPage();
  }

  // ---------------------------------------------------------------------------
  // Main app shell rendering
  // The LMS redraws the shell when the active page or learner state changes.
  // ---------------------------------------------------------------------------
  async function renderAppShell() {
    const user = getCurrentUser();
    const track = getCurrentTrack();
    if (!user || !track) {
      logoutUser();
      return;
    }

    ensureCurriculumDefaults(track);
    ensureCommunityFeedForTrack(track);
    ensureAnnouncementsFeedForTrack(track);
    renderSidebar(user, track);
    renderTopbar(user, track);
    await renderCurrentView(user, track);
    saveNavigationState();
  }

  function saveNavigationState() {
    if (!state.currentUserId) return;
    const navState = {
      currentView: state.currentView,
      currentLessonId: state.currentLessonId,
      currentLessonVideoIndex: state.currentLessonVideoIndex,
      currentLiveClassId: state.currentLiveClassId,
      currentCurriculumSemesterId: state.currentCurriculumSemesterId,
      currentCurriculumMonthId: state.currentCurriculumMonthId,
      currentResourcesSemesterId: state.currentResourcesSemesterId
    };
    localStorage.setItem(STATE_NAV_KEY, JSON.stringify(navState));
  }

  // The sidebar uses an icon rail so the dashboard feels closer to a compact product workspace.
  function renderSidebar(user, track) {
    const notificationCounts = getNotificationCounts(user, track);
    const navGroups = [
      { title: 'Learning', items: ['dashboard', 'curriculum', 'resources', 'books', 'progress'] },
      { title: 'Community', items: ['community', 'announcements', 'feedback'] },
      { title: 'Account', items: ['certificates', 'profile'] }
    ];

    dom.appNav.innerHTML = navGroups.map(group => {
      const buttons = group.items
        .map(itemId => window.RKH_DATA.navItems.find(item => item.id === itemId))
        .filter(Boolean)
        .map(item => `
          <button type="button" class="${item.id === state.currentView ? 'nav-active' : ''}" onclick="openDashboardView('${item.id}')" title="${item.label}" aria-label="${item.label}" aria-pressed="${item.id === state.currentView}">
            <span class="nav-icon" aria-hidden="true">${getNavIconMarkup(item.id)}</span>
            <span class="nav-button-copy">${item.label}</span>
            ${notificationCounts[item.id] ? `<span class="nav-badge" title="${notificationCounts[item.id]} new updates">${notificationCounts[item.id] > 9 ? '9+' : notificationCounts[item.id]}</span>` : ''}
          </button>
        `)
        .join('');

      return `
        <section class="sidebar-nav-group">
          <p class="sidebar-nav-title">${group.title}</p>
          <div class="sidebar-nav-buttons">${buttons}</div>
        </section>
      `;
    }).join('');
  }

  function getNavIconMarkup(viewId) {
    const icons = {
      dashboard: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 10.5L12 4l7.5 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-4v5H5.5a1 1 0 0 1-1-1v-8.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
        </svg>`,
      curriculum: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect>
          <path d="M4 10h16M10 5v14" fill="none" stroke="currentColor" stroke-width="1.8"></path>
        </svg>`,
      assessments: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4h6l1 2h3v14H5V6h3l1-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
          <path d="M9 11h6M9 15h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>`,
      progress: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 19V9M12 19V5M19 19v-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>`,
      live: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect>
          <path d="M10 10l4 2-4 2v-4z" fill="currentColor"></path>
          <path d="M18 9l2-1.5v9L18 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
        </svg>`,
      community: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.5 11.5A3.5 3.5 0 1 0 8.5 4.5a3.5 3.5 0 0 0 0 7zm7 2A3.5 3.5 0 1 0 15.5 6.5a3.5 3.5 0 0 0 0 7zM3.5 19c0-2.5 2.3-4.5 5-4.5s5 2 5 4.5M10.5 19c0-2 1.7-3.5 4-3.5 2.2 0 4 1.5 4 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
        </svg>`,
      announcements: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 15V9l10-4v14L5 15z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
          <path d="M15 9h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2M8 15l1 4h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`,
      resources: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 5h8l4 4v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
          <path d="M15 5v4h4M9 13h6M9 17h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>`,
      books: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 5.5A2.5 2.5 0 0 1 8.5 3H18v15H8.5A2.5 2.5 0 0 0 6 20.5V5.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
          <path d="M8.5 6.5h6M8.5 10.5h6M8.5 14.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>`,
      certificates: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
          <path d="M9.5 9.5h5M9.5 12.5h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M10 15v5l2-1.4L14 20v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
        </svg>`,
      profile: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0-0.001-8.001A4 4 0 0 0 12 12zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>`
    };

    return icons[viewId] || icons.dashboard;
  }

  function renderTopbar(user, track) {
    const progress = calculateTrackProgress(user, track);
    const notificationCounts = getNotificationCounts(user, track);
    const totalAlerts = Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
    const titles = {
      dashboard: 'Dashboard',
      curriculum: 'Curriculum',
      resources: 'Resources',
      books: 'Books',
      community: 'Community',
      progress: 'Progress',
      announcements: 'Announcements',
      feedback: 'Feedback',
      certificates: 'Certificates',
      profile: 'Profile and Settings'
    };
    const eyebrows = {
      dashboard: 'Track workspace',
      curriculum: 'Semester learning plan',
      resources: 'Semester resource library',
      books: 'Recommended learning books',
      community: 'Learner communication',
      progress: 'Completion tracking',
      announcements: 'Programme updates',
      feedback: 'Learner feedback',
      certificates: 'Programme completion',
      profile: 'Learner account'
    };

    dom.pageEyebrow.textContent = eyebrows[state.currentView] || 'RealKingHubs Academy LMS';
    dom.pageTitle.textContent = titles[state.currentView] || 'Dashboard';
    dom.topbarAlerts.textContent = String(totalAlerts);
    dom.topbarProgress.textContent = `${progress.percent}%`;
    dom.topbarProgress.setAttribute('title', `${progress.completedCount} of ${progress.totalLessons} lessons completed`);
    dom.topbarAvatar.innerHTML = `<img src="${getAvatarSrc(user)}" alt="${escapeAttribute(`${user.firstName} ${user.lastName}`.trim())}" />`;
    dom.appFooterText.textContent = '(c) 2026 RealKingHubs - ' + track.label + ' Student Portal';
    document.querySelector('.topbar-alert-button')?.classList.toggle('topbar-alert-active', totalAlerts > 0);
  }

  async function renderCurrentView(user, track) {
    const renderers = {
      dashboard: renderDashboard,
      curriculum: renderCurriculum,
      resources: renderResources,
      books: renderBooks,
      community: renderCommunity,
      progress: renderProgress,
      announcements: renderAnnouncements,
      feedback: renderFeedback,
      certificates: renderCertificates,
      profile: renderProfileAndSettings
    };

    const renderer = renderers[state.currentView] || renderDashboard;
    const html = await renderer(user, track);
    dom.appContent.innerHTML = html;

    if (state.currentView === 'profile') bindProfileForm();
    if (state.currentView === 'community') bindCommunityComposer();
    if (state.currentView === 'feedback') bindFeedbackForm();
    if (['community', 'announcements'].includes(state.currentView)) markSectionSeen(state.currentView);
  }

  // ---------------------------------------------------------------------------
  // Progress and notification calculations
  // ---------------------------------------------------------------------------
  function calculateTrackProgress(user, track) {
    const allLessons = track.semesters.flatMap(semester => semester.months.flatMap(month => month.weeks));
    const completedCount = allLessons.filter(lesson => user.completedLessonIds.includes(lesson.id)).length;
    const percent = allLessons.length ? Math.round((completedCount / allLessons.length) * 100) : 0;
    return { completedCount, totalLessons: allLessons.length, percent };
  }

  function getOrderedTrackLessons(track) {
    return track.semesters.flatMap(semester =>
      semester.months.flatMap(month =>
        month.weeks.map(lesson => ({
          lesson,
          semester,
          month
        }))
      )
    );
  }

  function getNextLessonContext(track, lessonId) {
    const orderedLessons = getOrderedTrackLessons(track);
    const currentIndex = orderedLessons.findIndex(entry => entry.lesson.id === lessonId);
    if (currentIndex === -1) return null;
    return orderedLessons[currentIndex + 1] || null;
  }

  function ensureCertificateState(user, track) {
    if (!user || !track) return null;
    const progress = calculateTrackProgress(user, track);
    if (progress.totalLessons > 0 && progress.completedCount === progress.totalLessons && !user.certificateIssuedAt) {
      user.certificateIssuedAt = new Date().toISOString();
      void persistUsers();
    }
    return user.certificateIssuedAt || null;
  }

  function getCertificateData(user, track) {
    const progress = calculateTrackProgress(user, track);
    const issuedAt = ensureCertificateState(user, track);
    return {
      unlocked: Boolean(issuedAt && progress.totalLessons > 0),
      issuedAt,
      certificateId: `${track.id}-${user.id}`.replace(/[^a-z0-9-]/gi, '').toUpperCase(),
      progress
    };
  }

  function calculateSemesterProgress(user, semester) {
    const lessons = semester.months.flatMap(month => month.weeks);
    const completed = lessons.filter(lesson => user.completedLessonIds.includes(lesson.id)).length;
    const percent = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
    return { completed, total: lessons.length, percent };
  }

  function getNotificationCounts(user, track) {
    return {
      community: getUnreadCommunityCount(user),
      announcements: getUnreadAnnouncementCount(user, track)
    };
  }

  function getUnreadCommunityCount(user) {
    const seenAt = toTimestamp(user.lastSeenCommunityAt);
    return state.communityMessages.filter(message => message.authorEmail !== user.email && toTimestamp(message.createdAt) > seenAt).length;
  }

  function getUnreadAnnouncementCount(user, track) {
    const seenAt = toTimestamp(user.lastSeenAnnouncementsAt);
    return getTrackAnnouncements(track).filter(item => toTimestamp(item.createdAt) > seenAt).length;
  }



  function markSectionSeen(viewId) {
    const user = getCurrentUser();
    const track = getCurrentTrack();
    if (!user || !track) return;

    let hasChanged = false;
    if (viewId === 'community' && state.communityMessages.length) {
      const latestCommunity = state.communityMessages[0].createdAt;
      if (latestCommunity !== user.lastSeenCommunityAt) {
        user.lastSeenCommunityAt = latestCommunity;
        hasChanged = true;
      }
    }
    const activeAnnouncements = getTrackAnnouncements(track);
    if (viewId === 'announcements' && activeAnnouncements.length) {
      const latestAnnouncement = activeAnnouncements[0]?.createdAt;
      if (latestAnnouncement !== user.lastSeenAnnouncementsAt) {
        user.lastSeenAnnouncementsAt = latestAnnouncement;
        hasChanged = true;
      }
    }
    if (hasChanged) {
      void persistUsers();
    }
  }

  // The dashboard is organized like an admin workspace:
  // overview metrics first, action queue second, and semester board last.
  // ---------------------------------------------------------------------------
  // View renderers
  // Each renderer returns the HTML for one dashboard section.
  // ---------------------------------------------------------------------------
  function renderDashboard(user, track) {
    const progress = calculateTrackProgress(user, track);
    const notificationCounts = getNotificationCounts(user, track);
    const latestAnnouncement = getTrackAnnouncements(track)[0] || null;
    const latestCommunityMessage = state.communityMessages.find(message => message.trackId === track.id) || null;
    const activeSemester = track.semesters.find(semester => semester.id === state.currentCurriculumSemesterId) || track.semesters[0];
    const monthFour = activeSemester?.months?.find(month => month.label === 'Month 4') || null;
    const semesterCards = track.semesters.map(semester => {
      const semesterProgress = calculateSemesterProgress(user, semester);
      return `
        <div class="semester-board-row">
          <div>
            <strong>${semester.label}</strong>
          </div>
          <div class="semester-board-progress">
            <div class="progress-bar"><div class="progress-fill" style="width:${semesterProgress.percent}%"></div></div>
            <small>${semesterProgress.completed} of ${semesterProgress.total} weeks completed</small>
          </div>
          <span class="status-pill ${semesterProgress.percent >= 100 ? 'success' : semesterProgress.percent >= 40 ? 'neutral' : 'warning'}">${semesterProgress.percent}% complete</span>
        </div>
      `;
    }).join('');

    return `
      <section class="surface-card dashboard-workspace-card">
        <div class="content-header">
          <div>
            <p class="section-kicker">Track workspace</p>
            <h2>${track.label} dashboard</h2>
            <p>A structured operational view of your programme, community updates, and semester delivery status.</p>
          </div>
          <div class="dashboard-toolbar">
            <span class="dashboard-toolbar-chip">${track.semesters.length} semesters</span>
            <span class="dashboard-toolbar-chip">12 academic months</span>
            <span class="dashboard-toolbar-chip">Month 4 hands-on lab</span>
            <button class="btn btn-primary btn-small" type="button" onclick="openDashboardView('curriculum')">Continue curriculum</button>
            <button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('community')">Open community</button>
          </div>
        </div>
        <div class="dashboard-overview-grid">
          <article class="dashboard-kpi-card">
            <span class="dashboard-kpi-label">Overall progress</span>
            <strong class="dashboard-kpi-value">${progress.percent}%</strong>
            <p>${progress.completedCount} of ${progress.totalLessons} weekly items completed.</p>
          </article>
          <article class="dashboard-kpi-card">
            <span class="dashboard-kpi-label">Programme structure</span>
            <strong class="dashboard-kpi-value">${track.semesters.length}</strong>
          </article>
          <article class="dashboard-kpi-card">
            <span class="dashboard-kpi-label">Current lab focus</span>
            <strong class="dashboard-kpi-value dashboard-kpi-value-small">${monthFour ? monthFour.title : 'Hands-on Lab'}</strong>
            <p>${monthFour ? monthFour.summary : 'Practical build work, testing, and showcase delivery.'}</p>
          </article>
          <article class="dashboard-kpi-card">
            <span class="dashboard-kpi-label">Unread updates</span>
            <strong class="dashboard-kpi-value">${notificationCounts.community + notificationCounts.announcements}</strong>
            <p>${notificationCounts.community} messages and ${notificationCounts.announcements} announcements need attention.</p>
          </article>
        </div>
      </section>

      <section class="dashboard-shell-grid">
        <article class="surface-card dashboard-side-card">
          <div class="content-header"><div><h2>Latest announcement</h2><p>Programme notices stay here instead of filling the main dashboard.</p></div></div>
          ${latestAnnouncement ? `
            <div class="dashboard-side-note">
              <strong>${latestAnnouncement.title}</strong>
              <span>${latestAnnouncement.body}</span>
              <small>${latestAnnouncement.date}</small>
            </div>
          ` : '<div class="empty-state">No announcement available yet.</div>'}
        </article>
        <article class="surface-card dashboard-side-card">
          <div class="content-header"><div><h2>Community activity</h2><p>The newest message in your track room appears here.</p></div></div>
          ${latestCommunityMessage ? `
            <div class="dashboard-side-note">
              <strong>${latestCommunityMessage.authorName}</strong>
              <span>${latestCommunityMessage.body || 'Shared an attachment in the community room.'}</span>
              <small>${formatDateTime(latestCommunityMessage.createdAt)}</small>
            </div>
          ` : '<div class="empty-state">No community message available yet.</div>'}
        </article>
      </section>

      <section class="surface-card dashboard-board-card">
        <div class="content-header">
          <div>
            <p class="section-kicker">Semester board</p>
            <h2>Programme delivery status</h2>
            <p>Track completion across all semesters with a cleaner operational view.</p>
          </div>
          <button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('progress')">Open progress page</button>
        </div>
        <div class="semester-board">${semesterCards}</div>
      </section>
    `;
  }



  // Curriculum rendering is intentionally split into semester -> month -> week.
  // This keeps the navigation clear and makes it easier to expand later.
  // Curriculum is split into semesters, then months, then weekly lesson entries.
  // The curriculum stays full width until a learner opens a lesson. Once a
  // lesson is opened, the player becomes the main stage and the curriculum
  // moves into a slimmer navigation column on the right.
  function buildContentSurfaceHeader({ eyebrow, title, description, metaItems = [] } = {}) {
    const metaHtml = Array.isArray(metaItems) && metaItems.length
      ? `<div class="content-surface-meta">${metaItems.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`
      : '';

    return `
      <div class="content-surface-shell">
        <div class="content-header">
          <div>
            <p class="section-kicker">${escapeHtml(eyebrow || 'Learning surface')}</p>
            <h2>${escapeHtml(title || 'Content surface')}</h2>
            <p>${escapeHtml(description || '')}</p>
          </div>
          ${metaHtml}
        </div>
      </div>
    `;
  }

  function renderCurriculum(user, track) {
    const allMonths = track.semesters.flatMap(semester => semester.months);
    const selectedLesson = track.semesters
      .flatMap(semester => semester.months.flatMap(month => month.weeks))
      .find(lesson => lesson.id === state.currentLessonId) || null;
    const openSemesterId = state.currentCurriculumSemesterId && track.semesters.some(semester => semester.id === state.currentCurriculumSemesterId)
      ? state.currentCurriculumSemesterId
      : null;
    const openMonthId = allMonths.some(month => month.id === state.currentCurriculumMonthId)
      ? state.currentCurriculumMonthId
      : null;
    const semestersHtml = track.semesters.map(semester => {
      const semesterProgress = calculateSemesterProgress(user, semester);
      const isOpen = semester.id === openSemesterId;
      return `
        <section class="curriculum-semester-block">
          <button class="curriculum-semester-header ${isOpen ? 'curriculum-semester-open' : ''}" type="button" onclick="toggleCurriculumSemester('${semester.id}')">
            <div>
              <p class="section-kicker">${semester.label}</p>
              <p>${semesterProgress.completed} of ${semesterProgress.total} weeks completed in this semester.</p>
            </div>
            <div class="curriculum-semester-side">
              <div class="curriculum-semester-progress">${semesterProgress.percent}% complete</div>
              <span class="curriculum-semester-toggle-label">${isOpen ? 'Collapse' : 'Expand'}</span>
            </div>
          </button>
          ${isOpen ? `<div class="curriculum-month-list">${semester.months.map(month => renderMonthCard(user, month, month.id === openMonthId)).join('')}</div>` : ''}
        </section>
      `;
    }).join('');

    const curriculumPanel = `
      <article class="surface-card curriculum-panel ${selectedLesson ? 'curriculum-panel-condensed' : ''}">
        ${buildContentSurfaceHeader({
          eyebrow: 'Course content',
          title: `${track.label} curriculum`,
          description: selectedLesson
            ? 'The active lesson is now in focus. Use this right-side curriculum column to switch months and lessons.'
            : '',
          metaItems: [`${track.semesters.length} semesters`, `${track.semesters.flatMap(semester => semester.months).length} months`]
        })}
        <div class="curriculum-course-list">${semestersHtml}</div>
      </article>
    `;

    if (!selectedLesson) {
      return `
        <section class="curriculum-layout curriculum-focused-layout curriculum-browsing-layout">
          <div class="dashboard-stack">
            ${curriculumPanel}
          </div>
        </section>
      `;
    }

    return `
      <section class="curriculum-layout curriculum-focused-layout curriculum-viewing-layout">
        <div class="lesson-player curriculum-player-main">${renderLessonPlayer(track, user, selectedLesson)}</div>
        <aside class="dashboard-stack curriculum-sidebar-stack">
          ${curriculumPanel}
        </aside>
      </section>
    `;
  }

  // Month cards act like drawers inside a semester so learners can focus on one block at a time.
  function renderMonthCard(user, month, isOpen) {
    const completedWeeks = month.weeks.filter(week => user.completedLessonIds.includes(week.id)).length;
    const monthPercent = month.weeks.length ? Math.round((completedWeeks / month.weeks.length) * 100) : 0;
    return `
      <article class="month-card curriculum-month-card ${isOpen ? 'curriculum-month-open' : ''}">
        <button class="curriculum-month-toggle" type="button" onclick="toggleCurriculumMonth('${month.id}')">
          <div>
            <strong class="curriculum-month-title">${month.label} - ${month.title}</strong>
            <span class="month-meta">${month.phase} phase</span>
          </div>
          <div class="curriculum-month-side">
            <span class="status-pill ${month.phase === 'Hands-on Lab' ? 'warning' : 'neutral'}">${month.phase}</span>
            <span class="curriculum-month-progress">${monthPercent}%</span>
            <span class="curriculum-semester-toggle-label">${isOpen ? 'Collapse' : 'Expand'}</span>
          </div>
        </button>
        ${isOpen ? `
          <div class="curriculum-month-body">
            <p class="copy-muted">${month.summary}</p>
            <div class="progress-bar"><div class="progress-fill" style="width:${monthPercent}%"></div></div>
            <div class="copy-muted">${completedWeeks} of ${month.weeks.length} weeks completed</div>
            <div class="lesson-list curriculum-week-list">${month.weeks.map(lesson => renderLessonRow(user, lesson)).join('')}</div>
          </div>
        ` : ''}
      </article>
    `;
  }

  function renderLessonRow(user, lesson) {
    const completed = user.completedLessonIds.includes(lesson.id);
    // Count how many videos are available for this week so learners can
    // see before opening the lesson whether it contains a playlist.
    const videoCount = Array.isArray(lesson.videoItems) && lesson.videoItems.length
      ? lesson.videoItems.length
      : (lesson.videoUrls && lesson.videoUrls.length) || (lesson.videoUrl ? 1 : 0);
    const videoBadge = videoCount > 0
      ? `<span class="lesson-video-badge">${videoCount} ${videoCount === 1 ? "video" : "videos"}</span>`
      : '';
    return `
      <div class="lesson-item curriculum-week-row ${state.currentLessonId === lesson.id ? 'curriculum-week-active' : ''}">
        <div class="lesson-item-header curriculum-week-header">
          <div class="curriculum-week-main">
            <span class="curriculum-week-marker ${completed ? 'completed' : ''}"></span>
            <div>
              <strong class="lesson-title">${lesson.title}</strong>
              <div class="lesson-row-meta">
                ${videoBadge}
                <span>${lesson.type === 'lab' ? 'Hands-on lab week' : 'Lesson'}</span>
              </div>
            </div>
          </div>
          <span class="status-pill ${completed ? 'success' : lesson.type === 'lab' ? 'warning' : 'neutral'}">${completed ? 'Completed' : lesson.type === 'lab' ? 'Lab' : 'Open'}</span>
        </div>
        <div class="lesson-actions">
          <button class="btn btn-secondary btn-small" type="button" onclick="openLesson('${lesson.id}')">View lesson</button>
          <button class="btn ${completed ? 'btn-secondary' : 'btn-primary'} btn-small" type="button" onclick="toggleLessonCompletion('${lesson.id}')">Mark ${completed ? 'incomplete' : 'complete'}</button>
        </div>
      </div>
    `;
  }

  function renderLessonPlayer(track, user, selectedLesson) {
    if (!selectedLesson) return '<div class="empty-state">Select a lesson to start watching.</div>';
    const lessonContext = getLessonContext(track, selectedLesson.id);
    const lessonCompleted = user?.completedLessonIds?.includes(selectedLesson.id);
    const nextLessonContext = getNextLessonContext(track, selectedLesson.id);
    const certificate = getCertificateData(user, track);
    const videoItems = Array.isArray(selectedLesson.videoItems) && selectedLesson.videoItems.length
      ? selectedLesson.videoItems
      : normalizeLessonVideoItems([], selectedLesson.videoUrl || '');
    const activeVideoIndex = Math.min(state.currentLessonVideoIndex || 0, Math.max(videoItems.length - 1, 0));
    const activeVideo = videoItems[activeVideoIndex] || { title: selectedLesson.title, url: selectedLesson.videoUrl || '' };
    const videoCount = videoItems.length;

    const videoPlaylist = videoItems.length > 0
      ? `
        <details class="lesson-video-playlist-details">
          <summary class="lesson-video-playlist-summary">
            <div>
              <strong>Week videos</strong>
              <span>${videoItems.length} ${videoItems.length === 1 ? 'video' : 'videos'} in this lesson</span>
            </div>
            <span class="lesson-video-playlist-icon">▾</span>
          </summary>
          <div class="lesson-video-playlist">
            ${videoItems.map((item, index) => `
              <button class="lesson-video-chip ${index === activeVideoIndex ? 'lesson-video-chip-active' : ''}" type="button" onclick="selectLessonVideo(${index})">
                <span>${index + 1}</span>
                <strong>${item.title}</strong>
              </button>
            `).join('')}
          </div>
        </details>
      `
      : '';

    const singleVideoLabel = videoItems.length === 1
      ? `<span class="lesson-single-video-label">${videoCount} ${videoCount === 1 ? 'video' : 'videos'}</span>`
      : '';

    return `
      <div class="lesson-watch-main lesson-watch-main-single">
        <div class="iframe-wrap lesson-watch-frame"><iframe src="${activeVideo.url}" title="${activeVideo.title || selectedLesson.title}" allowfullscreen loading="lazy"></iframe></div>
        ${videoPlaylist}
        <div class="lesson-watch-body">
          <div class="lesson-watch-header">
            <div>
              <p class="section-kicker">Now playing ${singleVideoLabel}</p>
              <h3 class="lesson-watch-title">${activeVideo.title || selectedLesson.title}</h3>
              <p class="copy-muted">${selectedLesson.objective}</p>
            </div>
            <div class="lesson-watch-actions">
              <span class="status-pill ${lessonCompleted ? 'success' : selectedLesson.type === 'lab' ? 'warning' : 'neutral'}">${lessonCompleted ? 'Completed' : selectedLesson.type === 'lab' ? 'Hands-on lab' : 'In progress'}</span>
              <button class="btn ${lessonCompleted ? 'btn-secondary' : 'btn-primary'} btn-small" type="button" onclick="toggleLessonCompletion('${selectedLesson.id}')">${lessonCompleted ? 'Mark incomplete' : 'Mark complete'}</button>
              ${nextLessonContext ? `<button class="btn btn-primary btn-small" type="button" onclick="openNextLesson('${selectedLesson.id}')">Next topic</button>` : certificate.unlocked ? `<button class="btn btn-primary btn-small" type="button" onclick="openDashboardView('certificates')">Open certificate</button>` : ''}
              <button class="btn btn-secondary btn-small" type="button" onclick="clearLessonView()">Back to curriculum</button>
            </div>
          </div>
          <div class="lesson-watch-channel">
            <div class="lesson-watch-channel-mark">RK</div>
            <div class="lesson-watch-channel-copy">
              <strong>${track.label}</strong>
              <span>${lessonContext ? `${lessonContext.semester.label} - ${lessonContext.month.label} - ${lessonContext.month.title}` : track.label}</span>
            </div>
          </div>
          <div class="lesson-watch-description">
            <div class="lesson-player-breadcrumb">${lessonContext ? `${lessonContext.semester.label} - ${lessonContext.month.label} - ${lessonContext.month.title}` : track.label}</div>
          </div>
        </div>
      </div>
    `;
  }

  // Community rendering includes the composer, sticker pack, message list,
  // attachments, and older-message toggle.
  function renderCommunity(user, track) {
    const visibleMessages = state.showOlderMessages ? state.communityMessages : state.communityMessages.slice(0, 5);
    const remaining = Math.max(state.communityMessages.length - visibleMessages.length, 0);
    return `
      <section class="community-layout">
        <aside class="composer-panel">
          <div class="composer-header"><div><p class="section-kicker">Communication room</p><h3>${track.label} community room</h3><p class="copy-muted">Only learners in ${track.label} can see the messages posted in this room.</p></div></div>
          <div class="community-sync-status ${state.communitySyncError ? 'error' : 'success'}">${state.communitySyncError ? `Sync issue: ${escapeHtml(state.communitySyncError)}` : state.communitySyncMode === 'remote' ? 'Connected' : 'Community is using local browser storage only.'}</div>
          <div id="communityComposerMessage" class="form-message ${state.communityComposerMessage ? state.communityComposerMessage.type : ''}">${state.communityComposerMessage ? state.communityComposerMessage.text : ''}</div>
          
          <div class="field-group">
            <label for="communityMessage">Post a message</label>
            <div class="chat-composer-box">
              <textarea id="communityMessage" placeholder="Write an update for ${track.label} learners...">${escapeHtml(state.communityDraftText)}</textarea>
              <div class="chat-composer-footer">
                <div class="chat-composer-tools">
                  <button class="btn-chat-tool ${state.communityStickerPackOpen ? 'active' : ''}" type="button" onclick="toggleCommunityStickerPack()" title="Stickers" aria-label="Stickers">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                  </button>
                  <input id="communityFileInput" type="file" class="hidden" onchange="handleCommunityFileSelect(event)" />
                  <input id="communityFolderInput" type="file" class="hidden" webkitdirectory directory multiple onchange="handleCommunityFolderSelect(event)" />
                  <button class="btn-chat-tool" type="button" onclick="document.getElementById('communityFileInput').click()" title="Attach file" aria-label="Attach file">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </button>
                  <button class="btn-chat-tool" type="button" onclick="document.getElementById('communityFolderInput').click()" title="Attach folder" aria-label="Attach folder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                </div>
                <button class="btn-chat-send" type="button" onclick="postCommunityMessage()" title="Send message" aria-label="Send message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          ${state.communityStickerPackOpen ? renderCommunityStickerPack() : ''}
          ${state.communitySelectedSticker ? `<div class="community-selection-pill"><span>Selected sticker</span><strong>${escapeHtml(state.communitySelectedSticker)}</strong><button type="button" onclick="clearCommunitySticker()">Clear</button></div>` : ''}
          <div class="community-upload-row">
            ${state.communityAttachment ? renderCommunityComposerAttachmentSummary(state.communityAttachment) : ''}
          </div>
        </aside>
        <article class="message-card">
          <div class="content-header"><div><p class="section-kicker">Shared learner feed</p></div></div>
          <div class="message-feed">${visibleMessages.map(message => renderMessageRow(user, message)).join('')}</div>
          <div class="composer-actions">${remaining > 0 ? `<button class="btn btn-secondary btn-small" type="button" onclick="toggleOlderMessages(true)">View ${remaining} older messages</button>` : ''}${state.showOlderMessages && state.communityMessages.length > 5 ? `<button class="btn btn-ghost btn-small" type="button" onclick="toggleOlderMessages(false)">Show latest 5</button>` : ''}</div>
        </article>
      </section>
    `;
  }

  function renderCommunityStickerPack() {
    return `
      <div class="sticker-pack-panel sticker-pack-compact">
        <div class="sticker-pack-header">
          <button class="btn btn-ghost btn-small sticker-pack-close" type="button" onclick="toggleCommunityStickerPack(false)" aria-label="Close sticker pack">
            <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="sticker-pack-groups">
          ${COMMUNITY_STICKER_PACKS.map(pack => `
            <section class="sticker-pack-group">
              <h4>${pack.label}</h4>
              <div class="sticker-pack-grid">
                ${pack.stickers.map(sticker => `
                  <button class="sticker-chip ${state.communitySelectedSticker === sticker ? 'sticker-chip-active' : ''}" type="button" onclick='selectCommunitySticker(${JSON.stringify(sticker)})'>${sticker}</button>
                `).join('')}
              </div>
            </section>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderCommunityComposerAttachmentSummary(attachment) {
    if (!attachment) return '';

    if (attachment.kind === 'folder') {
      return `
        <div class="community-attachment-pill">
          <span>${escapeHtml(attachment.name)} folder will be sent as a zip archive (${attachment.fileCount} files, ${formatFileSize(attachment.size)})${attachment.excludedCount ? `, ${attachment.excludedCount} skipped` : ''}</span>
          <button type="button" onclick="clearCommunityAttachment()">Remove</button>
        </div>
      `;
    }

    return `
      <div class="community-attachment-pill">
        <span>${escapeHtml(attachment.name)} (${formatFileSize(attachment.size)})</span>
        <button type="button" onclick="clearCommunityAttachment()">Remove</button>
      </div>
    `;
  }

  function getFirstName(name) {
    const first = String(name || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    return first || 'Learner';
  }

  function getCommunityAuthorName(message, currentUser) {
    const authorName = message.authorName || message.author_name || '';
    if (authorName.trim()) return authorName.trim();
    const email = message.authorEmail || message.author_email || '';
    if (currentUser?.email && email.toLowerCase() === currentUser.email.toLowerCase()) {
      return currentUser.firstName || currentUser.lastName || currentUser.email.split('@')[0] || 'Learner';
    }
    return 'Learner';
  }

  function renderMessageRow(user, message) {
    const ownMessage = user.id === message.authorId || user.email === message.authorEmail;
    const canDelete = ownMessage;
    const authorName = getCommunityAuthorName(message, user);
    const authorInitials = escapeHtml(getNameInitials(authorName));
    const isDeleting = state.communityDeletingMessageId === String(message.id);

    // Prefer a saved profile avatar when the message belongs to the current user.
    let avatarHtml = authorInitials;
    try {
      if (ownMessage && user && user.avatar) {
        avatarHtml = `<img src="${escapeAttribute(getAvatarSrc(user))}" alt="${escapeAttribute(authorName)}" />`;
      }
    } catch (e) {
      avatarHtml = authorInitials;
    }

    return `
      <div class="message-row">
        <div class="meta-row">
          <div class="message-author">
            <span class="message-author-avatar">${avatarHtml}</span>
            <strong>${escapeHtml(getFirstName(authorName))}</strong>
          </div>
          <small>${formatDateTime(message.createdAt)}</small>
        </div>
        ${message.sticker ? `<div class="message-sticker">${escapeHtml(message.sticker)}</div>` : ''}
        ${message.body ? `<div class="message-text">${escapeHtml(message.body)}</div>` : ''}
        ${message.attachment ? renderCommunityAttachment(message.attachment) : ''}
        ${canDelete ? `<div class="card-actions"><button class="btn btn-ghost btn-small" type="button" onclick="deleteCommunityMessage('${message.id}')" ${isDeleting ? 'disabled aria-busy="true"' : ''}>${isDeleting ? 'Deleting...' : 'Delete'}</button></div>` : ''}
      </div>
    `;
  }

  function renderCommunityAttachment(attachment) {
    if (!attachment?.name) return '';

    if (attachment.kind === 'folder') {
      const attachmentUrl = attachment?.url || attachment?.dataUrl || '';
      if (!attachmentUrl) return '';
      const archiveName = escapeHtml(attachment.name);
      const archiveNameAttr = escapeAttribute(attachment.name);
      const folderLabel = escapeHtml(attachment.folderName || attachment.name.replace(/\.zip$/i, '') || 'Shared folder');
      const folderSize = attachment.size ? formatFileSize(attachment.size) : '';
      const folderMeta = folderSize
        ? `Zip archive | ${attachment.fileCount || 0} files | ${folderSize}`
        : `Zip archive | ${attachment.fileCount || 0} files`;

      return `
        <div class="message-attachment-card">
          <div class="message-attachment-meta">
            <strong>${archiveName}</strong>
            <span>Folder: ${folderLabel}</span>
            <span>${folderMeta}</span>
          </div>
          <a class="message-attachment-link" href="${escapeAttribute(attachmentUrl)}" download="${archiveNameAttr}" target="_blank" rel="noopener">Download folder archive</a>
        </div>
      `;
    }

    const attachmentUrl = attachment?.url || attachment?.dataUrl || '';
    if (!attachmentUrl) return '';

    const safeName = escapeHtml(attachment.name);
    const safeNameAttr = escapeAttribute(attachment.name);
    const safeUrl = escapeAttribute(attachmentUrl);
    const fileType = escapeHtml(attachment.type || 'File');
    const fileSize = attachment.size ? formatFileSize(attachment.size) : '';
    const metaText = fileSize ? `${fileType} | ${fileSize}` : fileType;

    if ((attachment.type || '').startsWith('image/')) {
      return `
        <div class="message-attachment-card">
          <img class="message-attachment-image" src="${safeUrl}" alt="${safeName}" />
          <div class="message-attachment-meta"><strong>${safeName}</strong><span>${metaText}</span></div>
          <a class="message-attachment-link" href="${safeUrl}" download="${safeNameAttr}" target="_blank" rel="noopener">Open image</a>
        </div>
      `;
    }

    if ((attachment.type || '').startsWith('video/')) {
      return `
        <div class="message-attachment-card">
          <video class="message-attachment-video" controls src="${safeUrl}"></video>
          <div class="message-attachment-meta"><strong>${safeName}</strong><span>${metaText}</span></div>
          <a class="message-attachment-link" href="${safeUrl}" download="${safeNameAttr}" target="_blank" rel="noopener">Open video</a>
        </div>
      `;
    }

    return `
      <div class="message-attachment-card">
        <div class="message-attachment-meta"><strong>${safeName}</strong><span>${metaText}</span></div>
        <a class="message-attachment-link" href="${safeUrl}" download="${safeNameAttr}" target="_blank" rel="noopener">Open file</a>
      </div>
    `;
  }

  function renderProgress(user, track) {
    const overall = calculateTrackProgress(user, track);
    const certificate = getCertificateData(user, track);
    const semesterRows = track.semesters.map(semester => {
      const progress = calculateSemesterProgress(user, semester);
      return `<div class="progress-row"><div class="meta-row"><strong>${semester.label}</strong><small>${progress.completed}/${progress.total} weeks completed</small></div><div class="progress-bar"><div class="progress-fill" style="width:${progress.percent}%"></div></div></div>`;
    }).join('');

    const monthRows = track.semesters.flatMap(semester => semester.months).map(month => {
      const completed = month.weeks.filter(week => user.completedLessonIds.includes(week.id)).length;
      const percent = month.weeks.length ? Math.round((completed / month.weeks.length) * 100) : 0;
      return `<div class="progress-row"><div class="meta-row"><strong>${month.title}</strong><small>${month.phase}</small></div><div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div></div>`;
    }).join('');

    return `
      <section class="dashboard-stack progress-page-shell">
        ${buildContentSurfaceHeader({
          eyebrow: 'Learning progress',
          title: 'Track progress',
          description: 'A clearer view of how your programme is progressing across semesters and months.',
          metaItems: [`${overall.percent}% complete`, `${overall.completedCount}/${overall.totalLessons} lessons done`]
        })}
        <div class="progress-grid">
          <article class="progress-card"><p class="section-kicker">Overall progress</p><h3>${overall.percent}% complete</h3><p class="copy-muted">${overall.completedCount} of ${overall.totalLessons} weekly items have been completed across the entire track.</p><div class="progress-bar"><div class="progress-fill" style="width:${overall.percent}%"></div></div><div class="dashboard-stack">${semesterRows}</div>${certificate.unlocked ? `<div class="certificate-inline-banner"><strong>Certificate unlocked</strong><button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('certificates')">Open certificate</button></div>` : ''}</article>
          <article class="progress-card"><p class="section-kicker">Monthly breakdown</p><h3>Completion by month</h3><p class="copy-muted">Three learning months and one hands-on lab month are tracked every semester.</p><div class="dashboard-stack">${monthRows}</div></article>
        </div>
      </section>
    `;
  }

  function renderCertificates(user, track) {
    const certificate = getCertificateData(user, track);

    if (!certificate.unlocked) {
      return `
        <section class="surface-card certificate-page">
          <div class="content-header">
            <div>
              <p class="section-kicker">Programme certificate</p>
              <h2>Certificate not unlocked yet</h2>
              <p>Complete all 3 semesters and every weekly topic in ${track.label} to generate your certificate automatically.</p>
            </div>
            <span class="status-pill neutral">${certificate.progress.percent}% complete</span>
          </div>
          <div class="empty-state">Your certificate will appear here automatically once you complete the full programme.</div>
        </section>
      `;
    }

    return `
      <section class="certificate-page">
        <article class="surface-card certificate-actions-bar">
          <div>
            <p class="section-kicker">Programme certificate</p>
            <h2>${track.label} completion certificate</h2>
            <p>This certificate was generated automatically when the full 3-semester programme was completed.</p>
          </div>
          <div class="card-actions">
            <button class="btn btn-primary btn-small" type="button" onclick="printCertificate()">Download / Print</button>
          </div>
        </article>
        <article id="certificateCard" class="certificate-card">
          <div class="certificate-card-inner">
            <div class="certificate-brand-row">
              <div class="brand-mark">RK</div>
              <div>
                <strong>RealKingHubs Academy</strong>
                <span>Certificate of Programme Completion</span>
              </div>
            </div>
            <div class="certificate-copy">
              <p class="certificate-overline">This certifies that</p>
              <h3>${user.firstName} ${user.lastName}</h3>
              <p class="certificate-track-line">has successfully completed the full ${track.label} learning programme across 3 semesters at RealKingHubs Academy.</p>
            </div>
            <div class="certificate-meta-grid">
              <div><span>Track</span><strong>${track.label}</strong></div>
              <div><span>Date issued</span><strong>${formatCertificateDate(certificate.issuedAt)}</strong></div>
              <div><span>Certificate ID</span><strong>${certificate.certificateId}</strong></div>
            </div>
            <div class="certificate-signature-row">
              <div class="certificate-signature-block">
                <strong>Odo Kingsley Uchenna</strong>
                <span>Founder, RealKingHubs Academy</span>
              </div>
              <div class="certificate-seal">Verified</div>
            </div>
          </div>
        </article>
      </section>
    `;
  }

  async function fetchBooksCatalog() {
    if (!communitySupabase) return readBooksCatalog();

    const { data, error } = await communitySupabase
      .from(BOOKS_TABLE)
      .select('id, title, summary, link, image_url, created_at')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const normalized = data.map(book => ({
        id: String(book.id),
        title: book.title || '',
        summary: book.summary || '',
        link: book.link || '',
        imageUrl: book.image_url || ''
      }));
      persistBooksCatalog(normalized);
      return normalized;
    }

    return readBooksCatalog();
  }

  function readBooksCatalog() {
    try {
      return JSON.parse(localStorage.getItem(BOOKS_KEY) || '[]');
    } catch (error) {
      console.warn('Failed to read books catalog', error);
      return [];
    }
  }

  function persistBooksCatalog(books) {
    const dataString = JSON.stringify(Array.isArray(books) ? books : []);
    const oldString = localStorage.getItem(BOOKS_KEY);
    localStorage.setItem(BOOKS_KEY, dataString);
    if (oldString !== dataString) {
      window.dispatchEvent(new CustomEvent('rkh-books-updated'));
    }
  }

  function refreshBooksView() {
    try {
      const books = readBooksCatalog();
      const booksRoot = document.querySelector('.books-page-shell');
      if (!booksRoot) return;
      booksRoot.outerHTML = renderBooksHTML(books);
    } catch (error) {
      console.warn('Failed to refresh books view', error);
    }
  }

  function renderBooks(user, track) {
    const books = readBooksCatalog();

    setTimeout(async () => {
      try {
        await fetchBooksCatalog();
      } catch (e) {
        console.warn('Background books catalog load failed', e);
      }
    }, 0);

    return renderBooksHTML(books);
  }

  function renderBooksHTML(books) {
    return `
      <section class="dashboard-stack books-page-shell">
        <article class="surface-card books-hero-card">
          <div class="content-header">
            <div>
              <p class="section-kicker">Books</p>
              <h2>Recommended learning books</h2>
            </div>
          </div>
        </article>

        ${books.length ? `<div class="books-grid">${books.map(book => `
          <article class="book-card" aria-label="${escapeAttribute(book.title)} book card">
            <div class="book-photo-link" ${book.imageUrl ? `onclick="openBookPreview('${escapeAttribute(book.imageUrl)}')" style="cursor: pointer;"` : ''} aria-label="Preview ${escapeAttribute(book.title)}">
              ${book.imageUrl ? `<img src="${escapeAttribute(book.imageUrl)}" alt="${escapeAttribute(book.title)} cover" />` : '<span class="book-cover-placeholder">No cover image</span>'}
              <span class="book-photo-tag">Book</span>
              ${book.imageUrl ? `<div class="book-photo-overlay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg><span>Click to preview</span></div>` : ''}
            </div>
            <div class="book-card-copy">
              <p class="book-eyebrow">Learning resource</p>
              <h3>${escapeHtml(book.title)}</h3>
              <p class="book-summary">${escapeHtml(book.summary || 'A practical reference made for learners who want faster progress.')}</p>
              <div class="book-card-actions">
                <a class="btn btn-primary btn-small btn-open-book" href="${escapeAttribute(book.link || FOUNDER_PROFILE.supportUrl)}" target="_blank" rel="noreferrer">Open Book</a>
              </div>
            </div>
          </article>
        `).join('')}</div>` : '<div class="empty-state">No books have been added yet. Ask the admin to create a book card from the admin dashboard.</div>'}

        <div id="bookPreviewModal" class="book-preview-modal hidden" onclick="closeBookPreview()">
          <button class="book-preview-close" type="button" aria-label="Close preview" onclick="event.stopPropagation(); closeBookPreview();">ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â</button>
          <img id="bookPreviewImage" src="" alt="Book cover preview" />
        </div>
      </section>
    `;
  }

  window.openBookPreview = function (imageUrl) {
    if (!imageUrl) return;
    const modal = document.getElementById('bookPreviewModal');
    const image = document.getElementById('bookPreviewImage');
    if (!modal || !image) return;
    image.src = imageUrl;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  };

  window.closeBookPreview = function () {
    const modal = document.getElementById('bookPreviewModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  window.addEventListener('storage', event => {
    if (event.key === 'rkh_books_catalog') {
      refreshBooksView();
    }
  });

  window.addEventListener('rkh-books-updated', () => {
    refreshBooksView();
  });

  function renderResources(user, track) {
    const semesterCards = track.semesters.map((semester, semesterIndex) => {
      const links = getSemesterResources(track.id, semester.id);
      const isOpen = state.currentResourcesSemesterId === semester.id;
      const linkItems = links.length
        ? links.map((item, index) => {
          const url = typeof item === 'string' ? item : item?.url || '';
          const title = typeof item === 'object' && item?.title ? item.title : buildResourceLabel(url, index);
          return `
            <a class="resource-link-card" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">
              <div>
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(url)}</span>
              </div>
              <span class="resource-link-action">Open</span>
            </a>
          `;
        }).join('')
        : '<div class="empty-state">No semester resources have been added for this semester yet.</div>';

      return `
        <article class="surface-card semester-resource-card ${isOpen ? 'semester-resource-card-open' : ''}">
          <button class="resource-semester-toggle" type="button" onclick="toggleResourcesSemester('${semester.id}')">
            <div>
              <p class="section-kicker">${semester.label}</p>
              <p>Reference links for ${semester.label.toLowerCase()} are organised here in one place.</p>
            </div>
            <div class="resource-semester-side">
              <span class="status-pill neutral">${links.length} link${links.length === 1 ? '' : 's'}</span>
              <span class="curriculum-semester-toggle-label">${isOpen ? 'Collapse' : 'Expand'}</span>
            </div>
          </button>
          ${isOpen ? `<div class="resource-link-grid">${linkItems}</div>` : ''}
        </article>
      `;
    }).join('');

    return `
      <section class="dashboard-stack">
        <article class="surface-card">
          ${buildContentSurfaceHeader({
            eyebrow: 'Semester resources',
            title: `${track.label} resource library`,
            description: '',
            metaItems: [`${track.semesters.length} semesters`, 'Direct links']
          })}
        </article>
        ${semesterCards}
      </section>
    `;
  }

  function renderAnnouncements(user, track) {
    const announcements = getTrackAnnouncements(track);
    return `
      <section class="surface-card">
        ${buildContentSurfaceHeader({
          eyebrow: 'Programme updates',
          title: 'Announcements',
          description: 'Course notices, lab guidance, and learning updates live here instead of crowding the dashboard.',
          metaItems: [announcements.length ? `${announcements.length} updates` : 'No updates yet']
        })}
        <div class="announcement-grid">${announcements.length ? announcements.map(item => `<article class="announcement-card"><small>${item.date}</small><h3>${item.title}</h3><p>${item.body}</p></article>`).join('') : '<div class="empty-state">No announcement has been published for this track yet.</div>'}</div>
      </section>
    `;
  }

  function renderFeedback(user, track) {
    return `
      <section class="feedback-layout">
        <aside class="composer-panel">
          <div class="composer-header"><div><p class="section-kicker">Learner feedback</p><h3>Share what is working and what needs attention</h3></div></div>
          <div id="feedbackMessage" class="form-message"></div>
          
          <div class="field-group">
            <label for="feedbackCategory">Feedback category</label>
            <select id="feedbackCategory">
              <option value="General">General feedback</option>
              <option value="Course">Course content</option>
              <option value="Platform">Platform experience</option>
              <option value="Support">Support request</option>
            </select>
          </div>
          
          <div class="field-group">
            <label for="feedbackMessageText">Your message</label>
            <div class="chat-composer-box">
              <textarea id="feedbackMessageText" placeholder="Tell us what you need help with, what you love, or what should improve...">${''}</textarea>
              <div class="chat-composer-footer">
                <div class="chat-composer-tools">
                  <input id="feedbackFileInput" type="file" class="hidden" onchange="handleFeedbackFileSelect(event)" />
                  <button class="btn-chat-tool" type="button" onclick="document.getElementById('feedbackFileInput').click()" title="Attach file or image" aria-label="Attach file or image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </button>
                </div>
                <button class="btn-chat-send" type="button" onclick="submitFeedbackFromComposer()" title="Send feedback" aria-label="Send feedback">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div class="feedback-upload-row">
            ${state.feedbackAttachment ? renderFeedbackComposerAttachmentSummary(state.feedbackAttachment) : ''}
          </div>
        </aside>
        <article class="message-card">
          <div class="content-header"><div><p class="section-kicker">Feedback tips</p></div></div>
          <div class="feedback-tips">
            <ul class="feedback-tips-list">
              <li><strong>Be specific:</strong> Describe exactly what's working or what needs improvement.</li>
              <li><strong>Include context:</strong> Let us know which course, lesson, or feature you're referencing.</li>
              <li><strong>Add visuals:</strong> Screenshots help us understand UI or layout issues.</li>
              <li><strong>Be constructive:</strong> Suggest solutions when you identify problems.</li>
              <li><strong>Privacy:</strong> Your feedback is only visible to the admin team.</li>
            </ul>
          </div>
        </article>
      </section>
    `;
  }

  function renderProfileAndSettings(user, track) {
    return `
      <section class="profile-grid">
        <article class="profile-section">
          <div class="profile-header-row"><div><p class="section-kicker">Learner profile</p><h2>${user.firstName} ${user.lastName}</h2><p class="copy-muted">${user.headline}</p></div></div>
          <ul class="profile-list">
            <li><strong>Email address</strong><span>${user.email}</span></li>
            <li><strong>Current track</strong><span>${track.label}</span></li>
            <li><strong>Timezone</strong><span>${user.timezone}</span></li>
            <li><strong>Bio</strong><span>${user.bio}</span></li>
          </ul>
        </article>
        <article class="settings-card">
          <div class="settings-header-row"><div><p class="section-kicker">Functional settings</p><h2>Edit profile and preferences</h2></div></div>
          <div id="profileSaveMessage" class="form-message"></div>
          <form id="profileForm" class="dashboard-stack">
            <div class="field-row"><div class="field-group"><label for="profileFirstName">First name</label><input id="profileFirstName" type="text" value="${escapeAttribute(user.firstName)}" /></div><div class="field-group"><label for="profileLastName">Last name</label><input id="profileLastName" type="text" value="${escapeAttribute(user.lastName)}" /></div></div>
            <div class="field-group"><label for="profileHeadline">Professional headline</label><input id="profileHeadline" type="text" value="${escapeAttribute(user.headline)}" /></div>
            <div class="field-group"><label for="profileBio">Bio</label><textarea id="profileBio">${escapeHtml(user.bio)}</textarea></div>
            <div class="field-row"><div class="field-group"><label for="profileTrack">Track</label><select id="profileTrack">${getResolvedTracks().map(item => `<option value="${item.id}" ${item.id === user.trackId ? 'selected' : ''}>${item.label}</option>`).join('')}</select></div><div class="field-group"><label for="profileTimezone">Timezone</label><input id="profileTimezone" type="text" value="${escapeAttribute(user.timezone)}" /></div></div>
            <!-- Profile image removed: using generated photocard by default -->
            <div class="field-group"><label for="profilePassword">Password</label><input id="profilePassword" type="password" placeholder="Leave empty to keep your current password" /></div>
            <div class="profile-image-actions"><button id="profileSaveBtn" class="btn btn-primary btn-small" type="submit">Save profile changes</button></div>
          </form>
        </article>
      </section>
    `;
  }

  function formatCertificateDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Pending';
    return date.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ---------------------------------------------------------------------------
  // Profile, assessment, and composer event binding
  // ---------------------------------------------------------------------------
  function bindProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;
    form.addEventListener('submit', saveProfileSettings);
  }

  async function saveProfileSettings(event) {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    const profileForm = document.getElementById('profileForm');
    try {
      setAuthFormBusy(profileForm, true, 'Saving...');
    } catch (e) {
      // ignore if helper not available
    }

    const firstName = document.getElementById('profileFirstName')?.value.trim() || '';
    const lastName = document.getElementById('profileLastName')?.value.trim() || '';
    const headline = document.getElementById('profileHeadline')?.value.trim() || user.headline || '';
    const bio = document.getElementById('profileBio')?.value.trim() || user.bio || '';
    const trackId = document.getElementById('profileTrack')?.value || user.trackId;
    const timezone = document.getElementById('profileTimezone')?.value.trim() || user.timezone || '';
    const newPassword = document.getElementById('profilePassword')?.value || '';

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.headline = headline;
    user.bio = bio;
    user.trackId = trackId;
    user.timezone = timezone;

    if (newPassword) {
      user.password = newPassword;
    }

    persistUsers();
    await finalizeProfileSave();
  }

  async function finalizeProfileSave() {
    const user = getCurrentUser();
    if (user) {
      await syncUserProfileToRemote(user);
      await syncCurrentUserProfileFromRemote();
    }
    renderFounderShowcase();
    showProfileSaveMessage('Profile settings saved successfully.', 'success');
    renderAppShell();
    const profileForm = document.getElementById('profileForm');
    try { setAuthFormBusy(profileForm, false); } catch (e) {}
  }

  function showProfileSaveMessage(text, type) {
    const el = document.getElementById('profileSaveMessage');
    if (!el) return;
    el.textContent = text;
    el.className = `form-message ${type}`;
  }

  // Profile image uploads are unavailable in this build, so the generated photocard remains the default.

  // Community composer helpers manage the sticker picker, file selection,
  // folder zipping, payload uploads, and final message submission.
  function bindFeedbackForm() {
    const textarea = document.getElementById('feedbackMessageText');
    if (!textarea || textarea.dataset.bound === 'true') return;

    textarea.addEventListener('input', event => {
      state.feedbackDraftText = event.target.value;
    });

    textarea.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void submitFeedbackFromComposer();
      }
    });

    textarea.dataset.bound = 'true';
  }

  function previewFeedbackImages(event) {
    const files = Array.from(event.target.files || []);
    const preview = document.getElementById('feedbackImagePreview');
    if (!preview) return;

    if (!files.length) {
      preview.textContent = '';
      return;
    }

    preview.textContent = `${files.length} image${files.length === 1 ? '' : 's'} selected: ${files.map(file => file.name).join(', ')}`;
  }

  async function readFeedbackImageFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return [];

    if (files.length > FEEDBACK_IMAGE_LIMIT) {
      throw new Error(`You can attach up to ${FEEDBACK_IMAGE_LIMIT} images.`);
    }

    const oversized = files.find(file => file.size > FEEDBACK_IMAGE_MAX_BYTES);
    if (oversized) {
      throw new Error('Each image must be 5 MB or smaller.');
    }

    return Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Could not read the selected image.'));
      reader.readAsDataURL(file);
    })));
  }

  async function submitFeedbackForm(event) {
    event.preventDefault();

    const user = getCurrentUser();
    const track = getCurrentTrack();
    if (!user || !track) return;

    const category = document.getElementById('feedbackCategory')?.value || 'General';
    const message = document.getElementById('feedbackMessageText')?.value.trim() || '';
    const feedbackMessage = document.getElementById('feedbackMessage');
    const imageFiles = document.getElementById('feedbackImageInput')?.files || null;

    if (!message) {
      feedbackMessage.className = 'form-message error';
      feedbackMessage.textContent = 'Please write a short message before sending feedback.';
      feedbackMessage.classList.remove('hidden');
      return;
    }

    let imageUrls = [];
    try {
      imageUrls = imageFiles?.length ? await readFeedbackImageFiles(imageFiles) : [];
    } catch (error) {
      feedbackMessage.className = 'form-message error';
      feedbackMessage.textContent = error?.message || 'The selected images could not be attached.';
      feedbackMessage.classList.remove('hidden');
      return;
    }

    const payload = {
      user_email: user.email,
      user_name: `${user.firstName} ${user.lastName}`.trim(),
      track_id: track.id,
      category,
      message,
      image_urls: imageUrls,
      created_at: new Date().toISOString()
    };

    try {
      if (communitySupabase) {
        const { error } = await communitySupabase.from(FEEDBACK_TABLE).insert(payload);
        if (error) throw error;
      } else {
        const stored = JSON.parse(localStorage.getItem('rkh_feedback_submissions') || '[]');
        stored.unshift({ id: `feedback-${Date.now()}`, ...payload });
        localStorage.setItem('rkh_feedback_submissions', JSON.stringify(stored));
      }

      feedbackMessage.className = 'form-message success';
      feedbackMessage.textContent = 'Your feedback has been sent to the admin team.';
      feedbackMessage.classList.remove('hidden');
      document.getElementById('feedbackForm').reset();
      document.getElementById('feedbackImagePreview').textContent = '';
      renderAppShell();
    } catch (error) {
      feedbackMessage.className = 'form-message error';
      feedbackMessage.textContent = error?.message || 'Feedback could not be sent right now.';
      feedbackMessage.classList.remove('hidden');
    }
  }

  function renderFeedbackComposerAttachmentSummary(attachment) {
    if (!attachment) return '';

    return `
      <div class="community-attachment-pill">
        <span>${escapeHtml(attachment.name)} (${formatFileSize(attachment.size)})</span>
        <button type="button" onclick="clearFeedbackAttachment()">Remove</button>
      </div>
    `;
  }

  function handleFeedbackFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    state.feedbackAttachment = {
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    };

    renderAppShell();
  }

  function clearFeedbackAttachment() {
    state.feedbackAttachment = null;
    const fileInput = document.getElementById('feedbackFileInput');
    if (fileInput) fileInput.value = '';
    renderAppShell();
  }

  async function submitFeedbackFromComposer() {
    const user = getCurrentUser();
    const track = getCurrentTrack();
    if (!user || !track) return;

    const categorySelect = document.getElementById('feedbackCategory');
    const category = categorySelect?.value || 'General';
    const message = document.getElementById('feedbackMessageText')?.value.trim() || '';
    const feedbackMessage = document.getElementById('feedbackMessage');
    const attachment = state.feedbackAttachment;

    if (!message && !attachment) {
      state.feedbackComposerMessage = {
        type: 'error',
        text: 'Add a message or attach a file before sending feedback.'
      };
      renderAppShell();
      return;
    }

    let attachmentPayload = null;
    if (attachment) {
      state.feedbackComposerMessage = {
        type: 'success',
        text: `Uploading ${attachment.name}...`
      };
      renderAppShell();

      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error || new Error('Could not read file'));
          reader.readAsDataURL(attachment.file);
        });

        attachmentPayload = {
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
          data: base64
        };
      } catch (error) {
        state.feedbackComposerMessage = {
          type: 'error',
          text: error?.message || 'The selected file could not be attached.'
        };
        renderAppShell();
        return;
      }
    }

    const payload = {
      user_email: user.email,
      user_name: `${user.firstName} ${user.lastName}`.trim(),
      track_id: track.id,
      category,
      message,
      attachment: attachmentPayload,
      created_at: new Date().toISOString()
    };

    try {
      if (communitySupabase) {
        const { error } = await communitySupabase.from(FEEDBACK_TABLE).insert(payload);
        if (error) throw error;
      } else {
        const stored = JSON.parse(localStorage.getItem('rkh_feedback_submissions') || '[]');
        stored.unshift({ id: `feedback-${Date.now()}`, ...payload });
        localStorage.setItem('rkh_feedback_submissions', JSON.stringify(stored));
      }

      state.feedbackComposerMessage = {
        type: 'success',
        text: 'Your feedback has been sent to the admin team. Thank you!'
      };
      state.feedbackDraftText = '';
      state.feedbackAttachment = null;
      document.getElementById('feedbackMessageText').value = '';
      const fileInput = document.getElementById('feedbackFileInput');
      if (fileInput) fileInput.value = '';
      renderAppShell();
    } catch (error) {
      state.feedbackComposerMessage = {
        type: 'error',
        text: error?.message || 'Feedback could not be sent right now.'
      };
      renderAppShell();
    }
  }

  function bindCommunityComposer() {
    const input = document.getElementById('communityMessage');
    if (!input || input.dataset.bound === 'true') return;
    input.addEventListener('input', event => {
      state.communityDraftText = event.target.value;
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        postCommunityMessage();
      }
    });
    input.dataset.bound = 'true';
  }

  function toggleCommunityStickerPack(forceOpen) {
    state.communityStickerPackOpen = typeof forceOpen === 'boolean' ? forceOpen : !state.communityStickerPackOpen;
    renderAppShell();
  }

  function selectCommunitySticker(sticker) {
    state.communitySelectedSticker = state.communitySelectedSticker === sticker ? '' : sticker;
    state.communityStickerPackOpen = false;
    renderAppShell();
  }

  function clearCommunitySticker() {
    state.communitySelectedSticker = '';
    renderAppShell();
  }

  function clearCommunityAttachment() {
    state.communityAttachment = null;
    state.communityComposerMessage = null;
    const fileInput = document.getElementById('communityFileInput');
    if (fileInput) fileInput.value = '';
    const folderInput = document.getElementById('communityFolderInput');
    if (folderInput) folderInput.value = '';
    renderAppShell();
  }

  function clearCommunityComposerExtras() {
    state.communitySelectedSticker = '';
    state.communityStickerPackOpen = false;
    state.communityAttachment = null;
    state.communityComposerMessage = null;
  }

  function handleCommunityFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > COMMUNITY_ATTACHMENT_LIMIT_BYTES) {
      state.communityComposerMessage = {
        type: 'error',
        text: 'Files must be 2 GB or smaller to send through the community room.'
      };
      event.target.value = '';
      renderAppShell();
      return;
    }

    state.communityAttachment = {
      file,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size
    };
    state.communityComposerMessage = {
      type: 'success',
      text: `${file.name} is attached and ready to send (${formatFileSize(file.size)}).`
    };
    event.target.value = '';
    renderAppShell();
  }

  // Folder uploads are collected first, then converted into one downloadable zip archive on send.
  // This keeps the community room simple for learners and much easier to download later.
  function handleCommunityFolderSelect(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const folderName = (files[0].webkitRelativePath || files[0].name).split('/')[0] || 'Shared folder';
    if (shouldExcludeFolderName(folderName)) {
      state.communityComposerMessage = {
        type: 'error',
        text: 'Hidden system folders like .git cannot be sent. Select the actual project folder instead.'
      };
      event.target.value = '';
      renderAppShell();
      return;
    }

    const { includedFiles, excludedCount } = filterCommunityFolderFiles(files);

    if (!includedFiles.length) {
      state.communityComposerMessage = {
        type: 'error',
        text: 'That folder only contains hidden or project-system files, so there is nothing clean to send.'
      };
      event.target.value = '';
      renderAppShell();
      return;
    }

    const totalSize = includedFiles.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > COMMUNITY_ATTACHMENT_LIMIT_BYTES) {
      state.communityComposerMessage = {
        type: 'error',
        text: 'Folders must be 2 GB or smaller to send through the community room.'
      };
      event.target.value = '';
      renderAppShell();
      return;
    }

    state.communityAttachment = {
      kind: 'folder',
      name: folderName,
      size: totalSize,
      fileCount: includedFiles.length,
      excludedCount,
      files: includedFiles.map(file => ({
        file,
        name: file.name,
        relativePath: normalizeFolderRelativePath(file.webkitRelativePath || file.name),
        type: file.type || 'application/octet-stream',
        size: file.size
      }))
    };
    state.communityComposerMessage = {
      type: 'success',
      text: `${folderName} is attached and will be sent as a zip archive (${includedFiles.length} files, ${formatFileSize(totalSize)}).${excludedCount ? ` ${excludedCount} hidden or system items were skipped.` : ''}`
    };
    event.target.value = '';
    renderAppShell();
  }

  // Convert a file into a browser-safe data URL for local-only fallback storage.
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  // Decide whether an attachment should stay local or move through shared storage.
  // This protects the app from trying to serialize very large files into localStorage.
  async function prepareCommunityAttachmentPayload(user, track, attachment) {
    if (!attachment) return null;

    const MAX_LOCAL_ATTACHMENT_BYTES = 50 * 1024 * 1024;

    if (attachment.kind === 'folder') {
      return prepareCommunityFolderPayload(user, track, attachment, MAX_LOCAL_ATTACHMENT_BYTES);
    }

    if (!attachment.file) return null;

    if (!communitySupabase) {
      if (attachment.size > MAX_LOCAL_ATTACHMENT_BYTES) {
        throw new Error('Local file sharing only supports files up to 50 MB when community storage is unavailable.');
      }

      const dataUrl = await readFileAsDataUrl(attachment.file);
      return {
        bucket: null,
        path: null,
        url: dataUrl,
        dataUrl,
        name: attachment.name,
        type: attachment.type || attachment.file.type || 'application/octet-stream',
        size: attachment.size || attachment.file.size || 0
      };
    }

    try {
      return await uploadCommunityAttachment(user, track, attachment);
    } catch (error) {
      if (attachment.size <= MAX_LOCAL_ATTACHMENT_BYTES) {
        return {
          bucket: null,
          path: null,
          url: await readFileAsDataUrl(attachment.file),
          dataUrl: await readFileAsDataUrl(attachment.file),
          name: attachment.name,
          type: attachment.type || attachment.file.type || 'application/octet-stream',
          size: attachment.size || attachment.file.size || 0
        };
      }
      throw error;
    }
  }

  // Build one zip archive from the selected folder contents so the receiver gets a single download.
  async function buildCommunityFolderArchive(attachment) {
    if (!window.JSZip) {
      throw new Error('Zip support is not loaded yet. Refresh the page and try again.');
    }

    const zip = new window.JSZip();
    for (const fileEntry of attachment.files || []) {
      if (shouldExcludeFolderEntry(fileEntry.relativePath || fileEntry.name)) {
        continue;
      }
      const relativePath = sanitizeFolderRelativePath(fileEntry.relativePath || fileEntry.name);
      zip.file(relativePath, fileEntry.file);
    }

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const archiveBaseName = sanitizeFileName(attachment.name || 'shared-folder');
    return new File([blob], `${archiveBaseName}.zip`, { type: 'application/zip' });
  }

  // Folder uploads follow the same storage pipeline as normal files after we archive them.
  async function prepareCommunityFolderPayload(user, track, attachment, maxLocalBytes) {
    const archiveFile = await buildCommunityFolderArchive(attachment);
    const archiveAttachment = {
      kind: 'folder',
      file: archiveFile,
      name: archiveFile.name,
      folderName: attachment.name,
      type: 'application/zip',
      size: archiveFile.size,
      fileCount: attachment.fileCount
    };

    if (!communitySupabase) {
      if (archiveFile.size > maxLocalBytes) {
        throw new Error('Folder sharing without Supabase storage is limited to zip archives up to 50 MB.');
      }

      const dataUrl = await readFileAsDataUrl(archiveFile);
      return {
        bucket: null,
        path: null,
        url: dataUrl,
        dataUrl,
        kind: 'folder',
        folderName: attachment.name,
        name: archiveFile.name,
        type: 'application/zip',
        size: archiveFile.size,
        fileCount: attachment.fileCount
      };
    }

    return uploadCommunityAttachment(user, track, archiveAttachment);
  }

  // Upload the physical file to Supabase Storage, then return only the metadata
  // needed for the message feed to render a usable attachment link later.
  async function uploadCommunityAttachment(user, track, attachment) {
    if (!attachment?.file || !communitySupabase) return null;

    const safeName = sanitizeFileName(attachment.name || attachment.file.name || 'attachment');
    const path = `${track.id}/${user.id}/${Date.now()}-${safeName}`;
    const storage = communitySupabase.storage.from(COMMUNITY_ATTACHMENT_BUCKET);
    const { error } = await storage.upload(path, attachment.file, {
      upsert: false,
      contentType: attachment.type || attachment.file.type || 'application/octet-stream'
    });

    if (error) {
      throw error;
    }

    const { data } = storage.getPublicUrl(path);
    return {
      bucket: COMMUNITY_ATTACHMENT_BUCKET,
      path,
      url: data.publicUrl,
      kind: attachment.kind || 'file',
      folderName: attachment.folderName || '',
      name: attachment.name,
      type: attachment.type || attachment.file.type || 'application/octet-stream',
      size: attachment.size || attachment.file.size || 0,
      fileCount: attachment.fileCount || 0
    };
  }

  function getCommunityUploadErrorMessage(error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('zip support')) {
      return 'Folder archive could not be prepared. Refresh the page and try the folder upload again.';
    }
    if (message.includes('bucket') || message.includes('storage') || message.includes('not found')) {
      return 'Attachment could not be uploaded. Run the updated Supabase SQL so the community-attachments storage bucket is created.';
    }
    return error?.message || 'Attachment could not be prepared for sending.';
  }

  // Community messages can contain text, a sticker, or a file attachment.
  // The room value keeps each message scoped to the learner's selected programme.
  async function postCommunityMessage() {
    const user = getCurrentUser();
    const track = getCurrentTrack();
    const input = document.getElementById('communityMessage');
    if (!user || !track || !input) return;

    const body = input.value.trim();
    const sticker = state.communitySelectedSticker;
    const attachment = state.communityAttachment;
    if (!body && !sticker && !attachment) {
      state.communityComposerMessage = { type: 'error', text: 'Add a message, a sticker, a file, or a folder before sending.' };
      renderAppShell();
      return;
    }

    let attachmentPayload = null;
    if (attachment) {
      state.communityComposerMessage = {
        type: 'success',
        text: `Preparing ${attachment.name} before sending the message...`
      };
      renderAppShell();

      try {
        attachmentPayload = await prepareCommunityAttachmentPayload(user, track, attachment);
      } catch (error) {
        state.communitySyncError = error.message;
        state.communityComposerMessage = {
          type: 'error',
          text: getCommunityUploadErrorMessage(error)
        };
        renderAppShell();
        return;
      }
    }

    const payload = {
      author_name: `${user.firstName} ${user.lastName}`,
      author_email: user.email,
      room: track.id,
      content: serializeCommunityPayload({ body, sticker, attachment: attachmentPayload })
    };

    if (communitySupabase) {
      const { error } = await communitySupabase.from('community_messages').insert(payload);
      if (error) {
        if (attachmentPayload?.path) {
          await communitySupabase.storage
            .from(attachmentPayload.bucket || COMMUNITY_ATTACHMENT_BUCKET)
            .remove([attachmentPayload.path]);
        }
        state.communitySyncError = error.message;
        state.communityComposerMessage = { type: 'error', text: 'Message could not be sent to the shared room.' };
        renderAppShell();
        return;
      } else {
        state.communitySyncError = '';
      }
    } else {
      const localMessages = readStoredCommunityMessages();
      localMessages.unshift(normalizeCommunityMessage({
        id: `msg-${Date.now()}`,
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`,
        authorEmail: user.email,
        authorTrack: track.label,
        trackId: track.id,
        body,
        sticker,
        attachment: attachmentPayload,
        createdAt: new Date().toISOString()
      }));
      writeStoredCommunityMessages(localMessages);
    }

    input.value = '';
    state.communityDraftText = '';
    state.showOlderMessages = false;
    clearCommunityComposerExtras();
    await refreshCommunityMessages(track.id);
  }

  async function deleteCommunityMessage(messageId) {
    const user = getCurrentUser();
    const track = getCurrentTrack();
    if (!user || !track) return;

    state.communityDeletingMessageId = String(messageId);
    renderAppShell();

    if (communitySupabase) {
      const { error } = await communitySupabase
        .from('community_messages')
        .delete()
        .eq('id', messageId)
        .eq('author_email', user.email);
      if (error) {
        state.communityDeletingMessageId = null;
        state.communityComposerMessage = {
          type: 'error',
          text: `Message deletion failed: ${error.message}`
        };
        renderAppShell();
        return;
      }
    } else {
      const localMessages = readStoredCommunityMessages().filter(message => !(message.id === String(messageId) && (message.authorId === user.id || message.authorEmail === user.email)));
      writeStoredCommunityMessages(localMessages);
    }

    await refreshCommunityMessages(track.id);
    state.communityDeletingMessageId = null;
    renderAppShell();
  }

  // ---------------------------------------------------------------------------
  // Small interaction handlers and shared utilities
  // ---------------------------------------------------------------------------
  function toggleOlderMessages(showAll) {
    state.showOlderMessages = showAll;
    renderAppShell();
  }

  // Open a semester and keep month focus inside that semester predictable for the learner.
  function toggleCurriculumSemester(semesterId) {
    state.currentCurriculumSemesterId = state.currentCurriculumSemesterId === semesterId ? null : semesterId;
    state.currentCurriculumMonthId = null;
    state.currentView = 'curriculum';
    renderAppShell();
  }

  // Clicking the current month again collapses it, which keeps the curriculum list tidy.
  function toggleCurriculumMonth(monthId) {
    state.currentCurriculumMonthId = state.currentCurriculumMonthId === monthId ? null : monthId;
    const track = getCurrentTrack();
    if (track && state.currentCurriculumMonthId) {
      const lessonContext = track.semesters
        .map(semester => ({ semester, month: semester.months.find(item => item.id === monthId) }))
        .find(item => item.month);
      if (lessonContext) {
        state.currentCurriculumSemesterId = lessonContext.semester.id;
      }
    }
    state.currentView = 'curriculum';
    renderAppShell();
  }

  function toggleLessonCompletion(lessonId) {
    const user = getCurrentUser();
    const track = getCurrentTrack();
    if (!user) return;
    const hasCompleted = user.completedLessonIds.includes(lessonId);
    user.completedLessonIds = hasCompleted ? user.completedLessonIds.filter(id => id !== lessonId) : [...user.completedLessonIds, lessonId];
    if (track) {
      ensureCertificateState(user, track);
    }
    void persistUsers();
    renderAppShell();
  }

  function toggleResourcesSemester(semesterId) {
    state.currentResourcesSemesterId = state.currentResourcesSemesterId === semesterId ? null : semesterId;
    state.currentView = 'resources';
    renderAppShell();
  }

  function openLesson(lessonId) {
    const track = getCurrentTrack();
    const lessonContext = track ? getLessonContext(track, lessonId) : null;
    state.currentLessonId = lessonId;
    state.currentLessonVideoIndex = 0;
    if (lessonContext) {
      state.currentCurriculumSemesterId = lessonContext.semester.id;
      state.currentCurriculumMonthId = lessonContext.month.id;
    }
    state.currentView = 'curriculum';
    renderAppShell();
  }

  function clearLessonView() {
    state.currentLessonId = null;
    state.currentLessonVideoIndex = 0;
    state.currentView = 'curriculum';
    renderAppShell();
  }

  function selectLessonVideo(index) {
    state.currentLessonVideoIndex = Number(index) || 0;
    renderAppShell();
  }

  function openNextLesson(currentLessonId) {
    const track = getCurrentTrack();
    if (!track) return;
    const nextLesson = getNextLessonContext(track, currentLessonId);
    if (nextLesson) {
      openLesson(nextLesson.lesson.id);
      return;
    }

    const user = getCurrentUser();
    const certificate = user ? getCertificateData(user, track) : null;
    if (certificate?.unlocked) {
      openApp('certificates');
    }
  }

  function printCertificate() {
    window.print();
  }

  function focusCurriculumLocation(semesterId, monthId) {
    state.currentCurriculumSemesterId = semesterId || null;
    state.currentCurriculumMonthId = monthId || null;
    state.currentView = 'curriculum';
    renderAppShell();
  }

  function openLiveClass(classId) {
    state.currentLiveClassId = classId;
    state.currentView = 'live';
    renderAppShell();
  }

  function toggleLiveClassAttendance(classId) {
    const user = getCurrentUser();
    if (!user) return;
    const joined = user.joinedClassIds.includes(classId);
    user.joinedClassIds = joined ? user.joinedClassIds.filter(id => id !== classId) : [...user.joinedClassIds, classId];
    void persistUsers();
    state.currentLiveClassId = classId;
    state.currentView = 'live';
    renderAppShell();
  }

  function handleStorageSync(event) {
    if (event.key === 'rkh-track-refresh') {
      void refreshTrackSettings({ silent: false });
      return;
    }

    if (event.key !== COMMUNITY_KEY) return;
    hydrateState();
    if (getCurrentUser()) renderAppShell();
  }

  function toTimestamp(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function inferTrackId(label) {
    const normalized = String(label || '').toLowerCase();
    if (normalized.includes('cloud')) return 'cloud-engineering';
    if (normalized.includes('frontend')) return 'frontend-engineering';
    if (normalized.includes('backend')) return 'backend-engineering';
    return '';
  }

  function getNameInitials(fullName) {
    const parts = String(fullName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return parts.map(part => part.charAt(0)).join('').toUpperCase() || 'RK';
  }

  function getInitials(firstName, lastName) {
    return getNameInitials(`${firstName || ''} ${lastName || ''}`);
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function formatFileSize(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '0 B';
    if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    if (value >= 1024) return `${Math.round(value / 1024)} KB`;
    return `${value} B`;
  }

  function sanitizeFileName(name) {
    const cleaned = String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return cleaned || 'attachment';
  }

  function normalizeFolderRelativePath(path) {
    const normalized = String(path || '')
      .replace(/\\/g, '/')
      .replace(/^\.\//, '');
    const segments = normalized.split('/').filter(Boolean);
    return segments.length > 1 ? segments.slice(1).join('/') : segments[0] || 'file';
  }

  // Folder sharing should skip repository internals and operating-system files so
  // recipients only receive the useful learning content instead of project metadata.
  function filterCommunityFolderFiles(files) {
    const includedFiles = [];
    let excludedCount = 0;

    for (const file of files) {
      const candidatePath = file.webkitRelativePath || file.name;
      if (shouldExcludeFolderEntry(candidatePath)) {
        excludedCount += 1;
        continue;
      }
      includedFiles.push(file);
    }

    return { includedFiles, excludedCount };
  }

  function shouldExcludeFolderEntry(path) {
    const normalized = String(path || '').replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);
    if (!segments.length) return true;

    const excludedFolders = new Set(['.git', '.svn', '.hg', '.idea', '.vscode', '__macosx']);
    const excludedFiles = new Set(['thumbs.db', 'desktop.ini', '.ds_store']);

    if (segments.some(segment => shouldExcludeFolderName(segment) || excludedFolders.has(segment.toLowerCase()))) {
      return true;
    }

    const fileName = segments[segments.length - 1].toLowerCase();
    return excludedFiles.has(fileName);
  }

  function shouldExcludeFolderName(name) {
    const normalized = String(name || '').trim().toLowerCase();
    return normalized.startsWith('.') || normalized === '__macosx';
  }

  function sanitizeFolderRelativePath(path) {
    return normalizeFolderRelativePath(path)
      .split('/')
      .map(segment => sanitizeFileName(segment))
      .filter(Boolean)
      .join('/');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function getLessonContext(track, lessonId) {
    for (const semester of track.semesters) {
      for (const month of semester.months) {
        const lesson = month.weeks.find(item => item.id === lessonId);
        if (lesson) {
          return { semester, month, lesson };
        }
      }
    }
    return null;
  }

  // Search uses this lightweight context so it can stay in a separate file
  // without duplicating LMS state or business logic.
  // Search uses this compact context instead of touching internal app state directly.
  function getSearchContext() {
    const user = getCurrentUser();
    const track = getCurrentTrack();
    const resolvedTrack = track ? { ...track, announcements: getTrackAnnouncements(track) } : track;
    return {
      user,
      track: resolvedTrack,
      communityMessages: state.communityMessages.filter(message => !track || message.trackId === track.id),
      openView: openApp,
      openLesson,
      focusCurriculumLocation,
      openLiveClass
    };
  }

  const exposeGlobal = (name, value) => {
    if (typeof window !== 'undefined') {
      window[name] = value;
    }
    if (typeof globalThis !== 'undefined') {
      globalThis[name] = value;
    }
  };

  exposeGlobal('showLandingPage', showLandingPage);
  exposeGlobal('showAuthPage', showAuthPage);
  exposeGlobal('switchAuthMode', switchAuthMode);
  exposeGlobal('toggleLandingMenu', toggleLandingMenu);
  exposeGlobal('closeLandingMenu', closeLandingMenu);
  exposeGlobal('toggleAppSidebar', toggleAppSidebar);
  exposeGlobal('closeAppSidebar', closeAppSidebar);
  exposeGlobal('togglePasswordVisibility', togglePasswordVisibility);
  exposeGlobal('installRkhApp', installRkhApp);
  exposeGlobal('scrollToTopPage', scrollToTopPage);
  exposeGlobal('openDashboardView', openApp);
  exposeGlobal('toggleResourcesSemester', toggleResourcesSemester);
  exposeGlobal('logoutUser', logoutUser);
  exposeGlobal('toggleLessonCompletion', toggleLessonCompletion);
  exposeGlobal('openLesson', openLesson);
  exposeGlobal('openNextLesson', openNextLesson);
  exposeGlobal('selectLessonVideo', selectLessonVideo);
  exposeGlobal('clearLessonView', clearLessonView);
  exposeGlobal('printCertificate', printCertificate);
  exposeGlobal('focusCurriculumLocation', focusCurriculumLocation);
  exposeGlobal('toggleCurriculumMonth', toggleCurriculumMonth);
  exposeGlobal('openLiveClass', openLiveClass);
  exposeGlobal('toggleLiveClassAttendance', toggleLiveClassAttendance);

  exposeGlobal('toggleCommunityStickerPack', toggleCommunityStickerPack);
  exposeGlobal('selectCommunitySticker', selectCommunitySticker);
  exposeGlobal('clearCommunitySticker', clearCommunitySticker);
  exposeGlobal('handleCommunityFileSelect', handleCommunityFileSelect);
  exposeGlobal('handleCommunityFolderSelect', handleCommunityFolderSelect);
  exposeGlobal('clearCommunityAttachment', clearCommunityAttachment);
  exposeGlobal('postCommunityMessage', postCommunityMessage);
  exposeGlobal('deleteCommunityMessage', deleteCommunityMessage);
  exposeGlobal('toggleOlderMessages', toggleOlderMessages);
  
  exposeGlobal('handleFeedbackFileSelect', handleFeedbackFileSelect);
  exposeGlobal('clearFeedbackAttachment', clearFeedbackAttachment);
  exposeGlobal('submitFeedbackFromComposer', submitFeedbackFromComposer);
  
  exposeGlobal('toggleCurriculumSemester', toggleCurriculumSemester);
  exposeGlobal('getRkhSearchContext', getSearchContext);
})();

