import sys; sys.stdout.reconfigure(encoding="utf-8")
ENDS = ".?!'’”"
import re, json, difflib, glob
G = re.compile(r'[઀-૿]')
def letters(s): return ''.join(c for c in s if 'અ' <= c <= 'હ' or c in '૦')
def junk(line):
    t = line.strip()
    if not t: return False
    toks = t.split()
    g = len(G.findall(t))
    if g < len(t) * 0.5: return True
    if len(toks) >= 3 and sum(len(x) <= 2 for x in toks) / len(toks) > 0.6: return True
    if len(t) <= 3: return True
    return False
toc = [l.strip() for l in open('toc.txt', encoding='utf8', errors='replace')]
skip = {'અનબકમણિકા','વિષય પૃષ્ઠ','પરમારથ કારણ જગ વિચરત'}
titles = []
for l in toc[3:]:
    if l.startswith('અમૃતધારા') or 'સન ૧૯૭' in l or 'સત ૧૯૭' in l or l.startswith('*'): continue
    titles.append(l.rstrip('�'))
pages = {}
for i in range(31, 621):
    lines = open(f'ocr/p{i:03d}.txt', encoding='utf8', errors='replace').read().split('\n')
    while lines and not lines[0].strip(): lines.pop(0)
    if lines and ('પ્રમુખસ્વામી મહારાજ :' in lines[0] or re.search(r':\s*૧૯૭', lines[0])): lines.pop(0)
    out = []
    for l in lines:
        if junk(l):
            out.append('')
        else: out.append(l.strip())
    pages[i] = out

titles = titles[1:]  # first entry is the chapter name
norm = [letters(t) for t in titles]
ti = 0
def is_title(l):
    global ti
    if len(l) > 60: return False
    lt = letters(l)
    if len(lt) < 3: return False
    for k in range(ti, min(ti + 4, len(titles))):
        if difflib.SequenceMatcher(None, lt, norm[k]).ratio() > 0.8:
            for m in range(ti, k): print('MISSED', m, titles[m])
            ti = k + 1
            return titles[k]
    return False
sections = []; sec = None; cur = None
def close():
    global cur
    if cur and sec is not None: sec['paras'].append(cur)
    cur = None
for i in range(31, 621):
    first = True
    for l in pages[i] + ['']:
        if not l:
            if cur: close()
            continue
        t = is_title(l)
        if t:
            close()
            sec = {'i': len(sections) + 1, 'title': t, 'page': i, 'paras': []}
            sections.append(sec); first = False
            continue
        if cur is None:
            if first and sec and sec['paras'] and sec['paras'][-1][0] == i - 1 and sec['paras'][-1][1][-1] not in ENDS:
                cur = sec['paras'].pop()
            else:
                cur = [i, '']
        txt = cur[1]
        cur[1] = txt + l if txt.endswith('-') or not txt else txt + ' ' + l
        first = False
    close()
for k in range(ti, len(titles)): print('MISSED END', k, titles[k])
json.dump(sections, open('sections.json', 'w', encoding='utf8'), ensure_ascii=False)
print(len(titles), 'titles', len(sections), 'sections', sum(len(s['paras']) for s in sections), 'paras')
with open('book.txt', 'w', encoding='utf8') as f:
    for s in sections:
        f.write(f"\n### S{s['i']} [{s['page']}] {s['title']}\n")
        for j, (p, t) in enumerate(s['paras']): f.write(f"{j}| {t}\n")
