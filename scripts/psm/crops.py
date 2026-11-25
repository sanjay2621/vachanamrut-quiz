import sys, os, csv, json, difflib, glob; sys.path.insert(0, r'C:\temp\pdftools'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageDraw, ImageFont
from garb import garbled
csv.field_size_limit(10**7)
items = []
for f in sorted(glob.glob('tsv/p*.tsv')):
    i = int(f[5:8])
    rows = list(csv.DictReader(open(f, encoding='utf8', errors='replace'), delimiter='\t', quoting=csv.QUOTE_NONE))
    lines = {}
    for r in rows:
        if r['level'] != '5' or not r['text'].strip(): continue
        k = (r['block_num'], r['par_num'], r['line_num'])
        x, y, w, h = int(r['left']), int(r['top']), int(r['width']), int(r['height'])
        L = lines.setdefault(k, {'w': [], 'b': [x, y, x + w, y + h]})
        L['w'].append(r['text']); b = L['b']
        L['b'] = [min(b[0], x), min(b[1], y), max(b[2], x + w), max(b[3], y + h)]
    tl = [(' '.join(v['w']), v['b']) for v in lines.values()]
    txt = [l.strip() for l in open(f'ocr/p{i:03d}.txt', encoding='utf8', errors='replace').read().split('\n')]
    for l in txt:
        if not l or not garbled(l): continue
        best = max(tl, key=lambda t: difflib.SequenceMatcher(None, t[0], l).ratio())
        items.append({'id': len(items) + 1, 'page': i, 'ocr': l, 'box': best[1]})
print(len(items), 'lines')
json.dump(items, open('crops.json', 'w', encoding='utf8'), ensure_ascii=False)
os.makedirs('cimg', exist_ok=True)
font = ImageFont.truetype('arial.ttf', 22)
PER = 16; W = 720
for c in range(0, len(items), PER):
    chunk = items[c:c + PER]; ims = []
    for it in chunk:
        pg = Image.open(f"tsv/p{it['page']:03d}.png")
        x0, y0, x1, y1 = it['box']
        im = pg.crop((max(0, x0 - 10), max(0, y0 - 12), min(pg.width, x1 + 10), min(pg.height, y1 + 12)))
        s = min(0.5, (W - 60) / im.width)
        ims.append(im.resize((int(im.width * s), int(im.height * s))))
    H = sum(m.height + 8 for m in ims)
    out = Image.new('L', (W, H), 255); d = ImageDraw.Draw(out); y = 0
    for it, m in zip(chunk, ims):
        d.text((2, y + m.height // 2 - 11), str(it['id']), font=font, fill=0)
        out.paste(m, (58, y)); y += m.height + 8
        d.line((0, y - 4, W, y - 4), fill=200)
    out.save(f'cimg/c{c // PER + 1:03d}.png')
print(len(glob.glob('cimg/*.png')), 'composites')
