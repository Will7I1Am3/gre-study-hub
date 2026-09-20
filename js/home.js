// GRE Study Hub — home page: stats + streak/XP header + reset.

(function () {
  const el = {
    gamifyHeader: document.getElementById('gamify-header'),
    levelPill: document.getElementById('level-pill'),
    verbalKnown: document.getElementById('stat-verbal-known'),
    quantKnown: document.getElementById('stat-quant-known'),
    verbalBest: document.getElementById('stat-verbal-best'),
    quantBest: document.getElementById('stat-quant-best'),
    resetBtn: document.getElementById('reset-all-btn')
  };

  function loadStats() {
    let vKnown = {}, qKnown = {}, vBest = null, qBest = null;
    try { vKnown = JSON.parse(localStorage.getItem('gre_verbal_known') || '{}'); } catch (e) {}
    try { qKnown = JSON.parse(localStorage.getItem('gre_quant_known') || '{}'); } catch (e) {}
    try { vBest = JSON.parse(localStorage.getItem('gre_verbal_best') || 'null'); } catch (e) {}
    try { qBest = JSON.parse(localStorage.getItem('gre_quant_best') || 'null'); } catch (e) {}

    el.verbalKnown.textContent = Object.keys(vKnown).length + ' / ' + VOCAB.length;
    el.quantKnown.textContent = Object.keys(qKnown).length + ' / ' + QUANT_CONCEPTS.length;
    el.verbalBest.textContent = vBest ? vBest.score + ' / ' + vBest.total : '--';
    el.quantBest.textContent = qBest ? qBest.score + ' / ' + qBest.total : '--';
  }

  function refreshHeader() {
    const { xp } = renderGamifyHeader(el.gamifyHeader);
    el.levelPill.textContent = levelTitle(xp);
  }

  el.resetBtn.addEventListener('click', () => {
    if (!window.confirm('Reset ALL saved progress (vocabulary, quant concepts, best quiz scores, XP, and streak)? This cannot be undone.')) return;
    ['gre_verbal_known', 'gre_quant_known', 'gre_verbal_best', 'gre_quant_best', 'gre_xp', 'gre_streak'].forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    refreshHeader();
    loadStats();
  });

  refreshHeader();
  loadStats();
})();
