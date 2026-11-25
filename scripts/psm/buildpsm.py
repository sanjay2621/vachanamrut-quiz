import json, sys, re, os, difflib
sys.stdout.reconfigure(encoding='utf-8')
os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())

secs = json.load(open('sections.json', encoding='utf-8'))
crops = json.load(open('crops.json', encoding='utf8')) + json.load(open('crops2.json', encoding='utf8'))
fx = {}; BOOKTITLES = {}
for f in ('fix.txt', 'fix2.txt'):
    for l in open(f, encoding='utf8'):
        k, _, v = l.rstrip('\n').partition('|'); k = int(k)
        if v.startswith('#T '): BOOKTITLES[k] = v[3:]; v = ''   # a prasang title line: not body text
        fx[k] = v
for k in list(range(345, 353)) + [433, 434]: fx[k] = ''   # English footnotes: dropped with the footnotes
OFFSET = 30  # printed page = PDF page - 30

# ---- 0. paragraph starts: lines indented past the page margin (the OCR text has no blank lines)
import collections
_rows = collections.defaultdict(list)
for r in json.load(open('conf.json', encoding='utf8')): _rows[r['page']].append(r)
marked = 0
for pg, rs in _rows.items():
    lefts = sorted(r['box'][0] for r in rs if r['box'][2] - r['box'][0] > 600)
    if not lefts: continue
    margin = lefts[len(lefts) // 5]
    for r in rs:
        if not (margin + 80 < r['box'][0] < margin + 200) or len(r['ocr']) < 15: continue
        for s in secs:
            for p in s['paras']:
                if abs(p[0] - pg) <= 1 and r['ocr'] in p[1]:
                    i = p[1].index(r['ocr'])
                    if i > 0 and p[1][i - 2:i] != '¶ ': p[1] = p[1][:i] + '¶ ' + p[1][i:]; marked += 1
                    break
            else: continue
            break
print('paragraph marks', marked)

# ---- 1. proofread lines back into the paragraphs
def find(text, page):
    for s in secs:
        for p in s['paras']:
            if abs(p[0] - page) <= 1 and text and text in p[1]: return p
    return None
ocrlines = {}
def pagelines(pg):
    if pg not in ocrlines:
        ocrlines[pg] = [l.strip() for l in open(f'ocr/p{pg:03d}.txt', encoding='utf8', errors='replace').read().split('\n')]
    return ocrlines[pg]
cur = {}  # (page, ocr line) -> current text
missing = 0
for x in crops:
    if x['id'] not in fx or x['page'] > 585: continue
    new = fx[x['id']]
    p = find(x['ocr'], x['page'])
    if p:
        p[1] = p[1].replace(x['ocr'], new, 1); cur[(x['page'], x['ocr'])] = new; continue
    if not new: continue
    # the line was dropped as junk at build time: insert it after the previous line of the page
    ls = pagelines(x['page']); i = ls.index(x['ocr']) if x['ocr'] in ls else -1
    prev = next((ls[j] for j in range(i - 1, -1, -1) if ls[j]), None) if i > 0 else None
    q = cur.get((x['page'], prev), prev) if prev else None
    tp = find(q, x['page']) if q else None
    if tp:
        k = tp[1].index(q) + len(q)
        tp[1] = tp[1][:k] + ' ' + new + tp[1][k:]; cur[(x['page'], x['ocr'])] = new
    else:
        missing += 1; print('NOT PLACED', x['id'], new[:60])

# ---- 2. text cleanup
HEAD = re.compile(r'\s*(પરમારથ કારણ જગ વિચરત|આવા બ્રહ્મ સૃષ્ટિમાં ન ભાળ્યા|પૂર્વમાં પ્રગટ[યચ્]+ા ને પશ[્ચ્રિ્વિ]+મ પ્રકાશ્યા|આવા સંત લાગે મુને પ્યારા રે\.\.\.)\s*[:ઃ]+\s*૧૯૭[૫-૮]\s*[૦-૯પ]{0,3}')
GD = '૦૧૨૩૪૫૬૭૮૯'
def gnum(s): return int(''.join(str(GD.index(c)) for c in s))
fnext = [1]
QR_END = re.compile(r'વીડિયોને\s+માણો\.')
def strip_footnotes(t):
    out = t; pos = 0
    while True:
        m = None
        for mm in re.finditer(r'(?:^|\s)([૦-૯]{1,3})\.\s', out[pos:]):
            v = gnum(mm.group(1)); cands = {v, v % 100, v // 10}
            ok = [c for c in cands if fnext[0] <= c <= fnext[0] + 3]
            if ok:
                m = mm; fnext[0] = max(ok) + 1; break
        if not m: return out
        a = pos + m.start()
        q = QR_END.search(out, a)
        if q and q.start() - a < 400:
            b = q.end()
            mm2 = re.match(r'(?:\s+\S{1,2}(?=\s|$))*', out[b:]); b += mm2.end()
            out = out[:a] + ' ' + out[b:]
        else:
            out = out[:a]
        pos = a

from repl import REPL
def clean(t):
    for a, b in REPL: t = t.replace(a, b)
    t = re.sub(r'([૦-૯]/[૦-૯]{1,2})૧ી', r'ની', t)
    t = re.sub(r'^(?:\[|9|6|-9)\s+', '', t)
    t = HEAD.sub(' ', t)
    t = strip_footnotes(t)
    # QR notes left without their number
    t = re.sub(r'[^.!?’]{0,200}ક્?[યય]ૂઆર[^.]{0,200}વીડિયોને\s+માણો\.(?:\s+\S{1,2}(?=\s|$))*', ' ', t)
    t = re.sub(r'(?:\S+\s+){0,6}?\S*વા\s+બાજુના\s+ક્?[યય]ૂઆર.*?વીડિયોને\s+માણો\.(?:\s+\S{1,4}(?=\s|$))*', ' ', t)
    t = re.sub(r'\s\|\s*!?(?=\s|$)', ' !', t).replace('|!', '!').replace('|', '')
    t = re.sub(r'\[(?=[઀-૿])(?![^\]]{0,30}\])', '', t)
    t = t.replace('«ન', 'ન').replace('«થી', 'નથી').replace('«હીં', 'નહીં').replace('«હોતો', 'નહોતો').replace('«', 'ન')
    t = re.sub(r'([.!?’”\'])[0-9૦-૯]{1,2}(?=\s|$)', r'\1', t)        # footnote reference marks
    t = re.sub(r'([.!?’”\'])\*+[0-9૦-૯]{0,2}(?=\s|$)', r'\1', t)
    t = re.sub(r'(^|\s)ઊ(?=[અઆઇઈઉઊએઐઓઔ])', r'\1‘', t)                  # misread opening quote
    t = re.sub(r"(^|[\s(“])'(?=\S)", r'\1‘', t); t = t.replace("'", '’')
    if '(' in t:
        t = re.sub(r'\((?![^()]*\))', '‘', t)                          # unclosed ( = misread opening quote
    t = re.sub(r'\s+', ' ', t).strip()
    for a, b in REPL: t = t.replace(a, b)
    t = re.sub(r'\s\[7૫\s', ' ', t)
    return t

def strip_qr(t):
    while True:
        m = re.search(r'બાજુના\s+ક્?[યય]ૂઆર', t)
        if not m: return t
        e = re.compile(r'વીડિયોને\s+માણો\.').search(t, m.end())
        if not e or e.start() - m.end() > 300: e = None
        back = t[max(0, m.start() - 170):m.start()]
        fn = list(re.finditer(r'(?:^|\s)[૦-૯]{1,3}\.\s', back))
        if fn: a = m.start() - len(back) + fn[-1].start()
        else:
            w = list(re.finditer(r'\S+', back))[-2:]
            a = m.start() - len(back) + w[0].start() if w else m.start()
        if e:
            b = e.end(); junk = re.match(r'(?:\s+(?!તા\.)\S{1,3}(?=\s|$)){0,4}', t[b:]); b += junk.end()
        else:
            b = m.end()
        t = (t[:a].rstrip() + ' ' + t[b:].lstrip()).strip()

def strip_qr2(t):
    return re.sub(r'(?:^|(?<=\s))આર\s\(\S{1,5}\)\s+કોડ\s+પ\S\s+આપના.*?વીડિયોને(?:\s+માણો\.)?(?:\s+\S{1,2}(?=\s))*\s*', '', t)

# section titles as printed on the page (the table-of-contents OCR dropped final vowel signs etc.)
TITLES = {int(k): v for k, v in json.load(open('titles.json', encoding='utf8')).items()}
FIXT = {'આવું રોજ થાય છે?': 'આવું રોજ થાય છે ?', 'રસપ્રચુર આમ્ર-વિનનોદ': 'રસપ્રચુર આમ્ર-વિનોદ', 'બ્રમરષિનો પ્રભુપ્રેમ': 'બ્રહ્મર્ષિનો પ્રભુપ્રેમ', 'ગુણાતીતઃ સ ઉચ્યતે': 'गुणातीतः स उच्यते'}
DROP = {93: range(1, 99), 214: range(2, 99), 375: range(3, 99), 448: range(5, 999)}  # chapter-title scraps, photo pages
YEARS = [(1975, 1, 'પરમારથ કારણ જગ વિચરત'), (1976, 94, 'આવા બ્રહ્મ સૃષ્ટિમાં ન ભાળ્યા'),
         (1977, 215, 'પૂર્વમાં પ્રગટ્યા ને પશ્ચિમ પ્રકાશ્યા'), (1978, 376, 'આવા સંત લાગે મુને પ્યારા રે...')]
def year(i): return max(y for y, s, _ in YEARS if i >= s)

# ---- 3. reading notes: topics and હૃદયસ્પર્શી per prasang
TOPICS = []
for l in open('topics.txt', encoding='utf8'):
    if l.startswith('#') or not l.strip(): continue
    tid, rest = l.split(None, 1); gu, en = [x.strip() for x in rest.split('|')]
    TOPICS.append({'id': tid, 'gu': gu, 'en': en})
TIDS = {t['id'] for t in TOPICS}
base, splits, extra = {}, {}, {}
for l in open('notes.txt', encoding='utf8'):
    l = l.rstrip('\n')
    if not l.startswith('S'): continue
    head, tps, touch, summ = l.split('|', 3)
    m = re.fullmatch(r'S(\d+)(b)?(?:@(\d+)=(.*))?', head)
    n = int(m.group(1)); tl = [x for x in tps.split(',') if x in TIDS]
    e = {'topics': tl, 'touch': int(touch) if touch.isdigit() else 0}
    if m.group(3):
        k, ti = int(m.group(3)), m.group(4)
        if not tl: continue
        if ti.startswith('?'):
            if ti == '?TITLE2': ti = 'बड़ो दान सन्मान'
            else: extra.setdefault(n, []).append(e); continue        # not a book title: stays in the section
        ti = re.sub(r'^[*.\-]+', '...', ti).replace("'", '’')
        splits.setdefault(n, []).append((k, ti, e))
    elif m.group(2): e['b'] = True; extra.setdefault(n, []).append(e)
    else: base[n] = e

def merge(a, e):
    return {'topics': a['topics'] + [t for t in e['topics'] if t not in a['topics']], 'touch': max(a['touch'], e['touch'])}

out = []
for s in secs:
    n = s['i']
    keep = [(j, p, clean(t)) for j, (p, t) in enumerate(s['paras']) if j not in DROP.get(n, ())]
    b = base.get(n)
    if not b: print('NO NOTE S%d' % n); b = {'topics': [], 'touch': 0}
    sp = sorted(splits.get(n, []))
    for e in extra.get(n, []):
        # "b" notes add to the section only when it is not split (a split note already covers that part)
        if not sp or not e.get('b'): b = merge(b, e)
    cuts = [(0, TITLES.get(n, s['title']).replace("'", '’'), b)] + sp
    for ci, (k, ti, e) in enumerate(cuts):
        end = cuts[ci + 1][0] if ci + 1 < len(cuts) else 10**9
        js = []
        for j, p, t in keep:
            if not (k <= j < end) or len(re.findall(r'[઀-૿A-Za-z]', t)) < 3: continue
            # join paragraphs broken by page breaks / removed footnotes
            if js and not re.search(r'[.?!’”…)\]]\s*$', js[-1][1]): js[-1] = (js[-1][0], js[-1][1] + ' ' + t)
            else: js.append((p, t))
        if not js: print('EMPTY', n, k, ti); continue
        ti = FIXT.get(ti, ti)
        if '’' in ti: ti = ti.replace('“', '‘')
        # a title line the OCR glued to the first paragraph
        if js:
            p0 = js[0][1]; core = ti.lstrip('.'); m0 = re.match(r'[*.\s]*', p0).end()
            if difflib.SequenceMatcher(None, p0[m0:m0 + len(core)], core).ratio() > 0.75:
                js[0] = (js[0][0], p0[m0 + len(core):].strip())
        js = [(p, strip_qr2(strip_qr(t))) for p, t in js]
        js = [(p, x.strip()) for p, t in js for x in t.split('¶') if len(re.findall(r'[઀-૿A-Za-zऀ-ॿ]', x)) >= 3]
        out.append({'n': len(out) + 1, 'sec': n, 'year': year(n), 'page': js[0][0] - OFFSET, 'title': ti,
                    'topics': e['topics'], 'touching': e['touch'] == 2, 'paras': [t for _, t in js]})
print(len(out), 'prasangs', sum(p['touching'] for p in out), 'touching; not placed', missing, '; footnotes up to', fnext[0] - 1)
import difflib
for k, t in BOOKTITLES.items():
    best = max(out, key=lambda p: difflib.SequenceMatcher(None, p['title'], t).ratio())
    r = difflib.SequenceMatcher(None, best['title'], t).ratio()
    if r < 1: print('TITLE', k, round(r, 2), t, '<->', best['n'], best['title'])
json.dump({'out': out, 'topics': TOPICS, 'years': YEARS}, open('psm-build.json', 'w', encoding='utf8'), ensure_ascii=False)
