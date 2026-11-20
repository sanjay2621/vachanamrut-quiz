// Admin-made custom quizzes. Built on the admin page from any Vachanamrut (all
// questions, hidden quizzes included) and saved in public/data/quiz-config.json as
//   custom: [{ id: 'custom-…', title, titleEn?, nos: [vachno…], questions: [questionId…], created }]
// Question ids are shared by both languages, so one saved quiz works in gu and en;
// questions that exist in only one language (e.g. content questions) are skipped in
// the other. Visibility uses the same `disabled` list as every other quiz.

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Questions about the given Vachanamrut from the given quiz kinds, one per question id
export function customPool(quizzes, nos, kinds) {
  const pick = new Set(nos);
  const byId = new Map();
  for (const q of quizzes) {
    if (q.kind === 'custom' || !kinds.includes(q.kind || 'quiz')) continue;
    for (const x of q.questions) if (pick.has(x.vachno)) byId.set(x.id, x);
  }
  return [...byId.values()];
}

// `count` questions taken in turns from each Vachanamrut (so every pick is
// represented), then shuffled. count = 'all' takes the whole pool.
export function pickQuestions(pool, count) {
  const byNo = new Map();
  for (const q of shuffle(pool)) {
    if (!byNo.has(q.vachno)) byNo.set(q.vachno, []);
    byNo.get(q.vachno).push(q);
  }
  const queues = shuffle([...byNo.values()]);
  const limit = count === 'all' ? pool.length : Math.min(count, pool.length);
  const picked = [];
  for (let i = 0; picked.length < limit; i++) {
    const queue = queues[i % queues.length];
    if (queue.length) picked.push(queue.pop());
  }
  return shuffle(picked);
}

// Turn the saved definitions into quiz objects for the current language's data
export function buildCustomQuizzes(quizzes, customs, lang) {
  if (!customs?.length) return [];
  const byId = new Map();
  for (const q of quizzes) if (q.kind !== 'custom') for (const x of q.questions) byId.set(x.id, x);
  return customs
    .map((c) => {
      const questions = c.questions.map((id) => byId.get(id)).filter(Boolean);
      return {
        id: `${lang === 'en' ? 'en-' : ''}${c.id}`,
        kind: 'custom',
        title: (lang === 'en' && c.titleEn) || c.title,
        covers: [...new Set(questions.map((q) => q.vachno))],
        questions,
      };
    })
    .filter((q) => q.questions.length);
}
