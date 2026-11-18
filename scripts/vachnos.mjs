// Shared numbering for all scripts. `vachno` is anirdesh.com's Vachanamrut number.
// 1–262 are the standard Vachanamrut; 264–274 are the 11 additional ones in the BAPS edition
// (Amdavad 4–8, Ashlali 1, Jetalpur 1–5). 263 (ભૂગોળ-ખગોળ) is not included.

// Display order follows the BAPS Vachanamrut app: Ashlali and Jetalpur come after Gadhada III;
// the additional Amdavad ones are kept together with Amdavad 1–3.
export const SECTIONS = [
  { id: 'gp', name: 'ગઢડા પ્રથમ', en: 'Gadhada I', ranges: [[1, 78]] },
  { id: 'sar', name: 'સારંગપુર', en: 'Sarangpur', ranges: [[79, 96]] },
  { id: 'kar', name: 'કારીયાણી', en: 'Kariyani', ranges: [[97, 108]] },
  { id: 'loya', name: 'લોયા', en: 'Loya', ranges: [[109, 126]] },
  { id: 'pan', name: 'પંચાળા', en: 'Panchala', ranges: [[127, 133]] },
  { id: 'gm', name: 'ગઢડા મધ્ય', en: 'Gadhada II', ranges: [[134, 200]] },
  { id: 'var', name: 'વરતાલ', en: 'Vartal', ranges: [[201, 220]] },
  { id: 'amd', name: 'અમદાવાદ', en: 'Amdavad', ranges: [[221, 223], [264, 268]] },
  { id: 'ga', name: 'ગઢડા અંત્ય', en: 'Gadhada III', ranges: [[224, 262]] },
  { id: 'ash', name: 'અશલાલી', en: 'Ashlali', ranges: [[269, 269]] },
  { id: 'jet', name: 'જેતલપુર', en: 'Jetalpur', ranges: [[270, 274]] },
];

// Vachnos of each section in reading order
for (const s of SECTIONS) {
  s.nos = s.ranges.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i));
}

export const ALL_VACHNOS = SECTIONS.flatMap((s) => s.nos).sort((a, b) => a - b);
export const EXTRA_VACHNOS = ALL_VACHNOS.filter((n) => n > 262);

// Questioners in the additional Vachanamrut, read by hand from the text (regex extraction
// picks up story characters like Dronāchārya). [Gujarati, English]
export const EXTRA_ASKERS = {
  265: [['કુબેરસિંહજી', 'Kubersinhji']],
  266: [['કુબેરસિંહજી', 'Kubersinhji']],
  267: [['પ્રાગજી દવે', 'Prāgji Dave']],
  271: [['બ્રહ્માનંદ સ્વામી', 'Brahmānand Swāmi'], ['આશજીભાઈ', 'Āshjibhāi Patel']],
  273: [['આશજીભાઈ', 'Āshjibhāi Patel']],
};

const byNo = new Map(SECTIONS.flatMap((s) => s.nos.map((n, i) => [n, { section: s, pos: i + 1 }])));
export const sectionOfNo = (n) => byNo.get(n)?.section;
// 1-based position within its section, e.g. Amdavad 4 for vachno 264
export const positionOf = (n) => byNo.get(n)?.pos;
