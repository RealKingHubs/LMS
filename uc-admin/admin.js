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
  const TRACK_SETTINGS_TABLE = 'lms_track_settings';
  const PUBLIC_PROFILES_TABLE = 'lms_public_profiles';
  const MONTH_OVERRIDES_TABLE = 'lms_curriculum_month_overrides';
  const WEEK_OVERRIDES_TABLE = 'lms_curriculum_week_overrides';
  const ADMIN_USERS_TABLE = 'lms_admin_users';

  const state = {
    adminEmail: '',
    adminName: '',
    messages: [],
    announcements: [],
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
    curriculumWeekId: ''
  };

  const dom = {};
  let supabaseClient = null;

  document.addEventListener('DOMContentLoaded', () => {
    void initAdmin();
  });

  async function initAdmin() {
    bindDom();
    bindEvents();
    supabaseClient = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

    if (!supabaseClient) {
      showMessage(dom.adminAuthMessage, 'Supabase client could not be initialized for admin tools.', 'error');
      return;
    }

    populateTrackSelects();

    const restored = await restoreAdminSession();
    if (!restored) {
      showGate();
    }
  }

  function bindDom() {
    dom.adminGate = document.getElementById('adminGate');
    dom.adminApp = document.getElementById('adminApp');
    dom.adminIdentity = document.getElementById('adminIdentity');
    dom.adminLoginForm = document.getElementById('adminLoginForm');
    dom.adminEmail = document.getElementById('adminEmail');
    dom.adminPassword = document.getElementById('adminPassword');
    dom.adminAuthMessage = document.getElementById('adminAuthMessage');
    dom.adminOverviewCards = document.getElementById('adminOverviewCards');
    dom.announcementTrack = document.getElementById('announcementTrack');
    dom.announcementTitle = document.getElementById('announcementTitle');
    dom.announcementBody = document.getElementById('announcementBody');
    dom.announcementForm = document.getElementById('announcementForm');
    dom.announcementList = document.getElementById('announcementList');
    dom.adminAnnouncementMessage = document.getElementById('adminAnnouncementMessage');
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
    dom.curriculumWeekVideoUrl = document.getElementById('curriculumWeekVideoUrl');
    dom.curriculumWeekResources = document.getElementById('curriculumWeekResources');
    dom.resetWeekOverrideBtn = document.getElementById('resetWeekOverrideBtn');
    dom.adminCurriculumMessage = document.getElementById('adminCurriculumMessage');
    dom.trackSettingsList = document.getElementById('trackSettingsList');
    dom.adminTrackMessage = document.getElementById('adminTrackMessage');
    dom.userTrackFilter = document.getElementById('userTrackFilter');
    dom.userList = document.getElementById('userList');
    dom.userForm = document.getElementById('userForm');
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
  }

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
    dom.adminLogoutBtn.addEventListener('click', logoutAdmin);
    dom.curriculumTrackSelect.addEventListener('change', handleCurriculumTrackChange);
    dom.curriculumSemesterSelect.addEventListener('change', handleCurriculumSemesterChange);
    dom.curriculumMonthSelect.addEventListener('change', handleCurriculumMonthChange);
    dom.curriculumWeekSelect.addEventListener('change', handleCurriculumWeekChange);
    dom.curriculumMonthForm.addEventListener('submit', saveMonthOverride);
    dom.curriculumWeekForm.addEventListener('submit', saveWeekOverride);
    dom.resetMonthOverrideBtn.addEventListener('click', resetMonthOverride);
    dom.resetWeekOverrideBtn.addEventListener('click', resetWeekOverride);
    dom.userForm.addEventListener('submit', saveUserProfile);
  }

  function populateTrackSelects() {
    const tracks = Object.keys(state.trackSettingsById).length ? getResolvedTracks() : Object.values(window.RKH_DATA.tracks);
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
    dom.userTrack.innerHTML = trackOnlyOptions;

    if (!state.curriculumTrackId) {
      state.curriculumTrackId = Object.keys(window.RKH_DATA.tracks)[0] || '';
    }

    dom.messageTrackFilter.value = state.messageTrackFilter;
    dom.userTrackFilter.value = state.userTrackFilter;
    dom.curriculumTrackSelect.value = state.curriculumTrackId;
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
      showMessage(dom.adminAuthMessage, error.message, 'error');
      return;
    }

    const verified = await verifyAdminSession();
    if (!verified) {
      await supabaseClient.auth.signOut();
      showMessage(dom.adminAuthMessage, 'This authenticated account is not registered as an LMS admin.', 'error');
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
      fetchPublicProfiles(),
      fetchTrackSettings(),
      fetchCurriculumOverrides()
    ]);
    renderOverview();
    renderAnnouncements();
    renderMessages();
    renderTrackSettings();
    renderCurriculumEditor();
    renderUsers();
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
      supabaseClient.from(WEEK_OVERRIDES_TABLE).select('week_id, track_id, semester_id, month_id, title, objective, type, video_url, resources')
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
        resources: Array.isArray(item.resources) ? item.resources : []
      }
    ]));

    hideMessage(dom.adminCurriculumMessage);
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
    return Object.values(window.RKH_DATA.tracks)
      .map(track => getResolvedTrack(track.id))
      .sort((left, right) => {
        const leftOrder = Number.isFinite(left.sortOrder) ? left.sortOrder : 0;
        const rightOrder = Number.isFinite(right.sortOrder) ? right.sortOrder : 0;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.label.localeCompare(right.label);
      });
  }

  function getResolvedTrack(trackId) {
    const baseTrack = window.RKH_DATA.tracks[trackId];
    if (!baseTrack) return null;

    const settings = state.trackSettingsById[trackId] || {};
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
                videoUrl: weekOverride.videoUrl || week.videoUrl,
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

  function renderTrackSettings() {
    const tracks = getResolvedTracks();
    dom.trackSettingsList.innerHTML = tracks.map(track => {
      const outcomes = track.outcomes.join('\n');
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
    dom.curriculumWeekVideoUrl.value = week?.videoUrl || '';
    dom.curriculumWeekResources.value = Array.isArray(week?.resources) ? week.resources.join('\n') : '';
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

    const resources = dom.curriculumWeekResources.value
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);

    const { error } = await supabaseClient.from(WEEK_OVERRIDES_TABLE).upsert({
      week_id: week.id,
      track_id: track.id,
      semester_id: semester.id,
      month_id: month.id,
      title: dom.curriculumWeekTitle.value.trim(),
      objective: dom.curriculumWeekObjective.value.trim(),
      type: dom.curriculumWeekType.value.trim(),
      video_url: dom.curriculumWeekVideoUrl.value.trim(),
      resources,
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

  async function saveTrackSettings(trackId) {
    const baseTrack = window.RKH_DATA.tracks[trackId];
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
  window.selectAdminUser = selectUser;
  window.saveAdminTrackSettings = saveTrackSettings;
  window.resetAdminTrackSettings = resetTrackSettings;
})();
