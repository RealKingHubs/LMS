(function () {
  // ---------------------------------------------------------------------------
  // LMS search module
  // This file stays separate from app.js so search behavior is easier to maintain.
  // It only searches content that already exists inside the learner's LMS session.
  // ---------------------------------------------------------------------------

  const MAX_RESULTS = 10;
  const SEARCH_RESULT_SELECTOR = '[data-search-index]';

  const dom = {
    input: null,
    panel: null
  };

  const state = {
    results: []
  };

  document.addEventListener('DOMContentLoaded', initLmsSearch);

  // The search bar only looks through LMS content that already exists in this app.
  // It does not call the network or search outside the learner's current LMS data.
  function initLmsSearch() {
    dom.input = document.getElementById('topbarSearch');
    dom.panel = document.getElementById('topbarSearchPanel');
    if (!dom.input || !dom.panel) return;

    bindSearchEvents();
  }

  function bindSearchEvents() {
    dom.input.addEventListener('input', handleSearchInput);
    dom.input.addEventListener('focus', handleSearchFocus);
    dom.input.addEventListener('keydown', handleSearchKeyDown);
    dom.panel.addEventListener('click', handleSearchPanelClick);

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeyDown);
  }

  function handleDocumentClick(event) {
    const clickedInsidePanel = dom.panel.contains(event.target);
    const clickedInput = event.target === dom.input;

    if (!clickedInsidePanel && !clickedInput) {
      closeSearchPanel();
    }
  }

  function handleDocumentKeyDown(event) {
    if (event.key === 'Escape') {
      closeSearchPanel();
    }
  }

  function handleSearchPanelClick(event) {
    const button = event.target.closest(SEARCH_RESULT_SELECTOR);
    if (!button) return;

    const result = getResultAtIndex(Number(button.dataset.searchIndex));
    if (result) {
      activateSearchResult(result);
    }
  }

  // Basic UI handlers keep the search panel responsive without adding heavy state.
  function handleSearchInput() {
    renderSearchResults(dom.input.value);
  }

  function handleSearchFocus() {
    if (dom.input.value.trim()) {
      renderSearchResults(dom.input.value);
    }
  }

  function handleSearchKeyDown(event) {
    if (event.key !== 'Enter') return;

    const query = dom.input.value.trim();
    if (!query) return;

    const results = getSearchResults(query);
    if (!results.length) return;

    event.preventDefault();
    activateSearchResult(results[0]);
  }

  function getSearchResults(query) {
    const context = getSearchContext();
    if (!context?.track) return [];

    const searchIndex = buildSearchIndex(context);
    const normalizedQuery = normalizeSearchValue(query);

    return searchIndex
      .map(item => ({
        ...item,
        score: getSearchScore(normalizedQuery, item.searchText)
      }))
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_RESULTS);
  }

  function getSearchContext() {
    return window.getRkhSearchContext?.();
  }

  function getResultAtIndex(index) {
    return state.results[index] || null;
  }

  // Build a small in-memory index from the signed-in learner's track content.
  // This keeps the search fast and easy to understand for junior developers.
  function buildSearchIndex(context) {
    const { track, communityMessages } = context;
    const items = [];

    items.push({
      type: 'Track',
      title: `${track.label} overview`,
      subtitle: track.summary || 'Track summary and learning outcomes',
      searchText: `${track.label} ${track.summary || ''} ${track.outcomes?.join(' ') || ''} track dashboard`,
      action: () => context.openView('dashboard')
    });

    items.push(
      ...window.RKH_DATA.navItems.map(item => ({
        type: 'Page',
        title: item.label,
        subtitle: `Open the ${item.label.toLowerCase()} page for ${track.label}`,
        searchText: `${item.label} page ${track.label} ${track.summary || ''}`,
        action: () => context.openView(item.id)
      }))
    );

    track.semesters.forEach(semester => {
      items.push({
        type: 'Semester',
        title: semester.label,
        subtitle: semester.title,
        searchText: `${semester.label} ${semester.title} ${track.label} curriculum`,
        action: () => context.openView('curriculum')
      });

      semester.months.forEach(month => {
        items.push({
          type: 'Month',
          title: `${month.label} - ${month.title}`,
          subtitle: `${semester.label} • ${month.phase}`,
          searchText: `${month.label} ${month.title} ${month.summary} ${semester.label} ${track.label}`,
          action: () => context.focusCurriculumLocation?.(semester.id, month.id)
        });

        month.weeks.forEach(lesson => {
          items.push({
            type: 'Lesson',
            title: lesson.title,
            subtitle: `${semester.label} • ${month.title}`,
            searchText: `${lesson.title} ${lesson.objective} ${semester.label} ${month.title} ${track.label}`,
            action: () => context.openLesson(lesson.id)
          });
        });
      });
    });

    track.announcements.forEach(announcement => {
      items.push({
        type: 'Announcement',
        title: announcement.title,
        subtitle: announcement.date,
        searchText: `${announcement.title} ${announcement.body || ''} ${track.label} announcement update`,
        action: () => context.openView('announcements')
      });
    });

    (track.assessments || []).forEach(assessment => {
      items.push({
        type: 'Assessment',
        title: assessment.title,
        subtitle: `${assessment.semester || 'Assessment'} • ${assessment.module || 'Track task'}`,
        searchText: `${assessment.title} ${assessment.brief || ''} ${assessment.semester || ''} ${assessment.module || ''} ${track.label} assessment assignment`,
        action: () => context.openView('assessments')
      });
    });

    (track.liveClasses || []).forEach(liveClass => {
      items.push({
        type: 'Live Session',
        title: liveClass.title,
        subtitle: liveClass.date || 'Live classroom session',
        searchText: `${liveClass.title} ${liveClass.description || ''} ${liveClass.date || ''} ${track.label} live class session`,
        action: () => context.openView('live')
      });
    });

    communityMessages.forEach(message => {
      items.push({
        type: 'Community',
        title: message.authorName,
        subtitle: message.body || 'Shared an attachment in the community room',
        searchText: `${message.authorName} ${message.body || ''} ${track.label} community`,
        action: () => context.openView('community')
      });
    });

    return items;
  }

  // Relevance is intentionally simple here: exact matches, prefix matches,
  // contains matches, then word-start matches.
  function getSearchScore(query, haystack) {
    const normalizedQuery = normalizeSearchValue(query);
    const normalizedHaystack = normalizeSearchValue(haystack);

    if (!normalizedQuery || !normalizedHaystack) return 0;
    if (normalizedHaystack === normalizedQuery) return 140;
    if (normalizedHaystack.startsWith(normalizedQuery)) return 110;
    if (normalizedHaystack.includes(normalizedQuery)) return 80;

    const queryWords = normalizedQuery.split(' ').filter(Boolean);
    const haystackWords = normalizedHaystack.split(' ');
    const matchedWords = queryWords.filter(word => haystackWords.some(part => part.startsWith(word)));
    return matchedWords.length ? matchedWords.length * 22 : 0;
  }

  // Render and wire the current result set every time the query changes.
  function renderSearchResults(query) {
    const trimmed = query.trim();
    if (!trimmed) {
      closeSearchPanel();
      return;
    }

    state.results = getSearchResults(trimmed);
    dom.panel.classList.remove('hidden');
    dom.panel.innerHTML = state.results.length
      ? state.results.map((result, index) => renderSearchResult(result, index)).join('')
      : '<div class="search-empty-state">No LMS content matched that search.</div>';
  }

  // Small helpers below keep search text safe and consistent for display.
  function renderSearchResult(result, index) {
    return `
      <button type="button" class="search-result-item" data-search-index="${index}">
        <span class="search-result-type">${escapeHtml(result.type)}</span>
        <strong>${escapeHtml(result.title)}</strong>
        <span>${escapeHtml(result.subtitle)}</span>
      </button>
    `;
  }

  function activateSearchResult(result) {
    result.action();
    dom.input.value = '';
    closeSearchPanel();
  }

  function closeSearchPanel() {
    if (!dom.panel) return;
    state.results = [];
    dom.panel.classList.add('hidden');
    dom.panel.innerHTML = '';
  }

  function normalizeSearchValue(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
