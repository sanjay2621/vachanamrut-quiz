# Writes public/data/psm.json (index: parts, years, topics, prasang list) and
# public/data/psm-<part>.json (prasang texts) from psm-build.json.
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
here = os.path.dirname(os.path.abspath(__file__))
out_dir = sys.argv[1]
PART = 3
b = json.load(open(os.path.join(here, 'psm-build.json'), encoding='utf8'))
idx_path = os.path.join(out_dir, 'psm.json')
idx = json.load(open(idx_path, encoding='utf8')) if os.path.exists(idx_path) else {'parts': [], 'years': [], 'topics': [], 'prasangs': []}

part = {'n': PART, 'gu': 'બ્રહ્મસ્વરૂપ શ્રી પ્રમુખસ્વામી મહારાજ : ભાગ ૩', 'en': 'Brahmaswarup Shri Pramukh Swami Maharaj, Part 3',
        'from': 1975, 'to': 1978, 'count': len(b['out'])}
idx['parts'] = sorted([p for p in idx['parts'] if p['n'] != PART] + [part], key=lambda p: p['n'])
years = {y['year']: y for y in idx['years']}
for y, _, gu in b['years']: years[y] = {'year': y, 'part': PART, 'gu': gu}
idx['years'] = sorted(years.values(), key=lambda y: y['year'])
idx['topics'] = b['topics']
idx['prasangs'] = [p for p in idx['prasangs'] if p['part'] != PART] + [
    {'id': f"{PART}-{p['n']}", 'part': PART, 'n': p['n'], 'year': p['year'], 'page': p['page'], 'title': p['title'],
     'topics': p['topics'], **({'touching': 1} if p['touching'] else {})}
    for p in b['out']]
idx['prasangs'].sort(key=lambda p: (p['part'], p['n']))
json.dump(idx, open(idx_path, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
texts = {f"{PART}-{p['n']}": p['paras'] for p in b['out']}
tp = os.path.join(out_dir, f'psm-{PART}.json')
json.dump(texts, open(tp, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(idx_path, os.path.getsize(idx_path), tp, os.path.getsize(tp))
