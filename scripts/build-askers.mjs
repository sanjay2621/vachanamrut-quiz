// Builds scripts/askers.json: questioners per Vachanamrut for both languages, ordered by first
// appearance in the text. Gujarati = cleaned names from vachanamrut-source.json plus the
// Gujarati spelling of every English questioner (EN_TO_GU), kept only if that name actually
// occurs in the Gujarati text. Inputs: cache (npm run fetch-text) + committed source JSON.
// Run: npm run build-askers
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_VACHNOS, EXTRA_ASKERS } from './vachnos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(here, '.cache');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));
const guSource = [...readJson('vachanamrut-source.json'), ...readJson('vachanamrut-source-extra.json')];
const enSource = readJson('vachanamrut-source-en.json');
const guText = (n) => fs.readFileSync(path.join(CACHE, `${n}.txt`), 'utf8').replace(/\s+/g, ' ');

export const EN_TO_GU = {
  'Muktānand Swāmi': 'મુક્તાનંદ સ્વામી', 'Brahmānand Swāmi': 'બ્રહ્માનંદ સ્વામી', 'Shuk Muni': 'શુકમુનિ',
  'Nityānand Swāmi': 'નિત્યાનંદ સ્વામી', 'Swayamprakāshānand Swāmi': 'સ્વયંપ્રકાશાનંદ સ્વામી',
  'Gopālānand Swāmi': 'ગોપાળાનંદ સ્વામી', 'Bhagwadānand Swāmi': 'ભગવદાનંદ સ્વામી', 'Dinānāth Bhatt': 'દીનાનાથ ભટ્ટ',
  'Nrusinhānand Swāmi': 'નૃસિંહાનંદ સ્વામી', 'Nirvikārānand Swāmi': 'નિર્વિકારાનંદ સ્વામી',
  'Chaitanyānand Swāmi': 'ચૈતન્યાનંદ સ્વામી', 'Somlā Khāchar': 'સોમલા ખાચર', 'Motā Shivānand Swāmi': 'મોટા શિવાનંદ સ્વામી',
  'Bhajanānand Swāmi': 'ભજનાનંદ સ્વામી', 'Akhandānand Swāmi': 'અખંડાનંદ સ્વામી', 'Harji Thakkar': 'હરજી ઠક્કર',
  'Shivānand Swāmi': 'શિવાનંદ સ્વામી', 'Mahānubhāvānand Swāmi': 'મહાનુભાવાનંદ સ્વામી', 'Paramānand Swāmi': 'પરમાનંદ સ્વામી',
  'Surā Khāchar': 'સુરા ખાચર', 'Nānā Shivānand Swāmi': 'નાના શિવાનંદ સ્વામી', 'Shobhārām Shāstri': 'શોભારામ શાસ્ત્રી',
  'Kubersinhji': 'કુબેરસિંહજી', 'Āshjibhāi Patel': 'આશજીભાઈ', 'Mayārām Bhatt': 'મયારામ ભટ્ટ', 'Yogānand Muni': 'યોગાનંદ મુનિ',
  'Maheshwar Bhatt': 'માહેશ્વર ભટ્ટ', 'Purnānand Swāmi': 'પૂર્ણાનંદ સ્વામી', 'Paramchaitanyānand Swāmi': 'પરમચૈતન્યાનંદ સ્વામી',
  'Mātrā Dhādhal': 'માતરા ધાધલ', 'Nirmānānand Swāmi': 'નિર્માનાનંદ સ્વામી', 'Daharānand Swāmi': 'દહરાનંદ સ્વામી',
  'Tyāgānand Swāmi': 'ત્યાગાનંદ સ્વામી', 'Lakshmanānand Swāmi': 'લક્ષ્મણાનંદ સ્વામી', 'Paramātmānand Swāmi': 'પરમાત્માનંદ સ્વામી',
  'Shāntānand Swāmi': 'શાંતાનંદ સ્વામી', 'Vedāntānand Swāmi': 'વેદાંતાનંદ સ્વામી', 'Nirmalānand Swāmi': 'નિર્મળાનંદ સ્વામી',
  'Nārāyanānand Swāmi': 'નારાયણાનંદ સ્વામી', 'Shunyātitānand Swāmi': 'શૂન્યાતીતાનંદ સ્વામી', 'Prasādānand Swāmi': 'પ્રસાદાનંદ સ્વામી',
  'Trigunātitānand Swāmi': 'ત્રિગુણાતીતાનંદ સ્વામી', 'Nānā Nirvikārānand Swāmi': 'નાના નિર્વિકારાનંદ સ્વામી',
  'Motā Yogānand Swāmi': 'મોટા યોગાનંદ સ્વામી', 'Pratoshānand Swāmi': 'પ્રતોષાનંદ સ્વામી', 'Bhudharānand Swāmi': 'ભૂધરાનંદ સ્વામી',
  'Nishkulānand Swāmi': 'નિષ્કુળાનંદ સ્વામી', 'Sachchidānand Swāmi': 'સચ્ચિદાનંદ સ્વામી',
  'Nānā Nirmānānand Swāmi': 'નાના નિર્માનાનંદ સ્વામી', 'Kapileshwarānand Swāmi': 'કપિલેશ્વરાનંદ સ્વામી',
  'Achintyānand Swāmi': 'અચિંત્યાનંદ સ્વામી', 'Shri Gurucharanratānand Swāmi': 'ગુરુચરણરતાનંદ સ્વામી',
  'Purushottam Bhatt': 'પુરુષોત્તમ ભટ્ટ', 'Nājā Bhakta': 'નાજા ભક્ત', 'Nirlobhānand Swāmi': 'નિર્લોભાનંદ સ્વામી',
  'Prāgji Dave': 'પ્રાગજી દવે',
};

