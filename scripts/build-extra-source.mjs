// Builds scripts/vachanamrut-source-extra.json: Gujarati source entries (same shape as
// vachanamrut-source.json) for the 11 additional Vachanamrut, from the cache (npm run fetch-text).
// Run: npm run build-extra
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTRA_VACHNOS, EXTRA_ASKERS, sectionOfNo, positionOf } from './vachnos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(here, '.cache');
const toGu = (n) => String(n).replace(/\d/g, (d) => '૦૧૨૩૪૫૬૭૮૯'[d]);

const out = EXTRA_VACHNOS.map((n) => {
  const sec = sectionOfNo(n);
  const text = fs.readFileSync(path.join(CACHE, `${n}.txt`), 'utf8');
  const title = fs.readFileSync(path.join(CACHE, `${n}.gu-title.txt`), 'utf8').trim();
  if (!title) throw new Error(`${n}: missing Gujarati title`);
  const intro = text.split('\n')[0];
  // "સંવત ૧૮૮૨ના ફાગણ વદિ ૩ તૃતિયાને દિવસ …" -> "સંવત ૧૮૮૨ના ફાગણ વદિ ૩ તૃતિયા"
  const date = intro.match(/^(સંવત ([૦-૯]{4})ના .+?)ને દિવસ/);
  return {
    vachno: n,
    section: sec.name,
    ref: `${sec.name} ${toGu(positionOf(n))}`,
    title,
    samvat: date?.[2] || null,
    datePhrase: date?.[1] || null,
    intro,
    teachings: [], // these pages have no bold teaching text
    askers: (EXTRA_ASKERS[n] || []).map(([gu]) => gu),
  };
});

fs.writeFileSync(path.join(here, 'vachanamrut-source-extra.json'), JSON.stringify(out, null, 1));
for (const v of out) console.log(v.vachno, v.ref, '|', v.title, '|', v.datePhrase, '|', v.askers.join(', '));
