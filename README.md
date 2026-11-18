# vachanamrut-quiz
To play Vachanamrut quiz

A static React (Vite) site with multiple-choice quizzes covering all 262 Vachanamrut. No backend. All questions live in `public/data/quizzes.json`, and the site reads them from there.

## What it has
- 41 quizzes (about 25 questions each, 1039 questions in total), grouped by section: Gadhada Pratham, Sarangpur, Kariyani, Loya, Panchala, Gadhada Madhya, Vartal, Amdavad, Gadhada Antya
- Every Vachanamrut shows up in at least one quiz (the generator checks this)
- Question types: title to Vachanamrut, Vachanamrut to title, date (tithi), teaching (from the bold text), who asked the question
- Answers are checked as soon as you pick one, with a link to the original Vachanamrut on anirdesh.com
- Results screen, review of wrong answers, and "retry wrong only"
- Title quizzes (શીર્ષક ક્વિઝ tab): 14 quizzes with one question for each of the 262 Vachanamrut, e.g. "સારંગપુરના ૭મા વચનામૃતનું શીર્ષક કયું છે?"
- Quick practice: 20 random questions from all Vachanamrut or from one section
- A searchable list of all 262 titles
- Best scores are saved in the browser (localStorage)
- Light and dark mode; works on phone, tablet and laptop; keyboard shortcuts 1–4 and Enter

## Run locally
```bash
npm install
npm run dev
```

## Regenerate questions
`scripts/vachanamrut-source.json` holds the titles, dates, teachings and askers taken from
https://www.anirdesh.com/vachanamrut/ (vachno 1–262). To rebuild the quizzes:
```bash
npm run generate
```
To change quiz size, edit `QUIZ_SIZE` in `scripts/generate-quizzes.mjs`. You can also edit `public/data/quizzes.json` by hand.

## Deploy to Vercel
1. Push this repo to GitHub.
2. On vercel.com, choose New Project, import the repo, and keep the defaults (Framework: Vite, Build: `npm run build`, Output: `dist`). `vercel.json` already sets these.

Or deploy from the command line: `npx vercel --prod`.
