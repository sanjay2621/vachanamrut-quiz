import sys, warnings; warnings.filterwarnings('ignore'); sys.path.insert(0, r'C:\temp\pdftools')
import pymupdf
d = pymupdf.open(sys.argv[1]); out = sys.argv[2]; dpi = int(sys.argv[3])
for p in sys.argv[4:]:
    a, _, b = p.partition('-'); b = b or a
    for i in range(int(a), int(b)+1):
        d[i-1].get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY).save(f'{out}/p{i:03d}.png')
