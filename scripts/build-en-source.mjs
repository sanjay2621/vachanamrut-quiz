// Builds scripts/vachanamrut-source-en.json (English title, date, teaching excerpt, askers)
// from the cached English text in scripts/.cache/<n>.en.json (npm run fetch-text).
// Run: npm run build-en
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTRA_ASKERS } from './vachnos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(here, '.cache');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));
// Standard 262 + the additional ones (npm run build-extra first)
const guSource = [...readJson('vachanamrut-source.json'), ...readJson('vachanamrut-source-extra.json')];

// "On the night of Māgshar sudi 4, Samvat 1876 [21 November 1819], ..." -> "Māgshar sudi 4, Samvat 1876 [21 November 1819]"
function findDate(text) {
  const m = text.match(
    /\b(?:[Oo]n|In) (?:the (?:early |late )?(?:morning|night|evening|afternoon|day|occasion) of |the auspicious day of )?([A-ZĀ][^,.]{0,40}?(?:sudi|vadi|Punam|Amās|Pūnam)[^,]{0,20}, Samvat \d{4}(?: \[[^\]]+\])?)/
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// Asker names: "Thereupon Muktānand Swāmi asked" -> "Muktānand Swāmi"
const NAME_END = /(Swāmi|Muni|Khāchar|bhāi|Bhāi|Bhakta|Brahmachāri|Bhatt|Thakkar|Dhādhal|Dave|Purāni|Āchārya|Patel|Kākā|Bāi|Shāstri|Giri|Thākor|Vālā|Ghelā)$/;
const PREFIX = /^(?:Thereupon|Then|Thereafter|Again|Once again|After that|At that time|Next|Also|Finally|Later|And|Now|So)\s+/;
function cleanAsker(raw) {
  let s = raw.trim();
  while (PREFIX.test(s)) s = s.replace(PREFIX, '');
  s = s.replace(/\s+then$/, '');
  if (/Mahārāj|Shriji/.test(s) || !s.includes(' ') || s.length > 32) return null;
  return NAME_END.test(s) ? s : null;
}
function findAskers(text) {
  const out = [];
  for (const m of text.matchAll(/([A-Z][\wāīūṛṅñṇṣśḥ’-]+(?: [\wāīūṛṅñṇṣśḥ’-]+){0,4}) (?:then |once again |also )?asked/g)) {
    const name = cleanAsker(m[1]);
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

// English paragraphs don't align 1:1 with Gujarati ones, so the teaching is taken from the
// same relative position in the English text as the bold Gujarati teaching sits in the Gujarati text.
function findTeaching(guText, guTeaching, enText) {
  if (!guTeaching) return null;
  const probe = guTeaching.replace(/\s+/g, ' ').slice(0, 30);
  const at = guText.replace(/\s+/g, ' ').indexOf(probe);
  if (at < 0) return null;
  const frac = at / guText.length;
  // Sentences inside Shriji Mahārāj's speech are the useful ones; strip quote marks
  const sentences = enText.match(/[^.?!]+[.?!]+["”’]?/g) || [];
  let pos = 0;
  const target = frac * enText.length;
  let idx = sentences.findIndex((s) => (pos += s.length) >= target);
  if (idx < 0) idx = sentences.length - 1;
  let out = '';
  for (let i = idx; i < sentences.length && out.length < 120; i++) out += sentences[i];
  out = out
    .replace(/[“”"]/g, '')
    .replace(/\s+/g, ' ')
    // drop the narration lead-in: "Thereupon Shriji Mahārāj explained, ..."
    .replace(/^[^,]{0,60}?(?:Mahārāj|Swāmi|He) (?:then |again |further )?(?:said|explained|replied|answered|continued|added|spoke|stated)[^,]{0,30}, /, '')
    .replace(/^Allow Me to answer\. /, '')
    .trim();
  out = out.charAt(0).toUpperCase() + out.slice(1);
  // Skip excerpts that are still narration rather than the teaching itself
  if (/\b(?:said|asked|replied|began to explain)[,:]/.test(out)) return null;
  if (out.length > 220) {
    const cut = out.slice(0, 220);
    const dot = cut.lastIndexOf('.');
    out = dot > 80 ? cut.slice(0, dot + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }
  return out.length >= 40 ? out : null;
}

const out = guSource.map((g) => {
  const en = JSON.parse(fs.readFileSync(path.join(CACHE, `${g.vachno}.en.json`), 'utf8'));
  const enText = en.paras.join(' ');
  const guText = fs.readFileSync(path.join(CACHE, `${g.vachno}.txt`), 'utf8');
  // One English excerpt per bold Gujarati teaching; the first one stays first (knowledge quizzes use it)
  const teachings = [...new Set(g.teachings.map((t) => findTeaching(guText, t, enText)).filter(Boolean))];
  return {
    vachno: g.vachno,
    title: en.title,
    datePhrase: findDate(en.paras[0] || ''),
    teachings,
    // Additional Vachanamrut use the hand-entered askers only
    askers: g.vachno > 262 ? (EXTRA_ASKERS[g.vachno] || []).map(([, en]) => en) : findAskers(enText),
  };
});

fs.writeFileSync(path.join(here, 'vachanamrut-source-en.json'), JSON.stringify(out, null, 1));
const c = (f) => out.filter(f).length;
console.log(`titles=${c((v) => v.title)} dates=${c((v) => v.datePhrase)} teachings=${c((v) => v.teachings.length)} askers=${c((v) => v.askers.length)} /${out.length}`);
