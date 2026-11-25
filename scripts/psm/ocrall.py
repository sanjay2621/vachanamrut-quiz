import sys, os, subprocess, warnings; warnings.filterwarnings('ignore'); sys.path.insert(0, r'C:\temp\pdftools')
from concurrent.futures import ThreadPoolExecutor
import pymupdf
pdf = sys.argv[1]; out = 'ocr'
n = len(pymupdf.open(pdf))
def work(i):
    txt = f'{out}/p{i:03d}.txt'
    if os.path.exists(txt): return
    d = pymupdf.open(pdf)
    png = f'{out}/p{i:03d}.png'
    d[i-1].get_pixmap(dpi=300, colorspace=pymupdf.csGRAY).save(png)
    r = subprocess.run([r'C:\temp\tesseract\tesseract.exe', png, '-', '-l', 'guj', '--psm', '6'], capture_output=True)
    open(txt, 'wb').write(r.stdout)
    os.remove(png)
with ThreadPoolExecutor(8) as ex: list(ex.map(work, range(1, n+1)))
print('done', n)
