// GRE Study Hub — generic flashcard deck logic.
// Reads its data/labels from window.FLASHCARDS_CONFIG, set inline in each HTML page.

(function () {
  const cfg = window.FLASHCARDS_CONFIG;
  const CARDS = cfg.cards; // array of [frontMain, frontSub, backMain, backSub]
  const STORAGE_KEY = cfg.storageKey;

  const state = {
    known: {},
    deck: [],
    pos: 0,
    flipped: false,
    includeKnown: false,
    viewMode: 'card',
    searchQuery: '',
    expanded: {}
  };

  let burstTimer = null;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function buildDeck(known, includeKnown) {
    let idxs = CARDS.map((_, i) => i);
    if (!includeKnown) idxs = idxs.filter((i) => !known[i]);
    if (idxs.length === 0) idxs = CARDS.map((_, i) => i);
    return shuffle(idxs);
  }

  function loadKnown() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveKnown(known) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(known)); } catch (e) {}
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  // ---- DOM refs ----
  const el = {
    frontLabel: document.getElementById('front-label'),
    frontMain: document.getElementById('front-main'),
    frontSub: document.getElementById('front-sub'),
    tapHint: document.getElementById('tap-hint'),
    backLabel: document.getElementById('back-label'),
    backMain: document.getElementById('back-main'),
    backSub: document.getElementById('back-sub'),
    flashCard: document.getElementById('flash-card'),
    flipBtn: document.getElementById('flip-btn'),
    deckPos: document.getElementById('deck-pos'),
    progressLine: document.getElementById('progress-line'),
    progressFill: document.getElementById('progress-fill'),
    markActions: document.getElementById('mark-actions'),
    markHint: document.getElementById('mark-hint'),
    markKnownBtn: document.getElementById('mark-known-btn'),
    markLearningBtn: document.getElementById('mark-learning-btn'),
    prevBtn: document.getElementById('prev-btn'),
    skipBtn: document.getElementById('skip-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    includeKnownCb: document.getElementById('include-known-cb'),
    includeKnownLabel: document.getElementById('include-known-label'),
    resetBtn: document.getElementById('reset-btn'),
    burst: document.getElementById('burst'),
    gamifyHeader: document.getElementById('gamify-header'),

    viewCardBtn: document.getElementById('view-card-btn'),
    viewListBtn: document.getElementById('view-list-btn'),
    cardView: document.getElementById('card-view'),
    listView: document.getElementById('list-view'),
    listSearch: document.getElementById('list-search'),
    listCount: document.getElementById('list-count'),
    wordList: document.getElementById('word-list'),
    wordListEmpty: document.getElementById('word-list-empty')
  };

  el.frontLabel.textContent = cfg.frontLabel;
  el.frontMain.style.fontSize = cfg.frontMainSize + 'px';
  el.tapHint.textContent = 'Tap to reveal ' + cfg.backLabelLower;
  el.includeKnownLabel.textContent = 'Include already-known ' + cfg.unitPlural + ' in rotation';
  if (el.listSearch) el.listSearch.placeholder = 'Search ' + cfg.unitPlural + '…';

  function render() {
    const cardIdx = state.deck[state.pos];
    const card = CARDS[cardIdx];
    const knownCount = Object.keys(state.known).length;
    const total = CARDS.length;
    const pct = Math.round((knownCount / total) * 100);

    el.deckPos.textContent = 'Card ' + (state.pos + 1) + ' of ' + state.deck.length;
    el.progressLine.textContent = knownCount + ' of ' + total + ' ' + cfg.unitPlural + ' known (' + pct + '%)';
    el.progressFill.style.width = pct + '%';

    el.frontMain.textContent = card[0];
    el.frontSub.textContent = card[1];
    el.backLabel.textContent = card[0];
    el.backMain.textContent = card[2];
    el.backSub.textContent = card[3];

    el.flashCard.classList.toggle('flipped', state.flipped);
    el.markActions.classList.toggle('hidden', !state.flipped);
    el.markHint.classList.toggle('hidden', state.flipped);
    el.includeKnownCb.checked = state.includeKnown;
  }

  function flip() {
    state.flipped = !state.flipped;
    render();
  }

  function advance(knownOverride) {
    const known = knownOverride || state.known;
    let nextPos = state.pos + 1;
    let deck = state.deck;
    if (nextPos >= deck.length) {
      deck = buildDeck(known, state.includeKnown);
      nextPos = 0;
    }
    state.known = known;
    state.deck = deck;
    state.pos = nextPos;
    state.flipped = false;
    render();
  }

  function mark(isKnown) {
    const cardIdx = state.deck[state.pos];
    const newKnown = Object.assign({}, state.known);
    if (isKnown) {
      newKnown[cardIdx] = true;
      addXp(5);
      if (burstTimer) clearTimeout(burstTimer);
      el.burst.classList.remove('hidden');
      // restart the CSS animation
      el.burst.style.animation = 'none';
      void el.burst.offsetWidth;
      el.burst.style.animation = '';
      burstTimer = setTimeout(() => el.burst.classList.add('hidden'), 650);
      renderGamifyHeader(el.gamifyHeader);
    } else {
      delete newKnown[cardIdx];
    }
    saveKnown(newKnown);
    advance(newKnown);
  }

  el.flipBtn.addEventListener('click', flip);
  el.markKnownBtn.addEventListener('click', () => mark(true));
  el.markLearningBtn.addEventListener('click', () => mark(false));
  el.skipBtn.addEventListener('click', () => advance());
  el.prevBtn.addEventListener('click', () => {
    state.pos = state.pos > 0 ? state.pos - 1 : 0;
    state.flipped = false;
    render();
  });
  el.shuffleBtn.addEventListener('click', () => {
    state.deck = buildDeck(state.known, state.includeKnown);
    state.pos = 0;
    state.flipped = false;
    render();
  });
  el.includeKnownCb.addEventListener('change', () => {
    state.includeKnown = el.includeKnownCb.checked;
    state.deck = buildDeck(state.known, state.includeKnown);
    state.pos = 0;
    state.flipped = false;
    render();
  });
  el.resetBtn.addEventListener('click', () => {
    if (!window.confirm('Reset all progress for this deck? This cannot be undone.')) return;
    state.known = {};
    localStorage.removeItem(STORAGE_KEY);
    state.deck = buildDeck({}, state.includeKnown);
    state.pos = 0;
    state.flipped = false;
    render();
    if (state.viewMode === 'list') renderList();
  });

  // ---- full-list browse mode ----
  function setViewMode(mode) {
    state.viewMode = mode;
    if (el.viewCardBtn) el.viewCardBtn.classList.toggle('active', mode === 'card');
    if (el.viewListBtn) el.viewListBtn.classList.toggle('active', mode === 'list');
    if (el.cardView) el.cardView.classList.toggle('hidden', mode !== 'card');
    if (el.listView) el.listView.classList.toggle('hidden', mode !== 'list');
    if (mode === 'card') render();
    else renderList();
  }

  function toggleRowKnown(idx, isKnown) {
    const newKnown = Object.assign({}, state.known);
    if (isKnown) newKnown[idx] = true;
    else delete newKnown[idx];
    state.known = newKnown;
    saveKnown(newKnown);
  }

  function renderList() {
    if (!el.wordList) return;
    const q = state.searchQuery.trim().toLowerCase();
    const idxs = CARDS.map((_, i) => i).filter((i) => {
      if (!q) return true;
      const c = CARDS[i];
      return (c[0] + ' ' + (c[1] || '') + ' ' + (c[2] || '')).toLowerCase().indexOf(q) !== -1;
    });
    el.listCount.textContent = idxs.length + ' of ' + CARDS.length + ' ' + cfg.unitPlural;
    el.wordListEmpty.classList.toggle('hidden', idxs.length > 0);
    el.wordList.innerHTML = '';
    idxs.forEach((i) => {
      const c = CARDS[i];
      const isKnown = !!state.known[i];
      const isExpanded = !!state.expanded[i];
      const row = document.createElement('div');
      row.className = 'word-row' + (isKnown ? ' known' : '');
      row.innerHTML =
        '<div class="word-row-top">' +
        '<label class="word-check" title="Mark known"><input type="checkbox"' + (isKnown ? ' checked' : '') + '></label>' +
        '<div class="word-row-main">' +
        '<span class="word-row-title">' + escapeHtml(c[0]) + '</span>' +
        (c[1] ? '<span class="word-row-sub">' + escapeHtml(c[1]) + '</span>' : '') +
        '</div>' +
        '<span class="word-row-caret">' + (isExpanded ? '▲' : '▼') + '</span>' +
        '</div>' +
        '<div class="word-row-detail' + (isExpanded ? '' : ' hidden') + '">' +
        '<div>' + escapeHtml(c[2]) + '</div>' +
        (c[3] ? '<div class="word-row-example">' + escapeHtml(c[3]) + '</div>' : '') +
        '</div>';
      const top = row.querySelector('.word-row-top');
      const cb = row.querySelector('input[type="checkbox"]');
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleRowKnown(i, cb.checked);
        row.classList.toggle('known', cb.checked);
        if (cb.checked) { addXp(5); renderGamifyHeader(el.gamifyHeader); }
      });
      top.addEventListener('click', (e) => {
        if (e.target === cb) return;
        state.expanded[i] = !state.expanded[i];
        renderList();
      });
      el.wordList.appendChild(row);
    });
  }

  if (el.viewCardBtn) el.viewCardBtn.addEventListener('click', () => setViewMode('card'));
  if (el.viewListBtn) el.viewListBtn.addEventListener('click', () => setViewMode('list'));
  if (el.listSearch) {
    el.listSearch.addEventListener('input', () => {
      state.searchQuery = el.listSearch.value;
      renderList();
    });
  }

  // ---- init ----
  renderGamifyHeader(el.gamifyHeader);
  state.known = loadKnown();
  state.deck = buildDeck(state.known, false);
  render();
})();
