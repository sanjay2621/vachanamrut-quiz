// Small localStorage wrapper. Storage can be blocked (private mode), so every call is guarded.
const KEY = 'vachanamrut-quiz:v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getScores() {
  return readAll().scores || {};
}

// Keeps best score + attempt count per quiz id
export function saveScore(quizId, correct, total) {
  const data = readAll();
  const scores = data.scores || {};
  const prev = scores[quizId];
  const pct = Math.round((correct / total) * 100);
  scores[quizId] = {
    best: Math.max(prev?.best ?? 0, pct),
    last: pct,
    attempts: (prev?.attempts ?? 0) + 1,
  };
  writeAll({ ...data, scores });
}

export function getTheme() {
  return readAll().theme || null;
}

export function setTheme(theme) {
  writeAll({ ...readAll(), theme });
}

// Days on which the 15-minute પ્રાપ્તિનો વિચાર timer was completed (yyyy-mm-dd)
export function isPraptiDone(date) {
  return (readAll().praptiDone || []).includes(date);
}

export function setPraptiDone(date) {
  const data = readAll();
  const days = new Set(data.praptiDone || []);
  days.add(date);
  writeAll({ ...data, praptiDone: [...days] });
}

// 'gu' (default) or 'en'
export function getLang() {
  return readAll().lang === 'en' ? 'en' : 'gu';
}

export function setLang(lang) {
  writeAll({ ...readAll(), lang });
}

// Admin page (#/enabledisablequizes): GitHub token lives only in this browser,
// under its own key so it never mixes with scores. Unlock lasts for the tab session.
const ADMIN_KEY = 'vachanamrut-quiz:admin';

export function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token) {
  try {
    if (token) localStorage.setItem(ADMIN_KEY, token);
    else localStorage.removeItem(ADMIN_KEY);
  } catch {
    /* ignore */
  }
}

export function isAdminUnlocked(hash) {
  try {
    return sessionStorage.getItem(ADMIN_KEY) === hash;
  } catch {
    return false;
  }
}

export function setAdminUnlocked(hash) {
  try {
    sessionStorage.setItem(ADMIN_KEY, hash);
  } catch {
    /* ignore */
  }
}
