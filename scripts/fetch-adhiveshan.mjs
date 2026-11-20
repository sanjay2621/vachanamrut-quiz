import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Downloads prasang 1..100 in Gujarati and English into scripts/.cache/adhiveshan (skips cached).
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '.cache', 'adhiveshan');
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let n = 1; n <= 100; n++) {
  for (const [tag, fmt] of [['g', 'Guj'], ['e', 'Eng']]) {
    const file = path.join(out, `${tag}${n}.html`);
    if (fs.existsSync(file) && fs.statSync(file).size > 5000) continue;
    const url = `https://anirdesh.com/smadhiveshan25/prasang.php?prasang=${n}&format=${fmt}`;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (study-site fetch)' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        fs.writeFileSync(file, await r.text());
        break;
      } catch (e) {
        console.log(`retry ${tag}${n}: ${e.message}`);
        await sleep(3000 * attempt);
      }
    }
    await sleep(1000);
  }
  if (n % 10 === 0) console.log(`done ${n}`);
}
console.log('finished');
