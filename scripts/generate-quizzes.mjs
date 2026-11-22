// Generates the quiz data for both languages:
//   public/data/quizzes.json     (Gujarati, from scripts/vachanamrut-source.json)
//   public/data/quizzes.en.json  (English,  from scripts/vachanamrut-source-en.json)
// Both share the same structure and subjects (scripts/subjects.json).
// Run: npm run generate
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS, sectionOfNo, positionOf } from './vachnos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));
const QUIZ_SIZE = 25;

const sectionOf = (v) => sectionOfNo(v.vachno);

// deterministic RNG so regenerating gives same output; reset per language
let seed;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const shuffle = (a) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

function trimTeaching(t) {
  let s = t.replace(/\s+/g, ' ').trim();
  if (s.length > 220) {
    const cut = s.slice(0, 220);
    const dot = cut.lastIndexOf('.');
    s = (dot > 80 ? cut.slice(0, dot + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…');
  }
  return s;
}

// Gujarati asker names: keep only clean, recognisable names
const NAME_END = /(સ્વામી|ભટ્ટ|ઠક્કર|મુનિ|ધાધલ|ભાઈ|બ્રહ્મચારી|ખાચર|જી|દાસ|ભક્ત|આચાર્ય|રાય|ચંદ|ભગત|બાઈ|ઠાકોર|શાસ્ત્રી|પુરાણી|દવે|વાળા|મુનિ|ગિરિ|પટેલ|કાકા)$/;
function cleanAskerGu(a) {
  if (!a) return null;
  let s = a.trim();
  const PREFIX = /^(અને|ત્યાર પછી|તે પછી|પછી|ત્યારે|વળી|તે સમે|તે સમયમાં|તે સમામાં|પ્રથમ|શ્રીજીમહારાજને|તે)\s+/;
  while (PREFIX.test(s)) s = s.replace(PREFIX, '').trim();
  // Gujarati ergative inflects both words: "સોમલે ખાચરે" -> "સોમલા ખાચર"
  s = s.replace(/^(\S+)ે (ખાચર|ધાધલ|ભક્ત)$/, '$1ા $2');
  if (['મુનિ', 'સંત', 'તેણ'].includes(s)) return null;
  if (/શ્રીજીમહારાજ|અને |એ |ને |નો |તે |જે /.test(s) || s.length > 30 || s.length < 5) return null;
  return NAME_END.test(s) ? s : null;
}

const toGu = (n) => String(n).replace(/\d/g, (d) => '૦૧૨૩૪૫૬૭૮૯'[d]);
const enOrdinal = (n) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${s}`;
};

// Per-language text. `secName` picks the section label, `ref` builds "ગઢડા પ્રથમ ૧" / "Gadhada I-1".
const LANGS = {
  gu: {
    out: 'quizzes.json',
    idPrefix: '',
    // standard 262 + the 11 additional Vachanamrut
    load: () => [...readJson('vachanamrut-source.json'), ...readJson('vachanamrut-source-extra.json')],
    cleanAsker: cleanAskerGu,
    secName: (s) => s.name,
    secAlt: (s) => s.en,
    ref: (v) => v.ref,
    q: {
      titleToRef: (v) => `“${v.title}” — આ શીર્ષકવાળું વચનામૃત કયું છે?`,
      refToTitle: (v) => `વચનામૃત ${v.ref}નું શીર્ષક શું છે?`,
      date: (label) => `વચનામૃત ${label} કઈ તિથિએ કહેવાયું હતું?`,
      teaching: (t) => `“${t}” — આ ઉપદેશ કયા વચનામૃતમાં છે?`,
      asker: (label) => `વચનામૃત ${label}માં પ્રશ્ન પૂછનાર કોણ હતા?`,
      sectionTitle: (sec, pos) =>
        `${sec.name}ના ${toGu(pos) + ({ 1: 'લા', 2: 'જા', 3: 'જા', 4: 'થા', 6: 'ઠ્ઠા' }[pos] || 'મા')} વચનામૃતનું શીર્ષક કયું છે?`,
    },
    quizTitle: (sec, i) => `${sec.name} — ક્વિઝ ${i}`,
    titleQuizTitle: (sec, i) => `${sec.name} — શીર્ષક ક્વિઝ ${i}`.trim(),
    mixTitleQuizTitle: (i) => `સર્વ પ્રકરણ — મિશ્ર શીર્ષક ક્વિઝ ${i}`,
    topicQuizTitle: (sec, i) => `${sec.name} — વાત ક્વિઝ ${i}`.trim(),
    studyQuizTitle: (sec, i) => `${sec.name} — અભ્યાસ ક્વિઝ ${i}`.trim(),
    contentQuizTitle: (sec, i) => `${sec.name} — વિષયવસ્તુ ક્વિઝ ${i}`.trim(),
    subjectQuizTitle: (s, i) => `${s.name} — ક્વિઝ ${i}`.trim(),
    studyTeachingQ: (t) => `“${t}” — આ ઉપદેશ કયા વચનામૃતમાં છે?`,
    studyPrashnaQ: (q) => `“${q}” — આ પ્રશ્ન કયા વચનામૃતમાં પૂછાયો છે?`,
    subjectQ: (name) => `નીચેનામાંથી કયા વચનામૃતમાં ‘${name}’ વિષયની વાત છે?`,
    // Title topics: split on ";" and on "," when every piece is its own "…નું" phrase
    // ("જ્ઞાનની સ્થિતિનું, માહાત્મ્યરૂપી ખટાઈનું"), but not "દેહ, કુસંગ ને પૂર્વ સંસ્કારનું".
    topicSplit: (part) => /નું$/.test(part),
    // "મન જીત્યાનું" -> "કયા વચનામૃતમાં મન જીત્યાની વાત કરી છે?"
    topicQ: (part) =>
      /નું$/.test(part)
        ? `કયા વચનામૃતમાં ${part.slice(0, -'નું'.length)}ની વાત કરી છે?`
        : `“${part}” — આ વાત કયા વચનામૃતમાં કરી છે?`,
    link: (n) => `https://www.anirdesh.com/vachanamrut/index.php?format=gu&vachno=${n}`,
    subjectName: (s) => s.name,
    subjectAlt: (s) => s.en,
  },
  en: {
    out: 'quizzes.en.json',
    idPrefix: 'en-',
    // English source has no ref/askers cleaning needs; refs are built from the section + position
    load: () => readJson('vachanamrut-source-en.json'),
    cleanAsker: (a) => a || null,
    secName: (s) => s.en,
    secAlt: (s) => s.name,
    ref: (v) => `${sectionOf(v).en}-${positionOf(v.vachno)}`,
    q: {
      titleToRef: (v) => `Which Vachanamrut has the title “${v.title}”?`,
      refToTitle: (v) => `What is the title of Vachanamrut ${v.ref}?`,
      date: (label) => `On which date was Vachanamrut ${label} delivered?`,
      teaching: (t) => `“${t}” — In which Vachanamrut is this teaching found?`,
      asker: (label) => `In Vachanamrut ${label}, who asked the question?`,
      sectionTitle: (sec, pos) => `What is the title of the ${enOrdinal(pos)} Vachanamrut of ${sec.en}?`,
    },
    quizTitle: (sec, i) => `${sec.en} — Quiz ${i}`,
    titleQuizTitle: (sec, i) => `${sec.en} — Title Quiz ${i}`.trim(),
    mixTitleQuizTitle: (i) => `All Sections — Mixed Title Quiz ${i}`,
    topicQuizTitle: (sec, i) => `${sec.en} — Topic Quiz ${i}`.trim(),
    studyQuizTitle: (sec, i) => `${sec.en} — Study Quiz ${i}`.trim(),
    contentQuizTitle: (sec, i) => `${sec.en} — Content Quiz ${i}`.trim(),
    subjectQuizTitle: (s, i) => `${s.en || s.name} — Quiz ${i}`.trim(),
    studyTeachingQ: (t) => `“${t}” — In which Vachanamrut is this teaching found?`,
    studyPrashnaQ: (q) => `In which Vachanamrut is this question asked: “${q}”`,
    subjectQ: (name) => `Which of these Vachanamruts deals with the subject “${name}”?`,
    topicSplit: () => false, // English titles use ";" between topics; commas are inside one topic
    topicQ: (part) =>
      part.endsWith('?')
        ? `In which Vachanamrut is the question “${part}” discussed?`
        : `Which Vachanamrut talks about “${part}”?`,
    link: (n) => `https://www.anirdesh.com/vachanamrut/index.php?format=en&vachno=${n}`,
    subjectName: (s) => s.en || s.name,
    subjectAlt: (s) => s.name,
  },
};

