# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/` (Vercel uses this; `vercel.json` sets SPA rewrite)
- `npm run preview` — serve built `dist/`
- `npm run generate` — rebuild `public/data/quizzes.json` (Gujarati) and `public/data/quizzes.en.json` (English)
- `npm run fetch-text` — download full Gujarati + English text of all 273 Vachanamrut into `scripts/.cache/` (gitignored; skips cached files; ~10 min fresh)
- `npm run tag-subjects` — rebuild `scripts/subjects.json` from the cached Gujarati text
- `npm run build-extra` — rebuild `scripts/vachanamrut-source-extra.json` (Gujarati source for the 11 additional Vachanamrut) from the cache
- `npm run build-study` — rebuild `scripts/study-source.json` (all bold teachings + sabha questions per language, from the cache)
- `npm run build-en` — rebuild `scripts/vachanamrut-source-en.json` from the cached English text

Full pipeline: `fetch-text` → `tag-subjects` → `build-extra` → `build-en` → `build-study` → `build-askers` → `generate`. Only `generate` is needed when just the generator changes; the committed JSON files are its inputs.

No test runner or linter is configured. The generator's built-in coverage checks (throws if any Vachanamrut is missing from the quizzes or title quizzes) are the main correctness gate — run `npm run generate` after touching the generator or source data.

## Architecture

Static React 18 + Vite site, no backend, no router library. Bilingual: Gujarati (default) and English.

**Numbering (`scripts/vachnos.mjs`):** shared by every script. `vachno` is anirdesh's number: 1–262 standard, 264–274 the 11 additional Vachanamrut of the BAPS edition (Amdavad 4–8 = 264–268, Ashlali 1 = 269, Jetalpur 1–5 = 270–274; 263 ભૂગોળ-ખગોળ is excluded). `SECTIONS` holds each section's vachno `ranges` (Amdavad is non-contiguous) in BAPS display order; use `sectionOfNo`/`positionOf`, never vachno arithmetic. Askers of the extras are hand-entered in `EXTRA_ASKERS`. The app gets `section` ids on `data.vachanamruts` and `count` on `data.sections`.

**Data pipeline (build-time, offline):**
`scripts/vachanamrut-source.json` + `vachanamrut-source-extra.json` (Gujarati: ref, title, datePhrase, teachings, askers) and `scripts/vachanamrut-source-en.json` (English, same shape minus ref) → `scripts/generate-quizzes.mjs` → one minified, committed data file per language. The generator:
- Defines `SECTIONS` (id, Gujarati/English name, vachno range) — the single source of section boundaries — and a `LANGS` table holding every per-language string (question templates, quiz titles, refs, links, output file). English refs are built as `Gadhada I-1`, `Sarangpur-7`; English quiz ids get an `en-` prefix so saved scores don't collide.
- `build(lang)` resets the seeded RNG per language, so output is deterministic. Keep output stable for unchanged inputs (saved scores are keyed by quiz id); add any new generation step *after* existing ones so the RNG sequence isn't shifted.
- Builds up to 5 question types per Vachanamrut (`title-to-ref`, `ref-to-title`, `date`, `teaching`, `asker`); question id is `${vachno}-${type}`. Distractors prefer same-section items.
- `cleanAskerGu` heuristically filters scraped Gujarati asker phrases (prefix stripping, ergative-suffix normalization, name-ending whitelist) — fragile; check `askers=` in the output after edits.
- Chunks each section's shuffled questions into quizzes of ~`QUIZ_SIZE` (25), then builds **title quizzes** (`kind: 'titles'`, type `section-title`): exactly one question per Vachanamrut, asked by position in its section ("સારંગપુરના ૭મા વચનામૃતનું શીર્ષક કયું છે?" / "…the 7th Vachanamrut of Sarangpur?").
- Then **topic quizzes** (`kind: 'topics'`, type `topic`, id `${vachno}-topic-${k}`): each title is split into topics (on `;`, and in Gujarati on `,` only when every piece ends in `નું`), one question per topic ("કયા વચનામૃતમાં મન જીત્યાની વાત કરી છે?") answered with the ref. Wrong answers exclude other Vachanamrut sharing the same topic (e.g. અન્વય-વ્યતિરેકનું is GP-7 and Sarangpur-5). Phrasing lives in `LANGS.*.topicQ`/`topicSplit`.
- Then **study quizzes** (`kind: 'study'`, types `teaching`/`prashna`) from `scripts/study-source.json`: every bold teaching and every question asked in the sabha. `build-study-source.mjs` drops sabha questions that need context (short + pronoun, fragments, "of the two") or repeat across Vachanamrut, and records `alsoIn` (other Vachanamrut containing the same passage) so they are never wrong answers.
- Then **content quizzes** (`kind: 'study'`, type `content`, title "… — વિષયવસ્તુ ક્વિઝ") from `scripts/content-questions.json`, hand/AI-written from the full text. Every question must carry `evidence` copied word for word from that Vachanamrut; with the cache present the generator throws on any evidence not found. `options[0]` is the correct one. The quiz shows the evidence after answering. Pilot: GP-1, GP-22, Sarangpur-1, Kariyani-5, GM-34 (Gujarati only).
- Then **subject quizzes** (`kind: 'subject'`, `subject` id, no `section`): "which of these deals with subject X?" for every member of each hand-entered subject; wrong answers are non-members. Shown on the subject page, not on Home; excluded from practice and random subject quizzes.

