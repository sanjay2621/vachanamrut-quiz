import sys, os, subprocess, warnings; warnings.filterwarnings('ignore'); sys.path.insert(0, r'C:\temp\pdftools')
from concurrent.futures import ThreadPoolExecutor
import pymupdf
pdf = sys.argv[1]
def work(i):
    png = f'tsv/p{i:03d}.png'
    if not os.path.exists(png):
        d = pymupdf.open(pdf); d[i-1].get_pixmap(dpi=300, colorspace=pymupdf.csGRAY).save(png)
    if not os.path.exists(f'tsv/p{i:03d}.tsv'):
        subprocess.run([r'C:\temp\tesseract\tesseract.exe', png, f'tsv/p{i:03d}', '-l', 'guj', '--psm', '6', 'tsv'], capture_output=True)
with ThreadPoolExecutor(8) as ex: list(ex.map(work, range(31, 586)))
print('ok')
