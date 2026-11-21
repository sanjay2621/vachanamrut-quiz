// Builds public/data/videos.json — the Guruhari Ashirwad video library — from
// scripts/guruhari-videos.json ([{ id, title }], from the YouTube playlist) and the hand
// classification in scripts/video-topics.mjs. Each video gets its title topic (if any),
// date, year, place, session, occasion and subjects. Run: npm run build-videos
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOPICS, EXTRA_SUBJECTS } from './video-topics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PLAYLIST = 'PLOX7n0cygMYA19eaokQqliIzEhz--1BoK';
const videos = JSON.parse(fs.readFileSync(path.join(here, 'guruhari-videos.json'), 'utf8'));
const quizData = JSON.parse(fs.readFileSync(path.join(here, '..', 'public', 'data', 'quizzes.json'), 'utf8'));
const quizDataEn = JSON.parse(fs.readFileSync(path.join(here, '..', 'public', 'data', 'quizzes.en.json'), 'utf8'));

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const mon = (s) => MONTHS.indexOf(s.slice(0, 3).toLowerCase()) + 1;
const pad = (n) => String(n).padStart(2, '0');

function parseDate(t) {
  let m = t.match(/\b(\d{1,2})(?:\s*[-–&]\s*\d{1,2})?\s+(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\.?,?\s+(20\d\d)\b/i);
  if (m) return `${m[3]}-${pad(mon(m[2]))}-${pad(m[1])}`;
  m = t.match(/\b(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\.?\s+(\d{1,2}),?\s+(20\d\d)\b/i);
  if (m) return `${m[3]}-${pad(mon(m[1]))}-${pad(m[2])}`;
  m = t.match(/\b(20\d\d)\b/);
  return m ? `${m[1]}` : '';
}

const SESSIONS = [
  [/morning/i, 'morning'],
  [/evening/i, 'evening'],
  [/afternoon/i, 'afternoon'],
];

// Festivals and special days named in titles (checked in this order)
const OCCASIONS = [
  ['gurupurnima', /guru\s*purnima/i],
  ['diwali', /diwali|chopda pujan/i],
  ['newyear', /new year|nava varsh|annakut|bestu/i],
  ['janmashtami', /janmashtami/i],
  ['ramnavami', /ram\s*navami|hari\s*jayanti|shri\s*hari\s*jayanti/i],
  ['rathyatra', /rathyatra|rath yatra/i],
  ['rakshabandhan', /raksha\s*bandhan/i],
  ['navratri', /navratri|dashera|dussehra|vijaya\s*dashami/i],
  ['uttarayan', /uttarayan|makar\s*sankranti/i],
  ['ekadashi', /ekadashi/i],
  ['punam', /punam|purnima/i],
  ['janmajayanti', /janma\s*jayanti|birthday|janmotsav/i],
  ['diksha', /diksha|varani|gurupad/i],
  ['patotsav', /patotsav|murti pratishtha|pratishtha/i],
  ['yogaday', /yoga day/i],
];

function topicOf(title) {
  const m =
    title.match(/^(.+?)\s*\|\s*Guruhari Ashirwad/i) ||
    title.match(/^(.+?):\s*Guruhari Ashirwad/i) ||
    title.match(/^(.+?),\s*Guruhari Ashirwad/i);
  if (m) return m[1].trim();
  // "Guruhari Ashirwad, <topic>, <date>…" — a topic after the name that is not a date/place
  const after = title.replace(/^Guruhari Ashirwad[\s,|:]*/i, '');
  const first = after.split(/,|\|/)[0].trim();
  if (first.split(/\s+/).length >= 3 && !parseDate(first) && !/^(morning|evening|afternoon)/i.test(first)) return first;
  return null;
}

function placeOf(title) {
  // Drop the name and any topic that follows it (e.g. "Vachanamrut Gadhada Pratham 28")
  const after = title
    .replace(/^.*?Guruhari Ashirwad[\s,|:]*/i, '')
    .replace(/^Vachanamrut[^,|]*[,|]\s*/i, '');
  const parts = after.split(/\s*[|,]\s*/).map((s) => s.trim()).filter(Boolean);
  const cleaned = parts.filter(
    (p) =>
      !parseDate(p) &&
      !/^(\d{1,2}(\s*[-–&]\s*\d{1,2})?\s*)?(morning|evening|afternoon|new year|assembly)/i.test(p) &&
      !/assembly|ashirwad|blessing|^\(?(morning|evening|afternoon)\)?$/i.test(p) &&
      !/^\d{1,2}$/.test(p)
  );
  // City is the first remaining part; drop country/state suffixes
  const city = (cleaned[0] || '').replace(/\s*\(.*?\)\s*/g, '').trim();
  return /^(india|usa|uk|nj|tx)$/i.test(city) ? '' : city;
}

// "Vachanamrut Gadhada Madhya 15 (Part 2)", "Gadhada Ⅰ-6", "Gadhada 1-34", "Kariyani 10 ( Part 1)"
// → vachno, by position within the section (data.vachanamruts is in reading order)
const SECTION_NAMES = [
  ['gp', /gadhada\s*(pratham|prathama|first|i|Ⅰ|1)\b|gadhada\s*Ⅰ/i],
  ['gm', /gadhada\s*(madhya|middle|ii|Ⅱ|2)\b|gadhada\s*Ⅱ/i],
  ['ga', /gadhada\s*(antya|last|iii|Ⅲ|3)\b|gadhada\s*Ⅲ/i],
  ['sar', /sarangpur/i],
  ['kar', /kariyani|kariyan/i],
  ['loya', /loya/i],
  ['pan', /panchala/i],
  ['var', /vartal|vadtal/i],
  ['amd', /amdavad|ahmedabad/i],
  ['ash', /ashlali|asalali/i],
  ['jet', /jetalpur/i],
];
const bySection = {};
for (const v of quizData.vachanamruts) (bySection[v.section] ||= []).push(v.vachno);
const subjectsOfVachno = new Map();
for (const s of quizData.subjects) for (const n of s.vachnos) subjectsOfVachno.set(n, [...(subjectsOfVachno.get(n) || []), s.id]);

function vachanamrutOf(topic) {
  if (!topic || !/^vachanamrut\b/i.test(topic)) return null;
  const rest = topic.replace(/^vachanamrut\s*/i, '');
  const sec = SECTION_NAMES.find(([, re]) => re.test(rest))?.[0];
  // Position: the number after the section name (also "Ⅰ-6", "1-34")
  const pos = Number((rest.match(/[-\s](\d{1,2})\b(?!.*[-\s]\d{1,2}\b.*part)/i) || rest.match(/(\d{1,2})/) || [])[1]);
  if (!sec || !pos || !bySection[sec]?.[pos - 1]) return null;
  const part = (rest.match(/part\s*(\d)/i) || [])[1];
  return { vachno: bySection[sec][pos - 1], part: part ? Number(part) : 0 };
}

const unknownTopics = new Set();
const out = videos.map((v) => {
  const topic = topicOf(v.title);
  const vach = vachanamrutOf(topic);
  // Vachanamrut discourses take that Vachanamrut's subjects
  const subjects = vach ? [...(subjectsOfVachno.get(vach.vachno) || [])] : topic ? [...(TOPICS[topic] || [])] : [];
  if (topic && !vach && !TOPICS[topic]) unknownTopics.add(topic);
  const occasion = OCCASIONS.find(([, re]) => re.test(v.title))?.[0] || '';
  if (occasion && !subjects.includes('utsav') && !topic) subjects.push('utsav');
  return {
    id: v.id,
    title: v.title,
    topic: topic || '',
    date: parseDate(v.title),
    place: placeOf(v.title),
    session: SESSIONS.find(([re]) => re.test(v.title))?.[1] || '',
    occasion,
    subjects,
    ...(vach ? { vachno: vach.vachno, part: vach.part } : {}),
  };
});

const appSubjects = quizData.subjects.map((s, i) => ({ id: s.id, gu: s.name, en: quizDataEn.subjects[i].name }));
const used = new Set(out.flatMap((v) => v.subjects));
const subjects = [...appSubjects, ...EXTRA_SUBJECTS].filter((s) => used.has(s.id));
const missing = [...used].filter((id) => !subjects.some((s) => s.id === id));
if (missing.length) throw new Error(`Unknown subject ids: ${missing.join(', ')}`);

fs.writeFileSync(
  path.join(here, '..', 'public', 'data', 'videos.json'),
  JSON.stringify({ playlist: PLAYLIST, subjects, videos: out })
);
const withTopic = out.filter((v) => v.topic).length;
console.log(`videos.json: ${out.length} videos, ${withTopic} with a title topic, ${out.filter((v) => v.subjects.length).length} with a subject, ${out.filter((v) => v.occasion).length} with an occasion, ${out.filter((v) => !v.date).length} without a date, ${out.filter((v) => !v.place).length} without a place`);
if (unknownTopics.size) console.log(`Unclassified topics (add to scripts/video-topics.mjs):\n  ${[...unknownTopics].join('\n  ')}`);