// The distinctive word of a name, without its last letter so inflected forms match
// ("સોમલા ખાચર" is "સોમલે ખાચરે" in the text; "શુકમુનિ" may be "શુકમુનિએ").
const TITLES = new Set(['સ્વામી', 'ભટ્ટ', 'મુનિ', 'ખાચર', 'ધાધલ', 'ભક્ત', 'દવે', 'શાસ્ત્રી', 'ઠક્કર', 'મોટા', 'નાના']);
function stem(name) {
  const words = name.split(' ').filter((w) => !TITLES.has(w));
  const w = (words.sort((a, b) => b.length - a.length)[0] || name).replace(/[ાિીુૂેૈોૌંઃ]$/, '');
  return name.split(' ').includes('મોટા') ? `મોટા ${w}` : name.split(' ').includes('નાના') ? `નાના ${w}` : w;
}
const firstIndex = (text, name) => {
  const s = stem(name);
  const i = text.indexOf(s);
  // "શિવાનંદ" must not match inside "મોટા/નાના શિવાનંદ"
  if (!/^(મોટા|નાના) /.test(name) && /(મોટા|નાના) $/.test(text.slice(Math.max(0, i - 5), i))) {
    const j = text.indexOf(s, i + s.length);
    return j;
  }
  return i;
};

// Raw Gujarati phrases -> name ("સ્વયંપ્રકાશાનંદ સ્વામીએ પરમાનંદ સ્વામીન" -> "સ્વયંપ્રકાશાનંદ સ્વામી")
const NAME_END = /(સ્વામી|ભટ્ટ|ઠક્કર|મુનિ|ધાધલ|ભાઈ|બ્રહ્મચારી|ખાચર|જી|દાસ|ભક્ત|આચાર્ય|રાય|ભગત|બાઈ|ઠાકોર|શાસ્ત્રી|પુરાણી|દવે|કાકા)$/;
const PREFIX = /^(અને|ત્યાર પછી|તે પછી|પછી|ત્યારે|વળી|તે સમે|તે સમયમાં|તે સમામાં|તે સમયને વિષે|પ્રથમ|એ વાર્તા સાંભળીને|શ્રીજીમહારાજને|તે|ગામ \S+(ના|વાળા)|\S+વાળા|હરિભક્ત|શેઠ)\s+/;
function cleanGu(raw) {
  let s = raw.trim();
  for (let k = 0; k < 6 && PREFIX.test(s); k++) s = s.replace(PREFIX, '').trim();
  s = s.replace(/^(\S+ \S+?)(?:એ|ે) (?:તથા |\S+ )?\S+ ?(?:પ્રત્ય|ન)?$/, '$1'); // "X સ્વામીએ Y સ્વામીન" -> "X સ્વામી"
  s = s.replace(/^(\S+ \S+?)ે તથા .*$/, '$1'); // "દીનાનાથ ભટ્ટે તથા …" -> "દીનાનાથ ભટ્ટ"
  s = s.replace(/^(\S+?)ે (ખાચર|ધાધલ|ભક્ત)$/, '$1ા $2'); // "સોમલે ખાચર" -> "સોમલા ખાચર"
  s = s.replace(/^સુરાખાચર$/, 'સુરા ખાચર');
  if (/શ્રીજીમહારાજ|^(મુનિ|સંત)$/.test(s) || s.length > 30 || s.length < 4) return null;
  return NAME_END.test(s) ? s : null;
}

const gu = {};
const en = {};
const notFound = [];
for (const n of ALL_VACHNOS) {
  const g = guSource.find((v) => v.vachno === n);
  const e = enSource.find((v) => v.vachno === n);
  const text = guText(n);
  if (EXTRA_ASKERS[n]) {
    gu[n] = EXTRA_ASKERS[n].map(([x]) => x);
    en[n] = EXTRA_ASKERS[n].map(([, y]) => y);
    continue;
  }
  const names = new Set(g.askers.map(cleanGu).filter(Boolean));
  for (const name of e.askers) {
    const guName = EN_TO_GU[name];
    if (!guName) notFound.push(`${n}: no Gujarati spelling for "${name}"`);
    else if (firstIndex(text, guName) < 0) notFound.push(`${n}: "${guName}" not in Gujarati text`);
    else names.add(guName);
  }
  // order by first appearance in the text; names not found in the text go last
  gu[n] = [...names].sort((a, b) => (firstIndex(text, a) >>> 0) - (firstIndex(text, b) >>> 0));
  en[n] = e.askers;
}

fs.writeFileSync(path.join(here, 'askers.json'), JSON.stringify({ gu, en }, null, 1));
const covered = (m) => Object.values(m).filter((a) => a.length).length;
console.log(`gu: ${covered(gu)} Vachanamrut with questioners, en: ${covered(en)}`);
if (notFound.length) console.log('skipped:\n  ' + notFound.join('\n  '));
