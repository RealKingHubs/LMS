
(function () {
  const USERS_KEY = 'rkh_fresh_users';
  const SESSION_KEY = 'rkh_fresh_session';
  const COMMUNITY_KEY = 'rkh_fresh_community';
  const SUPABASE_URL = 'https://gelpzfafiiudidxmpofo.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHB6ZmFmaWl1ZGlkeG1wb2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTIwNzcsImV4cCI6MjA5MDk4ODA3N30.82lZQg6ZYr1SsK9SFsbszby5QEf6HENgnYn1ynS0ZhE';
  const COMMUNITY_SYNC_INTERVAL_MS = 15000;
  const COMMUNITY_ATTACHMENT_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;
  const COMMUNITY_ATTACHMENT_BUCKET = 'community-attachments';

  const COMMUNITY_STICKER_PACKS = [
    {
      id: 'celebrate',
      label: 'Celebrate',
      stickers: ['\u{1F389}', '\u{1F44F}', '\u{1F525}']
    },
    {
      id: 'support',
      label: 'Support',
      stickers: ['\u{2705}', '\u{1F4A1}', '\u{1F680}']
    },
    {
      id: 'study',
      label: 'Study',
      stickers: ['\u{1F4DA}', '\u{1F4BB}', '\u{1F3AF}']
    }
  ];

  const state = {
    users: [],
    currentUserId: null,
    currentView: 'dashboard',
    currentLessonId: null,
    currentLiveClassId: null,
    currentCurriculumSemesterId: null,
    currentCurriculumMonthId: null,
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
    communitySyncMode: 'local'
  };

  let communitySupabase = null;
  let communityChannel = null;
  let communityPollHandle = null;

  const dom = {};

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('storage', handleStorageSync);

  function init() {
    bindDom();
    seedStorage();
    hydrateState();
    persistUsers();
    initializeCommunitySync();
    renderMarketingTracks();
    populateRegisterTrackSelect();
    bindEvents();

    if (getCurrentUser()) {
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
    dom.loginForm = document.getElementById('loginForm');
    dom.registerForm = document.getElementById('registerForm');
    dom.loginTab = document.getElementById('loginTab');
    dom.registerTab = document.getElementById('registerTab');
    dom.authMessage = document.getElementById('authMessage');
    dom.registerTrack = document.getElementById('registerTrack');
    dom.appNav = document.getElementById('appNav');
    dom.appContent = document.getElementById('appContent');
    dom.pageTitle = document.getElementById('pageTitle');
    dom.pageEyebrow = document.getElementById('pageEyebrow');
    dom.topbarAlerts = document.getElementById('topbarAlerts');
    dom.topbarProgress = document.getElementById('topbarProgress');
    dom.topbarTrack = document.getElementById('topbarTrack');
    dom.appFooterText = document.getElementById('appFooterText');
    dom.sidebarTrack = document.getElementById('sidebarTrack');
    dom.sidebarName = document.getElementById('sidebarName');
    dom.sidebarEmail = document.getElementById('sidebarEmail');
    dom.sidebarAvatar = document.getElementById('sidebarAvatar');
  }

  function bindEvents() {
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.registerForm.addEventListener('submit', handleRegister);
  }

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
      bio: 'This is a demo learner profile. Update the profile and settings form to personalize it.',
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

  function getCurrentUser() {
    return state.users.find(user => user.id === state.currentUserId) || null;
  }

  function getCurrentTrack() {
    const user = getCurrentUser();
    return user ? window.RKH_DATA?.tracks?.[user.trackId] || null : null;
  }

  function ensureCurriculumDefaults(track) {
    const allSemesters = track.semesters || [];
    const allMonths = allSemesters.flatMap(semester => semester.months || []);

    if (!allSemesters.some(semester => semester.id === state.currentCurriculumSemesterId)) {
      state.currentCurriculumSemesterId = allSemesters[0]?.id || null;
    }

    if (!allMonths.some(month => month.id === state.currentCurriculumMonthId)) {
      const activeSemester = allSemesters.find(semester => semester.id === state.currentCurriculumSemesterId) || allSemesters[0];
      state.currentCurriculumMonthId = activeSemester?.months?.[0]?.id || allMonths[0]?.id || null;
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

  function showLandingPage() {
    setActivePage('landing');
  }

  function showAuthPage(mode) {
    setActivePage('auth');
    switchAuthMode(mode);
  }

  function openApp(viewId) {
    state.currentView = viewId;
    if (viewId !== 'assessments') {
      state.assessmentMessage = null;
    }
    markSectionSeen(viewId);
    setActivePage('app');
    renderAppShell();
  }

  function setActivePage(pageName) {
    dom.landingPage.classList.toggle('page-active', pageName === 'landing');
    dom.authPage.classList.toggle('page-active', pageName === 'auth');
    dom.appPage.classList.toggle('page-active', pageName === 'app');
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
  function renderMarketingTracks() {
    const tracks = Object.values(window.RKH_DATA.tracks);
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
          <span>${track.liveClasses.length} live classes</span>
          <span>${track.assessments.length} assessments</span>
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
    dom.registerTrack.innerHTML = Object.values(window.RKH_DATA.tracks)
      .map(track => `<option value="${track.id}">${track.label}</option>`)
      .join('');
  }

  function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();

    const user = state.users.find(item => item.email.toLowerCase() === email && item.password === password);
    if (!user) {
      showAuthMessage('Invalid email or password. Try demo accounts: cloud@realkinghubs.demo, frontend@realkinghubs.demo, or backend@realkinghubs.demo with password "password123", or register a new account.', 'error');
      return;
    }

    state.currentUserId = user.id;
    localStorage.setItem(SESSION_KEY, user.id);
    openApp('dashboard');
  }

  function handleRegister(event) {
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

  function quickDemoLogin(trackId) {
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

  function renderAppShell() {
    const user = getCurrentUser();
    const track = getCurrentTrack();
    if (!user || !track) {
      logoutUser();
      return;
    }

    ensureCurriculumDefaults(track);
    ensureCommunityFeedForTrack(track);
    renderSidebar(user, track);
    renderTopbar(user, track);
    renderCurrentView(user, track);
  }

  function renderSidebar(user, track) {
    const notificationCounts = getNotificationCounts(user, track);
    dom.sidebarTrack.textContent = track.label;
    dom.sidebarName.textContent = `${user.firstName} ${user.lastName}`;
    dom.sidebarEmail.textContent = user.email;
    dom.sidebarAvatar.innerHTML = user.avatar
      ? `<img src="${user.avatar}" alt="${user.firstName}" />`
      : getInitials(user.firstName, user.lastName);

    dom.appNav.innerHTML = window.RKH_DATA.navItems.map(item => `
      <button type="button" class="${item.id === state.currentView ? 'nav-active' : ''}" onclick="openDashboardView('${item.id}')">
        <span class="nav-button-copy">${item.label}</span>
        ${notificationCounts[item.id] ? `<span class="nav-badge">${notificationCounts[item.id]}</span>` : ''}
      </button>
    `).join('');
  }

  function renderTopbar(user, track) {
    const progress = calculateTrackProgress(user, track);
    const notificationCounts = getNotificationCounts(user, track);
    const totalAlerts = Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
    const titles = {
      dashboard: 'Dashboard',
      curriculum: 'Curriculum',
      assessments: 'Assessments',
      live: 'Live Classes',
      community: 'Community',
      progress: 'Progress',
      announcements: 'Announcements',
      profile: 'Profile and Settings'
    };
    const eyebrows = {
      dashboard: 'Action centre',
      curriculum: 'Semester learning plan',
      assessments: 'Assessment submissions and reminders',
      live: 'Live class room',
      community: 'Learner communication',
      progress: 'Completion tracking',
      announcements: 'Programme updates',
      profile: 'Learner account'
    };

    dom.pageEyebrow.textContent = eyebrows[state.currentView] || 'RealKingHubs Academy LMS';
    dom.pageTitle.textContent = titles[state.currentView] || 'Dashboard';
    dom.topbarAlerts.textContent = String(totalAlerts);
    dom.topbarProgress.textContent = `${progress.percent}%`;
    dom.topbarTrack.textContent = track.label;
    dom.appFooterText.textContent = `© 2026 RealKingHubs · ${track.label} Student Portal`;
  }

  function renderCurrentView(user, track) {
    const renderers = {
      dashboard: renderDashboard,
      curriculum: renderCurriculum,
      assessments: renderAssessments,
      live: renderLiveClasses,
      community: renderCommunity,
      progress: renderProgress,
      announcements: renderAnnouncements,
      profile: renderProfileAndSettings
    };

    const renderer = renderers[state.currentView] || renderDashboard;
    dom.appContent.innerHTML = renderer(user, track);

    if (state.currentView === 'profile') bindProfileForm();
    if (state.currentView === 'community') bindCommunityComposer();
    if (state.currentView === 'assessments') bindAssessmentInputs();
    if (['community', 'announcements', 'assessments'].includes(state.currentView)) markSectionSeen(state.currentView);
  }

  function calculateTrackProgress(user, track) {
    const allLessons = track.semesters.flatMap(semester => semester.months.flatMap(month => month.weeks));
    const completedCount = allLessons.filter(lesson => user.completedLessonIds.includes(lesson.id)).length;
    const percent = allLessons.length ? Math.round((completedCount / allLessons.length) * 100) : 0;
    return { completedCount, totalLessons: allLessons.length, percent };
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
      announcements: getUnreadAnnouncementCount(user, track),
      assessments: getAssessmentAttentionCount(user, track)
    };
  }

  function getUnreadCommunityCount(user) {
    const seenAt = toTimestamp(user.lastSeenCommunityAt);
    return state.communityMessages.filter(message => message.authorEmail !== user.email && toTimestamp(message.createdAt) > seenAt).length;
  }

  function getUnreadAnnouncementCount(user, track) {
    const seenAt = toTimestamp(user.lastSeenAnnouncementsAt);
    return track.announcements.filter(item => toTimestamp(item.createdAt) > seenAt).length;
  }

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
    if (viewId === 'announcements' && track.announcements.length) {
      const latestAnnouncement = track.announcements[0].createdAt;
      if (latestAnnouncement !== user.lastSeenAnnouncementsAt) {
        user.lastSeenAnnouncementsAt = latestAnnouncement;
        hasChanged = true;
      }
    }
    if (viewId === 'assessments' && track.assessments.length) {
      const latestAssessment = track.assessments.reduce((latest, assessment) => toTimestamp(assessment.createdAt) > toTimestamp(latest) ? assessment.createdAt : latest, track.assessments[0].createdAt);
      if (latestAssessment !== user.lastSeenAssessmentsAt) {
        user.lastSeenAssessmentsAt = latestAssessment;
        hasChanged = true;
      }
    }

    if (hasChanged) {
      persistUsers();
    }
  }

  function renderDashboard(user, track) {
    const progress = calculateTrackProgress(user, track);
    const notificationCounts = getNotificationCounts(user, track);
    const submittedAssessments = getSubmittedAssessmentCount(track, user);
    const pendingAssessments = getPendingAssessments(track, user);
    const nextAssessment = getNextAssessment(track, user);
    const nextClass = track.liveClasses[0];
    const reminderItems = getUpcomingAssessmentReminders(track, user);
    const semesterCards = track.semesters.map(semester => {
      const semesterProgress = calculateSemesterProgress(user, semester);
      return `
        <div class="mini-card">
          <strong>${semester.label}</strong>
          <span>${semester.title}</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${semesterProgress.percent}%"></div></div>
          <span>${semesterProgress.completed} of ${semesterProgress.total} weeks completed</span>
        </div>
      `;
    }).join('');

    return `
      <section class="surface-card dashboard-hero-card">
        <div class="content-header">
          <div>
            <p class="section-kicker">Learner dashboard</p>
            <h2>Welcome back, ${user.firstName}</h2>
            <p>Use this page to continue learning, check what needs attention next, and move quickly into the right section.</p>
          </div>
          <div class="card-actions">
            <button class="btn btn-primary btn-small" type="button" onclick="openDashboardView('curriculum')">Continue curriculum</button>
            <button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('assessments')">Open assessments</button>
          </div>
        </div>
        <div class="stats-grid">
          <article class="stat-card"><strong>Overall progress</strong><span class="stat-value">${progress.percent}%</span><span>${progress.completedCount} of ${progress.totalLessons} weekly items completed</span></article>
          <article class="stat-card"><strong>Submitted assessments</strong><span class="stat-value">${submittedAssessments}</span><span>${pendingAssessments.length} assessment links still waiting</span></article>
          <article class="stat-card"><strong>Next live class</strong><span class="stat-value">${nextClass.schedule}</span><span>${nextClass.title}</span></article>
          <article class="stat-card"><strong>Unread updates</strong><span class="stat-value">${notificationCounts.community + notificationCounts.announcements + notificationCounts.assessments}</span><span>${notificationCounts.community} messages, ${notificationCounts.announcements} announcements, ${notificationCounts.assessments} assessment alerts</span></article>
        </div>
      </section>

      <section class="dashboard-grid">
        <article class="surface-card">
          <div class="content-header"><div><h2>Action centre</h2><p>Only the most important reminders stay here so the dashboard remains clean.</p></div></div>
          <div class="dashboard-reminder-list">
            ${nextAssessment ? `
              <div class="dashboard-reminder-card">
                <div>
                  <strong>Next assessment</strong>
                  <span>${nextAssessment.title}</span>
                  <small>${getAssessmentStatus(nextAssessment, user).label} • ${formatDateTime(nextAssessment.dueAt)}</small>
                </div>
                <button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('assessments')">Submit link</button>
              </div>
            ` : `
              <div class="dashboard-reminder-card">
                <div>
                  <strong>Assessments</strong>
                  <span>You are up to date on current assessment submissions.</span>
                  <small>New assessment reminders will appear here automatically.</small>
                </div>
                <button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('assessments')">Review page</button>
              </div>
            `}
            <div class="dashboard-reminder-card">
              <div>
                <strong>Next live class</strong>
                <span>${nextClass.title}</span>
                <small>${nextClass.schedule}</small>
              </div>
              <button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('live')">Open class room</button>
            </div>
            <div class="dashboard-reminder-card">
              <div>
                <strong>Updates</strong>
                <span>${notificationCounts.community} new community messages and ${notificationCounts.announcements} announcements</span>
                <small>${notificationCounts.assessments} assessment items need attention.</small>
              </div>
              <button class="btn btn-secondary btn-small" type="button" onclick="openDashboardView('announcements')">Open updates</button>
            </div>
            ${reminderItems.map(item => `
              <div class="dashboard-reminder-card compact-reminder">
                <div>
                  <strong>${item.title}</strong>
                  <span>${item.module}</span>
                  <small>Due ${formatDateTime(item.dueAt)}</small>
                </div>
                <button class="btn btn-ghost btn-small" type="button" onclick="openDashboardView('assessments')">View</button>
              </div>
            `).join('')}
          </div>
        </article>
        <article class="surface-card">
          <div class="content-header"><div><h2>Semester progress</h2><p>Track completion across all three semesters and their revision months.</p></div></div>
          <div class="course-overview">${semesterCards}</div>
        </article>
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
  function renderCurriculum(user, track) {
    const allMonths = track.semesters.flatMap(semester => semester.months);
    const openSemesterId = track.semesters.some(semester => semester.id === state.currentCurriculumSemesterId)
      ? state.currentCurriculumSemesterId
      : track.semesters[0]?.id || null;
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

    return `
      <section class="curriculum-layout curriculum-focused-layout">
        <div class="dashboard-stack">
          <article class="surface-card curriculum-panel">
            <div class="content-header">
              <div>
                <p class="section-kicker">Course content</p>
                <h2>${track.label} curriculum</h2>
                <p>Open one month at a time, view the week list clearly, and keep the full lesson details in the player on the right.</p>
              </div>
            </div>
            <div class="curriculum-course-list">${semestersHtml}</div>
          </article>
        </div>
        <aside class="lesson-player">${renderLessonPlayer(track)}</aside>
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
            <span class="status-pill ${month.phase === 'Revision' ? 'warning' : 'neutral'}">${month.phase}</span>
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
              <span>${lesson.type === 'exam' ? 'Assessment and final review week' : 'Open lesson content in the player to the right'}</span>
            </div>
          </div>
          <span class="status-pill ${completed ? 'success' : lesson.type === 'exam' ? 'warning' : 'neutral'}">${completed ? 'Completed' : lesson.type === 'exam' ? 'Exam' : 'Open'}</span>
        </div>
        <div class="lesson-actions">
          <button class="btn btn-secondary btn-small" type="button" onclick="openLesson('${lesson.id}')">View lesson</button>
          <button class="btn ${completed ? 'btn-secondary' : 'btn-primary'} btn-small" type="button" onclick="toggleLessonCompletion('${lesson.id}')">${completed ? 'Mark incomplete' : 'Mark complete'}</button>
        </div>
      </div>
    `;
  }

  function renderLessonPlayer(track) {
    const allLessons = track.semesters.flatMap(semester => semester.months.flatMap(month => month.weeks));
    const selectedLesson = allLessons.find(lesson => lesson.id === state.currentLessonId) || allLessons[0];
    if (!selectedLesson) return '<div class="empty-state">No lessons are available for this track yet.</div>';
    const lessonContext = getLessonContext(track, selectedLesson.id);

    return `
      <div class="lesson-player-header">
        <div>
          <p class="section-kicker">Video lesson</p>
          <h3>${selectedLesson.title}</h3>
          <p class="copy-muted">${selectedLesson.objective}</p>
        </div>
      </div>
      <div class="lesson-player-breadcrumb">${lessonContext ? `${lessonContext.semester.label} - ${lessonContext.month.label} - ${lessonContext.month.title}` : track.label}</div>
      <div class="iframe-wrap"><iframe src="${selectedLesson.videoUrl}" title="${selectedLesson.title}" allowfullscreen loading="lazy"></iframe></div>
      <div class="notes-list">${selectedLesson.resources.map(resource => `<li><strong>${resource}</strong><span>Use this resource while completing the week.</span></li>`).join('')}</div>
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
          <span>${escapeHtml(attachment.name)} (${attachment.fileCount} files, ${formatFileSize(attachment.size)})</span>
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
    return `
      <div class="message-row">
        <div class="meta-row"><strong>${message.authorName}</strong><span class="pill">${message.authorTrack}</span><small>${formatDateTime(message.createdAt)}</small></div>
        ${message.sticker ? `<div class="message-sticker">${escapeHtml(message.sticker)}</div>` : ''}
        ${message.body ? `<div class="message-text">${escapeHtml(message.body)}</div>` : ''}
        ${message.attachment ? renderCommunityAttachment(message.attachment) : ''}
        ${ownMessage ? `<div class="card-actions"><button class="btn btn-ghost btn-small" type="button" onclick="deleteCommunityMessage('${message.id}')">Delete</button></div>` : ''}
      </div>
    `;
  }

  function renderCommunityAttachment(attachment) {
    if (!attachment?.name) return '';

    if (attachment.kind === 'folder') {
      const folderSize = attachment.size ? formatFileSize(attachment.size) : '';
      const folderMeta = folderSize
        ? `Folder | ${attachment.fileCount || 0} files | ${folderSize}`
        : `Folder | ${attachment.fileCount || 0} files`;
      const visibleFiles = (attachment.files || []).slice(0, 6);
      const remainingFiles = Math.max((attachment.files || []).length - visibleFiles.length, 0);

      return `
        <div class="message-attachment-card">
          <div class="message-attachment-meta">
            <strong>${escapeHtml(attachment.name)}</strong>
            <span>${folderMeta}</span>
          </div>
          <div class="message-folder-list">
            ${visibleFiles.map(file => `
              <a class="message-folder-link" href="${escapeAttribute(file.url)}" target="_blank" rel="noopener">
                ${escapeHtml(file.relativePath || file.name)}
              </a>
            `).join('')}
            ${remainingFiles > 0 ? `<span class="message-folder-more">+ ${remainingFiles} more files in this folder</span>` : ''}
          </div>
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
        <article class="progress-card"><p class="section-kicker">Overall progress</p><h3>${overall.percent}% complete</h3><p class="copy-muted">${overall.completedCount} of ${overall.totalLessons} weekly items have been completed across the entire track.</p><div class="progress-bar"><div class="progress-fill" style="width:${overall.percent}%"></div></div><div class="dashboard-stack">${semesterRows}</div></article>
        <article class="progress-card"><p class="section-kicker">Monthly breakdown</p><h3>Completion by month</h3><p class="copy-muted">Three learning months and one revision month are tracked every semester.</p><div class="dashboard-stack">${monthRows}</div></article>
      </section>
    `;
  }
  function renderAnnouncements(user, track) {
    const announcements = [...track.announcements].sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
    return `
      <section class="surface-card">
        <div class="content-header"><div><p class="section-kicker">Programme updates</p><h2>Announcements</h2><p>Course notices, exam reminders, and learning updates live here instead of crowding the dashboard.</p></div></div>
        <div class="announcement-grid">${announcements.map(item => `<article class="announcement-card"><small>${item.date}</small><h3>${item.title}</h3><p>${item.body}</p></article>`).join('')}</div>
      </section>
    `;
  }

  function renderProfileAndSettings(user, track) {
    return `
      <section class="profile-grid">
        <article class="profile-section">
          <div class="profile-header-row"><div><p class="section-kicker">Learner profile</p><h2>${user.firstName} ${user.lastName}</h2><p class="copy-muted">${user.headline}</p></div></div>
          <div class="profile-photo-panel"><div id="profileAvatarPreview" class="avatar-frame">${user.avatar ? `<img src="${user.avatar}" alt="${user.firstName}" />` : getInitials(user.firstName, user.lastName)}</div><div><strong>Profile image</strong><p class="copy-muted">Upload a profile photo or keep the clean initials-based avatar.</p></div></div>
          <ul class="profile-list">
            <li><strong>Email address</strong><span>${user.email}</span></li>
            <li><strong>Current track</strong><span>${track.label}</span></li>
            <li><strong>Timezone</strong><span>${user.timezone}</span></li>
            <li><strong>Bio</strong><span>${user.bio}</span></li>
          </ul>
        </article>
        <article class="settings-card">
          <div class="settings-header-row"><div><p class="section-kicker">Functional settings</p><h2>Edit profile and preferences</h2><p class="copy-muted">Changes are stored locally so you can review the dashboard as a working LMS demo.</p></div></div>
          <div id="profileSaveMessage" class="form-message"></div>
          <form id="profileForm" class="dashboard-stack">
            <div class="field-row"><div class="field-group"><label for="profileFirstName">First name</label><input id="profileFirstName" type="text" value="${escapeAttribute(user.firstName)}" /></div><div class="field-group"><label for="profileLastName">Last name</label><input id="profileLastName" type="text" value="${escapeAttribute(user.lastName)}" /></div></div>
            <div class="field-group"><label for="profileHeadline">Professional headline</label><input id="profileHeadline" type="text" value="${escapeAttribute(user.headline)}" /></div>
            <div class="field-group"><label for="profileBio">Bio</label><textarea id="profileBio">${escapeHtml(user.bio)}</textarea></div>
            <div class="field-row"><div class="field-group"><label for="profileTrack">Track</label><select id="profileTrack">${Object.values(window.RKH_DATA.tracks).map(item => `<option value="${item.id}" ${item.id === user.trackId ? 'selected' : ''}>${item.label}</option>`).join('')}</select></div><div class="field-group"><label for="profileTimezone">Timezone</label><input id="profileTimezone" type="text" value="${escapeAttribute(user.timezone)}" /></div></div>
            <div class="field-group"><label for="profileAvatarInput">Profile image</label><input id="profileAvatarInput" type="file" accept="image/*" /><span class="field-help">Upload a square image for the sidebar and profile preview.</span></div>
            <div class="field-group"><label for="profilePassword">Password</label><input id="profilePassword" type="password" placeholder="Leave empty to keep your current password" /></div>
            <div class="profile-image-actions"><button class="btn btn-primary btn-small" type="submit">Save profile changes</button><button class="btn btn-secondary btn-small" type="button" onclick="removeProfileImage()">Remove image</button></div>
          </form>
        </article>
      </section>
    `;
  }

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

  function finalizeProfileSave() {
    persistUsers();
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

  // Folder sharing is handled as a collection of files uploaded into one folder path in storage.
  // We keep the relative file names so the folder structure still makes sense in the message feed.
  function handleCommunityFolderSelect(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const folderName = (files[0].webkitRelativePath || files[0].name).split('/')[0] || 'Shared folder';
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

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
      fileCount: files.length,
      files: files.map(file => ({
        file,
        name: file.name,
        relativePath: normalizeFolderRelativePath(file.webkitRelativePath || file.name),
        type: file.type || 'application/octet-stream',
        size: file.size
      }))
    };
    state.communityComposerMessage = {
      type: 'success',
      text: `${folderName} is attached and ready to send (${files.length} files, ${formatFileSize(totalSize)}).`
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
      if (!communitySupabase) {
        throw new Error('Folder sharing requires Supabase storage to be active for this browser session.');
      }

      return uploadCommunityFolder(user, track, attachment);
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
      name: attachment.name,
      type: attachment.type || attachment.file.type || 'application/octet-stream',
      size: attachment.size || attachment.file.size || 0
    };
  }

  async function uploadCommunityFolder(user, track, attachment) {
    if (!attachment?.files?.length || !communitySupabase) return null;

    const safeFolderName = sanitizeFileName(attachment.name || 'folder');
    const folderRoot = `${track.id}/${user.id}/folders/${Date.now()}-${safeFolderName}`;
    const storage = communitySupabase.storage.from(COMMUNITY_ATTACHMENT_BUCKET);
    const uploadedFiles = [];

    try {
      for (const fileEntry of attachment.files) {
        const sanitizedRelativePath = sanitizeFolderRelativePath(fileEntry.relativePath || fileEntry.name);
        const path = `${folderRoot}/${sanitizedRelativePath}`;
        const { error } = await storage.upload(path, fileEntry.file, {
          upsert: false,
          contentType: fileEntry.type || fileEntry.file.type || 'application/octet-stream'
        });

        if (error) {
          throw error;
        }

        const { data } = storage.getPublicUrl(path);
        uploadedFiles.push({
          name: fileEntry.name,
          relativePath: fileEntry.relativePath || fileEntry.name,
          path,
          url: data.publicUrl,
          type: fileEntry.type || fileEntry.file.type || 'application/octet-stream',
          size: fileEntry.size || fileEntry.file.size || 0
        });
      }
    } catch (error) {
      if (uploadedFiles.length) {
        await storage.remove(uploadedFiles.map(file => file.path));
      }
      throw error;
    }

    return {
      kind: 'folder',
      bucket: COMMUNITY_ATTACHMENT_BUCKET,
      rootPath: folderRoot,
      name: attachment.name,
      fileCount: attachment.fileCount,
      size: attachment.size,
      files: uploadedFiles
    };
  }

  function getCommunityUploadErrorMessage(error) {
    const message = String(error?.message || '').toLowerCase();
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
      if (message?.attachment?.kind === 'folder' && message.attachment.files?.length) {
        await communitySupabase.storage
          .from(message.attachment.bucket || COMMUNITY_ATTACHMENT_BUCKET)
          .remove(message.attachment.files.map(file => file.path).filter(Boolean));
      } else if (message?.attachment?.path) {
        await communitySupabase.storage
          .from(message.attachment.bucket || COMMUNITY_ATTACHMENT_BUCKET)
          .remove([message.attachment.path]);
      }

      const { error } = await communitySupabase
        .from('community_messages')
        .delete()
        .eq('id', messageId)
        .eq('author_email', user.email);

      if (error) {
        state.communitySyncError = error.message;
        renderAppShell();
        return;
      }
    } else {
      const localMessages = readStoredCommunityMessages().filter(message => !(message.id === String(messageId) && (message.authorId === user.id || message.authorEmail === user.email)));
      writeStoredCommunityMessages(localMessages);
    }

    await refreshCommunityMessages(track.id);
  }

  function toggleOlderMessages(showAll) {
    state.showOlderMessages = showAll;
    renderAppShell();
  }

  // Open a semester and keep month focus inside that semester predictable for the learner.
  function toggleCurriculumSemester(semesterId) {
    const track = getCurrentTrack();
    if (!track) return;

    state.currentCurriculumSemesterId = semesterId;
    const semester = track.semesters.find(item => item.id === semesterId);
    if (semester?.months?.length && !semester.months.some(month => month.id === state.currentCurriculumMonthId)) {
      state.currentCurriculumMonthId = semester.months[0].id;
    }
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
    if (!user) return;
    const hasCompleted = user.completedLessonIds.includes(lessonId);
    user.completedLessonIds = hasCompleted ? user.completedLessonIds.filter(id => id !== lessonId) : [...user.completedLessonIds, lessonId];
    persistUsers();
    renderAppShell();
  }

  function openLesson(lessonId) {
    const track = getCurrentTrack();
    const lessonContext = track ? getLessonContext(track, lessonId) : null;
    state.currentLessonId = lessonId;
    if (lessonContext) {
      state.currentCurriculumSemesterId = lessonContext.semester.id;
      state.currentCurriculumMonthId = lessonContext.month.id;
    }
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

  function getInitials(firstName, lastName) {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
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

  window.showLandingPage = showLandingPage;
  window.showAuthPage = showAuthPage;
  window.switchAuthMode = switchAuthMode;
  window.quickDemoLogin = quickDemoLogin;
  window.openDashboardView = openApp;
  window.logoutUser = logoutUser;
  window.toggleLessonCompletion = toggleLessonCompletion;
  window.openLesson = openLesson;
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
})();
