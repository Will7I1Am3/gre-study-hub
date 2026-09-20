// GRE Study Hub — shared streak / XP helpers (used by every page)

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function loadXp() {
  let xp = 0;
  try { xp = parseInt(localStorage.getItem('gre_xp') || '0', 10) || 0; } catch (e) {}
  return xp;
}

function addXp(amount) {
  const xp = loadXp() + amount;
  try { localStorage.setItem('gre_xp', String(xp)); } catch (e) {}
  return xp;
}

function loadStreak() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('gre_streak') || 'null'); } catch (e) {}
  return s || { count: 0, last: null };
}

// Call once per page load. Increments the streak the first time a page
// loads on a new calendar day; resets to 1 if a day was skipped.
function touchStreak() {
  const streak = loadStreak();
  const today = todayStr();
  if (streak.last === today) return streak;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const count = streak.last === yesterday ? streak.count + 1 : 1;
  const next = { count, last: today };
  try { localStorage.setItem('gre_streak', JSON.stringify(next)); } catch (e) {}
  return next;
}

function levelTitle(xp) {
  if (xp >= 1000) return 'GRE Legend';
  if (xp >= 600) return 'Ace';
  if (xp >= 300) return 'Sharpshooter';
  if (xp >= 100) return 'Scholar';
  return 'Rookie';
}

const FLAME_ICON = '<svg class="icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2c1.2 3.1-2.1 4.3-2.1 7.4a4.1 4.1 0 108.2 0c0-2-1-3.3-2.1-4.4 1 4-1.1 5.3-2.1 5.3-1.6 0-2.2-1.6-1.1-3.3.9-1.7.1-3.6-0.8-5z"/></svg>';
const BOLT_ICON = '<svg class="icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>';

// Renders the streak + XP pills into a container element, e.g.
// <div id="gamify-header"></div>, and returns the current {xp, streak}.
function renderGamifyHeader(containerEl, opts) {
  opts = opts || {};
  const streak = touchStreak();
  const xp = loadXp();
  const streakLabel = streak.count + (streak.count === 1 ? ' day streak' : ' days streak');
  let html = '';
  html += '<div class="pill' + (opts.big ? ' big' : '') + '" style="color:var(--streak-dark);">' + FLAME_ICON + streakLabel + '</div>';
  html += '<div class="pill' + (opts.big ? ' big' : '') + '" style="color:var(--xp-dark);">' + BOLT_ICON + xp + ' XP</div>';
  if (opts.showLevel) {
    html += '<div class="pill' + (opts.big ? ' big' : '') + '" style="color:var(--primary-dark);">' + levelTitle(xp) + '</div>';
  }
  if (containerEl) containerEl.innerHTML = html;
  return { xp, streak };
}
