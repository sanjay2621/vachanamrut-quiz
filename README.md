# vachanamrut-quiz
To play Vachanamrut quiz

A static React (Vite) site with multiple-choice quizzes covering all 273 Vachanamrut (the standard 262 plus the 11 additional ones: Amdavad 4–8, Ashlali 1, Jetalpur 1–5). No backend. All questions live in `public/data/quizzes.json`, and the site reads them from there.

## What it has
- 44 knowledge quizzes (about 25 questions each), grouped by section: Gadhada I, Sarangpur, Kariyani, Loya, Panchala, Gadhada II, Vartal, Amdavad, Ashlali, Jetalpur, Gadhada III
- Every Vachanamrut shows up in at least one quiz (the generator checks this)
- Question types: title to Vachanamrut, Vachanamrut to title, date (tithi), teaching (from the bold text), who asked the question
- Answers are checked as soon as you pick one, with a link to the original Vachanamrut on anirdesh.com
- Results screen, review of wrong answers, and "retry wrong only"
- Title quizzes (શીર્ષક ક્વિઝ tab): 16 quizzes with one question for each of the 273 Vachanamrut, e.g. "સારંગપુરના ૭મા વચનામૃતનું શીર્ષક કયું છે?"
- Subjects (વિષય): 27 subjects such as ભક્તિ, સર્વોપરી, પ્રગટ-પ્રત્યક્ષ-નયનગોચર, each listing its Vachanamrut, with a 20-question subject quiz. Tagging is automatic (keywords in the full text), so it is approximate. Rebuild with `npm run fetch-text && npm run tag-subjects && npm run generate`.
- Gujarati and English: switch from the top bar. English questions use the English translation on anirdesh.com
- Topic quizzes (વાત ક્વિઝ tab): one question for every topic in every title, e.g. "કયા વચનામૃતમાં મન જીત્યાની વાત કરી છે?" (335 questions in Gujarati, 342 in English)
- Study quizzes (અભ્યાસ ક્વિઝ tab): a question for every bold teaching and every question asked in the sabha (538 in Gujarati, 581 in English)
- Subject quizzes on each subject page: "which of these Vachanamrut deals with subject X?" for every Vachanamrut in the subject (1,018 questions)
- Quick practice: 20 random questions from all Vachanamrut or from one section
- A searchable list of all 273 titles
- Best scores are saved in the browser (localStorage)
- Light and dark mode; works on phone, tablet and laptop; keyboard shortcuts 1–4 and Enter

## પ્રાપ્તિનો વિચાર
A second section of the site (switch in the header): a daily title, five prasangs and reflection prompts with a 15-minute timer. Entries live in `public/data/prapti.json`.

## Run locally
```bash
npm install
npm run dev
```

## Regenerate questions
`scripts/vachanamrut-source.json` holds the titles, dates, teachings and askers taken from
https://www.anirdesh.com/vachanamrut/ (vachno 1–262; the additional ones are vachno 264–274 in `scripts/vachanamrut-source-extra.json`). To rebuild the quizzes:
```bash
npm run generate
```
To change quiz size, edit `QUIZ_SIZE` in `scripts/generate-quizzes.mjs`. You can also edit `public/data/quizzes.json` by hand.

## Deploy to Vercel
1. Push this repo to GitHub.
2. On vercel.com, choose New Project, import the repo, and keep the defaults (Framework: Vite, Build: `npm run build`, Output: `dist`). `vercel.json` already sets these.

Or deploy from the command line: `npx vercel --prod`.
