import sys, os, subprocess, warnings, json, csv, io; warnings.filterwarnings('ignore'); sys.path.insert(0, r'C:\temp\pdftools')
sys.stdout.reconfigure(encoding='utf-8')
from concurrent.futures import ThreadPoolExecutor
import pymupdf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from garb import garbled
pdf = sys.argv[1]
os.makedirs('tsv', exist_ok=True)
pages = []
for i in range(31, 621):
    ls = open(f'ocr/p{i:03d}.txt', encoding='utf8', errors='replace').read().split('\n')
    if any(garbled(l) for l in ls): pages.append(i)
print(len(pages), 'pages')
def work(i):
    png = f'tsv/p{i:03d}.png'
    if not os.path.exists(png):
        d = pymupdf.open(pdf); d[i-1].get_pixmap(dpi=300, colorspace=pymupdf.csGRAY).save(png)
    if not os.path.exists(f'tsv/p{i:03d}.tsv'):
        r = subprocess.run([r'C:\temp\tesseract\tesseract.exe', png, f'tsv/p{i:03d}', '-l', 'guj', '--psm', '6', 'tsv'], capture_output=True)
with ThreadPoolExecutor(8) as ex: list(ex.map(work, pages))
print('ok')
