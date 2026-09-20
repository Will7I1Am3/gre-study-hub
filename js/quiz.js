// GRE Study Hub — generic quiz engine (setup -> quiz -> results).
// Reads its data/labels from window.QUIZ_CONFIG, set inline in each HTML page.

(function () {
  const cfg = window.QUIZ_CONFIG;
  const QUESTIONS = cfg.questions;
  const TYPE_KEYS = cfg.typeKeys;
  const TYPE_LABELS = cfg.typeLabels;
  const BEST_KEY = cfg.bestKey;
  const PER_Q_SECONDS = cfg.perQSeconds;
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const state = {
    screen: 'setup',
    pendingFilter: 'all',
    pendingTimed: false,
    order: [],
    idx: 0,
    selections: {},
    checked: {},
    timeRemaining: 0,
    totalTime: 0,
    timed: false,
    finalScore: 0,
    finalTotal: 0,
    xpEarnedThisRun: 0
  };
  let timerId = null;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function isAnswerCorrect(qIndex, sel) {
    const q = QUESTIONS[qIndex];
    const a = sel.slice().sort();
    const b = q.correct.slice().sort();
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  function formatAnswer(indices, choices) {
    if (!indices || indices.length === 0) return 'No answer selected';
    return indices.map((i) => LETTERS[i] + '. ' + choices[i]).join('  /  ');
  }

  // ---- DOM refs ----
  const el = {
    gamifyHeader: document.getElementById('gamify-header'),
    screenSetup: document.getElementById('screen-setup'),
    screenQuiz: document.getElementById('screen-quiz'),
    screenResults: document.getElementById('screen-results'),
    bestScoreLine: document.getElementById('best-score-line'),
    filterAll: document.getElementById('filter-all'),
    filterA: document.getElementById('filter-a'),
    filterB: document.getElementById('filter-b'),
    filterC: document.getElementById('filter-c'),
    countAll: document.getElementById('count-all'),
    countA: document.getElementById('count-a'),
    countB: document.getElementById('count-b'),
    countC: document.getElementById('count-c'),
    timedCb: document.getElementById('timed-cb'),
    timedLabel: document.getElementById('timed-label'),
    startBtn: document.getElementById('start-btn'),

    progressText: document.getElementById('progress-text'),
    timerText: document.getElementById('timer-text'),
    quizProgressFill: document.getElementById('quiz-progress-fill'),
    currentTypeLabel: document.getElementById('current-type-label'),
    contextBox: document.getElementById('context-box'),
    contextLabel: document.getElementById('context-label'),
    contextText: document.getElementById('context-text'),
    promptText: document.getElementById('prompt-text'),
    selectHint: document.getElementById('select-hint'),
    choicesContainer: document.getElementById('choices-container'),
    feedbackBox: document.getElementById('feedback-box'),
    resultBadge: document.getElementById('result-badge'),
    correctAnswerText: document.getElementById('correct-answer-text'),
    explanationText: document.getElementById('explanation-text'),
    prevQBtn: document.getElementById('prev-q-btn'),
    checkBtn: document.getElementById('check-btn'),
    nextBtn: document.getElementById('next-btn'),
    endQuizBtn: document.getElementById('end-quiz-btn'),

    stars: document.getElementById('stars'),
    finalScore: document.getElementById('final-score'),
    scoreMessage: document.getElementById('score-message'),
    xpEarnedText: document.getElementById('xp-earned-text'),
    restartBtn: document.getElementById('restart-btn'),
    reviewList: document.getElementById('review-list')
  };

  // static labels from config
  document.getElementById('setup-title').textContent = cfg.title;
  document.getElementById('setup-subtitle').textContent = cfg.subtitle;
  document.getElementById('filter-a-label').textContent = TYPE_LABELS[TYPE_KEYS[0]];
  document.getElementById('filter-b-label').textContent = TYPE_LABELS[TYPE_KEYS[1]];
  document.getElementById('filter-c-label').textContent = TYPE_LABELS[TYPE_KEYS[2]];
  el.timedLabel.textContent = 'Timed practice (' + PER_Q_SECONDS + ' seconds per question, like real GRE pacing)';

  function showScreen(name) {
    el.screenSetup.classList.toggle('hidden', name !== 'setup');
    el.screenQuiz.classList.toggle('hidden', name !== 'quiz');
    el.screenResults.classList.toggle('hidden', name !== 'results');
  }

  function renderSetup() {
    const countAll = QUESTIONS.length;
    const countA = QUESTIONS.filter((q) => q.type === TYPE_KEYS[0]).length;
    const countB = QUESTIONS.filter((q) => q.type === TYPE_KEYS[1]).length;
    const countC = QUESTIONS.filter((q) => q.type === TYPE_KEYS[2]).length;
    el.countAll.textContent = countAll + ' questions';
    el.countA.textContent = countA + ' questions';
    el.countB.textContent = countB + ' questions';
    el.countC.textContent = countC + ' questions';

    let best = null;
    try { best = JSON.parse(localStorage.getItem(BEST_KEY) || 'null'); } catch (e) {}
    el.bestScoreLine.textContent = 'Best score: ' + (best ? best.score + ' / ' + best.total : 'Not attempted yet');

    [el.filterAll, el.filterA, el.filterB, el.filterC].forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.type === state.pendingFilter);
    });
    el.timedCb.checked = state.pendingTimed;
  }

  el.filterAll.dataset.type = 'all';
  el.filterA.dataset.type = TYPE_KEYS[0];
  el.filterB.dataset.type = TYPE_KEYS[1];
  el.filterC.dataset.type = TYPE_KEYS[2];
  [el.filterAll, el.filterA, el.filterB, el.filterC].forEach((btn) => {
    btn.addEventListener('click', () => {
      state.pendingFilter = btn.dataset.type;
      renderSetup();
    });
  });
  el.timedCb.addEventListener('change', () => {
    state.pendingTimed = el.timedCb.checked;
  });

  function startQuiz() {
    const filterType = state.pendingFilter;
    let pool = QUESTIONS.map((_, i) => i);
    if (filterType !== 'all') pool = pool.filter((i) => QUESTIONS[i].type === filterType);
    const order = shuffle(pool.slice());
    const totalTime = order.length * PER_Q_SECONDS;
    if (timerId) { clearInterval(timerId); timerId = null; }
    Object.assign(state, {
      screen: 'quiz', order, idx: 0, selections: {}, checked: {},
      timeRemaining: totalTime, totalTime, timed: state.pendingTimed, xpEarnedThisRun: 0
    });
    showScreen('quiz');
    renderQuiz();
    if (state.timed) timerId = setInterval(tick, 1000);
  }
  el.startBtn.addEventListener('click', startQuiz);

  function tick() {
    state.timeRemaining -= 1;
    if (state.timeRemaining <= 0) {
      if (timerId) { clearInterval(timerId); timerId = null; }
      finishQuiz();
    } else {
      renderQuiz();
    }
  }

  function currentQIndex() { return state.order[state.idx]; }

  function selectChoice(choiceIdx) {
    const qIndex = currentQIndex();
    if (state.checked[qIndex]) return;
    const q = QUESTIONS[qIndex];
    const isSE = q.type === 'sentence-equivalence';
    const current = state.selections[qIndex] || [];
    let next;
    if (isSE) {
      if (current.indexOf(choiceIdx) !== -1) next = current.filter((c) => c !== choiceIdx);
      else if (current.length < 2) next = current.concat([choiceIdx]);
      else next = current;
    } else {
      next = [choiceIdx];
    }
    state.selections = Object.assign({}, state.selections, {});
    state.selections[qIndex] = next;
    renderQuiz();
  }

  function checkAnswer() {
    const qIndex = currentQIndex();
    const q = QUESTIONS[qIndex];
    const isSE = q.type === 'sentence-equivalence';
    const sel = state.selections[qIndex] || [];
    const needed = isSE ? 2 : 1;
    if (sel.length !== needed) return;
    state.checked = Object.assign({}, state.checked, {});
    state.checked[qIndex] = true;
    if (isAnswerCorrect(qIndex, sel)) {
      addXp(10);
      state.xpEarnedThisRun += 10;
      renderGamifyHeader(el.gamifyHeader);
    }
    renderQuiz();
  }
  el.checkBtn.addEventListener('click', checkAnswer);

  function nextQuestion() {
    if (state.idx + 1 >= state.order.length) finishQuiz();
    else { state.idx += 1; renderQuiz(); }
  }
  el.nextBtn.addEventListener('click', nextQuestion);
  el.prevQBtn.addEventListener('click', () => {
    if (state.idx > 0) { state.idx -= 1; renderQuiz(); }
  });
  el.endQuizBtn.addEventListener('click', finishQuiz);

  function finishQuiz() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    let score = 0;
    state.order.forEach((qIndex) => {
      const sel = (state.selections[qIndex] || []).slice().sort();
      const correct = QUESTIONS[qIndex].correct.slice().sort();
      if (sel.length === correct.length && sel.every((v, i) => v === correct[i])) score++;
    });
    const total = state.order.length;
    try {
      const prevBest = JSON.parse(localStorage.getItem(BEST_KEY) || 'null');
      if (total > 0 && (!prevBest || score / total > prevBest.score / prevBest.total)) {
        localStorage.setItem(BEST_KEY, JSON.stringify({ score, total }));
      }
    } catch (e) {}
    state.screen = 'results';
    state.finalScore = score;
    state.finalTotal = total;
    showScreen('results');
    renderResults();
  }

  el.restartBtn.addEventListener('click', () => {
    if (timerId) { clearInterval(timerId); timerId = null; }
    state.screen = 'setup';
    showScreen('setup');
    renderSetup();
  });

  function renderQuiz() {
    const qIndex = currentQIndex();
    const q = QUESTIONS[qIndex];
    const isSE = q.type === 'sentence-equivalence';
    const sel = state.selections[qIndex] || [];
    const checked = !!state.checked[qIndex];
    const hasContext = !!(q.passage || q.data);

    el.progressText.textContent = 'Question ' + (state.idx + 1) + ' of ' + state.order.length;
    el.quizProgressFill.style.width = Math.round((state.idx / state.order.length) * 100) + '%';
    el.currentTypeLabel.textContent = TYPE_LABELS[q.type];

    el.timerText.classList.toggle('hidden', !state.timed);
    if (state.timed) {
      const m = Math.floor(state.timeRemaining / 60);
      const s = state.timeRemaining % 60;
      el.timerText.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      el.timerText.style.color = state.timeRemaining <= 30 ? 'var(--bad)' : 'var(--ink-soft)';
    }

    el.contextBox.classList.toggle('hidden', !hasContext);
    if (hasContext) {
      el.contextLabel.textContent = q.passage ? 'Passage' : 'Data';
      el.contextText.textContent = q.passage || q.data || '';
    }
    el.promptText.textContent = q.prompt;
    el.selectHint.classList.toggle('hidden', !isSE);

    el.choicesContainer.innerHTML = '';
    q.choices.forEach((text, i) => {
      const isSelected = sel.indexOf(i) !== -1;
      const isCorrectChoice = q.correct.indexOf(i) !== -1;
      let cls = 'choice';
      if (checked) {
        if (isCorrectChoice) cls = 'choice correct';
        else if (isSelected) cls = 'choice incorrect';
        else cls = 'choice dim';
      } else if (isSelected) {
        cls = 'choice selected';
      }
      const btn = document.createElement('button');
      btn.className = cls;
      btn.textContent = LETTERS[i] + '. ' + text;
      btn.addEventListener('click', () => selectChoice(i));
      el.choicesContainer.appendChild(btn);
    });

    el.feedbackBox.classList.toggle('hidden', !checked);
    if (checked) {
      const correct = isAnswerCorrect(qIndex, sel);
      el.resultBadge.className = 'badge ' + (correct ? 'badge-good' : 'badge-bad');
      el.resultBadge.textContent = correct ? 'Correct  +10 XP' : 'Incorrect';
      el.correctAnswerText.textContent = formatAnswer(q.correct, q.choices);
      el.explanationText.textContent = q.explanation;
    }

    el.checkBtn.classList.toggle('hidden', checked);
    el.nextBtn.classList.toggle('hidden', !checked);
    el.nextBtn.textContent = (state.idx + 1 >= state.order.length) ? 'See results' : 'Next question →';
  }

  function renderResults() {
    const pct = state.finalTotal > 0 ? Math.round((state.finalScore / state.finalTotal) * 100) : 0;
    const starCount = pct >= 85 ? 3 : pct >= 60 ? 2 : pct > 0 ? 1 : 0;
    el.stars.innerHTML = [0, 1, 2].map((i) => {
      const fill = i < starCount ? 'var(--xp)' : 'none';
      return '<svg class="star" viewBox="0 0 24 24" width="30" height="30" fill="' + fill + '" stroke="var(--ink)" stroke-width="1.3"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8L6 21l1.6-7L2.2 9.2l7.1-.6z"/></svg>';
    }).join('');
    el.finalScore.textContent = state.finalScore + ' / ' + state.finalTotal;
    el.scoreMessage.textContent = pct >= 80 ? 'Excellent work.' : pct >= 60 ? 'Solid effort — review the missed ones below.' : 'Keep practicing — review the explanations below.';
    el.xpEarnedText.textContent = '+' + state.xpEarnedThisRun + ' XP earned this run';

    el.reviewList.innerHTML = '';
    state.order.forEach((qIndex, i) => {
      const q = QUESTIONS[qIndex];
      const sel = state.selections[qIndex] || [];
      const correct = isAnswerCorrect(qIndex, sel);
      const hasContext = !!(q.passage || q.data);
      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;">' +
        '<div class="kicker">Q' + (i + 1) + ' · ' + TYPE_LABELS[q.type] + '</div>' +
        '<span class="badge ' + (correct ? 'badge-good' : 'badge-bad') + '">' + (correct ? 'Correct' : 'Incorrect') + '</span>' +
        '</div>' +
        (hasContext ? '<div class="field-label">' + (q.passage ? 'Passage' : 'Data') + '</div><div class="field-value" style="white-space:pre-line;color:var(--ink-soft);">' + escapeHtml(q.passage || q.data || '') + '</div>' : '') +
        '<div style="font-size:15.5px;line-height:1.55;margin-bottom:10px;white-space:pre-line;">' + escapeHtml(q.prompt) + '</div>' +
        '<div class="field-label">Your answer</div><div class="field-value">' + escapeHtml(formatAnswer(sel, q.choices)) + '</div>' +
        '<div class="field-label">Correct answer</div><div class="field-value">' + escapeHtml(formatAnswer(q.correct, q.choices)) + '</div>' +
        '<div style="font-size:14px;color:var(--ink-soft);line-height:1.55;">' + escapeHtml(q.explanation) + '</div>';
      el.reviewList.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- init ----
  renderGamifyHeader(el.gamifyHeader);
  renderSetup();
  showScreen('setup');
})();
