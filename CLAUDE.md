# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/` (Vercel uses this; `vercel.json` sets SPA rewrite)
- `npm run preview` — serve built `dist/`
- `npm run generate` — rebuild `public/data/quizzes.json` from `scripts/vachanamrut-source.json`

No test runner or linter is configured. The generator's built-in coverage check (throws if any of the 262 Vachanamrut is missing from all quizzes) is the main correctness gate — run `npm run generate` after touching the generator or source data.

## Architecture

Static React 18 + Vite site, no backend, no router library. UI text is Gujarati.

**Data pipeline (build-time, offline):**
`scripts/vachanamrut-source.json` (scraped from anirdesh.com, vachno 1–262: ref, title, datePhrase, teachings, askers) → `scripts/generate-quizzes.mjs` → `public/data/quizzes.json` (minified, committed). The generator:
- Defines `SECTIONS` (id, Gujarati/English name, vachno range) — the single source of section boundaries; copied into the output JSON for the app.
- Uses a seeded deterministic RNG, so regenerating produces identical output unless source/seed/logic change.
- Builds up to 5 question types per Vachanamrut (`title-to-ref`, `ref-to-title`, `date`, `teaching`, `asker`); question id is `${vachno}-${type}`. Distractors prefer same-section items.
- `cleanAsker` heuristically filters scraped asker phrases into clean names (Gujarati prefix stripping, ergative-suffix normalization, name-ending whitelist) — fragile; check `askers=` count in output after edits.
- Chunks each section's shuffled questions into quizzes of ~`QUIZ_SIZE` (25); quiz id is `${sectionId}-${n}`.
- Then builds **title quizzes** (`kind: 'titles'`, id `titles-${sectionId}-${n}`, question type `section-title`): exactly one question per Vachanamrut, asked by position in its section (e.g. "સારંગપુરના ૭મા વચનામૃતનું શીર્ષક કયું છે?"), with a check that all 262 are covered exactly once. They are generated *after* the main quizzes so the seeded RNG sequence leaves existing quizzes unchanged — keep new generation steps after existing ones for the same reason.

`public/data/quizzes.json` can also be hand-edited, but `npm run generate` will overwrite it.

**Runtime (`src/`):**
- `App.jsx` fetches `/data/quizzes.json` once, holds it in state, and does hash routing: `#/`, `#/home/titles` (title-quiz tab), `#/quiz/<id>`, `#/practice/<sectionId|all>`, `#/titles` (searchable title list — unrelated to title quizzes). Practice quizzes (20 random questions, excluding title quizzes) are built client-side in `App.jsx`; `practiceKey` forces a new random set. Both quiz kinds share `data.quizzes`; UI separates them by `q.kind === 'titles'`.
- `components/Quiz.jsx` runs a quiz (keyboard 1–4/Enter, review-wrong-only rounds) and saves scores via `storage.js` — skipped for ids starting with `practice` and for review rounds.
- `storage.js` wraps localStorage under a single key `vachanamrut-quiz:v1` (`{ scores: {quizId: {best,last,attempts}}, theme }`), every access try/caught. Scores are keyed by quiz id, so regenerating with a different chunking changes which saved score maps to which quiz.
- Theme: `data-theme` attribute on `<html>`, null means follow system preference; styles in `styles.css`.
