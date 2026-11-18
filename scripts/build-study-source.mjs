// Builds scripts/study-source.json: per language, every bold teaching and every question asked
// in the sabha ("પ્રશ્ન પૂછ્યો જે, “…?”"), each with `alsoIn` = other Vachanamrut whose text
// contains the same passage (so they are never used as wrong answers).
// Inputs: cache (npm run fetch-text) + the committed source JSON files.
// Run: npm run build-study
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_VACHNOS } from './vachnos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(here, '.cache');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));
const norm = (s) => s.replace(/[\s‌‍]+/g, ' ').trim();

const guSource = [...readJson('vachanamrut-source.json'), ...readJson('vachanamrut-source-extra.json')];
const enSource = readJson('vachanamrut-source-en.json');
const texts = {
  gu: new Map(ALL_VACHNOS.map((n) => [n, norm(fs.readFileSync(path.join(CACHE, `${n}.txt`), 'utf8'))])),
  en: new Map(ALL_VACHNOS.map((n) => [n, norm(JSON.parse(fs.readFileSync(path.join(CACHE, `${n}.en.json`), 'utf8')).paras.join(' '))])),
};

// Keep a question short: if long, use its last sentence that has a "?"
function shortQuestion(q) {
  let s = norm(q).replace(/^[“"‘']+|[”"’']+$/g, '');
  if (!s.includes('?')) return null;
  if (s.length > 200) {
    const parts = s.split(/(?<=[.।!?])\s+/).filter((p) => p.includes('?'));
    s = parts[parts.length - 1] || '';
  }
  return s.length >= 15 && s.length <= 200 ? s : null;
}

// Questions that only make sense in context ("એનું શું કારણ છે?", "Why is that?") are dropped:
// short ones that lean on a pronoun pointing back to earlier talk.
const CONTEXT_WORDS = {
  gu: /(^|[\s,])(એ|તે|એનું|તેનું|એનો|તેનો|એની|તેની|એને|તેને|એમાં|તેમાં|એમ|એવું|એવો|એવી|એવા|એમનું|આમ|આનું|બેયમાં|બેમાં|એ બે)([\s,?]|$)/,
  en: /\b(this|that|these|those|it|its|they|them|their|he|him|his|she|her|so|such)\b/i,
};
// Sentence fragments ("ને શાને આધારે…", "- be destroyed?") and "which of the two" questions
const FRAGMENT = {
  gu: /^(ને|અને|પણ|તો|ત્યારે|કે)\s|બેમાં|બેયમાં|બે જણ/,
  en: /^([^A-Z‘“]|But |And |So |Then |If (that|this|so) |In that case)|\b(the two|both of them|did You talk)\b/,
};
const standsAlone = (lang, q) =>
  !FRAGMENT[lang].test(q) &&
  (q.length >= 70 || !CONTEXT_WORDS[lang].test(q.replace(/^(હે મહારાજ!|Mahārāj,)\s*/, '')));

const PRASHNA = {
  // "…એ પ્રશ્ન પૂછ્યો જે, “…”" / "…એ પૂછ્યું જે, “…”"
  gu: /(?:પ્રશ્ન પૂછ્યો|પ્રશ્ન કર્યો|પૂછ્યું|પૂછતા હવા) જે,? “([^”]{10,600}?)”/g,
  en: /\basked(?: [^“,.]{0,40})?,? “([^”]{10,600}?)”/g,
};

function build(lang, source) {
  const items = [];
  for (const v of source) {
    const text = texts[lang].get(v.vachno);
    const add = (kind, t) => {
      if (!t || items.some((x) => x.vachno === v.vachno && x.text === t)) return;
      if (kind === 'prashna' && !standsAlone(lang, t)) return;
      // A passage also present in another Vachanamrut must not be offered there as a wrong answer
      const probe = norm(t).slice(0, 60);
      const alsoIn = ALL_VACHNOS.filter((n) => n !== v.vachno && texts[lang].get(n).includes(probe));
      // A sabha question repeated in many Vachanamrut is too generic to point to one
      if (kind === 'prashna' && alsoIn.length) return;
      items.push({ vachno: v.vachno, kind, text: t, alsoIn });
    };
    for (const t of v.teachings) add('teaching', t);
    for (const m of text.matchAll(PRASHNA[lang])) add('prashna', shortQuestion(m[1]));
  }
  return items;
}

const out = { gu: build('gu', guSource), en: build('en', enSource) };
fs.writeFileSync(path.join(here, 'study-source.json'), JSON.stringify(out, null, 1));
for (const lang of ['gu', 'en']) {
  const c = (k) => out[lang].filter((x) => x.kind === k).length;
  const shared = out[lang].filter((x) => x.alsoIn.length).length;
  console.log(`[${lang}] teachings=${c('teaching')} questions=${c('prashna')} shared=${shared}`);
}
