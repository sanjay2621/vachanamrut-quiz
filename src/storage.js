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
