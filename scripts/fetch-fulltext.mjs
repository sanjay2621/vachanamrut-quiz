// Downloads the full Gujarati text of each Vachanamrut from anirdesh.com into scripts/.cache/
// (gitignored). Used only as input for scripts/tag-subjects.mjs. Already-cached files are skipped.
// Run: npm run fetch-text
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_VACHNOS } from './vachnos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(here, '.cache');
fs.mkdirSync(CACHE, { recursive: true });

const decode = (s) =>
  s
    .replace(/<sup>.*?<\/sup>/g, '') // footnote markers
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&emsp;|&ensp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

async function get(n, format) {
  const url = `https://www.anirdesh.com/vachanamrut/index.php?format=${format}&vachno=${n}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (vachanamrut-quiz build script)' } });
  if (!res.ok) throw new Error(`${n} ${format}: HTTP ${res.status}`);
  const html = await res.text();
  // Main text paragraphs only; footnotes (id="fn_...") are editorial and skipped
  const re = new RegExp(`<p id="vach-${n}-para-\\d+"[^>]*>([\\s\\S]*?)</p>`, 'g');
  const paras = [...html.matchAll(re)].map((m) => decode(m[1])).filter(Boolean);
  if (!paras.length) throw new Error(`${n} ${format}: no paragraphs found`);
  await new Promise((r) => setTimeout(r, 700)); // be polite to the server
  return { html, paras };
}

for (const n of ALL_VACHNOS) {
  // Gujarati: plain text, one paragraph per line
  const gu = path.join(CACHE, `${n}.txt`);
  // Additional Vachanamrut (not in vachanamrut-source.json) also need their Gujarati title
  const guTitle = path.join(CACHE, `${n}.gu-title.txt`);
  if (!fs.existsSync(gu) || (n > 262 && !fs.existsSync(guTitle))) {
    const { html, paras } = await get(n, 'gu');
    fs.writeFileSync(gu, paras.join('\n'));
    const title = decode(html.match(/<h1 class="title_gu">([\s\S]*?)<\/h1>/)?.[1] || '');
    if (n > 262) fs.writeFileSync(guTitle, title);
    console.log(n, 'gu', paras.length, 'paras');
  }
  // English: title + paragraphs
  const en = path.join(CACHE, `${n}.en.json`);
  if (!fs.existsSync(en)) {
    const { html, paras } = await get(n, 'en');
    const title = decode(html.match(/<h1 class="title_en">([\s\S]*?)<\/h1>/)?.[1] || '');
    if (!title) throw new Error(`${n} en: no title`);
    fs.writeFileSync(en, JSON.stringify({ title, paras }));
    console.log(n, 'en', paras.length, 'paras');
  }
}
console.log('done');
