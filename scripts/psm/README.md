# PSM Jivan Charitra pipeline (Python, offline)

Builds `public/data/psm.json` (index) and `public/data/psm-<part>.json` (texts) from the scanned PDF of
"બ્રહ્મસ્વરૂપ શ્રી પ્રમુખસ્વામી મહારાજ" (one PDF per part). Part 3 (1975–1978) is done.

Tools (not in the repo): PyMuPDF + Pillow in `C:\temp\pdftools` (`py -m pip install --target C:\temp\pdftools pymupdf pillow`),
Tesseract in `C:\temp\tesseract` with `tessdata\guj.traineddata` (tessdata_best). Run scripts with `py -I`.
The scripts work inside one work directory (they read/write relative paths): copy `scripts/psm/*.py` and
`scripts/psm/part<N>/*` into e.g. `scripts/.cache/psm<N>/` (git-ignored; Part 3's OCR cache is there) and run them there.

1. `ocrall.py <pdf>` — OCR every page into `ocr/pNNN.txt` (300 dpi, `--psm 6`, Gujarati).
2. `toc.txt` — the book's table of contents, cleaned by hand. `sections.py` splits the text at the
   book's own prasang titles into `sections.json` + `book.txt` (`### S<i> [pdfPage] title`, `<j>| paragraph`).
   Adjust the page range (31–620), header patterns and year-chapter scraps per part. `titles.json` holds
   section titles as printed on the pages (the TOC OCR drops final vowel signs; `tcheck`-style compare).
3. Read `book.txt` prasang by prasang and write `notes.txt`: `S<i>|topics|touch|summary`
   (topics from `topics.txt`, touch 2 = હૃદયસ્પર્શી); `S<i>@<paraIdx>=<title>|…` starts a new prasang
   inside a section (titles the OCR missed); `S<i>b|…` adds topics to a section.
4. Proofreading: `lines.py <pdf>` + `crops.py` cut every line with OCR noise (italic quotes, Hindi/Sanskrit)
   into numbered strips `cimg/cNNN.png`; type each line, as printed, into `fix.txt` (`id|text`, empty = drop,
   `#T title` = a title line). `tsvall.py`, `conf.py`, `crops2.py` do a second round on low-confidence
   lines (`cimg2/`, `fix2.txt`). Leftovers go into `repl.py` (exact text replacements).
5. `buildpsm.py` — applies the fixes, removes running headers, footnotes (numbered ૧, ૨, … through the book)
   and QR-code notes, restores paragraph breaks from line indentation, splits/joins prasangs, and writes
   `psm-build.json`. Per-part constants at the top (`TITLES`, `DROP`, `YEARS`, `OFFSET` = PDF page − printed page).
6. `export.py <repo>/public/data` — merges the part into `psm.json` and writes `psm-<part>.json` (set `PART`).
