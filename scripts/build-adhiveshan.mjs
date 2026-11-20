// Builds public/data/adhiveshan.json (Gujarati) and adhiveshan.en.json (English) from
// the 100 "Satsang Prasang" pages of North America Adhiveshan 2025 on anirdesh.com,
// cached by `npm run fetch-adhiveshan` in scripts/.cache/adhiveshan/{g,e}<n>.html.
// Text is copied exactly; tags (e.g. <i> around transliterated words) are dropped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cache = path.join(here, '.cache', 'adhiveshan');
const COUNT = 100;
const SOURCE_URL = 'https://anirdesh.com/smadhiveshan25/prasang.php';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', emsp: ' ', ensp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', mdash: '—', ndash: '–' };
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const clean = (html) => decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();

function parsePage(html, suffix) {
  const title = html.match(new RegExp(`<h3 class="title_${suffix}">([\\s\\S]*?)</h3>`));
  // The prasang body ends where the prev/next navigation starts
  const body = html.split('class="nav_button"')[0];
  const paras = [...body.matchAll(new RegExp(`<p class="text_${suffix}">([\\s\\S]*?)</p>`, 'g'))]
    .map((m) => clean(m[1]))
    .filter(Boolean);
  return { title: title ? clean(title[1]) : '', paras };
}

// Category list from the side menu: each pra_cat_* heading is followed by its prasang links
function parseCategories(html, suffix) {
  const cats = [];
  const re = new RegExp(`class="pra_cat_${suffix}">([\\s\\S]*?)</p>|prasang\\.php\\?prasang=(\\d+)&(?:amp;)?format=\\w+" class="toc_link"`, 'g');
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) cats.push({ name: clean(m[1]), nos: [] });
    else if (cats.length) cats[cats.length - 1].nos.push(+m[2]);
  }
  return cats;
}

function build(tag, suffix, out, meta) {
  const first = fs.readFileSync(path.join(cache, `${tag}1.html`), 'utf8');
  const categories = parseCategories(first, suffix);
  const catOf = new Map(categories.flatMap((c, i) => c.nos.map((n) => [n, i])));
  const prasangs = [];
  for (let n = 1; n <= COUNT; n++) {
    const p = parsePage(fs.readFileSync(path.join(cache, `${tag}${n}.html`), 'utf8'), suffix);
    if (!p.title || !p.paras.length) throw new Error(`${tag}${n}: missing title or text`);
    if (!catOf.has(n)) throw new Error(`${tag}${n}: not in any category`);
    prasangs.push({ n, cat: catOf.get(n), ...p });
  }
  const data = { ...meta, sourceUrl: SOURCE_URL, categories: categories.map((c) => ({ name: c.name, nos: c.nos })), prasangs };
  fs.writeFileSync(path.join(here, '..', 'public', 'data', out), JSON.stringify(data));
  console.log(`${out}: ${prasangs.length} prasangs, ${categories.length} categories, ${prasangs.reduce((a, p) => a + p.paras.length, 0)} paragraphs`);
}

build('g', 'gu', 'adhiveshan.json', { lang: 'gu', title: 'સત્સંગ પ્રસંગ', source: 'North America Adhiveshan 2025 - Satsang Prasang (anirdesh.com)' });
build('e', 'en', 'adhiveshan.en.json', { lang: 'en', title: 'Satsang Prasang', source: 'North America Adhiveshan 2025 - Satsang Prasang (anirdesh.com)' });
