// Converts scripts/subjects-app-lists.mjs (app abbreviations like "ગ.પ્ર. (1,4)") into vachno
// numbers and merges them into scripts/subjects-manual.json. Fails on unknown abbreviations or
// numbers outside a section's range.
// Run: npm run import-subjects   (then npm run tag-subjects && npm run generate)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS } from './vachnos.mjs';
import { APP_LISTS } from './subjects-app-lists.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MANUAL = path.join(here, 'subjects-manual.json');

// App abbreviation -> section id
const ABBR = {
  'ગ.પ્ર.': 'gp', 'સા.': 'sar', 'કા.': 'kar', 'લો.': 'loya', 'પં.': 'pan', 'ગ.મ.': 'gm',
  'વ.': 'var', 'અમ.': 'amd', 'ગ.અં.': 'ga', 'અશ્લાલી': 'ash', 'અશ.': 'ash', 'જેતલપુર': 'jet', 'જે.': 'jet',
};
const secById = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

function parse(id, text) {
  const out = [];
  for (const m of text.matchAll(/([^\s(),][^(]*?)\s*\(([^)]*)\)/g)) {
    const abbr = m[1].replace(/\s+/g, '').replace(/^,/, '');
    const sec = secById[ABBR[abbr]];
    if (!sec) throw new Error(`${id}: unknown section "${m[1]}"`);
    for (const raw of m[2].split(',').map((x) => x.trim()).filter(Boolean)) {
      const pos = Number(raw);
      if (!Number.isInteger(pos) || pos < 1 || pos > sec.nos.length) {
        throw new Error(`${id}: ${abbr} ${raw} is out of range (1–${sec.nos.length})`);
      }
      out.push(sec.nos[pos - 1]);
    }
  }
  return out;
}

const manual = JSON.parse(fs.readFileSync(MANUAL, 'utf8'));
for (const [id, value] of Object.entries(APP_LISTS)) {
  const nos = [...new Set([value].flat().flatMap((t) => parse(id, t)))].sort((a, b) => a - b);
  manual[id] = nos;
  console.log(String(nos.length).padStart(3), id);
}
fs.writeFileSync(
  MANUAL,
  JSON.stringify(manual, null, 2).replace(/\[\n\s+([\d,\n\s]+?)\n\s+\]/g, (_, x) => '[' + x.replace(/\s+/g, ' ') + ']') + '\n'
);
