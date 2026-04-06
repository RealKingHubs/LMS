(function () {
  const MAX_RESULTS = 8;

  const dom = {
    input: null,
    panel: null
  };

  document.addEventListener('DOMContentLoaded', initLmsSearch);

  // The search bar only looks through LMS content that already exists in this app.
  // It does not call the network or search outside the learner's current LMS data.
  function initLmsSearch() {
    dom.input = document.getElementById('topbarSearch');
    dom.panel = document.getElementById('topbarSearchPanel');
    if (!dom.input || !dom.panel) return;

    dom.input.addEventListener('input', handleSearchInput);
    dom.input.addEventListener('focus', handleSearchFocus);
    dom.input.addEventListener('keydown', handleSearchKeyDown);

    document.addEventListener('click', event => {
      if (!dom.panel.contains(event.target) && event.target !== dom.input) {
        closeSearchPanel();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeSearchPanel();
      }
    });
  }

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
    const context = window.getRkhSearchContext?.();
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

  // Build a small in-memory index from the signed-in learner's track content.
  // This keeps the search fast and easy to understand for junior developers.
  function buildSearchIndex(context) {
    const { track, communityMessages } = context;
    const items = [];

    items.push(
      ...window.RKH_DATA.navItems.map(item => ({
        type: 'Page',
        title: item.label,
        subtitle: `Open the ${item.label.toLowerCase()} page`,
        searchText: `${item.label} page ${track.label}`,
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
          subtitle: `${semester.label} · ${month.phase}`,
          searchText: `${month.label} ${month.title} ${month.summary} ${semester.label} ${track.label}`,
          action: () => context.focusCurriculumLocation?.(semester.id, month.id)
        });

        month.weeks.forEach(lesson => {
          items.push({
            type: 'Lesson',
            title: lesson.title,
            subtitle: `${semester.label} · ${month.title}`,
            searchText: `${lesson.title} ${lesson.objective} ${semester.label} ${month.title} ${track.label}`,
            action: () => context.openLesson(lesson.id)
          });
        });
      });
    });

    track.assessments.forEach(assessment => {
      items.push({
        type: 'Assessment',
        title: assessment.title,
        subtitle: `${assessment.module} · due ${formatDateForSearch(assessment.dueAt)}`,
        searchText: `${assessment.title} ${assessment.module} ${assessment.brief} ${track.label}`,
        action: () => context.openView('assessments')
      });
    });

    track.liveClasses.forEach(liveClass => {
      items.push({
        type: 'Live class',
        title: liveClass.title,
        subtitle: `${liveClass.instructor} · ${liveClass.schedule}`,
        searchText: `${liveClass.title} ${liveClass.instructor} ${liveClass.schedule} ${track.label}`,
        action: () => context.openLiveClass(liveClass.id)
      });
    });

    track.announcements.forEach(announcement => {
      items.push({
        type: 'Announcement',
        title: announcement.title,
        subtitle: announcement.date,
        searchText: `${announcement.title} ${announcement.body} ${track.label}`,
        action: () => context.openView('announcements')
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

  function getSearchScore(query, haystack) {
    if (!query || !haystack) return 0;
    if (haystack === query) return 120;
    if (haystack.startsWith(query)) return 100;
    if (haystack.includes(query)) return 70;

    const queryWords = query.split(' ').filter(Boolean);
    const haystackWords = haystack.split(' ');
    const matchedWords = queryWords.filter(word => haystackWords.some(part => part.startsWith(word)));
    return matchedWords.length ? matchedWords.length * 20 : 0;
  }

  function renderSearchResults(query) {
    const trimmed = query.trim();
    if (!trimmed) {
      closeSearchPanel();
      return;
    }

    const results = getSearchResults(trimmed);
    dom.panel.classList.remove('hidden');
    dom.panel.innerHTML = results.length
      ? results.map((result, index) => renderSearchResult(result, index)).join('')
      : '<div class="search-empty-state">No LMS content matched that search.</div>';

    dom.panel.querySelectorAll('[data-search-index]').forEach(button => {
      button.addEventListener('click', () => {
        const result = results[Number(button.dataset.searchIndex)];
        if (result) activateSearchResult(result);
      });
    });
  }

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

  function formatDateForSearch(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'date unavailable';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
