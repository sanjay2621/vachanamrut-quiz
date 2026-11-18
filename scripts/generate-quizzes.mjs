// Generates public/data/quizzes.json from scripts/vachanamrut-source.json
// Run: npm run generate
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(here, 'vachanamrut-source.json'), 'utf8'));
const OUT = path.join(here, '..', 'public', 'data', 'quizzes.json');
const QUIZ_SIZE = 25;

const SECTIONS = [
  { id: 'gp', name: 'ગઢડા પ્રથમ', en: 'Gadhada Pratham', from: 1, to: 78 },
  { id: 'sar', name: 'સારંગપુર', en: 'Sarangpur', from: 79, to: 96 },
  { id: 'kar', name: 'કારીયાણી', en: 'Kariyani', from: 97, to: 108 },
  { id: 'loya', name: 'લોયા', en: 'Loya', from: 109, to: 126 },
  { id: 'pan', name: 'પંચાળા', en: 'Panchala', from: 127, to: 133 },
  { id: 'gm', name: 'ગઢડા મધ્ય', en: 'Gadhada Madhya', from: 134, to: 200 },
  { id: 'var', name: 'વરતાલ', en: 'Vartal', from: 201, to: 220 },
  { id: 'amd', name: 'અમદાવાદ', en: 'Amdavad', from: 221, to: 223 },
  { id: 'ga', name: 'ગઢડા અંત્ય', en: 'Gadhada Antya', from: 224, to: 262 },
];

// deterministic RNG so regenerating gives same output
let seed = 20261118;
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
const sectionOf = (v) => SECTIONS.find((s) => v.vachno >= s.from && v.vachno <= s.to);

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