**English source (`scripts/build-en-source.mjs`):** title from anirdesh's English page; date, askers and teaching extracted by regex from the English text. English paragraphs don't align 1:1 with Gujarati ones, so the teaching excerpt is taken from the same *relative position* as the bold Gujarati teaching, with narration lead-ins stripped and narration-only excerpts dropped.

**Subjects (વિષય):** `scripts/tag-subjects.mjs` scores each Gujarati text against per-subject keyword lists (`SUBJECTS`, English names in `EN`). A subject is tagged when its keyword density is ≥ `RATIO`× the corpus mean, max 5 per Vachanamrut, min 1. Subjects with `near: 'divine'` (the પ્રગટ-પ્રત્યક્ષ subject) count a keyword only if a word for Bhagwan/Sant/Bhakt (`NEAR_DIVINE`) is in the same sentence nearby. It's an automatic approximation and the UI says so. `scripts/subjects-manual.json` (`{subjectId: [vachno…]}`, entered by hand from the BAPS Vachanamrut Study App) overrides the automatic result per subject; those get `source: 'manual'` and no "approximate" note/≈ mark in the UI. Lists typed from the app with its abbreviations ("ગ.પ્ર. (1,4)") live in `scripts/subjects-app-lists.mjs`; `npm run import-subjects` converts them into `subjects-manual.json` and rejects out-of-range numbers. Rerun `tag-subjects` then `generate` after either changes. All subjects except પ્રગટ-પ્રત્યક્ષ (not in the app) are manual now. Tags are language-independent; both data files carry them.

**Runtime (`src/`):**
- `i18n.js` holds all UI strings for both languages; components call `useLang()` for `t(key, vars)`, `num()` (Gujarati digits in gu) and `link(vachno)` (anirdesh in the current language). Never hardcode UI text in components. Language is stored via `storage.js` and switched from the top bar; `App.jsx` then fetches the other data file (`DATA_URL`) and leaves any open `#/quiz/<id>` page, since ids differ per language.
- `App.jsx` does hash routing: `#/`, `#/home/titles` / `#/home/topics` (title / topic quiz tabs), `#/subjects[/<id>]`, `#/subject-quiz/<id>` (20 random title/teaching questions from that subject's Vachanamrut), `#/quiz/<id>`, `#/practice/<sectionId|all>`, `#/titles` (searchable index — unrelated to title quizzes). Practice and subject quizzes are built client-side and not scored (ids start with `practice`). Both quiz kinds share `data.quizzes`; UI separates them by `q.kind` (absent = knowledge, `titles`, `topics`); practice and random subject quizzes exclude `titles` and `subject`. Home has 5 tabs (`#/home/<kind>`); the subject tab filters by subject instead of section.
- `components/Quiz.jsx` runs a quiz (keyboard 1–4/Enter, review-wrong-only rounds) and saves scores via `storage.js`, skipped for practice ids and review rounds.
- `storage.js` wraps localStorage under one key `vachanamrut-quiz:v1` (`{ scores: {quizId: {best,last,attempts}}, theme, lang }`), every access try/caught.
- **પ્રાપ્તિનો વિચાર section** (`#/prapti[/<date>]`, `components/Prapti.jsx`): the header switches between the two sections (Vachanamrut Quiz / પ્રાપ્તિનો વિચાર). Content is static in `public/data/prapti.json` (`days[]`: date, title, intro, prasangs, vichar prompts); the page shows today's entry or the latest earlier one, plus a 15-minute timer that marks the day done in storage (`praptiDone`). Prasangs are short retellings, not copies of the source article. Add a day by appending an object.
- Theme: `data-theme` attribute on `<html>`, null means follow system preference; styles in `styles.css`.
