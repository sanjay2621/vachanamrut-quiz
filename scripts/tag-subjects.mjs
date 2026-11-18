// Tags each Vachanamrut with subjects by keyword density over its full text
// (scripts/.cache/<n>.txt, from `npm run fetch-text`). Writes scripts/subjects.json.
// Run: npm run tag-subjects
//
// This is an automatic, keyword-based approximation, not an official classification.
// A subject is tagged when its weighted keyword hits per 1000 chars are well above the
// corpus average for that subject (so common words like ધર્મ/સંત don't tag everything).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_VACHNOS } from './vachnos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(here, '.cache');

const RATIO = 1.8; // density must be >= RATIO x corpus mean
const MIN_HITS = 3; // and weighted hits >= MIN_HITS
const MAX_PER_VACH = 5;

// [keyword, weight]. Keywords are substrings, so stems also match inflected forms.
export const SUBJECTS = [
  { id: 'akshar', name: 'અક્ષરબ્રહ્મ', kw: [['અક્ષરબ્રહ્મ', 3], ['અક્ષરધામ', 2], ['અક્ષર', 1], ['બ્રહ્મરૂપ', 2], ['બ્રહ્મસ્વરૂપ', 2], ['મૂળ અક્ષર', 3]] },
  { id: 'abhav', name: 'અભાવ-અવગુણ-દ્રોહ', kw: [['અભાવ', 2], ['અવગુણ', 2], ['દ્રોહ', 2], ['ઈર્ષ્યા', 1], ['ઇર્ષ્યા', 1], ['દોષ પરઠ', 2]] },
  { id: 'antardrishti', name: 'અંતર્દૃષ્ટિ', kw: [['અંતર્દૃષ્ટિ', 4], ['અંતર્દ્રષ્ટિ', 4], ['અંતરદૃષ્ટિ', 4], ['અંતરદ્રષ્ટિ', 4], ['પોતાના અંતર', 2], ['અંતરમાં તપાસ', 3], ['અંતરને તપાસ', 3], ['પોતાનો વિચાર', 2]] },
  { id: 'agna', name: 'આજ્ઞા', kw: [['આજ્ઞા', 2], ['વચનમાં', 1], ['વચન પ્રમાણે', 2], ['વચને કરીને', 1]] },
  { id: 'atmanishtha', name: 'આત્મનિષ્ઠા', kw: [['આત્મનિષ્ઠા', 4], ['આત્મનિષ્ઠ', 3], ['આત્મા', 1], ['આત્મસ્વરૂપ', 2], ['આત્મારૂપ', 2], ['દેહથી જુદો', 3], ['દેહથી પૃથક', 3], ['દેહ થકી', 1]] },
  { id: 'katha', name: 'કથાવાર્તા-સમાગમ', kw: [['કથાવાર્તા', 3], ['સમાગમ', 2], ['કથા', 1], ['વાર્તા', 1], ['શ્રવણ', 1]] },
  { id: 'kusang', name: 'કુસંગ', kw: [['કુસંગ', 3], ['નાસ્તિક', 2], ['શુષ્કવેદાંત', 2], ['શુષ્કજ્ઞાન', 2], ['વિમુખ', 1]] },
  { id: 'deshkal', name: 'દેશકાળ અને પૂર્વસંસ્કાર', kw: [['દેશકાળ', 3], ['દેશ, કાળ', 2], ['સંસ્કાર', 2], ['પ્રારબ્ધ', 2], ['શુભ-અશુભ', 1], ['દેશ, કાળ, ક્રિયા', 3]] },
  { id: 'niyam', name: 'નિયમ-ધર્મ', kw: [['નિયમ', 2], ['ધર્મ', 1], ['વર્તમાન', 1], ['સ્વધર્મ', 2], ['બ્રહ્મચર્ય', 2], ['અહિંસા', 2]] },
  { id: 'nishchay', name: 'નિશ્ચય-આશરો', kw: [['નિશ્ચય', 2], ['આશરો', 2], ['આશરે', 1], ['આશ્રય', 2], ['શરણ', 1]] },
  // Counted only when the word refers to Bhagwan or Sant/Sadhu/Bhakt (see NEAR_DIVINE), so
  // e.g. "પ્રત્યક્ષ દેખાય છે" (= "is evident") or "કામ પ્રગટ થાય" don't count.
  {
    id: 'pragat',
    name: 'પ્રગટ-પ્રત્યક્ષ-નયનગોચર',
    near: 'divine',
    kw: [
      ['પ્રગટ', 2], ['પ્રકટ', 2], ['પ્રત્યક્ષ', 3], ['નયનગોચર', 4], ['નેત્રગોચર', 4], ['દૃષ્ટિગોચર', 3],
      ['સાક્ષાત્', 2, { notAfter: 'કાર' }], // skip સાક્ષાત્કાર (realization), a different idea
      ['મનુષ્યરૂપે', 2],
    ],
  },
  { id: 'bhaktlakshan', name: 'ભક્ત લક્ષણ', kw: [['ભક્તનાં લક્ષણ', 4], ['ભક્તનું લક્ષણ', 4], ['ભક્તનો લક્ષણ', 4], ['એકાંતિક ભક્ત', 3], ['ઉત્તમ ભક્ત', 3], ['હરિભક્ત', 1], ['સત્સંગી', 1]] },
  { id: 'bhakti', name: 'ભક્તિ', kw: [['ભક્તિ', 2], ['નવધા', 3], ['માહાત્મ્યે સહિત', 2]] },
  { id: 'sukh', name: 'ભગવાનનું સુખ', kw: [['ભગવાનનું સુખ', 4], ['ભગવાનના સુખ', 4], ['મૂર્તિનું સુખ', 4], ['પરમ સુખ', 2], ['સુખ', 1], ['આનંદ', 1]] },
  { id: 'priti', name: 'ભગવાનમાં પ્રીતિ', kw: [['પ્રીતિ', 2], ['હેત', 1], ['સ્નેહ', 1], ['પ્રેમ', 2]] },
  { id: 'manushyabhav', name: 'મનુષ્યભાવ-દિવ્યભાવ', kw: [['મનુષ્યભાવ', 4], ['દિવ્યભાવ', 4], ['મનુષ્ય જેવા', 2], ['મનુષ્યચરિત્ર', 3], ['દિવ્ય', 1], ['માયિક', 1]] },
  { id: 'mahima', name: 'મહિમા', kw: [['મહિમા', 2], ['માહાત્મ્ય', 2], ['મોટપ', 1]] },
  { id: 'vasana', name: 'વાસના-પંચવિષય', kw: [['વાસના', 2], ['પંચવિષય', 3], ['વિષય', 1], ['ઇન્દ્રિય', 1], ['કામ, ક્રોધ', 2], ['સ્વાદ', 1], ['લોભ', 1]] },
  { id: 'vairagya', name: 'વૈરાગ્ય', kw: [['વૈરાગ્ય', 2], ['ત્યાગ', 1], ['નાશવંત', 2], ['ઉદાસ', 1]] },
  { id: 'shriji', name: 'શ્રીજીમહારાજનું વ્યક્તિત્વ', kw: [['અમારો સ્વભાવ', 4], ['અમારી રુચિ', 4], ['અમારી રીત', 3], ['અમારે તો', 2], ['અમે તો', 2], ['અમને તો', 2], ['અમારા મનમાં', 2]] },
  { id: 'satpurush', name: 'સત્પુરુષ-સંતમહિમા', kw: [['સત્પુરુષ', 3], ['મોટા સંત', 2], ['મોટા સાધુ', 2], ['એકાંતિક સાધુ', 2], ['સંતનો', 1], ['સંતને', 1], ['સાધુનો', 1]] },
  { id: 'sarvakarta', name: 'સર્વકર્તા', kw: [['સર્વકર્તા', 4], ['કર્તા', 2], ['કર્તાહર્તા', 3], ['નિયંતા', 2], ['અંતર્યામી', 1], ['કાળ, કર્મ', 2]] },
  { id: 'sarvopari', name: 'સર્વોપરી', kw: [['સર્વોપરી', 4], ['સર્વોપરિ', 4], ['પુરુષોત્તમ', 2], ['સર્વેશ્વર', 2], ['અવતારી', 2], ['સર્વના કારણ', 3], ['પરબ્રહ્મ', 1]] },
  { id: 'santlakshan', name: 'સંત લક્ષણ', kw: [['સંતનાં લક્ષણ', 4], ['સાધુનાં લક્ષણ', 4], ['સાધુનું લક્ષણ', 4], ['સંતનું લક્ષણ', 4], ['સાધુતા', 3], ['ખરો સાધુ', 3], ['સાચો સાધુ', 3], ['નિર્માની', 2]] },
  { id: 'sambandh', name: 'સંબંધનો મહિમા', kw: [['સંબંધ', 2]] },
  { id: 'sakar', name: 'સાકાર', kw: [['સાકાર', 4], ['નિરાકાર', 3], ['મૂર્તિમાન', 2], ['આકાર', 1], ['દિવ્ય મૂર્તિ', 2]] },
  { id: 'seva', name: 'સેવા', kw: [['સેવા', 2], ['ટેલ', 1], ['ચાકરી', 2], ['પરિચર્યા', 3]] },
];

