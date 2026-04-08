
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
  const USERS_KEY = 'rkh_fresh_users';
  const SESSION_KEY = 'rkh_fresh_session';
  const COMMUNITY_KEY = 'rkh_fresh_community';
  const SUPABASE_URL = 'https://gelpzfafiiudidxmpofo.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHB6ZmFmaWl1ZGlkeG1wb2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTIwNzcsImV4cCI6MjA5MDk4ODA3N30.82lZQg6ZYr1SsK9SFsbszby5QEf6HENgnYn1ynS0ZhE';
  const COMMUNITY_SYNC_INTERVAL_MS = 15000;
  const COMMUNITY_ATTACHMENT_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;
  const COMMUNITY_ATTACHMENT_BUCKET = 'community-attachments';
  const ANNOUNCEMENTS_TABLE = 'lms_announcements';
  const TRACK_SETTINGS_TABLE = 'lms_track_settings';
  const MONTH_OVERRIDES_TABLE = 'lms_curriculum_month_overrides';
  const WEEK_OVERRIDES_TABLE = 'lms_curriculum_week_overrides';
  const SEMESTER_RESOURCES_TABLE = 'lms_semester_resources';

  const COMMUNITY_STICKER_PACKS = [
    {
      id: 'celebrate',
      label: 'Celebrate',
      stickers: ['\u{1F389}', '\u{1F44F}', '\u{1F525}', '\u{1F31F}', '\u{1F3C6}', '\u{1F64C}']
    },
    {
      id: 'support',
      label: 'Support',
      stickers: ['\u{2705}', '\u{1F4A1}', '\u{1F680}', '\u{1F91D}', '\u{1FAE1}', '\u{1F90D}']
    },
    {
      id: 'study',
      label: 'Study',
      stickers: ['\u{1F4DA}', '\u{1F4BB}', '\u{1F3AF}', '\u{270D}', '\u{1F4D6}', '\u{1F4CB}']
    },
    {
      id: 'energy',
      label: 'Energy',
      stickers: ['\u{26A1}', '\u{1F525}', '\u{1F4A5}', '\u{1F680}', '\u{1F44A}', '\u{1F31E}']
    },
    {
      id: 'reaction',
      label: 'Reaction',
      stickers: ['\u{1F60E}', '\u{1F973}', '\u{1F929}', '\u{1F62E}', '\u{1F914}', '\u{1F440}']
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
    users: [],
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
    assessmentMessage: null,
    communityTrackId: null,
    communitySyncError: '',
    communitySyncMode: 'local',
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
    seedStorage();
    hydrateState();
    persistUsers();
    initializeCommunitySync();
    await bootstrapRemoteLmsData();
    renderMarketingTracks();
    renderFounderShowcase();
    populateRegisterTrackSelect();
    bindEvents();

    if (getCurrentUser()) {
      const profileAvailable = await syncCurrentUserProfileFromRemote();
      if (profileAvailable === false) {
        showAuthPage('login');
        return;
      }
      openApp('dashboard');
    } else {
      showLandingPage();
    }
  }

  function bindDom() {
    dom.landingPage = document.getElementById('landingPage');
    dom.authPage = document.getElementById('authPage');
    dom.appPage = document.getElementById('appPage');
    dom.marketingTracks = document.getElementById('marketingTracks');
    dom.founderAvatar = document.getElementById('founderAvatar');
    dom.founderName = document.getElementById('founderName');
    dom.founderRole = document.getElementById('founderRole');
    dom.founderBio = document.getElementById('founderBio');
    dom.founderSupportLink = document.getElementById('founderSupportLink');
    dom.loginForm = document.getElementById('loginForm');
    dom.registerForm = document.getElementById('registerForm');
    dom.loginTab = document.getElementById('loginTab');
    dom.registerTab = document.getElementById('registerTab');
    dom.authMessage = document.getElementById('authMessage');
    dom.registerTrack = document.getElementById('registerTrack');
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
    dom.topbarTrack = document.getElementById('topbarTrack');
    dom.topbarAvatar = document.getElementById('topbarAvatar');
    dom.appFooterText = document.getElementById('appFooterText');
    dom.scrollTopButton = document.getElementById('scrollTopButton');
  }

  function bindEvents() {
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.registerForm.addEventListener('submit', handleRegister);
    window.addEventListener('resize', handleViewportResize);
    window.addEventListener('scroll', handleScrollVisibility, { passive: true });
    document.addEventListener('keydown', handleGlobalEscapes);

    dom.landingMenuDrawer?.querySelectorAll('a, button').forEach(element => {
      element.addEventListener('click', () => closeLandingMenu());
    });

    handleScrollVisibility();
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
  // These helpers prepare a stable app state from local storage and demo seed data.
  // ---------------------------------------------------------------------------
  function seedStorage() {
    if (!localStorage.getItem(COMMUNITY_KEY)) {
      localStorage.setItem(COMMUNITY_KEY, JSON.stringify(window.RKH_DATA.demoMessages));
    }

    if (!localStorage.getItem(USERS_KEY)) {
      const demoUsers = [
        createDemoUser('demo-cloud', 'Adewale', 'King', 'cloud@realkinghubs.demo', 'cloud-engineering', 'Cloud learner building production-ready cloud operations.'),
        createDemoUser('demo-frontend', 'Martha', 'Bello', 'frontend@realkinghubs.demo', 'frontend-engineering', 'Frontend learner focused on clean UI delivery.'),
        createDemoUser('demo-backend', 'David', 'Uche', 'backend@realkinghubs.demo', 'backend-engineering', 'Backend learner improving API design and reliability.')
      ];
      localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
    }
  }

  function createDemoUser(id, firstName, lastName, email, trackId, headline) {
    return {
      id,
      firstName,
      lastName,
      email,
      password: 'password123',
      trackId,
      timezone: 'Africa/Lagos',
      headline,
      bio: 'This learner profile can be updated from profile and settings at any time.',
      avatar: '',
      completedLessonIds: [],
      joinedClassIds: [],
      assessmentSubmissions: {},
      lastSeenCommunityAt: '',
      lastSeenAnnouncementsAt: '',
      lastSeenAssessmentsAt: ''
    };
  }

  function hydrateState() {
    state.users = readJson(USERS_KEY, []).map(normalizeUser);
    state.communityMessages = readJson(COMMUNITY_KEY, window.RKH_DATA.demoMessages)
      .map(normalizeCommunityMessage)
      .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
    state.currentUserId = localStorage.getItem(SESSION_KEY) || null;
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

  function persistUsers() {
    localStorage.setItem(USERS_KEY, JSON.stringify(state.users));
  }

  function persistMessages() {
    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(state.communityMessages));
  }

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
    return {
      id: String(message.id),
      authorId: message.authorId || message.author_id || '',
      authorName: message.authorName || message.author_name || 'Learner',
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

  // Weekly lesson content can come from the base curriculum or admin overrides.
  // These helpers normalize both sources into one consistent shape so the
  // learner player can support playlists and richer resources without knowing
  // where the data came from.
  function normalizeLessonVideoItems(videoItems, fallbackVideoUrl = '') {
    const resolved = Array.isArray(videoItems) ? videoItems : [];
    const normalized = resolved
      .map((item, index) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          return trimmed ? { title: `Video ${index + 1}`, url: trimmed } : null;
        }

        if (item && typeof item === 'object') {
          const url = String(item.url || item.videoUrl || '').trim();
          if (!url) return null;
          return {
            title: String(item.title || `Video ${index + 1}`).trim(),
            url
          };
        }

        return null;
      })
      .filter(Boolean);

    if (normalized.length) return normalized;
    if (fallbackVideoUrl) {
      return [{ title: 'Lesson video', url: fallbackVideoUrl }];
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
    return state.users.find(user => user.id === state.currentUserId) || null;
  }

  function getCurrentTrack() {
    const user = getCurrentUser();
    return user ? getResolvedTrack(user.trackId) : null;
  }

  // Track settings and curriculum overrides are merged into the static data layer
  // so the LMS can stay fast in the browser while still supporting admin edits.
  function getResolvedTracks() {
    return Object.values(window.RKH_DATA?.tracks || {})
      .map(track => getResolvedTrack(track.id))
      .filter(Boolean)
      .sort((left, right) => {
        const leftOrder = Number.isFinite(left.sortOrder) ? left.sortOrder : 0;
        const rightOrder = Number.isFinite(right.sortOrder) ? right.sortOrder : 0;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.label.localeCompare(right.label);
      });
  }

  function getAvailableTracks() {
    return getResolvedTracks().filter(track => track.isEnabled !== false);
  }

  function getResolvedTrack(trackId) {
    const baseTrack = window.RKH_DATA?.tracks?.[trackId];
    if (!baseTrack) return null;

    const trackSettings = state.trackSettingsById[trackId] || {};
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
    return state.users.find(user => user.email.toLowerCase() === FOUNDER_PROFILE.email.toLowerCase()) || null;
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
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || fallbackName || 'RealKingHubs Academy';
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

  // The community layer prefers Supabase for cross-browser sync, but the app still
  // keeps local fallbacks so development and offline testing remain possible.
  function initializeCommunitySync() {
    if (!window.supabase?.createClient || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      state.communitySyncMode = 'local';
      return;
    }

    communitySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    state.communitySyncMode = 'remote';
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
      .select('id, label, summary, outcomes, is_enabled, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Track settings sync failed', error);
      return;
    }

    state.trackSettingsById = Object.fromEntries((data || []).map(item => [
      item.id,
      {
        label: item.label || '',
        summary: item.summary || '',
        outcomes: Array.isArray(item.outcomes) ? item.outcomes : [],
        isEnabled: item.is_enabled !== false,
        sortOrder: Number(item.sort_order || 0)
      }
    ]));

    if (!options.silent) {
      renderMarketingTracks();
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
          videoUrls: Array.isArray(item.video_urls) ? item.video_urls : [],
          resources: Array.isArray(item.resources) ? item.resources : [],
          resourceItems: Array.isArray(item.resource_items) ? item.resource_items : []
        }
      ]));
    }

    if (!options.silent && getCurrentUser()) {
      renderAppShell();
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

    state.semesterResourcesByKey = Object.fromEntries((data || []).map(item => [
      `${item.track_id}::${item.semester_id}`,
      Array.isArray(item.resource_links) ? item.resource_links : []
    ]));

    if (!options.silent && getCurrentUser()) {
      renderAppShell();
    }
  }

  // Learner accounts still authenticate locally, but their shareable profile data
  // is mirrored into Supabase so the admin workspace can manage people and tracks.
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
      profile_last_seen_at: new Date().toISOString()
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
      return true;
    }

    user.firstName = remoteProfile.firstName || user.firstName;
    user.lastName = remoteProfile.lastName || user.lastName;
    user.trackId = remoteProfile.trackId || user.trackId;
    user.timezone = remoteProfile.timezone || user.timezone;
    user.headline = remoteProfile.headline || user.headline;
    user.bio = remoteProfile.bio || user.bio;
    user.avatar = remoteProfile.avatar || user.avatar;
    persistUsers();

    if (remoteProfile.isActive === false) {
      state.currentUserId = null;
      localStorage.removeItem(SESSION_KEY);
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
  }

  function showAuthPage(mode) {
    closeAppSidebar();
    closeLandingMenu();
    setActivePage('auth');
    switchAuthMode(mode);
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
    renderAppShell();
  }

  function setActivePage(pageName) {
    dom.landingPage.classList.toggle('page-active', pageName === 'landing');
    dom.authPage.classList.toggle('page-active', pageName === 'auth');
    dom.appPage.classList.toggle('page-active', pageName === 'app');
    handleScrollVisibility();
  }

  function scrollToTopPage() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function switchAuthMode(mode) {
    const loginActive = mode === 'login';
    dom.loginTab.classList.toggle('auth-tab-active', loginActive);
    dom.registerTab.classList.toggle('auth-tab-active', !loginActive);
    dom.loginForm.classList.toggle('auth-form-active', loginActive);
    dom.registerForm.classList.toggle('auth-form-active', !loginActive);
    clearAuthMessage();
  }

  function showAuthMessage(text, type) {
    dom.authMessage.textContent = text;
    dom.authMessage.className = `form-message ${type}`;
  }

  function clearAuthMessage() {
    dom.authMessage.textContent = '';
    dom.authMessage.className = 'form-message';
  }

  // Build the landing-page programme cards from the same track data used by the LMS.
  // That way, entry-level developers only need to update one source of truth.
  // ---------------------------------------------------------------------------
  // Landing page rendering and auth actions
  // ---------------------------------------------------------------------------
  function renderMarketingTracks() {
    const tracks = getAvailableTracks();
    dom.marketingTracks.innerHTML = tracks.map(track => `
      <article class="track-card">
        <div class="track-card-copy">
          <p class="section-kicker">${track.label}</p>
          <h3>${track.label}</h3>
          <p>${track.summary}</p>
        </div>
        <div class="track-facts">
          <span>${track.semesters.length} semesters</span>
          <span>${track.semesters.reduce((total, semester) => total + semester.months.length, 0)} months</span>
          <span>Month 4 hands-on lab</span>
          <span>Track-based community</span>
        </div>
        <div class="tag-row">
          ${track.outcomes.map(outcome => `<span class="tag">${outcome}</span>`).join('')}
        </div>
        <div class="track-card-footer">
          <button class="btn btn-secondary btn-small" type="button" onclick="quickDemoLogin('${track.id}')">Open ${track.label}</button>
          <button class="btn btn-ghost btn-small" type="button" onclick="showAuthPage('register')">Create account</button>
        </div>
      </article>
    `).join('');
  }

  function populateRegisterTrackSelect() {
    dom.registerTrack.innerHTML = getAvailableTracks()
      .map(track => `<option value="${track.id}">${track.label}</option>`)
      .join('');
  }

  async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();

    const user = state.users.find(item => item.email.toLowerCase() === email && item.password === password);
    if (!user) {
      showAuthMessage('Invalid email or password. Check your details or create a new account.', 'error');
      return;
    }

    state.currentUserId = user.id;
    localStorage.setItem(SESSION_KEY, user.id);
    const profileAvailable = await syncCurrentUserProfileFromRemote();
    if (profileAvailable === false) return;
    openApp('dashboard');
  }

  async function handleRegister(event) {
    event.preventDefault();

    const firstName = document.getElementById('registerFirstName').value.trim();
    const lastName = document.getElementById('registerLastName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const trackId = document.getElementById('registerTrack').value;
    const timezone = document.getElementById('registerTimezone').value.trim() || 'Africa/Lagos';
    const headline = document.getElementById('registerHeadline').value.trim() || 'Learner at RealKingHubs Academy';
    const password = document.getElementById('registerPassword').value;

    if (!firstName || !lastName || !email || !trackId || password.length < 8) {
      showAuthMessage('Complete every registration field and use a password with at least 8 characters.', 'error');
      return;
    }

    if (state.users.some(user => user.email.toLowerCase() === email)) {
      showAuthMessage('A learner account with that email already exists.', 'error');
      return;
    }

    const user = {
      id: `user-${Date.now()}`,
      firstName,
      lastName,
      email,
      password,
      trackId,
      timezone,
      headline,
      bio: 'Add your professional summary, learning goals, and revision focus in profile settings.',
      avatar: '',
      completedLessonIds: [],
      joinedClassIds: [],
      assessmentSubmissions: {},
      lastSeenCommunityAt: '',
      lastSeenAnnouncementsAt: '',
      lastSeenAssessmentsAt: ''
    };

    state.users.unshift(user);
    persistUsers();
    state.currentUserId = user.id;
    localStorage.setItem(SESSION_KEY, user.id);
    await syncUserProfileToRemote(user);
    openApp('dashboard');
  }

  function logoutUser() {
    state.currentUserId = null;
    state.currentView = 'dashboard';
    state.currentLessonId = null;
    state.currentLiveClassId = null;
    state.currentCurriculumSemesterId = null;
    state.currentCurriculumMonthId = null;
    state.showOlderMessages = false;
    localStorage.removeItem(SESSION_KEY);
    showLandingPage();
  }

  async function quickDemoLogin(trackId) {
    const track = trackId || 'cloud-engineering';
    let user = state.users.find(item => item.trackId === track);
    if (!user) {
      const trackPrefix = track.split('-')[0];
      user = createDemoUser(`demo-${trackPrefix}`, 'Demo', 'Learner', `${trackPrefix}@realkinghubs.demo`, track, 'Demo learner profile for platform review.');
      state.users.unshift(user);
      persistUsers();
    }

    state.currentUserId = user.id;
    localStorage.setItem(SESSION_KEY, user.id);
    openApp('dashboard');
  }

  // ---------------------------------------------------------------------------
  // Main app shell rendering
  // The LMS redraws the shell when the active page or learner state changes.
  // ---------------------------------------------------------------------------
  function renderAppShell() {
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
    renderCurrentView(user, track);
  }

  // The sidebar uses an icon rail so the dashboard feels closer to a compact product workspace.
  function renderSidebar(user, track) {
    const notificationCounts = getNotificationCounts(user, track);
    const navGroups = [
      { title: 'Workspace', items: ['dashboard', 'curriculum', 'resources', 'progress'] },
      { title: 'Collaboration', items: ['community', 'announcements'] },
      { title: 'Account', items: ['certificates', 'profile'] }
    ];

    dom.appNav.innerHTML = navGroups.map(group => {
      const buttons = group.items
        .map(itemId => window.RKH_DATA.navItems.find(item => item.id === itemId))
        .filter(Boolean)
        .map(item => `
          <button type="button" class="${item.id === state.currentView ? 'nav-active' : ''}" onclick="openDashboardView('${item.id}')" title="${item.label}" aria-label="${item.label}">
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
      community: 'Community',
      progress: 'Progress',
      announcements: 'Announcements',
      certificates: 'Certificates',
      profile: 'Profile and Settings'
    };
    const eyebrows = {
      dashboard: 'Track workspace',
      curriculum: 'Semester learning plan',
      resources: 'Semester resource library',
      community: 'Learner communication',
      progress: 'Completion tracking',
      announcements: 'Programme updates',
      certificates: 'Programme completion',
      profile: 'Learner account'
    };

    dom.pageEyebrow.textContent = eyebrows[state.currentView] || 'RealKingHubs Academy LMS';
    dom.pageTitle.textContent = titles[state.currentView] || 'Dashboard';
    dom.topbarAlerts.textContent = String(totalAlerts);
    dom.topbarProgress.textContent = `${progress.percent}%`;
    dom.topbarTrack.textContent = track.label;
    dom.topbarAvatar.innerHTML = `<img src="${getAvatarSrc(user)}" alt="${escapeAttribute(`${user.firstName} ${user.lastName}`.trim())}" />`;
    dom.appFooterText.textContent = '(c) 2026 RealKingHubs - ' + track.label + ' Student Portal';
    document.querySelector('.topbar-alert-button')?.classList.toggle('topbar-alert-active', totalAlerts > 0);
  }

  function renderCurrentView(user, track) {
    const renderers = {
      dashboard: renderDashboard,
      curriculum: renderCurriculum,
      resources: renderResources,
      community: renderCommunity,
      progress: renderProgress,
      announcements: renderAnnouncements,
      certificates: renderCertificates,
      profile: renderProfileAndSettings
    };

    const renderer = renderers[state.currentView] || renderDashboard;
    dom.appContent.innerHTML = renderer(user, track);

    if (state.currentView === 'profile') bindProfileForm();
    if (state.currentView === 'community') bindCommunityComposer();
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
      persistUsers();
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

  // Some assessment helpers are still kept in the file because the data model
  // already supports them, even though the visible LMS currently centers more
  // strongly on curriculum, community, announcements, and profile management.
  function getAssessmentAttentionCount(user, track) {
    return track.assessments.filter(assessment => {
      const status = getAssessmentStatus(assessment, user);
      return status.isNew || status.isDueSoon || status.isOverdue;
    }).length;
  }

  function getAssessmentSubmission(user, assessmentId) {
    return user.assessmentSubmissions?.[assessmentId] || null;
  }

  function getAssessmentStatus(assessment, user) {
    const submission = getAssessmentSubmission(user, assessment.id);
    const now = Date.now();
    const dueAt = toTimestamp(assessment.dueAt);
    const seenAt = toTimestamp(user.lastSeenAssessmentsAt);
    const timeToDue = dueAt - now;
    const isSubmitted = Boolean(submission?.url);
    const isOverdue = !isSubmitted && dueAt < now;
    const isDueSoon = !isSubmitted && timeToDue >= 0 && timeToDue <= 1000 * 60 * 60 * 24 * 7;
    const isNew = !isSubmitted && toTimestamp(assessment.createdAt) > seenAt;

    if (isSubmitted) {
      return { label: 'Submitted', tone: 'success', isSubmitted, isOverdue: false, isDueSoon: false, isNew: false, submission };
    }

    if (isOverdue) {
      return { label: 'Overdue', tone: 'danger', isSubmitted, isOverdue, isDueSoon: false, isNew, submission: null };
    }

    if (isDueSoon) {
      return { label: 'Due soon', tone: 'warning', isSubmitted, isOverdue: false, isDueSoon, isNew, submission: null };
    }

    return { label: 'Pending', tone: 'neutral', isSubmitted, isOverdue: false, isDueSoon: false, isNew, submission: null };
  }

  function getPendingAssessments(track, user) {
    return [...track.assessments]
      .filter(assessment => !getAssessmentSubmission(user, assessment.id))
      .sort((left, right) => toTimestamp(left.dueAt) - toTimestamp(right.dueAt));
  }

  function getSubmittedAssessmentCount(track, user) {
    return track.assessments.filter(assessment => Boolean(getAssessmentSubmission(user, assessment.id))).length;
  }

  function getUpcomingAssessmentReminders(track, user) {
    return getPendingAssessments(track, user)
      .filter(assessment => {
        const dueAt = toTimestamp(assessment.dueAt);
        const diff = dueAt - Date.now();
        return diff <= 1000 * 60 * 60 * 24 * 14;
      })
      .slice(0, 3);
  }

  function getNextAssessment(track, user) {
    return getPendingAssessments(track, user)[0] || null;
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
      persistUsers();
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
            <span>${semester.title}</span>
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
            <strong class="dashboard-kpi-value">3</strong>
            <p>Each semester contains 3 learning months and 1 hands-on lab month.</p>
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
        <article class="surface-card dashboard-priority-panel">
          <div class="content-header"><div><h2>Priority queue</h2><p>The dashboard only shows what needs attention next.</p></div></div>
          <div class="dashboard-priority-list">
            <div class="dashboard-priority-item">
              <div>
                <strong>Month 4 hands-on lab</strong>
                <span>${monthFour ? monthFour.title : 'Hands-on Lab'}</span>
                <small>${monthFour ? monthFour.summary : 'Practical delivery and showcase work.'}</small>
              </div>
              <button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('curriculum')">Open curriculum</button>
            </div>
            <div class="dashboard-priority-item">
              <div>
                <strong>Updates</strong>
                <span>${notificationCounts.community} new community messages and ${notificationCounts.announcements} announcements</span>
                <small>Track updates stay organised between community and announcements.</small>
              </div>
              <button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('announcements')">Open updates</button>
            </div>
            <div class="dashboard-priority-item dashboard-priority-item-compact">
              <div>
                <strong>Community room</strong>
                <span>Stay in touch with other ${track.label} learners in one shared room.</span>
                <small>Messages are organised by track so each programme sees its own feed.</small>
              </div>
              <button class="btn btn-ghost btn-small" type="button" onclick="openDashboardView('community')">View room</button>
            </div>
          </div>
        </article>
        <aside class="dashboard-side-column">
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
        </aside>
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

  function renderAssessments(user, track) {
    const assessments = [...track.assessments].sort((left, right) => toTimestamp(left.dueAt) - toTimestamp(right.dueAt));
    const submittedCount = getSubmittedAssessmentCount(track, user);
    const dueSoonCount = assessments.filter(item => getAssessmentStatus(item, user).isDueSoon).length;
    const overdueCount = assessments.filter(item => getAssessmentStatus(item, user).isOverdue).length;

    return `
      <section class="dashboard-stack">
        <article class="surface-card">
          <div class="content-header">
            <div>
              <p class="section-kicker">Assessment tracking</p>
              <h2>Submit every assessment with a link</h2>
              <p>Paste the repository link, hosted project link, or delivery document link into the correct assessment card and save it.</p>
            </div>
          </div>
          <div id="assessmentSaveMessage" class="form-message ${state.assessmentMessage ? state.assessmentMessage.type : ''}">${state.assessmentMessage ? state.assessmentMessage.text : ''}</div>
          <div class="stats-grid assessment-stats-grid">
            <article class="stat-card"><strong>Total assessments</strong><span class="stat-value">${assessments.length}</span><span>Published for ${track.label}</span></article>
            <article class="stat-card"><strong>Submitted</strong><span class="stat-value">${submittedCount}</span><span>Links already submitted</span></article>
            <article class="stat-card"><strong>Due soon</strong><span class="stat-value">${dueSoonCount}</span><span>Due within 7 days</span></article>
            <article class="stat-card"><strong>Overdue</strong><span class="stat-value">${overdueCount}</span><span>Still waiting for your link</span></article>
          </div>
        </article>
        <section class="assessment-grid">
          ${assessments.map(assessment => renderAssessmentCard(user, assessment)).join('')}
        </section>
      </section>
    `;
  }

  function renderAssessmentCard(user, assessment) {
    const status = getAssessmentStatus(assessment, user);
    const submission = getAssessmentSubmission(user, assessment.id);
    const inputId = `assessment-link-${assessment.id}`;

    return `
      <article class="assessment-card">
        <div class="assessment-card-header">
          <div>
            <p class="section-kicker">${assessment.semester}</p>
            <h3>${assessment.title}</h3>
            <p class="copy-muted">${assessment.module}</p>
          </div>
          <span class="status-pill ${status.tone}">${status.label}</span>
        </div>
        <p class="copy-muted">${assessment.brief}</p>
        <div class="assessment-meta-grid">
          <div class="assessment-meta-item">
            <strong>Due date</strong>
            <span>${formatDateTime(assessment.dueAt)}</span>
          </div>
          <div class="assessment-meta-item">
            <strong>Submission type</strong>
            <span>${assessment.submissionType}</span>
          </div>
        </div>
        <div class="lesson-tags">${assessment.resources.map(resource => `<span class="pill">${resource}</span>`).join('')}</div>
        <div class="assessment-submit-row">
          <div class="field-group">
            <label for="${inputId}">Submission link</label>
            <input id="${inputId}" class="assessment-link-input" type="url" value="${submission ? escapeAttribute(submission.url) : ''}" placeholder="https://your-project-link.com" />
          </div>
          <div class="assessment-actions">
            <button class="btn btn-primary btn-small" type="button" onclick="submitAssessmentLink('${assessment.id}')">${submission ? 'Update link' : 'Submit link'}</button>
            ${submission ? `<a class="btn btn-secondary btn-small" href="${escapeAttribute(submission.url)}" target="_blank" rel="noreferrer">Open link</a>` : ''}
          </div>
        </div>
        <div class="assessment-submission-note">
          <strong>${submission ? 'Last submitted' : 'Reminder'}</strong>
          <span>${submission ? formatDateTime(submission.submittedAt) : `Due ${formatDateTime(assessment.dueAt)}`}</span>
        </div>
      </article>
    `;
  }

  // Curriculum rendering is intentionally split into semester -> month -> week.
  // This keeps the navigation clear and makes it easier to expand later.
  // Curriculum is split into semesters, then months, then weekly lesson entries.
  // The curriculum stays full width until a learner opens a lesson. Once a
  // lesson is opened, the player becomes the main stage and the curriculum
  // moves into a slimmer navigation column on the right.
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
              <h2>${semester.title}</h2>
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
        <div class="content-header">
          <div>
            <p class="section-kicker">Course content</p>
            <h2>${track.label} curriculum</h2>
            <p>${selectedLesson ? 'The active lesson is now in focus. Use this right-side curriculum column to switch months and lessons.' : 'Open one month at a time, review the week list, and click view lesson when you want to watch the selected content.'}</p>
          </div>
        </div>
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
            <strong class="curriculum-month-title">${month.label} · ${month.title}</strong>
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
    return `
      <div class="lesson-item curriculum-week-row ${state.currentLessonId === lesson.id ? 'curriculum-week-active' : ''}">
        <div class="lesson-item-header curriculum-week-header">
          <div class="curriculum-week-main">
            <span class="curriculum-week-marker ${completed ? 'completed' : ''}"></span>
            <div>
              <strong class="lesson-title">${lesson.title}</strong>
              <span>${lesson.type === 'lab' ? 'Hands-on lab week with guided build work in the lesson player' : 'Open this lesson in the main lesson player'}</span>
            </div>
          </div>
          <span class="status-pill ${completed ? 'success' : lesson.type === 'lab' ? 'warning' : 'neutral'}">${completed ? 'Completed' : lesson.type === 'lab' ? 'Lab' : 'Open'}</span>
        </div>
        <div class="lesson-actions">
          <button class="btn btn-secondary btn-small" type="button" onclick="openLesson('${lesson.id}')">View lesson</button>
          <button class="btn ${completed ? 'btn-secondary' : 'btn-primary'} btn-small" type="button" onclick="toggleLessonCompletion('${lesson.id}')">${completed ? 'Mark incomplete' : 'Mark complete'}</button>
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
    const videoPlaylist = videoItems.length > 1 ? `
      <div class="lesson-video-playlist">
        <div class="lesson-video-playlist-header">
          <strong>Week videos</strong>
          <span>${videoItems.length} videos added for this week</span>
        </div>
        <div class="lesson-video-playlist-grid">
          ${videoItems.map((item, index) => `
            <button class="lesson-video-chip ${index === activeVideoIndex ? 'lesson-video-chip-active' : ''}" type="button" onclick="selectLessonVideo(${index})">
              <span>${index + 1}</span>
              <strong>${item.title}</strong>
            </button>
          `).join('')}
        </div>
      </div>
    ` : '';

    return `
      <div class="lesson-watch-main lesson-watch-main-single">
          <div class="iframe-wrap lesson-watch-frame"><iframe src="${activeVideo.url}" title="${activeVideo.title || selectedLesson.title}" allowfullscreen loading="lazy"></iframe></div>
          <div class="lesson-watch-body">
            <div class="lesson-watch-header">
              <div>
                <p class="section-kicker">Now playing</p>
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
                <span>${lessonContext ? `${lessonContext.semester.label} · ${lessonContext.month.label} · ${lessonContext.month.title}` : 'Current lesson'}</span>
              </div>
            </div>
            <div class="lesson-watch-description">
              <div class="lesson-player-breadcrumb">${lessonContext ? `${lessonContext.semester.label} - ${lessonContext.month.label} - ${lessonContext.month.title}` : track.label}</div>
              ${videoPlaylist}
            </div>
          </div>
      </div>
    `;
  }

  function renderLiveClasses(user, track) {
    const activeClass = track.liveClasses.find(item => item.id === state.currentLiveClassId) || track.liveClasses[0];
    return `
      <section class="live-grid">
        <div class="dashboard-stack">
          <article class="surface-card">
            <div class="content-header"><div><p class="section-kicker">Scheduled sessions</p><h2>Functional live class room</h2><p>Open any class below to load the iframe session player and review the session checklist.</p></div></div>
            <div class="live-class-list">
              ${track.liveClasses.map(item => `
                <div class="class-card ${activeClass && activeClass.id === item.id ? 'active-class' : ''}">
                  <strong>${item.title}</strong>
                  <span>${item.schedule}</span>
                  <span>Instructor: ${item.instructor}</span>
                  <span>Class room: ${item.room}</span>
                  <div class="class-actions">
                    <button class="btn btn-secondary btn-small" type="button" onclick="openLiveClass('${item.id}')">Open class</button>
                    <button class="btn ${user.joinedClassIds.includes(item.id) ? 'btn-secondary' : 'btn-primary'} btn-small" type="button" onclick="toggleLiveClassAttendance('${item.id}')">${user.joinedClassIds.includes(item.id) ? 'Joined' : 'Join session'}</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </article>
        </div>
        <aside class="class-player">${renderLiveClassPlayer(activeClass, user)}</aside>
      </section>
    `;
  }

  function renderLiveClassPlayer(activeClass, user) {
    if (!activeClass) return '<div class="empty-state">No live class is available right now.</div>';

    return `
      <div class="class-player-header">
        <div>
          <p class="section-kicker">Active class</p>
          <h3>${activeClass.title}</h3>
          <p class="copy-muted">Instructor: ${activeClass.instructor} | ${activeClass.schedule}</p>
        </div>
        <span class="status-pill ${user.joinedClassIds.includes(activeClass.id) ? 'success' : 'neutral'}">${user.joinedClassIds.includes(activeClass.id) ? 'Joined' : 'Not joined'}</span>
      </div>
      <div class="iframe-wrap"><iframe src="${activeClass.videoUrl}" title="${activeClass.title}" allowfullscreen loading="lazy"></iframe></div>
      <div class="notes-list">${activeClass.notes.map(note => `<li><strong>Class note</strong><span>${note}</span></li>`).join('')}</div>
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
          <div class="community-sync-status ${state.communitySyncError ? 'error' : 'success'}">${state.communitySyncError ? `Sync issue: ${escapeHtml(state.communitySyncError)}` : state.communitySyncMode === 'remote' ? 'Cross-browser sync is active for this programme room.' : 'Community is using local browser storage only.'}</div>
          <div id="communityComposerMessage" class="form-message ${state.communityComposerMessage ? state.communityComposerMessage.type : ''}">${state.communityComposerMessage ? state.communityComposerMessage.text : ''}</div>
          <div class="field-group"><label for="communityMessage">Post a message</label><textarea id="communityMessage" placeholder="Write an update for ${track.label} learners...">${escapeHtml(state.communityDraftText)}</textarea></div>
          <div class="community-composer-toolbar">
            <button class="btn btn-secondary btn-small" type="button" onclick="toggleCommunityStickerPack()">${state.communityStickerPackOpen ? 'Hide sticker pack' : 'Open sticker pack'}</button>
            <input id="communityFileInput" type="file" class="hidden" onchange="handleCommunityFileSelect(event)" />
            <input id="communityFolderInput" type="file" class="hidden" webkitdirectory directory multiple onchange="handleCommunityFolderSelect(event)" />
            <button class="btn btn-secondary btn-small" type="button" onclick="document.getElementById('communityFileInput').click()">Attach file</button>
            <button class="btn btn-secondary btn-small" type="button" onclick="document.getElementById('communityFolderInput').click()">Attach folder</button>
          </div>
          ${state.communityStickerPackOpen ? renderCommunityStickerPack() : ''}
          ${state.communitySelectedSticker ? `<div class="community-selection-pill"><span>Selected sticker</span><strong>${escapeHtml(state.communitySelectedSticker)}</strong><button type="button" onclick="clearCommunitySticker()">Clear</button></div>` : ''}
          <div class="community-upload-row">
            ${state.communityAttachment ? renderCommunityComposerAttachmentSummary(state.communityAttachment) : '<span class="copy-muted">Add a file, folder, or sticker from the pack before you send.</span>'}
          </div>
          <div class="composer-actions"><button class="btn btn-primary btn-small" type="button" onclick="postCommunityMessage()">Post message</button><button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('announcements')">Check announcements</button></div>
        </aside>
        <article class="message-card">
          <div class="content-header"><div><p class="section-kicker">Shared learner feed</p><h2>${track.label} learner communication</h2><p>The latest messages are shown first. Use view older messages to inspect earlier posts for this programme only.</p></div></div>
          <div class="message-feed">${visibleMessages.map(message => renderMessageRow(user, message)).join('')}</div>
          <div class="composer-actions">${remaining > 0 ? `<button class="btn btn-secondary btn-small" type="button" onclick="toggleOlderMessages(true)">View ${remaining} older messages</button>` : ''}${state.showOlderMessages && state.communityMessages.length > 5 ? `<button class="btn btn-ghost btn-small" type="button" onclick="toggleOlderMessages(false)">Show latest 5</button>` : ''}</div>
        </article>
      </section>
    `;
  }

  function renderCommunityStickerPack() {
    return `
      <div class="sticker-pack-panel">
        <div class="sticker-pack-header">
          <div>
            <strong>Sticker pack</strong>
            <span>Choose one sticker to include with your message.</span>
          </div>
          <button class="btn btn-ghost btn-small" type="button" onclick="toggleCommunityStickerPack(false)">Close</button>
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

  function renderMessageRow(user, message) {
    const ownMessage = user.id === message.authorId || user.email === message.authorEmail;
    const canDeleteLocally = !communitySupabase && ownMessage;
    return `
      <div class="message-row">
        <div class="meta-row"><strong>${message.authorName}</strong><span class="pill">${message.authorTrack}</span><small>${formatDateTime(message.createdAt)}</small></div>
        ${message.sticker ? `<div class="message-sticker">${escapeHtml(message.sticker)}</div>` : ''}
        ${message.body ? `<div class="message-text">${escapeHtml(message.body)}</div>` : ''}
        ${message.attachment ? renderCommunityAttachment(message.attachment) : ''}
        ${canDeleteLocally ? `<div class="card-actions"><button class="btn btn-ghost btn-small" type="button" onclick="deleteCommunityMessage('${message.id}')">Delete</button></div>` : ''}
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
      <section class="progress-grid">
        <article class="progress-card"><p class="section-kicker">Overall progress</p><h3>${overall.percent}% complete</h3><p class="copy-muted">${overall.completedCount} of ${overall.totalLessons} weekly items have been completed across the entire track.</p><div class="progress-bar"><div class="progress-fill" style="width:${overall.percent}%"></div></div><div class="dashboard-stack">${semesterRows}</div>${certificate.unlocked ? `<div class="certificate-inline-banner"><strong>Certificate unlocked</strong><button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('certificates')">Open certificate</button></div>` : ''}</article>
        <article class="progress-card"><p class="section-kicker">Monthly breakdown</p><h3>Completion by month</h3><p class="copy-muted">Three learning months and one hands-on lab month are tracked every semester.</p><div class="dashboard-stack">${monthRows}</div></article>
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
              <h2>${semester.title}</h2>
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
          <div class="content-header">
            <div>
              <p class="section-kicker">Semester resources</p>
              <h2>${track.label} resource library</h2>
              <p>Open semester-specific resource links here instead of searching through lessons one by one.</p>
            </div>
          </div>
        </article>
        ${semesterCards}
      </section>
    `;
  }

  function renderAnnouncements(user, track) {
    const announcements = getTrackAnnouncements(track);
    return `
      <section class="surface-card">
        <div class="content-header"><div><p class="section-kicker">Programme updates</p><h2>Announcements</h2><p>Course notices, lab guidance, and learning updates live here instead of crowding the dashboard.</p></div></div>
        <div class="announcement-grid">${announcements.length ? announcements.map(item => `<article class="announcement-card"><small>${item.date}</small><h3>${item.title}</h3><p>${item.body}</p></article>`).join('') : '<div class="empty-state">No announcement has been published for this track yet.</div>'}</div>
      </section>
    `;
  }

  function renderProfileAndSettings(user, track) {
    return `
      <section class="profile-grid">
        <article class="profile-section">
          <div class="profile-header-row"><div><p class="section-kicker">Learner profile</p><h2>${user.firstName} ${user.lastName}</h2><p class="copy-muted">${user.headline}</p></div></div>
          <div class="profile-photo-panel"><div id="profileAvatarPreview" class="avatar-frame"><img src="${getAvatarSrc(user)}" alt="${escapeAttribute(`${user.firstName} ${user.lastName}`.trim())}" /></div><div><strong>Profile image</strong><p class="copy-muted">Upload a profile photo or keep the generated profile image.</p></div></div>
          <ul class="profile-list">
            <li><strong>Email address</strong><span>${user.email}</span></li>
            <li><strong>Current track</strong><span>${track.label}</span></li>
            <li><strong>Timezone</strong><span>${user.timezone}</span></li>
            <li><strong>Bio</strong><span>${user.bio}</span></li>
          </ul>
        </article>
        <article class="settings-card">
          <div class="settings-header-row"><div><p class="section-kicker">Functional settings</p><h2>Edit profile and preferences</h2><p class="copy-muted">Changes are stored locally so you can keep your LMS experience personalized and up to date.</p></div></div>
          <div id="profileSaveMessage" class="form-message"></div>
          <form id="profileForm" class="dashboard-stack">
            <div class="field-row"><div class="field-group"><label for="profileFirstName">First name</label><input id="profileFirstName" type="text" value="${escapeAttribute(user.firstName)}" /></div><div class="field-group"><label for="profileLastName">Last name</label><input id="profileLastName" type="text" value="${escapeAttribute(user.lastName)}" /></div></div>
            <div class="field-group"><label for="profileHeadline">Professional headline</label><input id="profileHeadline" type="text" value="${escapeAttribute(user.headline)}" /></div>
            <div class="field-group"><label for="profileBio">Bio</label><textarea id="profileBio">${escapeHtml(user.bio)}</textarea></div>
            <div class="field-row"><div class="field-group"><label for="profileTrack">Track</label><select id="profileTrack">${getResolvedTracks().map(item => `<option value="${item.id}" ${item.id === user.trackId ? 'selected' : ''}>${item.label}</option>`).join('')}</select></div><div class="field-group"><label for="profileTimezone">Timezone</label><input id="profileTimezone" type="text" value="${escapeAttribute(user.timezone)}" /></div></div>
            <div class="field-group"><label for="profileAvatarInput">Profile image</label><input id="profileAvatarInput" type="file" accept="image/*" /><span class="field-help">Upload a square image for the sidebar and profile preview.</span></div>
            <div class="field-group"><label for="profilePassword">Password</label><input id="profilePassword" type="password" placeholder="Leave empty to keep your current password" /></div>
            <div class="profile-image-actions"><button class="btn btn-primary btn-small" type="submit">Save profile changes</button><button class="btn btn-secondary btn-small" type="button" onclick="removeProfileImage()">Remove image</button></div>
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
    const avatarInput = document.getElementById('profileAvatarInput');
    if (!form || !avatarInput) return;
    avatarInput.addEventListener('change', handleProfileImagePreview);
    form.addEventListener('submit', saveProfileSettings);
  }

  function handleProfileImagePreview(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = loadEvent => {
      const preview = document.getElementById('profileAvatarPreview');
      if (preview) preview.innerHTML = `<img src="${loadEvent.target.result}" alt="Profile preview" />`;
    };
    reader.readAsDataURL(file);
  }

  function saveProfileSettings(event) {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    user.firstName = document.getElementById('profileFirstName').value.trim() || user.firstName;
    user.lastName = document.getElementById('profileLastName').value.trim() || user.lastName;
    user.headline = document.getElementById('profileHeadline').value.trim() || user.headline;
    user.bio = document.getElementById('profileBio').value.trim() || user.bio;
    user.trackId = document.getElementById('profileTrack').value;
    user.timezone = document.getElementById('profileTimezone').value.trim() || user.timezone;

    const newPassword = document.getElementById('profilePassword').value;
    if (newPassword) {
      if (newPassword.length < 8) {
        showProfileSaveMessage('Password must be at least 8 characters.', 'error');
        return;
      }
      user.password = newPassword;
    }

    const avatarInput = document.getElementById('profileAvatarInput');
    const file = avatarInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = loadEvent => {
        user.avatar = loadEvent.target.result;
        finalizeProfileSave();
      };
      reader.readAsDataURL(file);
      return;
    }

    finalizeProfileSave();
  }

  async function finalizeProfileSave() {
    const user = getCurrentUser();
    persistUsers();
    if (user) {
      await syncUserProfileToRemote(user);
      await syncCurrentUserProfileFromRemote();
    }
    renderFounderShowcase();
    showProfileSaveMessage('Profile settings saved successfully.', 'success');
    renderAppShell();
  }

  function showProfileSaveMessage(text, type) {
    const el = document.getElementById('profileSaveMessage');
    if (!el) return;
    el.textContent = text;
    el.className = `form-message ${type}`;
  }

  function removeProfileImage() {
    const user = getCurrentUser();
    if (!user) return;
    user.avatar = '';
    persistUsers();
    renderFounderShowcase();
    renderAppShell();
  }

  function bindAssessmentInputs() {
    const inputs = document.querySelectorAll('.assessment-link-input');
    inputs.forEach(input => {
      if (input.dataset.bound === 'true') return;
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const assessmentId = input.id.replace('assessment-link-', '');
          submitAssessmentLink(assessmentId);
        }
      });
      input.dataset.bound = 'true';
    });
  }

  function submitAssessmentLink(assessmentId) {
    const user = getCurrentUser();
    const track = getCurrentTrack();
    const input = document.getElementById(`assessment-link-${assessmentId}`);
    const assessment = track?.assessments.find(item => item.id === assessmentId);
    if (!user || !track || !input || !assessment) return;

    const url = input.value.trim();
    if (!url) {
      state.assessmentMessage = { type: 'error', text: 'Paste a valid project or repository link before submitting.' };
      renderAppShell();
      return;
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
    } catch (error) {
      state.assessmentMessage = { type: 'error', text: 'Assessment links must start with http:// or https://.' };
      renderAppShell();
      return;
    }

    user.assessmentSubmissions = {
      ...user.assessmentSubmissions,
      [assessmentId]: {
        url,
        submittedAt: new Date().toISOString()
      }
    };

    persistUsers();
    state.assessmentMessage = { type: 'success', text: `${assessment.title} has been submitted successfully.` };
    state.currentView = 'assessments';
    renderAppShell();
  }

  // Community composer helpers manage the sticker picker, file selection,
  // folder zipping, payload uploads, and final message submission.
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
    const message = state.communityMessages.find(item => item.id === String(messageId));

    if (communitySupabase) {
      state.communityComposerMessage = {
        type: 'error',
        text: 'Learner-side message deletion is disabled in the secured workspace. Use /uc-admin/ for moderation.'
      };
      renderAppShell();
      return;
    } else {
      const localMessages = readStoredCommunityMessages().filter(message => !(message.id === String(messageId) && (message.authorId === user.id || message.authorEmail === user.email)));
      writeStoredCommunityMessages(localMessages);
    }

    await refreshCommunityMessages(track.id);
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
    persistUsers();
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
    persistUsers();
    state.currentLiveClassId = classId;
    state.currentView = 'live';
    renderAppShell();
  }

  function handleStorageSync(event) {
    if (![USERS_KEY, COMMUNITY_KEY, SESSION_KEY].includes(event.key)) return;
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

  window.showLandingPage = showLandingPage;
  window.showAuthPage = showAuthPage;
  window.switchAuthMode = switchAuthMode;
  window.toggleLandingMenu = toggleLandingMenu;
  window.closeLandingMenu = closeLandingMenu;
  window.toggleAppSidebar = toggleAppSidebar;
  window.closeAppSidebar = closeAppSidebar;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.scrollToTopPage = scrollToTopPage;
  window.quickDemoLogin = quickDemoLogin;
  window.openDashboardView = openApp;
  window.toggleResourcesSemester = toggleResourcesSemester;
  window.logoutUser = logoutUser;
  window.toggleLessonCompletion = toggleLessonCompletion;
  window.openLesson = openLesson;
  window.openNextLesson = openNextLesson;
  window.selectLessonVideo = selectLessonVideo;
  window.clearLessonView = clearLessonView;
  window.printCertificate = printCertificate;
  window.focusCurriculumLocation = focusCurriculumLocation;
  window.toggleCurriculumMonth = toggleCurriculumMonth;
  window.openLiveClass = openLiveClass;
  window.toggleLiveClassAttendance = toggleLiveClassAttendance;
  window.submitAssessmentLink = submitAssessmentLink;
  window.toggleCommunityStickerPack = toggleCommunityStickerPack;
  window.selectCommunitySticker = selectCommunitySticker;
  window.clearCommunitySticker = clearCommunitySticker;
  window.handleCommunityFileSelect = handleCommunityFileSelect;
  window.handleCommunityFolderSelect = handleCommunityFolderSelect;
  window.clearCommunityAttachment = clearCommunityAttachment;
  window.postCommunityMessage = postCommunityMessage;
  window.deleteCommunityMessage = deleteCommunityMessage;
  window.toggleOlderMessages = toggleOlderMessages;
  window.toggleCurriculumSemester = toggleCurriculumSemester;
  window.removeProfileImage = removeProfileImage;
  window.getRkhSearchContext = getSearchContext;
})();
