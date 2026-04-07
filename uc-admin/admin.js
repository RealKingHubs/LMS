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
  const ADMIN_SESSION_KEY = 'rkh_uc_admin_session';

  // IMPORTANT:
  // This is only a frontend gate. It keeps the page separate and less discoverable,
  // but it is not a true backend security boundary. For production-grade protection,
  // the admin actions should be moved behind a server-side auth layer.
  const ADMIN_ALLOWED_EMAILS = ['ucking480@gmail.com'];
  const ADMIN_ACCESS_KEY = 'RKH-UC-ADMIN-2026';

  const state = {
    adminEmail: '',
    messages: [],
    announcements: [],
    messageTrackFilter: 'all'
  };

  const dom = {};
  let supabaseClient = null;

  document.addEventListener('DOMContentLoaded', initAdmin);

  function initAdmin() {
    bindDom();
    populateTrackSelects();
    bindEvents();
    supabaseClient = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

    const storedEmail = localStorage.getItem(ADMIN_SESSION_KEY);
    if (storedEmail && ADMIN_ALLOWED_EMAILS.includes(storedEmail)) {
      state.adminEmail = storedEmail;
      openAdminApp();
      return;
    }

    showGate();
  }

  function bindDom() {
    dom.adminGate = document.getElementById('adminGate');
    dom.adminApp = document.getElementById('adminApp');
    dom.adminLoginForm = document.getElementById('adminLoginForm');
    dom.adminEmail = document.getElementById('adminEmail');
    dom.adminAccessKey = document.getElementById('adminAccessKey');
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
  }

  function bindEvents() {
    dom.adminLoginForm.addEventListener('submit', handleAdminLogin);
    dom.announcementForm.addEventListener('submit', handleAnnouncementSubmit);
    dom.messageTrackFilter.addEventListener('change', () => {
      state.messageTrackFilter = dom.messageTrackFilter.value;
      renderMessages();
    });
    dom.deleteFilteredMessagesBtn.addEventListener('click', deleteFilteredMessages);
    dom.deleteAllMessagesBtn.addEventListener('click', deleteAllMessages);
    dom.refreshAdminDataBtn.addEventListener('click', refreshAdminData);
    dom.adminLogoutBtn.addEventListener('click', logoutAdmin);
  }

  function populateTrackSelects() {
    const trackOptions = [
      '<option value="all">All tracks</option>',
      ...Object.values(window.RKH_DATA.tracks).map(track => `<option value="${track.id}">${track.label}</option>`)
    ].join('');

    dom.messageTrackFilter.innerHTML = trackOptions;
    dom.announcementTrack.innerHTML = Object.values(window.RKH_DATA.tracks)
      .map(track => `<option value="${track.id}">${track.label}</option>`)
      .join('');
  }

  function handleAdminLogin(event) {
    event.preventDefault();

    const email = dom.adminEmail.value.trim().toLowerCase();
    const accessKey = dom.adminAccessKey.value.trim();

    if (!ADMIN_ALLOWED_EMAILS.includes(email) || accessKey !== ADMIN_ACCESS_KEY) {
      showMessage(dom.adminAuthMessage, 'Only the configured admin account can access this page.', 'error');
      return;
    }

    state.adminEmail = email;
    localStorage.setItem(ADMIN_SESSION_KEY, email);
    openAdminApp();
  }

  async function openAdminApp() {
    if (!supabaseClient) {
      showMessage(dom.adminAuthMessage, 'Supabase client could not be initialized for admin tools.', 'error');
      showGate();
      return;
    }

    dom.adminGate.classList.add('hidden');
    dom.adminApp.classList.remove('hidden');
    await refreshAdminData();
  }

  function showGate() {
    dom.adminGate.classList.remove('hidden');
    dom.adminApp.classList.add('hidden');
  }

  function logoutAdmin() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    state.adminEmail = '';
    showGate();
  }

  async function refreshAdminData() {
    await Promise.all([fetchMessages(), fetchAnnouncements()]);
    renderOverview();
    renderAnnouncements();
    renderMessages();
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

  function renderOverview() {
    const totalTracks = Object.keys(window.RKH_DATA.tracks).length;
    const totalSemesters = Object.values(window.RKH_DATA.tracks).reduce((sum, track) => sum + track.semesters.length, 0);
    const totalWeeks = Object.values(window.RKH_DATA.tracks)
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
        <span>Admin-published announcements currently stored in Supabase.</span>
      </article>
      <article class="overview-card">
        <strong>${totalTracks}</strong>
        <span>Career tracks configured in the LMS data layer.</span>
      </article>
      <article class="overview-card">
        <strong>${totalSemesters} / ${totalWeeks}</strong>
        <span>Total semesters and weekly curriculum items currently mapped in the LMS.</span>
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
          <span class="pill">${escapeHtml(window.RKH_DATA.tracks[item.trackId]?.label || item.trackId)}</span>
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
          <span class="pill">${escapeHtml(window.RKH_DATA.tracks[message.trackId]?.label || message.trackId)}</span>
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
      : `${window.RKH_DATA.tracks[state.messageTrackFilter]?.label || state.messageTrackFilter} messages`;

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

  window.deleteAdminMessage = deleteMessage;
  window.deleteAdminAnnouncement = deleteAnnouncement;
})();