// Words for Bhagwan, Sant/Sadhu and Bhakt (stems; inflected forms match too)
const NEAR_DIVINE = new RegExp(
  [
    'ભગવાન', 'શ્રીકૃષ્ણ', 'નારાયણ', 'પુરુષોત્તમ', 'શ્રીજીમહારાજ', 'મહારાજ', 'હરિ', 'પરમેશ્વર', 'ઈશ્વર',
    'પરમાત્મા', 'પરબ્રહ્મ', 'પ્રભુ', 'અવતાર', 'મૂર્તિ', 'ઇષ્ટદેવ', 'મનુષ્યાકૃતિ', 'રાજાધિરાજ',
    'કલ્યાણને અર્થે', 'કલ્યાણ કરવા', 'પૃથ્વી ઉપર', 'પૃથ્વીને વિષે', 'પતિતપાવન', 'અધમઉદ્ધારણ',
    'સંત', 'સાધુ', 'સત્પુરુષ', 'મોટા પુરુષ', 'ભક્ત', 'ગુરુ', 'એકાંતિક',
  ].join('|')
);
const BEFORE = 60; // chars of context before the keyword
const AFTER = 50; // and after it

// English subject names (used by the English site)
const EN = {
  akshar: 'Aksharbrahma',
  abhav: 'Dislike, Fault-Finding & Enmity',
  antardrishti: 'Introspection',
  agna: 'Obeying Commands (Āgnā)',
  atmanishtha: 'Ātmanishthā (Knowing Oneself as the Ātmā)',
  katha: 'Spiritual Discourses & Association',
  kusang: 'Bad Company (Kusang)',
  deshkal: 'Place, Time & Past Impressions',
  niyam: 'Codes of Conduct & Dharma',
  nishchay: 'Conviction & Refuge in God',
  pragat: 'Manifest Form of God (Pragat, Pratyaksh)',
  bhaktlakshan: 'Qualities of a Devotee',
  bhakti: 'Devotion (Bhakti)',
  sukh: 'Bliss of God',
  priti: 'Love for God',
  manushyabhav: 'Human Traits & Divinity in God',
  mahima: 'Glory (Mahimā)',
  vasana: 'Desires & Sense Pleasures',
  vairagya: 'Detachment (Vairāgya)',
  shriji: 'Personality of Shriji Mahārāj',
  satpurush: 'Satpurush & Glory of the Sant',
  sarvakarta: 'God as the All-Doer',
  sarvopari: 'Supremacy of God',
  santlakshan: 'Qualities of a Sant',
  sambandh: 'Glory of Association with God',
  sakar: 'God Has a Divine Form (Sākār)',
  seva: 'Service (Sevā)',
};

