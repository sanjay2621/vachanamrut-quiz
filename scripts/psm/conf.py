import sys, csv, json, glob, statistics
sys.stdout.reconfigure(encoding='utf-8'); csv.field_size_limit(10**7)
crops = json.load(open('crops.json', encoding='utf8'))
fixed = {(x['page'], x['ocr']) for x in crops}
rows = []
for i in range(31, 586):
    lines = {}
    for r in csv.DictReader(open(f'tsv/p{i:03d}.tsv', encoding='utf8', errors='replace'), delimiter='\t', quoting=csv.QUOTE_NONE):
        if r['level'] != '5' or not r['text'].strip(): continue
        k = (r['block_num'], r['par_num'], r['line_num'])
        x, y, w, h = int(r['left']), int(r['top']), int(r['width']), int(r['height'])
        L = lines.setdefault(k, {'w': [], 'c': [], 'b': [x, y, x + w, y + h]})
        L['w'].append(r['text']); L['c'].append(float(r['conf'])); b = L['b']
        L['b'] = [min(b[0], x), min(b[1], y), max(b[2], x + w), max(b[3], y + h)]
    for v in lines.values():
        t = ' '.join(v['w'])
        rows.append({'page': i, 'ocr': t, 'box': v['b'], 'conf': statistics.mean(v['c']), 'low': sum(c < 60 for c in v['c']) / len(v['c']), 'fixed': (i, t) in fixed})
json.dump(rows, open('conf.json', 'w', encoding='utf8'), ensure_ascii=False)
import collections
for f in (True, False):
    cs = sorted(r['conf'] for r in rows if r['fixed'] == f)
    print(f, len(cs), [round(cs[int(len(cs) * q)]) for q in (0.1, 0.25, 0.5, 0.75, 0.9)])
for th in (60, 65, 70, 75, 80):
    print(th, sum(1 for r in rows if not r['fixed'] and r['conf'] < th))
