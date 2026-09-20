// GRE Study Hub — vocabulary Speed Round (rapid-fire multiple choice).
// Reads its data/settings from window.SPEED_CONFIG, set inline in the HTML page.

(function () {
  const cfg = window.SPEED_CONFIG;
  const VOCAB_SRC = cfg.vocab;
  const ROUND_SECONDS = cfg.roundSeconds || 60;
  const BEST_KEY = cfg.bestKey || 'gre_speed_best';
  const LETTERS = ['A', 'B', 'C', 'D'];

  const state = {
    screen: 'setup',
    score: 0,
    wrong: 0,
    combo: 0,
    bestComboThisRound: 0,
    xpEarned: 0,
    timeRemaining: ROUND_SECONDS,
    timerId: null,
    current: null,
    lastWord: null,
    locked: false
  };

  const el = {
    gamifyHeader: document.getElementById('gamify-header'),
    screenSetup: document.getElementById('screen-setup'),
    screenPlay: document.getElementById('screen-play'),
    screenResults: document.getElementById('screen-results'),
    bestLine: document.getElementById('best-line'),
    startBtn: document.getElementById('start-btn'),

    timerFill: document.getElementById('speed-timer-fill'),
    timerText: document.getElementById('speed-timer-text'),
    scoreText: document.getElementById('speed-score-text'),
    comboText: document.getElementById('speed-combo-text'),
    wordEl: document.getElementById('speed-word'),
    choicesEl: document.getElementById('speed-choices'),

    finalScore: document.getElementById('final-score'),
    finalDetail: document.getElementById('final-detail'),
    xpEarnedText: document.getElementById('xp-earned-text'),
    restartBtn: document.getElementById('restart-btn')
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function showScreen(name) {
    el.screenSetup.classList.toggle('hidden', name !== 'setup');
    el.screenPlay.classList.toggle('hidden', name !== 'play');
    el.screenResults.classList.toggle('hidden', name !== 'results');
  }

  function loadBest() {
    let best = null;
    try { best = JSON.parse(localStorage.getItem(BEST_KEY) || 'null'); } catch (e) {}
    return best;
  }

  function renderBest() {
    const best = loadBest();
    el.bestLine.textContent = 'Best score: ' + (best ? best.score + ' correct (best combo: ' + best.combo + ')' : 'Not attempted yet');
  }

  function nextQuestion() {
    let word;
    do {
      word = VOCAB_SRC[Math.floor(Math.random() * VOCAB_SRC.length)];
    } while (VOCAB_SRC.length > 1 && state.lastWord && word.word === state.lastWord.word);
    state.lastWord = word;

    const distractorPool = VOCAB_SRC.filter((w) => w.word !== word.word);
    const distractors = shuffle(distractorPool.slice()).slice(0, 3).map((w) => w.def);
    const choices = shuffle([word.def].concat(distractors));
    const correctIndex = choices.indexOf(word.def);

    state.current = { word: word.word, choices, correctIndex };
    renderQuestion();
  }

  function renderQuestion() {
    el.wordEl.textContent = state.current.word;
    el.choicesEl.innerHTML = '';
    state.current.choices.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.textContent = LETTERS[i] + '. ' + text;
      btn.addEventListener('click', () => onAnswer(i));
      el.choicesEl.appendChild(btn);
    });
  }

  function onAnswer(i) {
    if (state.locked || state.screen !== 'play') return;
    state.locked = true;
    const correct = i === state.current.correctIndex;
    const buttons = el.choicesEl.querySelectorAll('.choice');
    buttons.forEach((b, idx) => {
      b.classList.add('locked');
      if (idx === state.current.correctIndex) b.classList.add('correct');
      else if (idx === i && !correct) b.classList.add('incorrect');
    });

    if (correct) {
      state.score += 1;
      state.combo += 1;
      state.bestComboThisRound = Math.max(state.bestComboThisRound, state.combo);
      let xp = 2;
      if (state.combo > 0 && state.combo % 5 === 0) xp += 5;
      state.xpEarned += xp;
      addXp(xp);
    } else {
      state.wrong += 1;
      state.combo = 0;
    }
    renderGamifyHeader(el.gamifyHeader);
    el.scoreText.textContent = String(state.score);
    el.comboText.textContent = state.combo + 'x combo';

    setTimeout(() => {
      if (state.screen === 'play') {
        state.locked = false;
        nextQuestion();
      }
    }, 180);
  }

  function tick() {
    state.timeRemaining -= 1;
    el.timerFill.style.width = Math.max(0, Math.round((state.timeRemaining / ROUND_SECONDS) * 100)) + '%';
    el.timerText.textContent = state.timeRemaining + 's';
    if (state.timeRemaining <= 0) finishRound();
  }

  function startRound() {
    Object.assign(state, {
      screen: 'play', score: 0, wrong: 0, combo: 0, bestComboThisRound: 0,
      xpEarned: 0, timeRemaining: ROUND_SECONDS, lastWord: null, locked: false
    });
    el.scoreText.textContent = '0';
    el.comboText.textContent = '0x combo';
    el.timerFill.style.width = '100%';
    el.timerText.textContent = ROUND_SECONDS + 's';
    showScreen('play');
    nextQuestion();
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(tick, 1000);
  }
  el.startBtn.addEventListener('click', startRound);

  function finishRound() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    state.screen = 'results';
    const best = loadBest();
    const isNewBest = !best || state.score > best.score || (state.score === best.score && state.bestComboThisRound > best.combo);
    if (isNewBest) {
      try { localStorage.setItem(BEST_KEY, JSON.stringify({ score: state.score, combo: state.bestComboThisRound })); } catch (e) {}
    }
    const attempted = state.score + state.wrong;
    const accuracy = attempted > 0 ? Math.round((state.score / attempted) * 100) : 0;
    el.finalScore.textContent = String(state.score);
    el.finalDetail.textContent = attempted + ' answered · ' + accuracy + '% accuracy · best combo ' + state.bestComboThisRound + (isNewBest ? ' · New best!' : '');
    el.xpEarnedText.textContent = '+' + state.xpEarned + ' XP earned this run';
    showScreen('results');
    renderBest();
  }

  el.restartBtn.addEventListener('click', () => {
    state.screen = 'setup';
    showScreen('setup');
    renderBest();
  });

  // ---- init ----
  renderGamifyHeader(el.gamifyHeader);
  renderBest();
  showScreen('setup');
})();