const count = (text, kw, near, opts = {}) => {
  let n = 0;
  for (let i = text.indexOf(kw); i !== -1; i = text.indexOf(kw, i + kw.length)) {
    if (opts.notAfter && text.startsWith(opts.notAfter, i + kw.length)) continue;
    if (near) {
      // Context stays within the sentence so a referent in the next sentence doesn't count
      const pre = text.slice(Math.max(0, i - BEFORE), i).split(/[.।?!\n]/).pop();
      const post = text.slice(i + kw.length, i + kw.length + AFTER).split(/[.।?!\n]/)[0];
      if (!near.test(pre) && !near.test(post)) continue;
    }
    n++;
  }
  return n;
};

const docs = [];
for (const n of ALL_VACHNOS) {
  const file = path.join(CACHE, `${n}.txt`);
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}. Run npm run fetch-text first.`);
  docs.push({ vachno: n, text: fs.readFileSync(file, 'utf8') });
}

// hits[d][s] and density per 1000 chars
for (const d of docs) {
  d.hits = SUBJECTS.map((s) =>
    s.kw.reduce((a, [k, w, opts]) => a + w * count(d.text, k, s.near === 'divine' ? NEAR_DIVINE : null, opts), 0)
  );
  d.density = d.hits.map((h) => (h * 1000) / d.text.length);
}
const mean = SUBJECTS.map((_, i) => docs.reduce((a, d) => a + d.density[i], 0) / docs.length);

const tags = {};
for (const d of docs) {
  const ranked = SUBJECTS.map((s, i) => ({ id: s.id, ratio: d.density[i] / (mean[i] || 1), hits: d.hits[i] }))
    .sort((a, b) => b.ratio - a.ratio);
  let picked = ranked.filter((r) => r.ratio >= RATIO && r.hits >= MIN_HITS).slice(0, MAX_PER_VACH);
  if (!picked.length) picked = ranked.slice(0, 1); // every Vachanamrut gets at least one subject
  tags[d.vachno] = picked.map((r) => r.id);
}

// Hand-entered lists (scripts/subjects-manual.json) replace the automatic result for that subject
const manualFile = path.join(here, 'subjects-manual.json');
const manual = fs.existsSync(manualFile) ? JSON.parse(fs.readFileSync(manualFile, 'utf8')) : {};
for (const id of Object.keys(manual)) {
  if (id.startsWith('_')) continue;
  if (!SUBJECTS.some((s) => s.id === id)) throw new Error(`subjects-manual.json: unknown subject "${id}"`);
  const bad = manual[id].filter((n) => !Number.isInteger(n) || !ALL_VACHNOS.includes(n));
  if (bad.length) throw new Error(`subjects-manual.json: ${id} has invalid vachno ${bad.join(',')}`);
}

const out = SUBJECTS.map((s) => {
  const list = manual[s.id];
  return {
    id: s.id,
    name: s.name,
    en: EN[s.id],
    source: list ? 'manual' : 'auto',
    vachnos: list
      ? [...new Set(list)].sort((a, b) => a - b)
      : docs.filter((d) => tags[d.vachno].includes(s.id)).map((d) => d.vachno),
  };
});
fs.writeFileSync(path.join(here, 'subjects.json'), JSON.stringify(out, null, 1));
for (const s of out) console.log(String(s.vachnos.length).padStart(3), s.source.padEnd(6), s.name);
