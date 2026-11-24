// Dev helper: node scripts/sankali-find.mjs "<regex>" [width]
// Lists every Vachanamrut whose cached Gujarati text matches, with a snippet around each match.
import fs from 'node:fs';
import { ALL_VACHNOS } from './vachnos.mjs';
const data = JSON.parse(fs.readFileSync('public/data/quizzes.json', 'utf8'));
const ref = Object.fromEntries(data.vachanamruts.map((v) => [v.vachno, v.ref]));
const re = new RegExp(process.argv[2], 'g');
const w = Number(process.argv[3] || 50);
let n = 0;
for (const no of ALL_VACHNOS) {
  const txt = fs.readFileSync(`scripts/.cache/${no}.txt`, 'utf8').replace(/\s+/g, ' ');
  const hits = [...txt.matchAll(re)];
  if (!hits.length) continue;
  n++;
  const h = hits[0];
  console.log(`${no} ${ref[no]} [${hits.length}]: …${txt.slice(Math.max(0, h.index - w), h.index + h[0].length + w)}…`);
}
console.log(`= ${n} Vachanamrut`);
