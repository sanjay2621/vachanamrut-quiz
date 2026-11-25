import re
G = re.compile(r'[\u0A80-\u0AFF]')
def garbled(line):
    t = re.sub(r'[૦-૯0-9]+/[૦-૯0-9]+(/[૦-૯0-9\']+)?', '', line)
    if 'ક્યૂઆર' in t or 'કયૂઆર' in t or 'વીડિયો' in t: return False
    for b in re.findall(r'\S*[%#«/$&@A-Za-z0-9]\S*', t):
        if G.search(b): return True
    return False
