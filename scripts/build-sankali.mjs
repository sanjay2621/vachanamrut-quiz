// Builds public/data/sankali.json (Vachanamrut Sankali: for each theme, every Vachanamrut that
// talks about it, with the sentence quoted from the cached Gujarati text). Themes and patterns
// live in sankali-themes.mjs. Needs scripts/.cache (npm run fetch-text).
// Themes listed in sankali-reviewed.json were reviewed by hand: only the vachno kept there
// (passages that really discuss the theme, not passing mentions) are listed, and a kept
// vachno that no longer matches the pattern is an error. --all ignores the review (for
// reviewing new candidates after a pattern change).
// Usage: node scripts/build-sankali.mjs [--report] [--all]
import fs from 'node:fs';
import { ALL_VACHNOS } from './vachnos.mjs';
import { GROUPS, THEMES } from './sankali-themes.mjs';

const MAX_QUOTE = 240;
const report = process.argv.includes('--report');
const reviewed = process.argv.includes('--all')
  ? {}
  : JSON.parse(fs.readFileSync('scripts/sankali-reviewed.json', 'utf8'));

// Split into sentences after . ? ! (optionally followed by a closing quote)
const sentencesOf = (text) =>
  text
    .split(/\n+/)
    .flatMap((para) => para.replace(/\s+/g, ' ').trim().split(/(?<=[.?!][”’"]?) +/))
    .map((s) => s.trim())
    .filter(Boolean);

// Shorten a long sentence to the clauses around the match
function quoteOf(sentence, re) {
  if (sentence.length <= MAX_QUOTE) return sentence;
  const clauses = sentence.split(/(?<=;) +/);
  const i = clauses.findIndex((c) => re.test(c));
  if (i >= 0) {
    let out = clauses[i];
    let a = i;
    let b = i;
    while (out.length < MAX_QUOTE * 0.6 && (a > 0 || b < clauses.length - 1)) {
      if (b < clauses.length - 1 && `${out} ${clauses[b + 1]}`.length <= MAX_QUOTE) out = `${out} ${clauses[++b]}`;
      else if (a > 0 && `${clauses[a - 1]} ${out}`.length <= MAX_QUOTE) out = `${clauses[--a]} ${out}`;
      else break;
    }
    if (out.length <= MAX_QUOTE) return `${a > 0 ? '… ' : ''}${out}${b < clauses.length - 1 ? ' …' : ''}`;
  }
  // Window around the match, cut at spaces
  const m = sentence.match(re);
  const at = m ? m.index : 0;
  let s = Math.max(0, at - Math.floor(MAX_QUOTE / 2));
  let e = Math.min(sentence.length, s + MAX_QUOTE);
  s = Math.max(0, e - MAX_QUOTE);
  if (s > 0) s = sentence.indexOf(' ', s) + 1;
  if (e < sentence.length) e = sentence.lastIndexOf(' ', e);
  return `${s > 0 ? '… ' : ''}${sentence.slice(s, e)}${e < sentence.length ? ' …' : ''}`;
}

const sentences = Object.fromEntries(
  ALL_VACHNOS.map((no) => [no, sentencesOf(fs.readFileSync(`scripts/.cache/${no}.txt`, 'utf8'))]),
);

const ids = new Set();
const themes = THEMES.map((t) => {
  if (ids.has(t.id)) throw new Error(`duplicate theme id ${t.id}`);
  ids.add(t.id);
  if (!GROUPS.some((g) => g.id === t.group)) throw new Error(`${t.id}: unknown group ${t.group}`);
  const re = new RegExp(t.re);
  const withRe = t.with ? new RegExp(t.with) : null;
  const exclude = new Set(t.exclude || []);
  // Reviewed entries are vachno, or "vachno@words" to quote the sentence containing those words
  // (for a Vachanamrut that discusses the theme without the pattern's wording)
  const keep = Array.isArray(reviewed[t.id])
    ? new Map(reviewed[t.id].map((e) => {
        const [no, at] = String(e).split('@');
        return [Number(no), at || null];
      }))
    : null;
  const items = [];
  for (const no of ALL_VACHNOS) {
    if (exclude.has(no) || (keep && !keep.has(no))) continue;
    const hits = sentences[no].filter((s) => re.test(s) && (!withRe || withRe.test(s)));
    const at = keep && keep.get(no);
    if (at) {
      const s = sentences[no].find((x) => x.includes(at));
      if (!s) throw new Error(`${t.id}: ${no}@${at} not found in the text`);
      items.push({ no, n: Math.max(1, hits.length), q: quoteOf(s, new RegExp(at.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) });
      continue;
    }
    if (!keep && hits.length < (t.min || 1) && !(t.add || []).includes(no)) continue;
    if (!hits.length) throw new Error(`${t.id}: ${no} has no matching sentence; give it as "${no}@<words from the passage>"`);
    // Quote the sentence that says most about the theme: most pattern hits, then not a
    // question, then reasonably short, then earliest
    const reG = new RegExp(t.re, 'g');
    const score = (s) =>
      (s.match(reG) || []).length * 10 + (withRe ? 2 : 0) - (/\?[”’"]?$/.test(s) ? 5 : 0) - (s.length > 400 ? 3 : 0);
    const best = hits.reduce((a, s) => (score(s) > score(a) ? s : a), hits[0]);
    items.push({ no, n: hits.length, q: quoteOf(best, re) });
  }
  if (keep) {
    const missing = [...keep.keys()].filter((no) => !items.some((it) => it.no === no));
    if (missing.length) throw new Error(`${t.id}: reviewed vachno no longer match: ${missing.join(', ')}`);
  }
  if (report) console.log(`${t.id.padEnd(16)} ${String(items.length).padStart(3)}`);
  return { id: t.id, group: t.group, ...(keep ? { reviewed: true } : {}), ...(t.subject ? { subject: t.subject } : {}), gu: t.gu, en: t.en, re: t.re, items };
});

const out = { groups: GROUPS, themes };
fs.writeFileSync('public/data/sankali.json', JSON.stringify(out));
const links = themes.reduce((a, t) => a + t.items.length, 0);
console.log(`sankali.json: ${themes.length} themes, ${links} links, ${(fs.statSync('public/data/sankali.json').size / 1024).toFixed(0)} KB`);
