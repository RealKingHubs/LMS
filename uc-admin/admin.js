(function () {
  // ---------------------------------------------------------------------------
  // RealKingHubs UC Admin
  // This file powers the separate admin workspace at /uc-admin/.
  // It focuses on moderation and announcements without mixing that logic
  // into the learner dashboard code.
  // ---------------------------------------------------------------------------

  const SUPABASE_URL = 'https://gelpzfafiiudidxmpofo.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHB6ZmFmaWl1ZGlkeG1wb2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTIwNzcsImV4cCI6MjA5MDk4ODA3N30.82lZQg6ZYr1SsK9SFsbszby5QEf6HENgnYn1ynS0ZhE';
  const COMMUNITY_TABLE = 'community_messages';
  const ANNOUNCEMENTS_TABLE = 'lms_announcements';
  const FEEDBACK_TABLE = 'lms_feedback';
  const TRACK_SETTINGS_TABLE = 'lms_track_settings';
  const PUBLIC_PROFILES_TABLE = 'lms_public_profiles';
  const MONTH_OVERRIDES_TABLE = 'lms_curriculum_month_overrides';
  const WEEK_OVERRIDES_TABLE = 'lms_curriculum_week_overrides';
  const SEMESTER_RESOURCES_TABLE = 'lms_semester_resources';
  const BOOKS_TABLE = 'lms_books';
  const ADMIN_USERS_TABLE = 'lms_admin_users';

  // Admin state mirrors the visible tools in /uc-admin:
  // - moderation data
  // - curriculum editor selection
  // - semester resources editor selection
  // - learner profile management state
  const state = {
    adminEmail: '',
    adminName: '',
    messages: [],
    announcements: [],
    feedbackItems: [],
    publicProfiles: [],
    trackSettingsById: {},
    monthOverridesById: {},
    weekOverridesById: {},
    messageTrackFilter: 'all',
    userTrackFilter: 'all',
    selectedUserEmail: '',
    curriculumTrackId: '',
    curriculumSemesterId: '',
    curriculumMonthId: '',
    curriculumWeekId: '',
    resourceTrackId: '',
    resourceSemesterId: '',
    semesterResourcesByKey: {},
    books: []
  };

  const dom = {};
  let supabaseClient = null;
  const LOGS_ENDPOINT = `${SUPABASE_URL}/rest/v1/system_logs?select=*&order=timestamp.desc&limit=50`;
  const LOGS_DELETE_ENDPOINT = `${SUPABASE_URL}/rest/v1/system_logs`;
  const SUPABASE_REST_HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  };

  document.addEventListener('DOMContentLoaded', () => {
    void initAdmin();
  });

  async function initAdmin() {
    bindDom();
    bindEvents();
    supabaseClient = window.supabase?.createClient
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        })
      : null;

    if (!supabaseClient) {
      showMessage(dom.adminAuthMessage, 'Supabase client could not be initialized for admin tools.', 'error');
      return;
    }

    populateTrackSelects();
    showAdminSection('overview');

    const restored = await restoreAdminSession();
    if (!restored) {
      showGate();
    }
  }

  // Keep DOM references in one place so junior developers know where to add
  // new admin controls before wiring events or data handlers.
  function bindDom() {
    dom.adminGate = document.getElementById('adminGate');
    dom.adminApp = document.getElementById('adminApp');
    dom.adminIdentity = document.getElementById('adminIdentity');
    dom.adminLoginForm = document.getElementById('adminLoginForm');
    dom.adminEmail = document.getElementById('adminEmail');
    dom.adminPassword = document.getElementById('adminPassword');
    dom.adminAuthMessage = document.getElementById('adminAuthMessage');
    dom.adminOverviewCards = document.getElementById('adminOverviewCards');
    dom.refreshLogsBtn = document.getElementById('refreshLogsBtn');
    dom.clearLogsBtn = document.getElementById('clearLogsBtn');
    dom.logsStatus = document.getElementById('logsStatus');
    dom.systemLogsList = document.getElementById('systemLogsList');
    dom.announcementTrack = document.getElementById('announcementTrack');
    dom.announcementTitle = document.getElementById('announcementTitle');
    dom.announcementBody = document.getElementById('announcementBody');
    dom.announcementForm = document.getElementById('announcementForm');
    dom.announcementList = document.getElementById('announcementList');
    dom.adminAnnouncementMessage = document.getElementById('adminAnnouncementMessage');
    dom.feedbackList = document.getElementById('feedbackList');
    dom.adminFeedbackMessage = document.getElementById('adminFeedbackMessage');
    dom.messageTrackFilter = document.getElementById('messageTrackFilter');
    dom.deleteFilteredMessagesBtn = document.getElementById('deleteFilteredMessagesBtn');
    dom.deleteAllMessagesBtn = document.getElementById('deleteAllMessagesBtn');
    dom.adminCommunityMessage = document.getElementById('adminCommunityMessage');
    dom.messageList = document.getElementById('messageList');
    dom.refreshAdminDataBtn = document.getElementById('refreshAdminDataBtn');
    dom.adminLogoutBtn = document.getElementById('adminLogoutBtn');
    dom.curriculumTrackSelect = document.getElementById('curriculumTrackSelect');
    dom.curriculumSemesterSelect = document.getElementById('curriculumSemesterSelect');
    dom.curriculumMonthSelect = document.getElementById('curriculumMonthSelect');
    dom.curriculumWeekSelect = document.getElementById('curriculumWeekSelect');
    dom.curriculumMonthForm = document.getElementById('curriculumMonthForm');
    dom.curriculumMonthLabel = document.getElementById('curriculumMonthLabel');
    dom.curriculumMonthTitle = document.getElementById('curriculumMonthTitle');
    dom.curriculumMonthSummary = document.getElementById('curriculumMonthSummary');
    dom.curriculumMonthPhase = document.getElementById('curriculumMonthPhase');
    dom.resetMonthOverrideBtn = document.getElementById('resetMonthOverrideBtn');
    dom.curriculumWeekForm = document.getElementById('curriculumWeekForm');
    dom.curriculumWeekTitle = document.getElementById('curriculumWeekTitle');
    dom.curriculumWeekObjective = document.getElementById('curriculumWeekObjective');
    dom.curriculumWeekType = document.getElementById('curriculumWeekType');
    dom.curriculumWeekVideoUrls = document.getElementById('curriculumWeekVideoUrls');
    dom.curriculumWeekResources = document.getElementById('curriculumWeekResources');
    dom.resetWeekOverrideBtn = document.getElementById('resetWeekOverrideBtn');
    dom.adminCurriculumMessage = document.getElementById('adminCurriculumMessage');
    dom.trackSettingsList = document.getElementById('trackSettingsList');
    dom.adminTrackMessage = document.getElementById('adminTrackMessage');
    dom.createTrackForm = document.getElementById('createTrackForm');
    dom.newTrackId = document.getElementById('newTrackId');
    dom.newTrackLabel = document.getElementById('newTrackLabel');
    dom.newTrackSummary = document.getElementById('newTrackSummary');
    dom.newTrackOutcomes = document.getElementById('newTrackOutcomes');
    dom.newTrackSort = document.getElementById('newTrackSort');
    dom.newTrackEnabled = document.getElementById('newTrackEnabled');
    dom.userTrackFilter = document.getElementById('userTrackFilter');
    dom.userList = document.getElementById('userList');
    dom.resourceTrackSelect = document.getElementById('resourceTrackSelect');
    dom.resourceSemesterSelect = document.getElementById('resourceSemesterSelect');
    dom.semesterResourcesForm = document.getElementById('semesterResourcesForm');
    dom.semesterResourceLinks = document.getElementById('semesterResourceLinks');
    dom.resetSemesterResourcesBtn = document.getElementById('resetSemesterResourcesBtn');
    dom.adminResourcesMessage = document.getElementById('adminResourcesMessage');
    dom.bookForm = document.getElementById('bookForm');
    dom.bookTitle = document.getElementById('bookTitle');
    dom.bookLink = document.getElementById('bookLink');
    dom.bookSummary = document.getElementById('bookSummary');
    dom.bookImage = document.getElementById('bookImage');
    dom.bookImagePreview = document.getElementById('bookImagePreview');
    dom.adminBookMessage = document.getElementById('adminBookMessage');
    dom.bookList = document.getElementById('bookList');
    dom.userForm = document.getElementById('userForm');
    dom.deleteUserBtn = document.getElementById('deleteUserBtn');
    dom.userEmail = document.getElementById('userEmail');
    dom.userFirstName = document.getElementById('userFirstName');
    dom.userLastName = document.getElementById('userLastName');
    dom.userHeadline = document.getElementById('userHeadline');
    dom.userTrack = document.getElementById('userTrack');
    dom.userActive = document.getElementById('userActive');
    dom.userTimezone = document.getElementById('userTimezone');
    dom.userManagedNote = document.getElementById('userManagedNote');
    dom.userBio = document.getElementById('userBio');
    dom.adminUserMessage = document.getElementById('adminUserMessage');
    dom.adminSectionButtons = document.querySelectorAll('.admin-nav-pill');
    dom.adminSectionPanels = document.querySelectorAll('[data-admin-section]');
  }

  // Every admin form or toolbar action is connected here.
  // If a new admin button stops working, this is the first place to check.
  function bindEvents() {
    dom.adminLoginForm.addEventListener('submit', handleAdminLogin);
    dom.announcementForm.addEventListener('submit', handleAnnouncementSubmit);
    dom.messageTrackFilter.addEventListener('change', () => {
      state.messageTrackFilter = dom.messageTrackFilter.value;
      renderMessages();
    });
    dom.userTrackFilter.addEventListener('change', () => {
      state.userTrackFilter = dom.userTrackFilter.value;
      ensureSelectedUser();
      renderUsers();
    });
    dom.deleteFilteredMessagesBtn.addEventListener('click', deleteFilteredMessages);
    dom.deleteAllMessagesBtn.addEventListener('click', deleteAllMessages);
    dom.refreshAdminDataBtn.addEventListener('click', refreshAdminData);
    dom.refreshLogsBtn?.addEventListener('click', loadSystemLogs);
    dom.clearLogsBtn?.addEventListener('click', clearAllLogs);
    dom.systemLogsList?.addEventListener('click', handleSystemLogsClick);
    dom.adminLogoutBtn.addEventListener('click', logoutAdmin);
    dom.curriculumTrackSelect.addEventListener('change', handleCurriculumTrackChange);
    dom.curriculumSemesterSelect.addEventListener('change', handleCurriculumSemesterChange);
    dom.curriculumMonthSelect.addEventListener('change', handleCurriculumMonthChange);
    dom.curriculumWeekSelect.addEventListener('change', handleCurriculumWeekChange);
    dom.curriculumMonthForm.addEventListener('submit', saveMonthOverride);
    dom.curriculumWeekForm.addEventListener('submit', saveWeekOverride);
    dom.resetMonthOverrideBtn.addEventListener('click', resetMonthOverride);
    dom.resetWeekOverrideBtn.addEventListener('click', resetWeekOverride);
    dom.resourceTrackSelect.addEventListener('change', handleResourceTrackChange);
    dom.resourceSemesterSelect.addEventListener('change', handleResourceSemesterChange);
    dom.semesterResourcesForm.addEventListener('submit', saveSemesterResources);
    dom.resetSemesterResourcesBtn.addEventListener('click', resetSemesterResources);
    dom.userForm.addEventListener('submit', saveUserProfile);
    dom.createTrackForm.addEventListener('submit', createTrackFromAdmin);
    dom.bookForm.addEventListener('submit', handleBookSubmit);
    dom.bookImage?.addEventListener('change', previewBookImage);
    dom.deleteUserBtn.addEventListener('click', deleteSelectedUserProfile);

    dom.adminSectionButtons.forEach(button => {
      button.addEventListener('click', () => showAdminSection(button.dataset.section));
    });
  }

  function showAdminSection(sectionName) {
    const section = sectionName || 'overview';

    dom.adminSectionPanels.forEach(panel => {
      const isVisible = panel.getAttribute('data-admin-section') === section;
      panel.classList.toggle('hidden', !isVisible);
    });

    dom.adminSectionButtons.forEach(button => {
      const isActive = button.dataset.section === section;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function populateTrackSelects() {
    const tracks = getResolvedTracks();
    const trackOptions = [
      '<option value="all">All tracks</option>',
      ...tracks.map(track => `<option value="${track.id}">${track.label}</option>`)
    ].join('');

    dom.messageTrackFilter.innerHTML = trackOptions;
    dom.userTrackFilter.innerHTML = trackOptions;
    const trackOnlyOptions = tracks
      .map(track => `<option value="${track.id}">${track.label}</option>`)
      .join('');
    dom.announcementTrack.innerHTML = trackOnlyOptions;
    dom.curriculumTrackSelect.innerHTML = trackOnlyOptions;
    dom.resourceTrackSelect.innerHTML = trackOnlyOptions;
    dom.userTrack.innerHTML = trackOnlyOptions;

    if (!state.curriculumTrackId) {
      state.curriculumTrackId = Object.keys(window.RKH_DATA.tracks)[0] || '';
    }
    if (!state.resourceTrackId) {
      state.resourceTrackId = state.curriculumTrackId;
    }

    dom.messageTrackFilter.value = state.messageTrackFilter;
    dom.userTrackFilter.value = state.userTrackFilter;
    dom.curriculumTrackSelect.value = state.curriculumTrackId;
    dom.resourceTrackSelect.value = state.resourceTrackId;
  }

  async function restoreAdminSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data?.session) return false;
    const restored = await verifyAdminSession();
    if (!restored) {
      await supabaseClient.auth.signOut();
    }
    return restored;
  }

  async function handleAdminLogin(event) {
    event.preventDefault();

    const email = dom.adminEmail.value.trim().toLowerCase();
    const password = dom.adminPassword.value;

    if (!email || !password) {
      showMessage(dom.adminAuthMessage, 'Enter both your admin email and password.', 'error');
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showMessage(dom.adminAuthMessage, await getAdminAuthErrorMessage(error), 'error');
      return;
    }

    const verified = await verifyAdminSession();
    if (!verified) {
      await supabaseClient.auth.signOut();
      showMessage(dom.adminAuthMessage, 'This authenticated account is not registered as an LMS admin.', 'error');
    }
  }

  // Supabase returns "Failed to fetch" when the browser cannot reach the
  // backend at all. This helper turns that raw network error into an action
  // message that is useful to the admin.
  async function getAdminAuthErrorMessage(error) {
    const message = error?.message || 'Admin sign in failed.';
    if (!/failed to fetch/i.test(message)) return message;

    const backendReachable = await canReachSupabase();
    if (!backendReachable) {
      return 'Could not reach Supabase. Check your internet connection, browser ad blocker, and make sure this page is opened from localhost or your HTTPS domain.';
    }

    return 'Supabase is reachable, but the sign-in request was blocked. Confirm Email/Password auth is enabled in Supabase and that this admin user exists.';
  }

  async function canReachSupabase() {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        method: 'GET',
        cache: 'no-store'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async function verifyAdminSession() {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user?.email) return false;

    const { data: isAdmin, error: adminError } = await supabaseClient.rpc('is_lms_admin');
    if (adminError || !isAdmin) return false;

    const { data: adminRows } = await supabaseClient
      .from(ADMIN_USERS_TABLE)
      .select('email, display_name')
      .eq('email', userData.user.email.toLowerCase())
      .limit(1);

    state.adminEmail = userData.user.email.toLowerCase();
    state.adminName = adminRows?.[0]?.display_name || state.adminEmail;
    await openAdminApp();
    return true;
  }

  async function openAdminApp() {
    dom.adminGate.classList.add('hidden');
    dom.adminApp.classList.remove('hidden');
    if (dom.adminIdentity) {
      dom.adminIdentity.textContent = `Signed in as ${state.adminName || state.adminEmail}.`;
    }
    await refreshAdminData();
  }

  function showGate() {
    dom.adminGate.classList.remove('hidden');
    dom.adminApp.classList.add('hidden');
  }

  async function logoutAdmin() {
    await supabaseClient.auth.signOut();
    state.adminEmail = '';
    state.adminName = '';
    showGate();
  }

  async function refreshAdminData() {
    await Promise.all([
      fetchMessages(),
      fetchAnnouncements(),
      fetchFeedback(),
      fetchPublicProfiles(),
      fetchTrackSettings(),
      fetchCurriculumOverrides(),
      fetchSemesterResources(),
      fetchBooks()
    ]);
    renderOverview();
    renderAnnouncements();
    renderFeedbackList();
    renderMessages();
    renderTrackSettings();
    renderCurriculumEditor();
    renderResourcesEditor();
    renderUsers();
    renderBookList();
    await loadSystemLogs();
  }

  async function loadSystemLogs() {
    if (!dom.logsStatus || !dom.systemLogsList) return;

    dom.logsStatus.textContent = 'Loading the latest logs…';
    dom.systemLogsList.innerHTML = '';

    try {
      const response = await fetch(LOGS_ENDPOINT, {
        method: 'GET',
        headers: {
          ...SUPABASE_REST_HEADERS,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Unable to load logs (${response.status})`);
      }

      const data = await response.json();
      const records = Array.isArray(data) ? data : Array.isArray(data?.logs) ? data.logs : [];

      if (!records.length) {
        dom.logsStatus.textContent = 'No logs were returned from the logging endpoint.';
        dom.systemLogsList.innerHTML = '<article class="empty-state">No log entries are available yet.</article>';
        return;
      }

      dom.logsStatus.textContent = `${records.length} log entries loaded.`;
      dom.systemLogsList.innerHTML = records.map(renderLogCard).join('');
    } catch (error) {
      dom.logsStatus.textContent = 'Logs are currently unavailable. Please try again shortly.';
      dom.systemLogsList.innerHTML = `<article class="empty-state">${escapeHtml(error?.message || 'Failed to load logs')}</article>`;
    }
  }

  function renderLogCard(entry) {
    const type = String(entry?.type || entry?.severity || 'info').toLowerCase();
    const severity = type.includes('error') || type.includes('crash') ? 'error' : type.includes('warn') || type.includes('slow') ? 'warning' : 'info';
    const message = escapeHtml(String(entry?.message || entry?.error || 'No message recorded'));
    const location = escapeHtml(String(entry?.file || entry?.source || 'Unknown script location'));
    const line = entry?.line ? `Line ${entry.line}` : 'Line unavailable';
    const pageUrl = escapeHtml(String(entry?.url || entry?.page || entry?.pathname || 'Unknown page'));
    const timestamp = escapeHtml(String(entry?.timestamp || entry?.created_at || 'Unknown time'));
    const width = entry?.viewport?.width || 0;
    const height = entry?.viewport?.height || 0;
    const resolution = escapeHtml(`${width} × ${height}`);
    const deviceType = escapeHtml(String(entry?.viewport?.deviceType || entry?.deviceType || (width < 768 ? 'Mobile' : 'Desktop')));
    const logId = escapeHtml(String(entry?.id || ''));

    return `
      <article class="log-card ${severity}" data-log-id="${logId}" aria-label="Log entry ${severity}">
        <div class="log-card-header">
          <span class="log-card-label">${severity.toUpperCase()} • ${escapeHtml(type)}</span>
          <button class="btn btn-secondary delete-log-btn" type="button" data-log-id="${logId}">Delete Log</button>
        </div>
        <strong class="log-card-message">${message}</strong>
        <div class="log-card-meta">${escapeHtml(timestamp)} • ${escapeHtml(line)} • ${resolution} (${deviceType})</div>
        <div class="log-card-location">Script location: ${location}</div>
        <div class="log-card-url">Page: ${pageUrl}</div>
      </article>
    `;
  }

  async function deleteLogById(logId) {
    if (!logId) return false;

    const response = await fetch(`${LOGS_DELETE_ENDPOINT}?id=eq.${encodeURIComponent(logId)}`, {
      method: 'DELETE',
      headers: {
        ...LOGS_REST_HEADERS,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      }
    });

    return response.ok;
  }

  function handleSystemLogsClick(event) {
    const target = event.target;
    const button = target.closest('.delete-log-btn');
    if (!button) return;

    const logId = button.dataset.logId;
    if (!logId) return;

    event.preventDefault();
    deleteLogAndHideCard(logId, button);
  }

  async function deleteLogAndHideCard(logId, button) {
    const card = button.closest('.log-card');
    if (card) {
      card.style.transition = 'opacity 180ms ease, transform 180ms ease, max-height 180ms ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.98) translateY(-4px)';
      card.style.maxHeight = '0';
      card.style.overflow = 'hidden';
    }

    const deleted = await deleteLogById(logId);
    if (!deleted) {
      if (card) {
        card.style.opacity = '';
        card.style.transform = '';
        card.style.maxHeight = '';
        card.style.overflow = '';
      }
      dom.logsStatus.textContent = 'Failed to delete the selected log. Please try again.';
      return;
    }

    if (card) {
      window.setTimeout(() => card.remove(), 200);
    }
    dom.logsStatus.textContent = 'Log deleted successfully.';
  }

  async function clearAllLogs() {
    if (!dom.logsStatus || !dom.systemLogsList) return;

    dom.logsStatus.textContent = 'Clearing all logs…';

    const response = await fetch(`${LOGS_DELETE_ENDPOINT}?id=not.is.null`, {
      method: 'DELETE',
      headers: {
        ...LOGS_REST_HEADERS,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      }
    });

    if (!response.ok) {
      dom.logsStatus.textContent = 'Unable to clear logs. Try refreshing instead.';
      return;
    }

    dom.systemLogsList.innerHTML = '<article class="empty-state">All logs have been cleared.</article>';
    dom.logsStatus.textContent = 'All log records were cleared.';
  }

  async function fetchMessages() {
    const { data, error } = await supabaseClient
      .from(COMMUNITY_TABLE)
      .select('id, author_name, author_email, room, content, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      showMessage(dom.adminCommunityMessage, error.message, 'error');
      return;
    }

    state.messages = (data || []).map(normalizeMessage);
    hideMessage(dom.adminCommunityMessage);
  }

  async function fetchAnnouncements() {
    const { data, error } = await supabaseClient
      .from(ANNOUNCEMENTS_TABLE)
      .select('id, track_id, title, body, created_at, created_by')
      .order('created_at', { ascending: false });

    if (error) {
      showMessage(dom.adminAnnouncementMessage, error.message, 'error');
      return;
    }

    state.announcements = (data || []).map(item => ({
      id: String(item.id),
      trackId: item.track_id,
      title: item.title,
      body: item.body,
      createdAt: item.created_at,
      createdBy: item.created_by || ''
    }));
    hideMessage(dom.adminAnnouncementMessage);
  }

  async function fetchFeedback() {
    const { data, error } = await supabaseClient
      .from(FEEDBACK_TABLE)
      .select('id, user_email, user_name, track_id, category, message, image_urls, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      showMessage(dom.adminFeedbackMessage, error.message, 'error');
      return;
    }

    state.feedbackItems = (data || []).map(item => ({
      id: String(item.id),
      userEmail: item.user_email || '',
      userName: item.user_name || 'Learner',
      trackId: item.track_id || 'community',
      category: item.category || 'General',
      message: item.message || '',
      imageUrls: Array.isArray(item.image_urls) ? item.image_urls : [],
      createdAt: item.created_at || ''
    }));
    hideMessage(dom.adminFeedbackMessage);
  }

  async function fetchPublicProfiles() {
    const { data, error } = await supabaseClient
      .from(PUBLIC_PROFILES_TABLE)
      .select('email, first_name, last_name, track_id, timezone, headline, bio, avatar_url, is_active, managed_note, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      showMessage(dom.adminUserMessage, error.message, 'error');
      return;
    }

    state.publicProfiles = (data || []).map(item => ({
      email: item.email || '',
      firstName: item.first_name || '',
      lastName: item.last_name || '',
      trackId: item.track_id || '',
      timezone: item.timezone || 'Africa/Lagos',
      headline: item.headline || '',
      bio: item.bio || '',
      avatarUrl: item.avatar_url || '',
      isActive: item.is_active !== false,
      managedNote: item.managed_note || '',
      updatedAt: item.updated_at || ''
    }));

    ensureSelectedUser();
    hideMessage(dom.adminUserMessage);
  }

  async function fetchTrackSettings() {
    const { data, error } = await supabaseClient
      .from(TRACK_SETTINGS_TABLE)
      .select('id, label, summary, outcomes, is_enabled, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      showMessage(dom.adminTrackMessage, error.message, 'error');
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

    populateTrackSelects();
    hideMessage(dom.adminTrackMessage);
  }

  async function fetchCurriculumOverrides() {
    const [{ data: monthData, error: monthError }, { data: weekData, error: weekError }] = await Promise.all([
      supabaseClient.from(MONTH_OVERRIDES_TABLE).select('month_id, track_id, semester_id, label, title, summary, phase'),
      supabaseClient.from(WEEK_OVERRIDES_TABLE).select('week_id, track_id, semester_id, month_id, title, objective, type, video_url, video_urls, resources, resource_items')
    ]);

    if (monthError) {
      showMessage(dom.adminCurriculumMessage, monthError.message, 'error');
      return;
    }

    if (weekError) {
      showMessage(dom.adminCurriculumMessage, weekError.message, 'error');
      return;
    }

    state.monthOverridesById = Object.fromEntries((monthData || []).map(item => [
      item.month_id,
      {
        trackId: item.track_id,
        semesterId: item.semester_id,
        label: item.label || '',
        title: item.title || '',
        summary: item.summary || '',
        phase: item.phase || ''
      }
    ]));

    state.weekOverridesById = Object.fromEntries((weekData || []).map(item => [
      item.week_id,
      {
        trackId: item.track_id,
        semesterId: item.semester_id,
        monthId: item.month_id,
        title: item.title || '',
        objective: item.objective || '',
        type: item.type || '',
        videoUrl: item.video_url || '',
        videoUrls: Array.isArray(item.video_urls) ? item.video_urls : [],
        resources: Array.isArray(item.resources) ? item.resources : [],
        resourceItems: Array.isArray(item.resource_items) ? item.resource_items : []
      }
    ]));

    hideMessage(dom.adminCurriculumMessage);
  }

  // Semester resources are managed separately from week resources because the
  // learner LMS shows them in a standalone Resources page grouped by semester.
  async function fetchSemesterResources() {
    const { data, error } = await supabaseClient
      .from(SEMESTER_RESOURCES_TABLE)
      .select('track_id, semester_id, resource_links');

    if (error) {
      showMessage(dom.adminResourcesMessage, error.message, 'error');
      return;
    }

    state.semesterResourcesByKey = Object.fromEntries((data || []).map(item => [
      `${item.track_id}::${item.semester_id}`,
      Array.isArray(item.resource_links) ? item.resource_links : []
    ]));

    hideMessage(dom.adminResourcesMessage);
  }

  function normalizeMessage(item) {
    const payload = parseMessagePayload(item.content || '');
    return {
      id: String(item.id),
      authorName: item.author_name || 'Learner',
      authorEmail: item.author_email || '',
      trackId: item.room || 'community',
      body: payload.body || '',
      sticker: payload.sticker || '',
      attachment: payload.attachment || null,
      createdAt: item.created_at || new Date().toISOString()
    };
  }

  function parseMessagePayload(value) {
    if (!value) return { body: '', sticker: '', attachment: null };
    try {
      const parsed = JSON.parse(value);
      return {
        body: parsed.body || '',
        sticker: parsed.sticker || '',
        attachment: parsed.attachment || null
      };
    } catch (error) {
      return { body: String(value), sticker: '', attachment: null };
    }
  }

  function getResolvedTracks() {
    const trackIds = Array.from(new Set([
      ...Object.keys(window.RKH_DATA.tracks || {}),
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

  function getResolvedTrack(trackId) {
    const settings = state.trackSettingsById[trackId] || {};
    const baseTrack = window.RKH_DATA.tracks[trackId] || buildFallbackTrack(trackId, settings);
    if (!baseTrack) return null;
    return {
      ...baseTrack,
      label: settings.label || baseTrack.label,
      summary: settings.summary || baseTrack.summary,
      outcomes: Array.isArray(settings.outcomes) && settings.outcomes.length ? settings.outcomes : baseTrack.outcomes,
      isEnabled: settings.isEnabled !== false,
      sortOrder: Number.isFinite(settings.sortOrder) ? settings.sortOrder : 0,
      semesters: baseTrack.semesters.map(semester => ({
        ...semester,
        months: semester.months.map(month => {
          const monthOverride = state.monthOverridesById[month.id] || {};
          return {
            ...month,
            label: monthOverride.label || month.label,
            title: monthOverride.title || month.title,
            summary: monthOverride.summary || month.summary,
            phase: monthOverride.phase || month.phase,
            weeks: month.weeks.map(week => {
              const weekOverride = state.weekOverridesById[week.id] || {};
              return {
                ...week,
                title: weekOverride.title || week.title,
                objective: weekOverride.objective || week.objective,
                type: weekOverride.type || week.type,
                videoUrl: weekOverride.videoUrls?.[0] || weekOverride.videoUrl || week.videoUrl,
                videoUrls: Array.isArray(weekOverride.videoUrls) && weekOverride.videoUrls.length
                  ? weekOverride.videoUrls
                  : [weekOverride.videoUrl || week.videoUrl].filter(Boolean),
                resourceItems: Array.isArray(weekOverride.resourceItems) && weekOverride.resourceItems.length
                  ? weekOverride.resourceItems
                  : Array.isArray(weekOverride.resources) && weekOverride.resources.length
                    ? weekOverride.resources.map(item => ({ title: item, url: '', kind: 'resource' }))
                    : Array.isArray(week.resourceItems)
                      ? week.resourceItems
                      : (week.resources || []).map(item => ({ title: item, url: '', kind: 'resource' })),
                resources: Array.isArray(weekOverride.resources) && weekOverride.resources.length
                  ? weekOverride.resources
                  : week.resources
              };
            })
          };
        })
      }))
    };
  }

  function ensureSelectedUser() {
    const filteredUsers = getFilteredUsers();
    if (!filteredUsers.some(profile => profile.email === state.selectedUserEmail)) {
      state.selectedUserEmail = filteredUsers[0]?.email || '';
    }
  }

  function getFilteredUsers() {
    return state.publicProfiles.filter(profile => {
      return state.userTrackFilter === 'all' || profile.trackId === state.userTrackFilter;
    });
  }

  function renderOverview() {
    const tracks = getResolvedTracks();
    const totalSemesters = tracks.reduce((sum, track) => sum + track.semesters.length, 0);
    const totalWeeks = tracks
      .flatMap(track => track.semesters)
      .flatMap(semester => semester.months)
      .reduce((sum, month) => sum + month.weeks.length, 0);

    dom.adminOverviewCards.innerHTML = `
      <article class="overview-card">
        <strong>${state.messages.length}</strong>
        <span>Total community messages across all programme rooms.</span>
      </article>
      <article class="overview-card">
        <strong>${state.announcements.length}</strong>
        <span>Announcements published from the secured admin workspace.</span>
      </article>
      <article class="overview-card">
        <strong>${state.publicProfiles.length}</strong>
        <span>Learner profiles currently synced into the shared backend.</span>
      </article>
      <article class="overview-card">
        <strong>${totalSemesters} / ${totalWeeks}</strong>
        <span>Total semesters and weekly curriculum items currently managed by the LMS.</span>
      </article>
    `;
  }

  function renderAnnouncements() {
    if (!state.announcements.length) {
      dom.announcementList.innerHTML = '<div class="empty-state">No admin announcement has been published yet.</div>';
      return;
    }

    dom.announcementList.innerHTML = state.announcements.map(item => `
      <article class="admin-list-item">
        <div class="admin-list-meta">
          <span class="pill">${escapeHtml(getResolvedTrack(item.trackId)?.label || item.trackId)}</span>
          <small>${escapeHtml(formatDateTime(item.createdAt))}</small>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.body)}</p>
        <div class="admin-list-actions">
          <small>${escapeHtml(item.createdBy || state.adminEmail)}</small>
          <button class="btn btn-secondary" type="button" onclick="deleteAdminAnnouncement('${item.id}')">Delete</button>
        </div>
      </article>
    `).join('');
  }

  function renderMessages() {
    const filteredMessages = state.messages.filter(message => {
      return state.messageTrackFilter === 'all' || message.trackId === state.messageTrackFilter;
    });

    if (!filteredMessages.length) {
      dom.messageList.innerHTML = '<div class="empty-state">No message matched the current moderation filter.</div>';
      return;
    }

    dom.messageList.innerHTML = filteredMessages.map(message => `
      <article class="admin-list-item">
        <div class="admin-list-meta">
          <span class="pill">${escapeHtml(getResolvedTrack(message.trackId)?.label || message.trackId)}</span>
          <small>${escapeHtml(formatDateTime(message.createdAt))}</small>
        </div>
        <h4>${escapeHtml(message.authorName)}</h4>
        <p>${escapeHtml(message.body || 'Shared a message attachment without body text.')}</p>
        <div class="admin-list-meta">
          <small>${escapeHtml(message.authorEmail || 'No author email')}</small>
          ${message.sticker ? `<small>Sticker: ${escapeHtml(message.sticker)}</small>` : ''}
          ${message.attachment ? `<small>Attachment: ${escapeHtml(message.attachment.name || 'Attached file')}</small>` : ''}
        </div>
        <div class="admin-list-actions">
          <button class="btn btn-secondary" type="button" onclick="deleteAdminMessage('${message.id}')">Delete message</button>
        </div>
      </article>
    `).join('');
  }

  async function fetchBooks() {
    try {
      const { data, error } = await supabaseClient
        .from(BOOKS_TABLE)
        .select('id, title, summary, link, image_url, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const normalized = (data || []).map(item => ({
        id: String(item.id),
        title: item.title || '',
        summary: item.summary || '',
        link: item.link || '',
        imageUrl: item.image_url || ''
      }));

      state.books = normalized;
      persistBooksCatalog(normalized);
      renderBookList();
      return normalized;
    } catch (error) {
      state.books = readBooksCatalog();
      renderBookList();
      return state.books;
    }
  }

  function readBooksCatalog() {
    try {
      return JSON.parse(localStorage.getItem('rkh_books_catalog') || '[]');
    } catch (error) {
      console.warn('Failed to read books catalog', error);
      return [];
    }
  }

  function persistBooksCatalog(books) {
    localStorage.setItem('rkh_books_catalog', JSON.stringify(books));
    state.books = Array.isArray(books) ? books : [];
  }

  function renderBookList() {
    const books = state.books.length ? state.books : readBooksCatalog();
    state.books = books;

    if (!books.length) {
      dom.bookList.innerHTML = '<div class="empty-state">No books have been created yet. Add one above to show it on the learner dashboard.</div>';
      return;
    }

    dom.bookList.innerHTML = books.map(book => `
      <article class="admin-list-item admin-book-item">
        <div class="admin-list-meta">
          <span class="pill">Book</span>
          <small>${escapeHtml(book.title)}</small>
        </div>
        <div class="admin-book-card">
          ${book.imageUrl ? `<img src="${escapeAttribute(book.imageUrl)}" alt="${escapeAttribute(book.title)} cover" />` : '<div class="book-placeholder">No cover image</div>'}
          <div class="admin-book-copy">
            <h3>${escapeHtml(book.title)}</h3>
            <p>${escapeHtml(book.summary || 'A calm, practical book resource for the learners dashboard.')}</p>
            <a class="btn btn-secondary btn-small" href="${escapeAttribute(book.link)}" target="_blank" rel="noreferrer">Open link</a>
          </div>
        </div>
        <div class="admin-list-actions">
          <small>${escapeHtml(book.link)}</small>
          <button class="btn btn-danger btn-small" type="button" onclick="deleteAdminBook('${book.id}')">Delete book</button>
        </div>
      </article>
    `).join('');
  }

  function renderFeedbackList() {
    if (!state.feedbackItems.length) {
      dom.feedbackList.innerHTML = '<div class="empty-state">No learner feedback has been submitted yet.</div>';
      return;
    }

    dom.feedbackList.innerHTML = state.feedbackItems.map(item => `
      <article class="admin-list-item">
        <div class="admin-list-meta">
          <span class="pill">${escapeHtml(item.category)}</span>
          <span class="pill">${escapeHtml(getResolvedTrack(item.trackId)?.label || item.trackId)}</span>
          <small>${escapeHtml(formatDateTime(item.createdAt))}</small>
        </div>
        <h3>${escapeHtml(item.userName)}</h3>
        <p>${escapeHtml(item.message)}</p>
        ${item.imageUrls.length ? `<div class="feedback-image-grid">${item.imageUrls.map(url => `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer"><img src="${escapeAttribute(url)}" alt="Feedback image from ${escapeAttribute(item.userName)}" /></a>`).join('')}</div>` : ''}
        <div class="admin-list-actions">
          <small>${escapeHtml(item.userEmail || 'No email on file')}</small>
          <button class="btn btn-danger btn-small" type="button" onclick="deleteAdminFeedback('${item.id}')">Delete feedback</button>
        </div>
      </article>
    `).join('');
  }

  async function handleBookSubmit(event) {
    event.preventDefault();

    const title = dom.bookTitle.value.trim();
    const link = dom.bookLink.value.trim();
    const summary = dom.bookSummary.value.trim();

    if (!title || !link || !summary) {
      showMessage(dom.adminBookMessage, 'Book title, description, and link are required.', 'error');
      return;
    }

    const imageUrl = await readBookImageFile();

    try {
      const { error } = await supabaseClient
        .from(BOOKS_TABLE)
        .insert({
          title,
          summary,
          link,
          image_url: imageUrl || ''
        });

      if (error) {
        throw error;
      }

      dom.bookForm.reset();
      dom.bookImagePreview.innerHTML = '';
      await fetchBooks();
      showMessage(dom.adminBookMessage, 'Book card created successfully.', 'success');
      window.dispatchEvent(new CustomEvent('rkh-books-updated'));
      return;
    } catch (error) {
      const books = readBooksCatalog();
      books.unshift({
        id: `book-${Date.now()}`,
        title,
        summary,
        link,
        imageUrl: imageUrl || ''
      });
      persistBooksCatalog(books);
      state.books = books;
      dom.bookForm.reset();
      dom.bookImagePreview.innerHTML = '';
      renderBookList();
      showMessage(dom.adminBookMessage, 'Book card saved locally because remote sync is unavailable right now.', 'success');
      window.dispatchEvent(new CustomEvent('rkh-books-updated'));
    }
  }

  function previewBookImage() {
    const file = dom.bookImage?.files?.[0];
    if (!file) {
      dom.bookImagePreview.innerHTML = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      dom.bookImagePreview.innerHTML = `<img src="${escapeAttribute(String(reader.result || ''))}" alt="Book cover preview" />`;
    };
    reader.readAsDataURL(file);
  }

  function readBookImageFile() {
    return new Promise(resolve => {
      const file = dom.bookImage?.files?.[0];
      if (!file) {
        resolve('');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  window.deleteAdminBook = async function (bookId) {
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient
          .from(BOOKS_TABLE)
          .delete()
          .eq('id', bookId);

        if (error) {
          throw error;
        }
      }

      const books = readBooksCatalog().filter(item => item.id !== bookId);
      persistBooksCatalog(books);
      state.books = books;
      renderBookList();
      showMessage(dom.adminBookMessage, 'Book card deleted successfully.', 'success');
      window.dispatchEvent(new CustomEvent('rkh-books-updated'));
      return;
    } catch (error) {
      const books = readBooksCatalog().filter(item => item.id !== bookId);
      persistBooksCatalog(books);
      state.books = books;
      renderBookList();
      showMessage(dom.adminBookMessage, 'Book card removed from the local catalog. Remote deletion could not be completed.', 'error');
      window.dispatchEvent(new CustomEvent('rkh-books-updated'));
    }
  };

  function renderTrackSettings() {
    const tracks = getResolvedTracks();
    dom.trackSettingsList.innerHTML = tracks.map(track => {
      const outcomes = track.outcomes.join('\n');
      const isCustomTrack = Boolean(state.trackSettingsById[track.id]);
      return `
        <article class="admin-list-item">
          <div class="admin-list-meta">
            <span class="pill">${escapeHtml(track.id)}</span>
            <small>${track.isEnabled ? 'Enabled' : 'Disabled'}</small>
          </div>
          <div class="admin-form">
            <label>
              <span>Track label</span>
              <input id="track-label-${track.id}" type="text" value="${escapeAttribute(track.label)}" />
            </label>
            <label>
              <span>Track summary</span>
              <textarea id="track-summary-${track.id}" rows="4">${escapeHtml(track.summary)}</textarea>
            </label>
            <label>
              <span>Track outcomes</span>
              <textarea id="track-outcomes-${track.id}" rows="4">${escapeHtml(outcomes)}</textarea>
            </label>
            <div class="form-columns">
              <label>
                <span>Sort order</span>
                <input id="track-sort-${track.id}" type="number" value="${escapeAttribute(String(track.sortOrder || 0))}" />
              </label>
              <label>
                <span>Status</span>
                <select id="track-enabled-${track.id}">
                  <option value="true" ${track.isEnabled ? 'selected' : ''}>Enabled</option>
                  <option value="false" ${!track.isEnabled ? 'selected' : ''}>Disabled</option>
                </select>
              </label>
            </div>
            <div class="button-row">
              <button class="btn btn-primary" type="button" onclick="saveAdminTrackSettings('${track.id}')">Save track</button>
              <button class="btn btn-secondary" type="button" onclick="resetAdminTrackSettings('${track.id}')">Reset overrides</button>
              ${isCustomTrack ? `<button class="btn btn-danger" type="button" onclick="deleteAdminTrack('${track.id}')">Delete track</button>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderCurriculumEditor() {
    ensureCurriculumSelection();
    renderCurriculumSelectors();
    renderCurriculumForms();
  }

  function ensureCurriculumSelection() {
    const track = getResolvedTrack(state.curriculumTrackId) || getResolvedTracks()[0] || null;
    if (!track) return;
    state.curriculumTrackId = track.id;

    const semester = track.semesters.find(item => item.id === state.curriculumSemesterId) || track.semesters[0] || null;
    if (!semester) return;
    state.curriculumSemesterId = semester.id;

    const month = semester.months.find(item => item.id === state.curriculumMonthId) || semester.months[0] || null;
    if (!month) return;
    state.curriculumMonthId = month.id;

    const week = month.weeks.find(item => item.id === state.curriculumWeekId) || month.weeks[0] || null;
    state.curriculumWeekId = week?.id || '';
  }

  function renderCurriculumSelectors() {
    const track = getResolvedTrack(state.curriculumTrackId);
    if (!track) return;

    dom.curriculumTrackSelect.value = track.id;
    dom.curriculumSemesterSelect.innerHTML = track.semesters
      .map(semester => `<option value="${semester.id}">${escapeHtml(`${semester.label} - ${semester.title}`)}</option>`)
      .join('');
    dom.curriculumSemesterSelect.value = state.curriculumSemesterId;

    const semester = track.semesters.find(item => item.id === state.curriculumSemesterId);
    const months = semester?.months || [];
    dom.curriculumMonthSelect.innerHTML = months
      .map(month => `<option value="${month.id}">${escapeHtml(`${month.label} - ${month.title}`)}</option>`)
      .join('');
    dom.curriculumMonthSelect.value = state.curriculumMonthId;

    const month = months.find(item => item.id === state.curriculumMonthId);
    const weeks = month?.weeks || [];
    dom.curriculumWeekSelect.innerHTML = weeks
      .map(week => `<option value="${week.id}">${escapeHtml(week.title)}</option>`)
      .join('');
    dom.curriculumWeekSelect.value = state.curriculumWeekId;
  }

  function renderCurriculumForms() {
    const track = getResolvedTrack(state.curriculumTrackId);
    const semester = track?.semesters.find(item => item.id === state.curriculumSemesterId) || null;
    const month = semester?.months.find(item => item.id === state.curriculumMonthId) || null;
    const week = month?.weeks.find(item => item.id === state.curriculumWeekId) || null;

    dom.curriculumMonthLabel.value = month?.label || '';
    dom.curriculumMonthTitle.value = month?.title || '';
    dom.curriculumMonthSummary.value = month?.summary || '';
    dom.curriculumMonthPhase.value = month?.phase || '';
    dom.curriculumWeekTitle.value = week?.title || '';
    dom.curriculumWeekObjective.value = week?.objective || '';
    dom.curriculumWeekType.value = week?.type || '';
    const weekVideoUrls = Array.isArray(week?.videoUrls) && week.videoUrls.length
      ? week.videoUrls
      : [week?.videoUrl].filter(Boolean);
    const weekResourceLines = Array.isArray(week?.resourceItems) && week.resourceItems.length
      ? week.resourceItems.map(item => item.url ? `${item.title} | ${item.url}` : item.title)
      : Array.isArray(week?.resources)
        ? week.resources
        : [];
    dom.curriculumWeekVideoUrls.value = weekVideoUrls.join('\n');
    dom.curriculumWeekResources.value = weekResourceLines.join('\n');
  }

  function ensureResourceSelection() {
    const track = getResolvedTrack(state.resourceTrackId) || getResolvedTracks()[0] || null;
    if (!track) return;
    state.resourceTrackId = track.id;

    const semester = track.semesters.find(item => item.id === state.resourceSemesterId) || track.semesters[0] || null;
    state.resourceSemesterId = semester?.id || '';
  }

  // This editor lets admins assign multiple resource links to each semester.
  // Learners then see those links grouped under Semester 1, 2, and 3.
  function renderResourcesEditor() {
    ensureResourceSelection();
    const track = getResolvedTrack(state.resourceTrackId);
    if (!track) return;

    dom.resourceTrackSelect.value = track.id;
    dom.resourceSemesterSelect.innerHTML = track.semesters
      .map(semester => `<option value="${semester.id}">${escapeHtml(`${semester.label} - ${semester.title}`)}</option>`)
      .join('');
    dom.resourceSemesterSelect.value = state.resourceSemesterId;

    const links = state.semesterResourcesByKey[`${track.id}::${state.resourceSemesterId}`] || [];
    dom.semesterResourceLinks.value = links
      .map(item => typeof item === 'string' ? item : item?.url || '')
      .filter(Boolean)
      .join('\n');
  }

  function renderUsers() {
    const filteredUsers = getFilteredUsers();

    if (!filteredUsers.length) {
      dom.userList.innerHTML = '<div class="empty-state">No learner profile has been synced for this filter yet.</div>';
      dom.userForm.reset();
      return;
    }

    dom.userList.innerHTML = filteredUsers.map(profile => `
      <article class="admin-list-item user-list-item ${profile.email === state.selectedUserEmail ? 'user-list-item-active' : ''}" onclick="selectAdminUser('${profile.email}')">
        <div class="admin-list-meta">
          <span class="pill">${escapeHtml(getResolvedTrack(profile.trackId)?.label || profile.trackId || 'No track')}</span>
          <small>${profile.isActive ? 'Active' : 'Disabled'}</small>
        </div>
        <h4>${escapeHtml(`${profile.firstName} ${profile.lastName}`.trim() || profile.email)}</h4>
        <p>${escapeHtml(profile.headline || 'No headline provided yet.')}</p>
        <div class="admin-list-meta">
          <small>${escapeHtml(profile.email)}</small>
          <small>${escapeHtml(profile.timezone || 'Africa/Lagos')}</small>
        </div>
      </article>
    `).join('');

    const selectedProfile = filteredUsers.find(profile => profile.email === state.selectedUserEmail) || filteredUsers[0];
    if (!selectedProfile) return;

    state.selectedUserEmail = selectedProfile.email;
    dom.userEmail.value = selectedProfile.email;
    dom.userFirstName.value = selectedProfile.firstName;
    dom.userLastName.value = selectedProfile.lastName;
    dom.userHeadline.value = selectedProfile.headline;
    dom.userTrack.value = selectedProfile.trackId || Object.keys(window.RKH_DATA.tracks)[0] || '';
    dom.userActive.value = selectedProfile.isActive ? 'true' : 'false';
    dom.userTimezone.value = selectedProfile.timezone;
    dom.userManagedNote.value = selectedProfile.managedNote;
    dom.userBio.value = selectedProfile.bio;
  }

  function handleCurriculumTrackChange() {
    state.curriculumTrackId = dom.curriculumTrackSelect.value;
    state.curriculumSemesterId = '';
    state.curriculumMonthId = '';
    state.curriculumWeekId = '';
    renderCurriculumEditor();
  }

  function handleCurriculumSemesterChange() {
    state.curriculumSemesterId = dom.curriculumSemesterSelect.value;
    state.curriculumMonthId = '';
    state.curriculumWeekId = '';
    renderCurriculumEditor();
  }

  function handleCurriculumMonthChange() {
    state.curriculumMonthId = dom.curriculumMonthSelect.value;
    state.curriculumWeekId = '';
    renderCurriculumEditor();
  }

  function handleCurriculumWeekChange() {
    state.curriculumWeekId = dom.curriculumWeekSelect.value;
    renderCurriculumEditor();
  }

  function handleResourceTrackChange() {
    state.resourceTrackId = dom.resourceTrackSelect.value;
    state.resourceSemesterId = '';
    renderResourcesEditor();
  }

  function handleResourceSemesterChange() {
    state.resourceSemesterId = dom.resourceSemesterSelect.value;
    renderResourcesEditor();
  }

  async function handleAnnouncementSubmit(event) {
    event.preventDefault();

    const trackId = dom.announcementTrack.value;
    const title = dom.announcementTitle.value.trim();
    const body = dom.announcementBody.value.trim();

    if (!trackId || !title || !body) {
      showMessage(dom.adminAnnouncementMessage, 'Track, title, and body are required.', 'error');
      return;
    }

    const payload = {
      track_id: trackId,
      title,
      body,
      created_by: state.adminEmail
    };

    const { error } = await supabaseClient.from(ANNOUNCEMENTS_TABLE).insert(payload);
    if (error) {
      showMessage(dom.adminAnnouncementMessage, error.message, 'error');
      return;
    }

    dom.announcementForm.reset();
    populateTrackSelects();
    showMessage(dom.adminAnnouncementMessage, 'Announcement published successfully.', 'success');
    await fetchAnnouncements();
    renderOverview();
    renderAnnouncements();
  }

  async function saveMonthOverride(event) {
    event.preventDefault();

    const track = getResolvedTrack(state.curriculumTrackId);
    const semester = track?.semesters.find(item => item.id === state.curriculumSemesterId) || null;
    const month = semester?.months.find(item => item.id === state.curriculumMonthId) || null;
    if (!track || !semester || !month) {
      showMessage(dom.adminCurriculumMessage, 'Select a valid track, semester, and month before saving.', 'error');
      return;
    }

    const { error } = await supabaseClient.from(MONTH_OVERRIDES_TABLE).upsert({
      month_id: month.id,
      track_id: track.id,
      semester_id: semester.id,
      label: dom.curriculumMonthLabel.value.trim(),
      title: dom.curriculumMonthTitle.value.trim(),
      summary: dom.curriculumMonthSummary.value.trim(),
      phase: dom.curriculumMonthPhase.value.trim(),
      updated_by: state.adminEmail
    }, { onConflict: 'month_id' });

    if (error) {
      showMessage(dom.adminCurriculumMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminCurriculumMessage, 'Month override saved successfully.', 'success');
    await fetchCurriculumOverrides();
    renderCurriculumEditor();
    renderOverview();
  }

  async function saveWeekOverride(event) {
    event.preventDefault();

    const track = getResolvedTrack(state.curriculumTrackId);
    const semester = track?.semesters.find(item => item.id === state.curriculumSemesterId) || null;
    const month = semester?.months.find(item => item.id === state.curriculumMonthId) || null;
    const week = month?.weeks.find(item => item.id === state.curriculumWeekId) || null;
    if (!track || !semester || !month || !week) {
      showMessage(dom.adminCurriculumMessage, 'Select a valid track, semester, month, and week before saving.', 'error');
      return;
    }

    const videoUrls = dom.curriculumWeekVideoUrls.value
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);

    const resourceItems = dom.curriculumWeekResources.value
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const [titlePart, urlPart] = item.split('|').map(part => part.trim());
        if (urlPart) {
          return { title: titlePart || 'Resource', url: urlPart, kind: 'link' };
        }
        return { title: titlePart || 'Resource', url: '', kind: 'resource' };
      });
    const resources = resourceItems.map(item => item.title);

    const { error } = await supabaseClient.from(WEEK_OVERRIDES_TABLE).upsert({
      week_id: week.id,
      track_id: track.id,
      semester_id: semester.id,
      month_id: month.id,
      title: dom.curriculumWeekTitle.value.trim(),
      objective: dom.curriculumWeekObjective.value.trim(),
      type: dom.curriculumWeekType.value.trim(),
      video_url: videoUrls[0] || '',
      video_urls: videoUrls,
      resources,
      resource_items: resourceItems,
      updated_by: state.adminEmail
    }, { onConflict: 'week_id' });

    if (error) {
      showMessage(dom.adminCurriculumMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminCurriculumMessage, 'Week override saved successfully.', 'success');
    await fetchCurriculumOverrides();
    renderCurriculumEditor();
    renderOverview();
  }

  async function resetMonthOverride() {
    if (!state.curriculumMonthId) return;

    const shouldReset = window.confirm('Reset this month back to the base curriculum content?');
    if (!shouldReset) return;

    const { error } = await supabaseClient
      .from(MONTH_OVERRIDES_TABLE)
      .delete()
      .eq('month_id', state.curriculumMonthId);

    if (error) {
      showMessage(dom.adminCurriculumMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminCurriculumMessage, 'Month override removed.', 'success');
    await fetchCurriculumOverrides();
    renderCurriculumEditor();
  }

  async function resetWeekOverride() {
    if (!state.curriculumWeekId) return;

    const shouldReset = window.confirm('Reset this week back to the base curriculum content?');
    if (!shouldReset) return;

    const { error } = await supabaseClient
      .from(WEEK_OVERRIDES_TABLE)
      .delete()
      .eq('week_id', state.curriculumWeekId);

    if (error) {
      showMessage(dom.adminCurriculumMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminCurriculumMessage, 'Week override removed.', 'success');
    await fetchCurriculumOverrides();
    renderCurriculumEditor();
  }

  async function saveSemesterResources(event) {
    event.preventDefault();

    const track = getResolvedTrack(state.resourceTrackId);
    const semester = track?.semesters.find(item => item.id === state.resourceSemesterId) || null;
    if (!track || !semester) {
      showMessage(dom.adminResourcesMessage, 'Select a valid track and semester before saving.', 'error');
      return;
    }

    const resourceLinks = dom.semesterResourceLinks.value
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);

    const { error } = await supabaseClient.from(SEMESTER_RESOURCES_TABLE).upsert({
      track_id: track.id,
      semester_id: semester.id,
      resource_links: resourceLinks,
      updated_by: state.adminEmail
    }, { onConflict: 'track_id,semester_id' });

    if (error) {
      showMessage(dom.adminResourcesMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminResourcesMessage, 'Semester resources saved successfully.', 'success');
    await fetchSemesterResources();
    renderResourcesEditor();
  }

  async function resetSemesterResources() {
    const track = getResolvedTrack(state.resourceTrackId);
    if (!track || !state.resourceSemesterId) return;

    const shouldReset = window.confirm('Reset the resource links for this semester?');
    if (!shouldReset) return;

    const { error } = await supabaseClient
      .from(SEMESTER_RESOURCES_TABLE)
      .delete()
      .eq('track_id', track.id)
      .eq('semester_id', state.resourceSemesterId);

    if (error) {
      showMessage(dom.adminResourcesMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminResourcesMessage, 'Semester resources removed.', 'success');
    await fetchSemesterResources();
    renderResourcesEditor();
  }

  async function createTrackFromAdmin(event) {
    event.preventDefault();

    const rawId = (dom.newTrackId.value || dom.newTrackLabel.value || '').trim();
    const trackId = rawId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const label = dom.newTrackLabel.value.trim();
    const summary = dom.newTrackSummary.value.trim();
    const outcomes = (dom.newTrackOutcomes.value || '')
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);

    if (!trackId || !label) {
      showMessage(dom.adminTrackMessage, 'Enter both a track ID and a display name.', 'error');
      return;
    }

    const isEnabled = dom.newTrackEnabled.value !== 'false';
    const sortOrder = Number(dom.newTrackSort.value || 0);

    const { error } = await supabaseClient.from(TRACK_SETTINGS_TABLE).upsert({
      id: trackId,
      label,
      summary: summary || `${label} track created from the admin dashboard.`,
      outcomes,
      is_enabled: isEnabled,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      updated_by: state.adminEmail
    }, { onConflict: 'id' });

    if (error) {
      showMessage(dom.adminTrackMessage, error.message, 'error');
      return;
    }

    if (!window.RKH_DATA.tracks[trackId]) {
      window.RKH_DATA.tracks[trackId] = buildFallbackTrack(trackId, { label, summary, outcomes });
    }

    dom.createTrackForm.reset();
    dom.newTrackSort.value = '10';
    dom.newTrackEnabled.value = 'true';
    localStorage.setItem('rkh-track-refresh', String(Date.now()));
    showMessage(dom.adminTrackMessage, 'Track created successfully.', 'success');
    await fetchTrackSettings();
    populateTrackSelects();
    renderTrackSettings();
    renderCurriculumEditor();
  }

  function buildFallbackTrack(trackId, settings = {}) {
    return {
      id: trackId,
      label: settings.label || 'New track',
      summary: settings.summary || 'Custom track created from the admin dashboard.',
      outcomes: Array.isArray(settings.outcomes) && settings.outcomes.length ? settings.outcomes : ['Track outcomes'],
      liveClasses: [],
      announcements: [],
      assessments: [],
      semesters: [
        {
          id: `${trackId}-semester-1`,
          label: 'Semester 1',
          title: 'Foundation pathway',
          months: [
            {
              id: `${trackId}-month-1`,
              label: 'Month 1',
              title: 'Foundation',
              summary: 'Starter structure for the new track.',
              phase: 'Foundation',
              weeks: [
                {
                  id: `${trackId}-week-1`,
                  title: 'Welcome and orientation',
                  objective: 'Set up the new track for learners and administrators.',
                  type: 'learning',
                  videoUrl: '',
                  videoUrls: [],
                  resources: [],
                  resourceItems: []
                }
              ]
            }
          ]
        }
      ]
    };
  }

  async function saveTrackSettings(trackId) {
    const baseTrack = window.RKH_DATA.tracks[trackId] || buildFallbackTrack(trackId, state.trackSettingsById[trackId] || {});
    if (!baseTrack) return;

    const label = document.getElementById(`track-label-${trackId}`)?.value.trim() || baseTrack.label;
    const summary = document.getElementById(`track-summary-${trackId}`)?.value.trim() || baseTrack.summary;
    const outcomes = (document.getElementById(`track-outcomes-${trackId}`)?.value || '')
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
    const sortOrder = Number(document.getElementById(`track-sort-${trackId}`)?.value || 0);
    const isEnabled = document.getElementById(`track-enabled-${trackId}`)?.value !== 'false';

    const { error } = await supabaseClient.from(TRACK_SETTINGS_TABLE).upsert({
      id: trackId,
      label,
      summary,
      outcomes,
      is_enabled: isEnabled,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      updated_by: state.adminEmail
    }, { onConflict: 'id' });

    if (error) {
      showMessage(dom.adminTrackMessage, error.message, 'error');
      return;
    }

    if (!window.RKH_DATA.tracks[trackId]) {
      window.RKH_DATA.tracks[trackId] = baseTrack;
    }

    showMessage(dom.adminTrackMessage, 'Track settings saved successfully.', 'success');
    await fetchTrackSettings();
    renderTrackSettings();
    renderCurriculumEditor();
  }

  async function resetTrackSettings(trackId) {
    const shouldReset = window.confirm('Reset this track back to the base LMS configuration?');
    if (!shouldReset) return;

    const { error } = await supabaseClient
      .from(TRACK_SETTINGS_TABLE)
      .delete()
      .eq('id', trackId);

    if (error) {
      showMessage(dom.adminTrackMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminTrackMessage, 'Track overrides removed.', 'success');
    await fetchTrackSettings();
    renderTrackSettings();
    renderCurriculumEditor();
  }

  async function deleteTrack(trackId) {
    if (!trackId) return;

    if (!state.trackSettingsById[trackId]) {
      showMessage(dom.adminTrackMessage, 'Only custom tracks created from the admin dashboard can be deleted here.', 'error');
      return;
    }

    const trackLabel = getResolvedTrack(trackId)?.label || trackId;
    const shouldDelete = window.confirm(`Delete custom track "${trackLabel}"? This removes its admin override and local fallback entry.`);
    if (!shouldDelete) return;

    const { error } = await supabaseClient
      .from(TRACK_SETTINGS_TABLE)
      .delete()
      .eq('id', trackId);

    if (error) {
      showMessage(dom.adminTrackMessage, error.message, 'error');
      return;
    }

    if (window.RKH_DATA?.tracks) {
      delete window.RKH_DATA.tracks[trackId];
    }
    delete state.trackSettingsById[trackId];

    showMessage(dom.adminTrackMessage, 'Track deleted successfully.', 'success');
    populateTrackSelects();
    await fetchTrackSettings();
    renderTrackSettings();
    renderCurriculumEditor();
  }

  async function deleteSelectedUserProfile() {
    if (!state.selectedUserEmail) {
      showMessage(dom.adminUserMessage, 'Select a learner profile before deleting it.', 'error');
      return;
    }

    const profile = state.publicProfiles.find(item => item.email === state.selectedUserEmail);
    const label = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : state.selectedUserEmail;
    const shouldDelete = window.confirm(`Delete learner profile for ${label}? This removes the record from the admin learner list.`);
    if (!shouldDelete) return;

    const { error } = await supabaseClient
      .from(PUBLIC_PROFILES_TABLE)
      .delete()
      .eq('email', state.selectedUserEmail);

    if (error) {
      showMessage(dom.adminUserMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminUserMessage, 'Learner profile deleted successfully.', 'success');
    await refreshAdminData();
  }

  async function saveUserProfile(event) {
    event.preventDefault();

    if (!state.selectedUserEmail) {
      showMessage(dom.adminUserMessage, 'Select a learner profile before saving.', 'error');
      return;
    }

    const payload = {
      email: state.selectedUserEmail,
      first_name: dom.userFirstName.value.trim(),
      last_name: dom.userLastName.value.trim(),
      track_id: dom.userTrack.value,
      timezone: dom.userTimezone.value.trim() || 'Africa/Lagos',
      headline: dom.userHeadline.value.trim(),
      bio: dom.userBio.value.trim(),
      is_active: dom.userActive.value === 'true',
      managed_note: dom.userManagedNote.value.trim(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from(PUBLIC_PROFILES_TABLE)
      .upsert(payload, { onConflict: 'email' });

    if (error) {
      showMessage(dom.adminUserMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminUserMessage, 'Learner profile saved successfully.', 'success');
    await fetchPublicProfiles();
    renderUsers();
    renderOverview();
  }

  async function deleteFeedback(id) {
    const entry = state.feedbackItems.find(item => item.id === String(id));
    const label = entry ? `${entry.userName} (${entry.category})` : 'this feedback entry';
    const shouldDelete = window.confirm(`Delete feedback from ${label}? This can only be done by an admin.`);
    if (!shouldDelete) return;

    const { error } = await supabaseClient
      .from(FEEDBACK_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      showMessage(dom.adminFeedbackMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminFeedbackMessage, 'Feedback deleted successfully.', 'success');
    await fetchFeedback();
    renderFeedbackList();
  }

  async function deleteAnnouncement(id) {
    const shouldDelete = window.confirm('Delete this announcement?');
    if (!shouldDelete) return;

    const { error } = await supabaseClient
      .from(ANNOUNCEMENTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      showMessage(dom.adminAnnouncementMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminAnnouncementMessage, 'Announcement deleted.', 'success');
    await fetchAnnouncements();
    renderOverview();
    renderAnnouncements();
  }

  async function deleteMessage(id) {
    const shouldDelete = window.confirm('Delete this learner message?');
    if (!shouldDelete) return;

    const { error } = await supabaseClient
      .from(COMMUNITY_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      showMessage(dom.adminCommunityMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminCommunityMessage, 'Message deleted successfully.', 'success');
    await fetchMessages();
    renderOverview();
    renderMessages();
  }

  async function deleteFilteredMessages() {
    const filteredMessages = state.messages.filter(message => {
      return state.messageTrackFilter === 'all' || message.trackId === state.messageTrackFilter;
    });

    if (!filteredMessages.length) {
      showMessage(dom.adminCommunityMessage, 'There are no messages to delete for this filter.', 'error');
      return;
    }

    const label = state.messageTrackFilter === 'all'
      ? 'all messages'
      : `${getResolvedTrack(state.messageTrackFilter)?.label || state.messageTrackFilter} messages`;

    const shouldDelete = window.confirm(`Delete ${label}? This cannot be undone.`);
    if (!shouldDelete) return;

    const messageIds = filteredMessages.map(message => Number(message.id)).filter(Number.isFinite);
    const { error } = await supabaseClient
      .from(COMMUNITY_TABLE)
      .delete()
      .in('id', messageIds);

    if (error) {
      showMessage(dom.adminCommunityMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminCommunityMessage, 'Filtered messages deleted successfully.', 'success');
    await fetchMessages();
    renderOverview();
    renderMessages();
  }

  async function deleteAllMessages() {
    const shouldDelete = window.confirm('Delete every learner message across all tracks? This cannot be undone.');
    if (!shouldDelete) return;

    const messageIds = state.messages.map(message => Number(message.id)).filter(Number.isFinite);
    if (!messageIds.length) {
      showMessage(dom.adminCommunityMessage, 'There are no messages to delete.', 'error');
      return;
    }

    const { error } = await supabaseClient
      .from(COMMUNITY_TABLE)
      .delete()
      .in('id', messageIds);

    if (error) {
      showMessage(dom.adminCommunityMessage, error.message, 'error');
      return;
    }

    showMessage(dom.adminCommunityMessage, 'All messages deleted successfully.', 'success');
    await fetchMessages();
    renderOverview();
    renderMessages();
  }

  function showMessage(target, text, type) {
    target.className = `form-message ${type}`;
    target.textContent = text;
    target.classList.remove('hidden');
  }

  function hideMessage(target) {
    target.textContent = '';
    target.className = 'form-message hidden';
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
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
    return escapeHtml(value);
  }

  function selectUser(email) {
    state.selectedUserEmail = email;
    renderUsers();
  }

  window.deleteAdminMessage = deleteMessage;
  window.deleteAdminAnnouncement = deleteAnnouncement;
  window.deleteAdminFeedback = deleteFeedback;
  window.deleteAdminTrack = deleteTrack;
  window.selectAdminUser = selectUser;
  window.saveAdminTrackSettings = saveTrackSettings;
  window.resetAdminTrackSettings = resetTrackSettings;
})();
