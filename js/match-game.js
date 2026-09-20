// GRE Study Hub — vocabulary Matching Game.
// Reads its data/settings from window.MATCH_CONFIG, set inline in the HTML page.

(function () {
  const cfg = window.MATCH_CONFIG;
  const VOCAB_SRC = cfg.vocab;
  const PAIRS = cfg.pairsPerRound || 8;
  const BEST_KEY = cfg.bestKey || 'gre_match_best';
  const XP_PER_MATCH = 3;

  const state = {
    tiles: [],
    selected: [],
    matchedCount: 0,
    mistakes: 0,
    rounds: 0,
    startedAt: 0,
    elapsedTimerId: null,
    finished: false,
    locked: false
  };

  const el = {
    gamifyHeader: document.getElementById('gamify-header'),
    matchedStat: document.getElementById('stat-matched'),
    mistakesStat: document.getElementById('stat-mistakes'),
    timeStat: document.getElementById('stat-time'),
    bestLine: document.getElementById('best-line'),
    banner: document.getElementById('match-banner'),
    bannerText: document.getElementById('banner-text'),
    grid: document.getElementById('match-grid'),
    newRoundBtn: document.getElementById('new-round-btn')
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function pickWords(n) {
    return shuffle(VOCAB_SRC.slice()).slice(0, n);
  }

  function fmtTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function loadBest() {
    let best = null;
    try { best = JSON.parse(localStorage.getItem(BEST_KEY) || 'null'); } catch (e) {}
    return best;
  }

  function saveBestIfBetter(seconds, mistakes) {
    const best = loadBest();
    if (!best || seconds < best.seconds || (seconds === best.seconds && mistakes < best.mistakes)) {
      try { localStorage.setItem(BEST_KEY, JSON.stringify({ seconds, mistakes })); } catch (e) {}
      return true;
    }
    return false;
  }

  function renderBest() {
    const best = loadBest();
    el.bestLine.textContent = 'Best round: ' + (best ? fmtTime(best.seconds) + ' · ' + best.mistakes + ' mistake' + (best.mistakes === 1 ? '' : 's') : 'Not set yet');
  }

  function startElapsedTimer() {
    if (state.elapsedTimerId) clearInterval(state.elapsedTimerId);
    state.startedAt = Date.now();
    el.timeStat.textContent = '0:00';
    state.elapsedTimerId = setInterval(() => {
      const secs = Math.floor((Date.now() - state.startedAt) / 1000);
      el.timeStat.textContent = fmtTime(secs);
    }, 250);
  }

  function stopElapsedTimer() {
    if (state.elapsedTimerId) { clearInterval(state.elapsedTimerId); state.elapsedTimerId = null; }
  }

  function newRound() {
    stopElapsedTimer();
    state.finished = false;
    state.locked = false;
    state.selected = [];
    state.matchedCount = 0;
    state.mistakes = 0;

    const words = pickWords(PAIRS);
    let tiles = [];
    words.forEach((w, i) => {
      tiles.push({ id: 'w' + i, kind: 'word', text: w.word, pairId: i, matched: false });
      tiles.push({ id: 'd' + i, kind: 'def', text: w.def, pairId: i, matched: false });
    });
    tiles = shuffle(tiles);
    state.tiles = tiles;

    el.banner.classList.add('hidden');
    el.matchedStat.textContent = '0 / ' + PAIRS;
    el.mistakesStat.textContent = '0';
    renderBest();
    renderGrid();
    startElapsedTimer();
  }

  function renderGrid() {
    el.grid.innerHTML = '';
    state.tiles.forEach((tile) => {
      const btn = document.createElement('button');
      let cls = 'match-tile ' + tile.kind;
      if (tile.matched) cls += ' matched';
      if (state.selected.indexOf(tile.id) !== -1) cls += ' selected';
      if (tile.wrongFlash) cls += ' wrong';
      btn.className = cls;
      btn.textContent = tile.text;
      btn.disabled = tile.matched;
      btn.addEventListener('click', () => onTileClick(tile.id));
      el.grid.appendChild(btn);
    });
  }

  function onTileClick(id) {
    if (state.locked || state.finished) return;
    const tile = state.tiles.find((t) => t.id === id);
    if (!tile || tile.matched || state.selected.indexOf(id) !== -1) return;
    if (state.selected.length >= 2) return;

    state.selected.push(id);
    renderGrid();

    if (state.selected.length === 2) {
      state.locked = true;
      const [id1, id2] = state.selected;
      const t1 = state.tiles.find((t) => t.id === id1);
      const t2 = state.tiles.find((t) => t.id === id2);
      const isMatch = t1.pairId === t2.pairId && t1.kind !== t2.kind;

      if (isMatch) {
        setTimeout(() => {
          t1.matched = true;
          t2.matched = true;
          state.matchedCount += 1;
          state.selected = [];
          state.locked = false;
          addXp(XP_PER_MATCH);
          renderGamifyHeader(el.gamifyHeader);
          el.matchedStat.textContent = state.matchedCount + ' / ' + PAIRS;
          renderGrid();
          if (state.matchedCount === PAIRS) finishRound();
        }, 220);
      } else {
        t1.wrongFlash = true;
        t2.wrongFlash = true;
        state.mistakes += 1;
        el.mistakesStat.textContent = String(state.mistakes);
        renderGrid();
        setTimeout(() => {
          t1.wrongFlash = false;
          t2.wrongFlash = false;
          state.selected = [];
          state.locked = false;
          renderGrid();
        }, 550);
      }
    }
  }

  function finishRound() {
    state.finished = true;
    stopElapsedTimer();
    const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
    const isNewBest = saveBestIfBetter(seconds, state.mistakes);
    renderBest();
    el.bannerText.innerHTML = 'Round complete in <strong>' + fmtTime(seconds) + '</strong> with <strong>' + state.mistakes + '</strong> mistake' + (state.mistakes === 1 ? '' : 's') + '.' + (isNewBest ? ' New best time!' : '') + ' +' + (PAIRS * XP_PER_MATCH) + ' XP earned.';
    el.banner.classList.remove('hidden');
  }

  el.newRoundBtn.addEventListener('click', newRound);

  // ---- init ----
  renderGamifyHeader(el.gamifyHeader);
  newRound();
})();
