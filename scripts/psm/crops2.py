import sys, json, re, os
sys.path.insert(0, r'C:\temp\pdftools'); sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageDraw, ImageFont
rows = json.load(open('conf.json', encoding='utf8'))
secs = json.load(open('sections.json', encoding='utf-8'))
text = {}
for s in secs:
    for p, t in s['paras']: text.setdefault(p, []).append(t)
HEAD = re.compile(r'(પરમારથ કારણ|આવા બ્રહ્મ સૃષ્ટિમાં|પૂર્વમાં પ્રગટ|આવા સંત લાગે|પ્રમુખસ્વામી મહારાજ\s*[:ઃ]\s*૩)')
items = []
for r in rows:
    if r['fixed'] or r['conf'] >= 72: continue
    if HEAD.search(r['ocr']) or 'ક્યૂઆર' in r['ocr'] or 'વીડિયો' in r['ocr'] or 'કેમેરો' in r['ocr']: continue
    inpara = any(r['ocr'] in t for t in text.get(r['page'], []) + text.get(r['page'] - 1, []))
    g = len(re.findall('[\u0A80-\u0AFF]', r['ocr']))
    if not inpara and g < 15: continue
    items.append({'id': 1000 + len(items) + 1, 'page': r['page'], 'ocr': r['ocr'], 'box': r['box'], 'inpara': inpara})
print(len(items), sum(not x['inpara'] for x in items))
json.dump(items, open('crops2.json', 'w', encoding='utf8'), ensure_ascii=False)
os.makedirs('cimg2', exist_ok=True)
font = ImageFont.truetype('arial.ttf', 20); PER = 16; W = 720
for c in range(0, len(items), PER):
    chunk = items[c:c + PER]; ims = []
    for it in chunk:
        pg = Image.open(f"tsv/p{it['page']:03d}.png"); x0, y0, x1, y1 = it['box']
        im = pg.crop((max(0, x0 - 10), max(0, y0 - 12), min(pg.width, x1 + 10), min(pg.height, y1 + 12)))
        s = min(0.5, (W - 64) / im.width); ims.append(im.resize((max(1, int(im.width * s)), max(1, int(im.height * s)))))
    H = sum(m.height + 8 for m in ims); out = Image.new('L', (W, H), 255); d = ImageDraw.Draw(out); y = 0
    for it, m in zip(chunk, ims):
        d.text((2, y + m.height // 2 - 10), str(it['id']), font=font, fill=0); out.paste(m, (62, y)); y += m.height + 8
        d.line((0, y - 4, W, y - 4), fill=200)
    out.save(f'cimg2/c{c // PER + 1:03d}.png')
print((len(items) + PER - 1) // PER, 'composites')
