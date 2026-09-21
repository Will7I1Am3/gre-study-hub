// GRE Study Hub — full-length mock exam engine.
// Simulates the current (post-Sept-2023) GRE General Test structure minus
// Analytical Writing: 4 timed sections (Verbal x2, Quant x2), no breaks,
// no per-question feedback until the whole exam is finished. Scores are
// an ESTIMATE on the official 130-170 scale (ETS does not publish its
// real raw-to-scaled conversion), clearly labeled as such in the UI.

(function () {
  const HISTORY_KEY = 'gre_mock_history';
  const HISTORY_MAX = 5;
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Section definitions mirror ETS's published structure (question counts +
  // per-section time). Question-type composition within each section is our
  // own reasonable approximation (ETS doesn't publish an exact breakdown) --
  // weighted toward Reading Comprehension / Problem Solving, like the real
  // test, using only the three types each subject's question bank supports.
  const SECTION_DEFS = {
    'verbal-1': {
      id: 'verbal-1', subject: 'verbal', label: 'Verbal Reasoning', sub: 'Section 1',
      minutes: 18,
      composition: { 'text-completion': 4, 'sentence-equivalence': 3, 'reading-comprehension': 5 }
    },
    'verbal-2': {
      id: 'verbal-2', subject: 'verbal', label: 'Verbal Reasoning', sub: 'Section 2',
      minutes: 23,
      composition: { 'text-completion': 5, 'sentence-equivalence': 4, 'reading-comprehension': 6 }
    },
    'quant-1': {
      id: 'quant-1', subject: 'quant', label: 'Quantitative Reasoning', sub: 'Section 1',
      minutes: 21,
      composition: { 'problem-solving': 4, 'quantitative-comparison': 4, 'data-interpretation': 4 }
    },
    'quant-2': {
      id: 'quant-2', subject: 'quant', label: 'Quantitative Reasoning', sub: 'Section 2',
      minutes: 26,
      composition: { 'problem-solving': 6, 'quantitative-comparison': 5, 'data-interpretation': 4 }
    }
  };
  const TYPE_LABELS = {
    'text-completion': 'Text Completion',
    'sentence-equivalence': 'Sentence Equivalence',
    'reading-comprehension': 'Reading Comprehension',
    'problem-solving': 'Problem Solving',
    'quantitative-comparison': 'Quantitative Comparison',
    'data-interpretation': 'Data Interpretation'
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // Picks `composition` question indices out of `questions`, leaning ~70%
  // toward the standard-difficulty sets (1-3) and ~30% toward the Hard sets
  // (4-6), skipping anything already used elsewhere in this exam.
  function pickQuestions(questions, composition, excludeSet) {
    const byType = {};
    questions.forEach((q, i) => {
      if (excludeSet.has(i)) return;
      if (!byType[q.type]) byType[q.type] = { standard: [], hard: [] };
      (q.set <= 3 ? byType[q.type].standard : byType[q.type].hard).push(i);
    });
    let result = [];
    Object.keys(composition).forEach((type) => {
      const need = composition[type];
      const bucket = byType[type] || { standard: [], hard: [] };
      const standard = shuffle(bucket.standard.slice());
      const hard = shuffle(bucket.hard.slice());
      const wantHard = Math.round(need * 0.3);
      let picked = hard.slice(0, wantHard).concat(standard.slice(0, need - wantHard));
      if (picked.length < need) {
        const leftover = standard.slice(need - wantHard).concat(hard.slice(wantHard));
        picked = picked.concat(leftover);
      }
      picked = picked.slice(0, need);
      picked.forEach((i) => { result.push(i); excludeSet.add(i); });
    });
    return shuffle(result);
  }

  // Approximate raw-percent -> scaled-score (130-170) curve, anchored to
  // roughly known GRE score-distribution shape. Not ETS's real formula.
  function scaledScore(rawPct) {
    const anchors = [[0, 130], [20, 138], [40, 146], [50, 150], [60, 154], [70, 158], [80, 162], [90, 166], [100, 170]];
    if (rawPct <= anchors[0][0]) return anchors[0][1];
    if (rawPct >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
    for (let i = 0; i < anchors.length - 1; i++) {
      const x0 = anchors[i][0], y0 = anchors[i][1], x1 = anchors[i + 1][0], y1 = anchors[i + 1][1];
      if (rawPct >= x0 && rawPct <= x1) {
        const t = (rawPct - x0) / (x1 - x0);
        return Math.round(y0 + t * (y1 - y0));
      }
    }
    return 150;
  }

  // Rough percentile estimate anchored to ETS-published percentile points
  // (150 -> ~48th/38th, 160 -> ~86th/76th, 165 -> ~96th/89th), interpolated.
  function estimatePercentile(scaled, subject) {
    const table = subject === 'verbal'
      ? [[130, 1], [140, 15], [145, 28], [150, 48], [155, 68], [160, 86], [165, 96], [170, 99]]
      : [[130, 1], [140, 10], [145, 20], [150, 38], [155, 58], [160, 76], [165, 89], [170, 97]];
    if (scaled <= table[0][0]) return table[0][1];
    if (scaled >= table[table.length - 1][0]) return table[table.length - 1][1];
    for (let i = 0; i < table.length - 1; i++) {
      const x0 = table[i][0], y0 = table[i][1], x1 = table[i + 1][0], y1 = table[i + 1][1];
      if (scaled >= x0 && scaled <= x1) {
        const t = (scaled - x0) / (x1 - x0);
        return Math.round(y0 + t * (y1 - y0));
      }
    }
    return 50;
  }

  function isAnswerCorrect(q, sel) {
    if (!sel || !sel.length) return false;
    const a = sel.slice().sort();
    const b = q.correct.slice().sort();
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  function formatAnswer(indices, choices) {
    if (!indices || indices.length === 0) return 'No answer selected';
    return indices.map((i) => LETTERS[i] + '. ' + choices[i]).join('  /  ');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveAttemptToHistory(record) {
    try {
      const hist = loadHistory();
      hist.unshift(record);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, HISTORY_MAX)));
    } catch (e) {}
  }
  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  // ---- state ----
  const state = {
    screen: 'start',
    sections: [],
    sectionIdx: 0,
    qIdx: 0,
    timeRemaining: 0,
    timerId: null,
    reviewingPast: false,
    resultData: null
  };

  // ---- DOM refs ----
  const el = {
    gamifyHeader: document.getElementById('gamify-header'),

    screenStart: document.getElementById('screen-start'),
    screenExam: document.getElementById('screen-exam'),
    screenResults: document.getElementById('screen-results'),

    historyList: document.getElementById('mock-history-list'),
    historyEmpty: document.getElementById('mock-history-empty'),
    startExamBtn: document.getElementById('start-exam-btn'),

    examSectionName: document.getElementById('exam-section-name'),
    examSectionSub: document.getElementById('exam-section-sub'),
    examTimer: document.getElementById('exam-timer'),
    examNavGrid: document.getElementById('exam-nav-grid'),
    examContextBox: document.getElementById('exam-context-box'),
    examContextLabel: document.getElementById('exam-context-label'),
    examContextText: document.getElementById('exam-context-text'),
    examPromptText: document.getElementById('exam-prompt-text'),
    examSelectHint: document.getElementById('exam-select-hint'),
    examChoicesContainer: document.getElementById('exam-choices-container'),
    examPrevBtn: document.getElementById('exam-prev-btn'),
    examNextBtn: document.getElementById('exam-next-btn'),
    examEndSectionBtn: document.getElementById('exam-end-section-btn'),

    scoreVerbalBig: document.getElementById('score-verbal-big'),
    scoreVerbalRaw: document.getElementById('score-verbal-raw'),
    scoreVerbalPct: document.getElementById('score-verbal-pct'),
    scoreQuantBig: document.getElementById('score-quant-big'),
    scoreQuantRaw: document.getElementById('score-quant-raw'),
    scoreQuantPct: document.getElementById('score-quant-pct'),
    examXpEarnedText: document.getElementById('exam-xp-earned-text'),
    examReviewList: document.getElementById('exam-review-list'),
    examRestartBtn: document.getElementById('exam-restart-btn')
  };

  function questionsFor(subject) {
    return subject === 'verbal' ? VERBAL_QUESTIONS : QUANT_QUESTIONS;
  }

  function currentSection() { return state.sections[state.sectionIdx]; }
  function currentQIndex() { return currentSection().order[state.qIdx]; }

  function buildExam() {
    const verbalExclude = new Set();
    const quantExclude = new Set();
    const order = Math.random() < 0.5
      ? ['verbal-1', 'verbal-2', 'quant-1', 'quant-2']
      : ['quant-1', 'quant-2', 'verbal-1', 'verbal-2'];
    return order.map((id) => {
      const def = SECTION_DEFS[id];
      const pool = questionsFor(def.subject);
      const exclude = def.subject === 'verbal' ? verbalExclude : quantExclude;
      const qOrder = pickQuestions(pool, def.composition, exclude);
      return Object.assign({}, def, { order: qOrder, selections: {} });
    });
  }

  function showScreen(name) {
    el.screenStart.classList.toggle('hidden', name !== 'start');
    el.screenExam.classList.toggle('hidden', name !== 'exam');
    el.screenResults.classList.toggle('hidden', name !== 'results');
  }

  function renderHistory() {
    const hist = loadHistory();
    el.historyList.innerHTML = '';
    el.historyEmpty.classList.toggle('hidden', hist.length > 0);
    hist.forEach((rec) => {
      const row = document.createElement('div');
      row.className = 'mock-history-card';
      row.innerHTML =
        '<div>' +
        '<div class="mock-history-meta">' + escapeHtml(formatDate(rec.date)) + '</div>' +
        '<div class="mock-history-scores">V ' + rec.verbalScaled + ' &middot; Q ' + rec.quantScaled +
        ' <span style="font-weight:600;color:var(--ink-soft);">(' + rec.verbalRaw + '/' + rec.verbalTotal +
        ' &middot; ' + rec.quantRaw + '/' + rec.quantTotal + ')</span></div>' +
        '</div>' +
        '<button class="ctrl-btn history-review-btn" type="button">Review</button>';
      row.querySelector('.history-review-btn').addEventListener('click', () => reviewAttempt(rec));
      el.historyList.appendChild(row);
    });
  }

  function startExam() {
    state.sections = buildExam();
    state.sectionIdx = 0;
    state.qIdx = 0;
    state.reviewingPast = false;
    startSectionTimer();
    state.screen = 'exam';
    showScreen('exam');
    renderExamQuestion();
    window.scrollTo(0, 0);
  }
  el.startExamBtn.addEventListener('click', startExam);

  function startSectionTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    state.timeRemaining = currentSection().minutes * 60;
    state.timerId = setInterval(tick, 1000);
  }

  function tick() {
    state.timeRemaining -= 1;
    if (state.timeRemaining <= 0) {
      advanceSection();
    } else {
      renderTimer();
    }
  }

  function renderTimer() {
    const m = Math.floor(state.timeRemaining / 60);
    const s = state.timeRemaining % 60;
    el.examTimer.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    el.examTimer.classList.toggle('low', state.timeRemaining <= 60);
  }

  function selectChoice(choiceIdx) {
    const section = currentSection();
    const qIndex = currentQIndex();
    const q = questionsFor(section.subject)[qIndex];
    const isSE = q.type === 'sentence-equivalence';
    const cur = section.selections[qIndex] || [];
    let next;
    if (isSE) {
      if (cur.indexOf(choiceIdx) !== -1) next = cur.filter((c) => c !== choiceIdx);
      else if (cur.length < 2) next = cur.concat([choiceIdx]);
      else next = cur;
    } else {
      next = [choiceIdx];
    }
    section.selections = Object.assign({}, section.selections, {});
    section.selections[qIndex] = next;
    renderExamQuestion();
  }

  function goToQuestion(i) {
    state.qIdx = i;
    renderExamQuestion();
  }

  function nextQuestion() {
    const section = currentSection();
    if (state.qIdx + 1 < section.order.length) {
      state.qIdx += 1;
      renderExamQuestion();
    }
  }
  el.examNextBtn.addEventListener('click', nextQuestion);
  el.examPrevBtn.addEventListener('click', () => {
    if (state.qIdx > 0) { state.qIdx -= 1; renderExamQuestion(); }
  });

  el.examEndSectionBtn.addEventListener('click', () => {
    const isLastSection = state.sectionIdx + 1 >= state.sections.length;
    const msg = isLastSection
      ? 'Finish the exam now? You won’t be able to come back and change any answers.'
      : 'End this section now and move to the next one? You won’t be able to come back to it.';
    if (!window.confirm(msg)) return;
    advanceSection();
  });

  function advanceSection() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    if (state.sectionIdx + 1 >= state.sections.length) {
      finishExam();
    } else {
      state.sectionIdx += 1;
      state.qIdx = 0;
      startSectionTimer();
      renderExamQuestion();
      window.scrollTo(0, 0);
    }
  }

  function renderExamQuestion() {
    const section = currentSection();
    const qIndex = currentQIndex();
    const q = questionsFor(section.subject)[qIndex];
    const isSE = q.type === 'sentence-equivalence';
    const sel = section.selections[qIndex] || [];
    const hasContext = !!(q.passage || q.data);

    el.examSectionName.textContent = section.label + ' — ' + section.sub;
    el.examSectionSub.textContent = TYPE_LABELS[q.type] + ' · Question ' + (state.qIdx + 1) + ' of ' + section.order.length;
    renderTimer();

    el.examNavGrid.innerHTML = '';
    section.order.forEach((qi, i) => {
      const answered = !!(section.selections[qi] && section.selections[qi].length);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'exam-nav-btn' + (answered ? ' answered' : '') + (i === state.qIdx ? ' current' : '');
      btn.textContent = String(i + 1);
      btn.addEventListener('click', () => goToQuestion(i));
      el.examNavGrid.appendChild(btn);
    });

    el.examContextBox.classList.toggle('hidden', !hasContext);
    if (hasContext) {
      el.examContextLabel.textContent = q.passage ? 'Passage' : 'Data';
      el.examContextText.textContent = q.passage || q.data || '';
    }
    el.examPromptText.textContent = q.prompt;
    el.examSelectHint.classList.toggle('hidden', !isSE);

    el.examChoicesContainer.innerHTML = '';
    q.choices.forEach((text, i) => {
      const isSelected = sel.indexOf(i) !== -1;
      const btn = document.createElement('button');
      btn.className = 'choice' + (isSelected ? ' selected' : '');
      btn.textContent = LETTERS[i] + '. ' + text;
      btn.addEventListener('click', () => selectChoice(i));
      el.examChoicesContainer.appendChild(btn);
    });

    el.examPrevBtn.disabled = state.qIdx === 0;
    const isLast = state.qIdx + 1 >= section.order.length;
    el.examNextBtn.classList.toggle('hidden', isLast);
    const isLastSection = state.sectionIdx + 1 >= state.sections.length;
    el.examEndSectionBtn.textContent = isLastSection ? 'Finish exam now' : 'End section now and continue';
  }

  function computeResults(sections) {
    let verbalRaw = 0, verbalTotal = 0, quantRaw = 0, quantTotal = 0;
    sections.forEach((section) => {
      const questions = questionsFor(section.subject);
      let correct = 0;
      section.order.forEach((qIndex) => {
        const q = questions[qIndex];
        const sel = section.selections[qIndex] || [];
        if (isAnswerCorrect(q, sel)) correct++;
      });
      section.correctCount = correct;
      if (section.subject === 'verbal') { verbalRaw += correct; verbalTotal += section.order.length; }
      else { quantRaw += correct; quantTotal += section.order.length; }
    });
    const verbalPct = verbalTotal ? (verbalRaw / verbalTotal) * 100 : 0;
    const quantPct = quantTotal ? (quantRaw / quantTotal) * 100 : 0;
    const verbalScaled = scaledScore(verbalPct);
    const quantScaled = scaledScore(quantPct);
    return {
      verbalRaw, verbalTotal, quantRaw, quantTotal, verbalScaled, quantScaled,
      verbalPercentile: estimatePercentile(verbalScaled, 'verbal'),
      quantPercentile: estimatePercentile(quantScaled, 'quant')
    };
  }

  function finishExam() {
    const result = computeResults(state.sections);
    const totalCorrect = result.verbalRaw + result.quantRaw;
    const xpEarned = totalCorrect * 5 + 50;
    addXp(xpEarned);
    renderGamifyHeader(el.gamifyHeader);
    const record = Object.assign({
      id: Date.now(),
      date: new Date().toISOString(),
      xpEarned,
      sections: state.sections.map((s) => ({
        id: s.id, subject: s.subject, label: s.label, sub: s.sub,
        order: s.order.slice(), selections: s.selections, correctCount: s.correctCount
      }))
    }, result);
    saveAttemptToHistory(record);
    state.resultData = record;
    state.reviewingPast = false;
    state.screen = 'results';
    showScreen('results');
    renderResults();
    window.scrollTo(0, 0);
  }

  function reviewAttempt(rec) {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    state.resultData = rec;
    state.reviewingPast = true;
    state.screen = 'results';
    showScreen('results');
    renderResults();
    window.scrollTo(0, 0);
  }

  function renderResults() {
    const rec = state.resultData;
    el.examXpEarnedText.textContent = state.reviewingPast
      ? 'Reviewing a saved mock exam — no new XP'
      : '+' + rec.xpEarned + ' XP earned for completing this mock exam';

    el.scoreVerbalBig.textContent = rec.verbalScaled;
    el.scoreVerbalRaw.textContent = rec.verbalRaw + ' / ' + rec.verbalTotal + ' correct';
    el.scoreVerbalPct.textContent = '~' + rec.verbalPercentile + 'th percentile (est.)';
    el.scoreQuantBig.textContent = rec.quantScaled;
    el.scoreQuantRaw.textContent = rec.quantRaw + ' / ' + rec.quantTotal + ' correct';
    el.scoreQuantPct.textContent = '~' + rec.quantPercentile + 'th percentile (est.)';

    el.examReviewList.innerHTML = '';
    rec.sections.forEach((section) => {
      const questions = questionsFor(section.subject);
      const wrap = document.createElement('div');
      const header = document.createElement('div');
      header.className = 'exam-section-header';
      header.innerHTML =
        '<div class="name">' + escapeHtml(section.label + ' — ' + section.sub) + '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span class="score">' + section.correctCount + ' / ' + section.order.length + '</span>' +
        '<span class="caret">▼</span></div>';
      const body = document.createElement('div');
      body.className = 'exam-section-body hidden';
      section.order.forEach((qIndex, i) => {
        const q = questions[qIndex];
        const sel = section.selections[qIndex] || [];
        const correct = isAnswerCorrect(q, sel);
        const hasContext = !!(q.passage || q.data);
        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;">' +
          '<div class="kicker">Q' + (i + 1) + ' · ' + TYPE_LABELS[q.type] + (q.difficulty ? ' · ' + capitalize(q.difficulty) : '') + '</div>' +
          '<span class="badge ' + (correct ? 'badge-good' : 'badge-bad') + '">' + (correct ? 'Correct' : 'Incorrect') + '</span>' +
          '</div>' +
          (hasContext ? '<div class="field-label">' + (q.passage ? 'Passage' : 'Data') + '</div><div class="field-value" style="white-space:pre-line;color:var(--ink-soft);">' + escapeHtml(q.passage || q.data || '') + '</div>' : '') +
          '<div style="font-size:15.5px;line-height:1.55;margin-bottom:10px;white-space:pre-line;">' + escapeHtml(q.prompt) + '</div>' +
          '<div class="field-label">Your answer</div><div class="field-value">' + escapeHtml(formatAnswer(sel, q.choices)) + '</div>' +
          '<div class="field-label">Correct answer</div><div class="field-value">' + escapeHtml(formatAnswer(q.correct, q.choices)) + '</div>' +
          '<div style="font-size:14px;color:var(--ink-soft);line-height:1.55;">' + escapeHtml(q.explanation) + '</div>';
        body.appendChild(card);
      });
      header.addEventListener('click', () => {
        body.classList.toggle('hidden');
        header.querySelector('.caret').textContent = body.classList.contains('hidden') ? '▼' : '▲';
      });
      wrap.appendChild(header);
      wrap.appendChild(body);
      el.examReviewList.appendChild(wrap);
    });
  }

  el.examRestartBtn.addEventListener('click', () => {
    state.reviewingPast = false;
    state.screen = 'start';
    showScreen('start');
    renderHistory();
    window.scrollTo(0, 0);
  });

  // ---- init ----
  renderGamifyHeader(el.gamifyHeader);
  renderHistory();
  showScreen('start');
})();