function trimTeaching(t) {
  let s = t.replace(/\s+/g, ' ').trim();
  if (s.length > 220) {
    const cut = s.slice(0, 220);
    const dot = cut.lastIndexOf('.');
    s = (dot > 80 ? cut.slice(0, dot + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…');
  }
  return s;
}

// Asker names: keep only clean, recognisable names
const NAME_END = /(સ્વામી|ભટ્ટ|ઠક્કર|મુનિ|ધાધલ|ભાઈ|બ્રહ્મચારી|ખાચર|જી|દાસ|ભક્ત|આચાર્ય|રાય|ચંદ|ભગત|બાઈ|ઠાકોર|શાસ્ત્રી|પુરાણી|દવે|વાળા|મુનિ|ગિરિ|પટેલ|કાકા)$/;
function cleanAsker(a) {
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
const askerPool = [...new Set(source.flatMap((v) => v.askers.map(cleanAsker)).filter(Boolean))];

const all = []; // per vachanamrut list of questions
for (const v of source) {
  const qs = [];
  const label = `${v.ref} (${v.title})`;
  const link = `https://www.anirdesh.com/vachanamrut/index.php?format=gu&vachno=${v.vachno}`;
  const base = { ref: v.ref, title: v.title, link };

  qs.push(makeQ(v, 'title-to-ref', `“${v.title}” — આ શીર્ષકવાળું વચનામૃત કયું છે?`, v.ref,
    distractors(v, (x) => x.ref), base));

  qs.push(makeQ(v, 'ref-to-title', `વચનામૃત ${v.ref}નું શીર્ષક શું છે?`, v.title,
    distractors(v, (x) => x.title), base));

  if (v.datePhrase) {
    qs.push(makeQ(v, 'date', `વચનામૃત ${label} કઈ તિથિએ કહેવાયું હતું?`, v.datePhrase,
      distractors(v, (x) => x.datePhrase), base));
  }

  if (v.teachings.length) {
    const t = trimTeaching(v.teachings[0]);
    qs.push(makeQ(v, 'teaching', `“${t}” — આ ઉપદેશ કયા વચનામૃતમાં છે?`, label,
      distractors(v, (x) => `${x.ref} (${x.title})`), { ...base, quote: t }));
  }

  const asker = v.askers.map(cleanAsker).find(Boolean);
  if (asker && askerPool.length > 4) {
    const inThis = new Set(v.askers.map(cleanAsker));
    const wrong = shuffle(askerPool.filter((n) => !inThis.has(n))).slice(0, 3);
    qs.push(makeQ(v, 'asker', `વચનામૃત ${label}માં પ્રશ્ન પૂછનાર કોણ હતા?`, asker, wrong, base));
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
      id: `${sec.id}-${i + 1}`,
      section: sec.id,
      title: `${sec.name} — ક્વિઝ ${i + 1}`,
      titleEn: `${sec.en} — Quiz ${i + 1}`,
      covers: vachnos,
      questions,
    });
  }
}

// Coverage check: every vachanamrut must appear in at least one quiz
const covered = new Set(quizzes.flatMap((q) => q.covers));
const missing = source.filter((v) => !covered.has(v.vachno)).map((v) => v.vachno);
if (missing.length) throw new Error('Missing coverage: ' + missing.join(','));

// Title quizzes: exactly one question per Vachanamrut, asked by position in its section
// ("સારંગપુરના ૭મા વચનામૃતનું શીર્ષક કયું છે?"). Generated after the main quizzes so the
// seeded RNG sequence (and so the existing quiz ids/contents) stays unchanged.
const toGu = (n) => String(n).replace(/\d/g, (d) => '૦૧૨૩૪૫૬૭૮૯'[d]);
const ordinal = (n) => toGu(n) + ({ 1: 'લા', 2: 'જા', 3: 'જા', 4: 'થા', 6: 'ઠ્ઠા' }[n] || 'મા');
const titleQuizzes = [];
for (const sec of SECTIONS) {
  const questions = source
    .filter((v) => sectionOf(v) === sec)
    .map((v) => makeQ(
      v,
      'section-title',
      `${sec.name}ના ${ordinal(v.vachno - sec.from + 1)} વચનામૃતનું શીર્ષક કયું છે?`,
      v.title,
      distractors(v, (x) => x.title),
      {
        ref: v.ref,
        title: v.title,
        link: `https://www.anirdesh.com/vachanamrut/index.php?format=gu&vachno=${v.vachno}`,
      }
    ));
  const n = Math.max(1, Math.round(questions.length / QUIZ_SIZE));
  for (let i = 0; i < n; i++) {
    const qs = questions.slice(Math.round((i * questions.length) / n), Math.round(((i + 1) * questions.length) / n));
    titleQuizzes.push({
      id: `titles-${sec.id}-${i + 1}`,
      kind: 'titles',
      section: sec.id,
      title: `${sec.name} — શીર્ષક ક્વિઝ ${n > 1 ? i + 1 : ''}`.trim(),
      titleEn: `${sec.en} — Title Quiz ${n > 1 ? i + 1 : ''}`.trim(),
      covers: qs.map((q) => q.vachno),
      questions: qs,
    });
  }
}
const titleCovered = titleQuizzes.flatMap((q) => q.covers);
if (titleCovered.length !== source.length || new Set(titleCovered).size !== source.length) {
  throw new Error(`Title quizzes must cover each Vachanamrut exactly once (got ${titleCovered.length})`);
}
quizzes.push(...titleQuizzes);

const data = {
  generated: new Date().toISOString().slice(0, 10),
  source: 'https://www.anirdesh.com/vachanamrut/',
  sections: SECTIONS,
  vachanamruts: source.map((v) => ({ vachno: v.vachno, ref: v.ref, title: v.title, date: v.datePhrase })),
  quizzes,
};
fs.writeFileSync(OUT, JSON.stringify(data));
const total = quizzes.reduce((a, q) => a + q.questions.length, 0);
console.log(`quizzes=${quizzes.length} (titles=${titleQuizzes.length}) questions=${total} covered=${covered.size}/262 askers=${askerPool.length}`);