function build(lang) {
  const L = LANGS[lang];
  seed = 20261118;
  // Questioners from scripts/askers.json (npm run build-askers) when present: already clean,
  // verified against the text, and merged across Gujarati and English
  const askersFile = path.join(here, 'askers.json');
  const askers = fs.existsSync(askersFile) ? readJson('askers.json')[lang] : null;
  const source = L.load().map((v) => ({ ...v, ref: L.ref(v), ...(askers && { askers: askers[v.vachno] || [] }) }));
  const cleanAsker = askers ? (a) => a || null : L.cleanAsker;

  // pick 3 distinct distractor values; prefer same-section items
  function distractors(v, getValue, count = 3) {
    const correct = getValue(v);
    const sec = sectionOf(v);
    const same = shuffle(source.filter((x) => x.vachno !== v.vachno && sectionOf(x) === sec));
    const other = shuffle(source.filter((x) => sectionOf(x) !== sec));
    const picked = new Set();
    for (const x of [...same, ...other]) {
      const val = getValue(x);
      if (!val || val === correct || picked.has(val)) continue;
      picked.add(val);
      if (picked.size === count) break;
    }
    return [...picked];
  }

  function makeQ(v, type, question, correct, wrong, extra = {}) {
    const options = shuffle([correct, ...wrong]);
    return {
      id: `${v.vachno}-${type}`,
      vachno: v.vachno,
      type,
      question,
      options,
      answer: options.indexOf(correct),
      ...extra,
    };
  }

  const askerPool = [...new Set(source.flatMap((v) => v.askers.map(cleanAsker)).filter(Boolean))];

  const all = []; // per vachanamrut list of questions
  for (const v of source) {
    const qs = [];
    const label = `${v.ref} (${v.title})`;
    const base = { ref: v.ref, title: v.title, link: L.link(v.vachno) };

    qs.push(makeQ(v, 'title-to-ref', L.q.titleToRef(v), v.ref, distractors(v, (x) => x.ref), base));
    qs.push(makeQ(v, 'ref-to-title', L.q.refToTitle(v), v.title, distractors(v, (x) => x.title), base));

    if (v.datePhrase) {
      qs.push(makeQ(v, 'date', L.q.date(label), v.datePhrase, distractors(v, (x) => x.datePhrase), base));
    }

    if (v.teachings.length) {
      const t = trimTeaching(v.teachings[0]);
      qs.push(makeQ(v, 'teaching', L.q.teaching(t), label,
        distractors(v, (x) => `${x.ref} (${x.title})`), { ...base, quote: t }));
    }

    const asker = v.askers.map(cleanAsker).find(Boolean);
    if (asker && askerPool.length > 4) {
      const inThis = new Set(v.askers.map(cleanAsker));
      const wrong = shuffle(askerPool.filter((n) => !inThis.has(n))).slice(0, 3);
      qs.push(makeQ(v, 'asker', L.q.asker(label), asker, wrong, base));
    }
    all.push(qs);
  }

  // Build quizzes per section: shuffle all section questions, chunk into ~QUIZ_SIZE
  const quizzes = [];
  for (const sec of SECTIONS) {
    const pool = shuffle(all.filter((qs) => sectionOf({ vachno: qs[0].vachno }) === sec).flat());
    const n = Math.max(1, Math.round(pool.length / QUIZ_SIZE));
    for (let i = 0; i < n; i++) {
      const questions = pool.slice(Math.round((i * pool.length) / n), Math.round(((i + 1) * pool.length) / n));
      if (!questions.length) continue;
      const vachnos = [...new Set(questions.map((q) => q.vachno))].sort((a, b) => a - b);
      quizzes.push({
        id: `${L.idPrefix}${sec.id}-${i + 1}`,
        section: sec.id,
        title: L.quizTitle(sec, i + 1),
        covers: vachnos,
        questions,
      });
    }
  }

  // Coverage check: every vachanamrut must appear in at least one quiz
  const covered = new Set(quizzes.flatMap((q) => q.covers));
  const missing = source.filter((v) => !covered.has(v.vachno)).map((v) => v.vachno);
  if (missing.length) throw new Error(`[${lang}] Missing coverage: ` + missing.join(','));

  // Title quizzes: exactly one question per Vachanamrut, asked by position in its section.
  // Generated after the main quizzes so the seeded RNG sequence (and so the existing quiz
  // ids/contents) stays unchanged — keep any new generation steps after existing ones.
  const titleQuizzes = [];
  for (const sec of SECTIONS) {
    const questions = source
      .filter((v) => sectionOf(v) === sec)
      .map((v) =>
        makeQ(v, 'section-title', L.q.sectionTitle(sec, positionOf(v.vachno)), v.title,
          distractors(v, (x) => x.title), { ref: v.ref, title: v.title, link: L.link(v.vachno) })
      );
    const n = Math.max(1, Math.round(questions.length / QUIZ_SIZE));
    for (let i = 0; i < n; i++) {
      const qs = questions.slice(Math.round((i * questions.length) / n), Math.round(((i + 1) * questions.length) / n));
      titleQuizzes.push({
        id: `${L.idPrefix}titles-${sec.id}-${i + 1}`,
        kind: 'titles',
        section: sec.id,
        title: L.titleQuizTitle(sec, n > 1 ? i + 1 : ''),
        covers: qs.map((q) => q.vachno),
        questions: qs,
      });
    }
  }
  const titleCovered = titleQuizzes.flatMap((q) => q.covers);
  if (titleCovered.length !== source.length || new Set(titleCovered).size !== source.length) {
    throw new Error(`[${lang}] Title quizzes must cover each Vachanamrut exactly once (got ${titleCovered.length})`);
  }
  quizzes.push(...titleQuizzes);

  // Topic quizzes: one question per topic in each title ("કયા વચનામૃતમાં મન જીત્યાની વાત કરી છે?"),
  // answered with the Vachanamrut ref. Generated last so earlier quizzes keep their RNG sequence.
  const topicsOf = (title) =>
    title
      .split(/\s*;\s*/)
      .flatMap((seg) => {
        const pieces = seg.split(/,\s*/);
        return pieces.length > 1 && pieces.every((p) => L.topicSplit(p.trim())) ? pieces : [seg];
      })
      .map((s) => s.trim())
      .filter(Boolean);
  const topicsByNo = new Map(source.map((v) => [v.vachno, topicsOf(v.title)]));
  const topicQuizzes = [];
  for (const sec of SECTIONS) {
    const pool = [];
    for (const v of source.filter((x) => sectionOf(x) === sec)) {
      topicsByNo.get(v.vachno).forEach((topic, k) => {
        // Wrong answers must not be another Vachanamrut with the same topic (e.g. અન્વય-વ્યતિરેકનું)
        const wrong = [];
        for (const x of shuffle(source)) {
          if (x.vachno === v.vachno || topicsByNo.get(x.vachno).includes(topic)) continue;
          wrong.push(x.ref);
          if (wrong.length === 3) break;
        }
        pool.push({
          ...makeQ(v, 'topic', L.topicQ(topic), v.ref, wrong, { ref: v.ref, title: v.title, link: L.link(v.vachno) }),
          id: `${v.vachno}-topic-${k + 1}`,
        });
      });
    }
    const shuffled = shuffle(pool);
    const n = Math.max(1, Math.round(shuffled.length / QUIZ_SIZE));
    for (let i = 0; i < n; i++) {
      const qs = shuffled.slice(Math.round((i * shuffled.length) / n), Math.round(((i + 1) * shuffled.length) / n));
      topicQuizzes.push({
        id: `${L.idPrefix}topics-${sec.id}-${i + 1}`,
        kind: 'topics',
        section: sec.id,
        title: L.topicQuizTitle(sec, n > 1 ? i + 1 : ''),
        covers: [...new Set(qs.map((q) => q.vachno))].sort((a, b) => positionOf(a) - positionOf(b)),
        questions: qs,
      });
    }
  }
  const topicCovered = new Set(topicQuizzes.flatMap((q) => q.covers));
  if (topicCovered.size !== source.length) {
    throw new Error(`[${lang}] Topic quizzes must cover every Vachanamrut (got ${topicCovered.size})`);
  }
  quizzes.push(...topicQuizzes);

  // Wrong answers: 3 random refs, never the Vachanamrut itself or any in `exclude`
  const randomRefs = (v, exclude) => {
    const wrong = [];
    for (const x of shuffle(source)) {
      if (x.vachno === v.vachno || exclude.has(x.vachno)) continue;
      wrong.push(x.ref);
      if (wrong.length === 3) break;
    }
    return wrong;
  };
  const chunk = (qs) => {
    const n = Math.max(1, Math.round(qs.length / QUIZ_SIZE));
    return Array.from({ length: n }, (_, i) => qs.slice(Math.round((i * qs.length) / n), Math.round(((i + 1) * qs.length) / n)));
  };
  const byNo = new Map(source.map((v) => [v.vachno, v]));
  const coversOf = (qs) => [...new Set(qs.map((q) => q.vachno))].sort((a, b) => positionOf(a) - positionOf(b));

  // Study quizzes: every bold teaching and every sabha question (scripts/study-source.json)
  const study = fs.existsSync(path.join(here, 'study-source.json')) ? readJson('study-source.json')[lang] : [];
  const studyQuizzes = [];
  for (const sec of SECTIONS) {
    const pool = [];
    const counter = new Map();
    for (const item of study.filter((x) => sectionOf(x) === sec)) {
      const v = byNo.get(item.vachno);
      const k = (counter.get(v.vachno) || 0) + 1;
      counter.set(v.vachno, k);
      const text = item.kind === 'teaching' ? trimTeaching(item.text) : item.text;
      const q = item.kind === 'teaching' ? L.studyTeachingQ(text) : L.studyPrashnaQ(text);
      pool.push({
        ...makeQ(v, item.kind, q, v.ref, randomRefs(v, new Set(item.alsoIn)), { ref: v.ref, title: v.title, link: L.link(v.vachno) }),
        id: `${v.vachno}-study-${k}`,
      });
    }
    if (!pool.length) continue;
    chunk(shuffle(pool)).forEach((qs, i, all) =>
      studyQuizzes.push({
        id: `${L.idPrefix}study-${sec.id}-${i + 1}`,
        kind: 'study',
        section: sec.id,
        title: L.studyQuizTitle(sec, all.length > 1 ? i + 1 : ''),
        covers: coversOf(qs),
        questions: qs,
      })
    );
  }
  quizzes.push(...studyQuizzes);

  // Subject quizzes: "which of these deals with subject X?" for every Vachanamrut in the
  // hand-entered (app) subject lists; wrong answers are Vachanamrut not in that subject.
  const subjectList = fs.existsSync(path.join(here, 'subjects.json')) ? readJson('subjects.json') : [];
  const subjectQuizzes = [];
  for (const subj of subjectList.filter((x) => x.source === 'manual')) {
    const members = new Set(subj.vachnos);
    const name = L.subjectName(subj);
    const pool = subj.vachnos.map((n) => {
      const v = byNo.get(n);
      return {
        ...makeQ(v, 'subject', L.subjectQ(name), v.ref, randomRefs(v, members), { ref: v.ref, title: v.title, link: L.link(n) }),
        id: `${n}-subject-${subj.id}`,
      };
    });
    chunk(shuffle(pool)).forEach((qs, i, all) =>
      subjectQuizzes.push({
        id: `${L.idPrefix}subject-${subj.id}-${i + 1}`,
        kind: 'subject',
        subject: subj.id,
        title: L.subjectQuizTitle(subj, all.length > 1 ? i + 1 : ''),
        covers: coversOf(qs),
        questions: qs,
      })
    );
  }
  quizzes.push(...subjectQuizzes);

  // Content questions written from the full text (scripts/content-questions.json). Each must carry
  // `evidence` copied word for word from that Vachanamrut; when the text cache is available the
  // build fails on any evidence not found, so a wrong or invented answer can't slip in.
  const contentFile = path.join(here, 'content-questions.json');
  const content = fs.existsSync(contentFile) ? readJson('content-questions.json')[lang] || {} : {};
  const cacheText = (n) => {
    const f = path.join(here, '.cache', `${n}.txt`);
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\s+/g, ' ') : null;
  };
  const badEvidence = [];
  const contentQuizzes = [];

  // Wrong options for content questions. The hand-written ones were often short and generic
  // next to a long, specific correct quote (correct option was the longest ~78% of the time).
  // Keep a hand-written wrong option only when its length is close to the correct one; fill
  // the rest with correct answers of *other* content questions — same Vachanamrut first, then
  // same section, then any — of similar length, so every option reads like real text.
  // Never use a candidate found in this question's evidence or overlapping the correct answer.
  // Uses its own seeded RNG per question so the main RNG sequence (and other quizzes) is untouched.
  const answerPool = source.flatMap((v) =>
    (content[v.vachno] || []).map((item) => ({ vachno: v.vachno, sec: sectionOf(v), text: item.options[0] }))
  );
  const lengthOk = (a, b, lo, hi) => a.length / b.length >= lo && a.length / b.length <= hi;
  function contentOptions(v, item, qid) {
    const correct = item.options[0];
    const ev = item.evidence.replace(/\s+/g, ' ');
    let h = 0;
    for (const ch of qid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const rand = () => ((h = (h * 1103515245 + 12345) >>> 0) / 2 ** 32);
    const clash = (t) => t === correct || correct.includes(t) || t.includes(correct) || ev.includes(t);
    // Same "form" as the correct answer: list vs sentence, ending, word count
    const words = (t) => t.split(/\s+/).filter(Boolean);
    const commas = (t) => (t.match(/[,،]/g) || []).length;
    const ending = (t) => words(t).at(-1)?.slice(-2) || '';
    const cw = words(correct).length;
    const shape = (t) =>
      (Math.min(commas(t), 3) === Math.min(commas(correct), 3) ? 2 : 0) +
      (ending(t) === ending(correct) ? 1 : 0) +
      (Math.abs(words(t).length - cw) <= Math.max(1, cw * 0.3) ? 1 : 0);
    // Hand-written wrong options fit the question's topic: keep them unless much shorter/longer
    const picked = item.options.slice(1).filter((o) => lengthOk(o, correct, 0.45, 2.2));
    const tiers = [
      (c) => c.vachno === v.vachno,
      (c) => c.vachno !== v.vachno && c.sec === sectionOf(v),
      (c) => c.sec !== sectionOf(v),
    ];
    for (const [lo, hi] of [[0.6, 1.7], [0.45, 2.2]]) {
      for (const inTier of tiers) {
        if (picked.length >= 3) break;
        const cands = answerPool
          .filter((c) => inTier(c) && lengthOk(c.text, correct, lo, hi) && !clash(c.text) && !picked.includes(c.text))
          .map((c) => ({ t: c.text, s: shape(c.text), r: rand() }))
          .sort((a, b) => b.s - a.s || a.r - b.r);
        for (const c of cands) {
          if (picked.length >= 3) break;
          if (!picked.includes(c.t)) picked.push(c.t);
        }
      }
    }
    // Last resort: the original hand-written options
    for (const o of item.options.slice(1)) if (picked.length < 3 && !picked.includes(o)) picked.push(o);
    return [correct, ...picked.slice(0, 3)];
  }

  for (const sec of SECTIONS) {
    const pool = [];
    for (const v of source.filter((x) => sectionOf(x) === sec)) {
      (content[v.vachno] || []).forEach((item, k) => {
        const text = lang === 'gu' ? cacheText(v.vachno) : null;
        if (text && !text.includes(item.evidence.replace(/\s+/g, ' '))) badEvidence.push(`${v.vachno}: ${item.q}`);
        if (new Set(item.options).size !== 4) badEvidence.push(`${v.vachno}: needs 4 distinct options: ${item.q}`);
        const options = shuffle(contentOptions(v, item, `${v.vachno}-content-${k + 1}`));
        pool.push({
          id: `${v.vachno}-content-${k + 1}`,
          vachno: v.vachno,
          type: 'content',
          question: `${v.ref}: ${item.q}`,
          options,
          answer: options.indexOf(item.options[0]),
          ref: v.ref,
          title: v.title,
          link: L.link(v.vachno),
          evidence: item.evidence,
        });
      });
    }
    if (!pool.length) continue;
    chunk(pool).forEach((qs, i, all) =>
      contentQuizzes.push({
        id: `${L.idPrefix}content-${sec.id}-${i + 1}`,
        kind: 'study',
        section: sec.id,
        title: L.contentQuizTitle(sec, all.length > 1 ? i + 1 : ''),
        covers: coversOf(qs),
        questions: qs,
      })
    );
  }
  if (badEvidence.length) {
    throw new Error(`[${lang}] content questions failed the evidence check:\n  ${badEvidence.join('\n  ')}`);
  }
  quizzes.push(...contentQuizzes);

  // Mixed title quizzes: the same one-per-Vachanamrut title questions, shuffled across
  // all sections and chunked into ~QUIZ_SIZE. No section (shown under "all" on the
  // titles tab). Generated last so every earlier quiz keeps its RNG sequence.
  const mixQuestions = shuffle(titleQuizzes.flatMap((q) => q.questions));
  const nMix = Math.max(1, Math.round(mixQuestions.length / QUIZ_SIZE));
  const mixQuizzes = [];
  for (let i = 0; i < nMix; i++) {
    const qs = mixQuestions.slice(Math.round((i * mixQuestions.length) / nMix), Math.round(((i + 1) * mixQuestions.length) / nMix));
    mixQuizzes.push({
      id: `${L.idPrefix}titles-mix-${i + 1}`,
      kind: 'titles',
      title: L.mixTitleQuizTitle(i + 1),
      covers: qs.map((q) => q.vachno),
      questions: qs,
    });
  }
  if (mixQuizzes.flatMap((q) => q.covers).length !== source.length) {
    throw new Error(`[${lang}] Mixed title quizzes must cover each Vachanamrut exactly once`);
  }
  quizzes.push(...mixQuizzes);

  // Ramayan / Mahabharat quizzes (kind 'ramayan' / 'mahabharat', section = Kanda/Parva id) from
  // scripts/epic-<epic>.json: { epic: {gu,en}, parts: [{id,gu,en}], questions: [{ p, gu: [q, correct,
  // w1, w2, w3], en: [...] }] }. Written by hand/AI from well-known Valmiki Ramayan / Vyasa
  // Mahabharat facts; wrong options are of the same kind (people/places/objects of that story).
  // Options are shuffled with a per-question seed so adding questions never reshuffles others,
  // and this step runs last so the main RNG sequence is untouched.
  const epics = {};
  for (const epic of ['ramayan', 'mahabharat']) {
    const file = path.join(here, `epic-${epic}.json`);
    if (!fs.existsSync(file)) continue;
    const src = readJson(`epic-${epic}.json`);
    const partIds = new Set(src.parts.map((p) => p.id));
    const perPart = new Map(src.parts.map((p) => [p.id, []]));
    const seenQ = new Set();
    src.questions.forEach((item, k) => {
      const row = item[lang];
      if (!partIds.has(item.p)) throw new Error(`[${lang}] ${epic} #${k + 1}: unknown part "${item.p}"`);
      if (!Array.isArray(row) || row.length !== 5 || new Set(row.slice(1)).size !== 4 || row.some((x) => !String(x).trim())) {
        throw new Error(`[${lang}] ${epic} #${k + 1}: needs a question and 4 distinct non-empty options: ${JSON.stringify(row)}`);
      }
      if (seenQ.has(row[0])) throw new Error(`[${lang}] ${epic} #${k + 1}: duplicate question: ${row[0]}`);
      seenQ.add(row[0]);
      const id = `${epic}-${item.p}-q${perPart.get(item.p).length + 1}`;
      let h = 0;
      for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const rand = () => ((h = (h * 1103515245 + 12345) >>> 0) / 2 ** 32);
      const options = row.slice(1).map((o) => [o, rand()]).sort((a, b) => a[1] - b[1]).map(([o]) => o);
      const part = src.parts.find((p) => p.id === item.p);
      perPart.get(item.p).push({
        id,
        type: 'epic',
        question: row[0],
        options,
        answer: options.indexOf(row[1]),
        ref: `${src.epic[lang]} — ${part[lang]}`,
      });
    });
    epics[epic] = {
      name: src.epic[lang],
      parts: src.parts.map((p) => ({ id: p.id, name: p[lang], count: perPart.get(p.id).length })).filter((p) => p.count),
    };
    for (const p of src.parts) {
      const qs = perPart.get(p.id);
      if (!qs.length) continue;
      chunk(qs).forEach((part, i, all) =>
        quizzes.push({
          id: `${L.idPrefix}${epic}-${p.id}-${i + 1}`,
          kind: epic,
          section: p.id,
          title: `${p[lang]} — ${lang === 'gu' ? 'ક્વિઝ' : 'Quiz'}${all.length > 1 ? ` ${i + 1}` : ''}`,
          covers: [],
          questions: part,
        })
      );
    }
  }

  const subjects = fs.existsSync(path.join(here, 'subjects.json')) ? readJson('subjects.json') : [];
  const data = {
    generated: new Date().toISOString().slice(0, 10),
    lang,
    source: 'https://www.anirdesh.com/vachanamrut/',
    sections: SECTIONS.map((s) => ({ id: s.id, name: L.secName(s), alt: L.secAlt(s), count: s.nos.length })),
    vachanamruts: source
      .map((v) => ({ vachno: v.vachno, section: sectionOf(v).id, ref: v.ref, title: v.title, date: v.datePhrase }))
      .sort((a, b) => SECTIONS.indexOf(sectionOfNo(a.vachno)) - SECTIONS.indexOf(sectionOfNo(b.vachno)) || positionOf(a.vachno) - positionOf(b.vachno)),
    // From scripts/subjects.json (npm run tag-subjects); tagging is language-independent
    subjects: subjects.map((s) => ({
      id: s.id, name: L.subjectName(s), alt: L.subjectAlt(s), source: s.source,
      // reading order (Amdavad 4–8 are vachno 264–268 but belong after Amdavad 3)
      vachnos: [...s.vachnos].sort((a, b) => SECTIONS.indexOf(sectionOfNo(a)) - SECTIONS.indexOf(sectionOfNo(b)) || positionOf(a) - positionOf(b)),
    })),
    quizzes,
    epics,
  };
  fs.writeFileSync(path.join(here, '..', 'public', 'data', L.out), JSON.stringify(data));
  const total = quizzes.reduce((a, q) => a + q.questions.length, 0);
  console.log(`[${lang}] quizzes=${quizzes.length} (titles=${titleQuizzes.length}+${mixQuizzes.length} mixed, topics=${topicQuizzes.length}, study=${studyQuizzes.length}, subject=${subjectQuizzes.length}, content=${contentQuizzes.reduce((a, q) => a + q.questions.length, 0)}q) questions=${total} covered=${covered.size}/${source.length} askers=${askerPool.length}`);
}

build('gu');
build('en');
