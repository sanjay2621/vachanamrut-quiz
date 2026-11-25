import json, sys, difflib, re
sys.stdout.reconfigure(encoding='utf-8')
secs = json.load(open('sections.json', encoding='utf-8'))
for s in secs:
    t = s['title']
    best, br = None, 0
    for pg in (s['page'], s['page'] - 1):
        for l in open(f'ocr/p{pg:03d}.txt', encoding='utf8', errors='replace').read().split('\n'):
            l = l.strip()
            if not l or len(l) > len(t) + 12: continue
            r = difflib.SequenceMatcher(None, l[:len(t) + 3], t).ratio()
            if r > br: best, br = l, r
    if best and best != t: print(s['i'], '|', t, '|', best, '|', round(br, 2))
