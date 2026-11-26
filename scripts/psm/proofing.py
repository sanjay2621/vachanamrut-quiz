# Word-by-word proofreading corrections, read from part<N>/proof.txt and applied to psm-build.json's prasangs.
# One correction per line:  <n>|<wrong text>|<text as printed>   (n = prasang number in the part)
#   - the wrong text must occur in that prasang (exact, first occurrence is replaced); paragraphs are joined
#     with "\n" while correcting, so "\n" in either side joins/splits paragraphs
#   - a paragraph "§ text" is a sub-heading printed inside the prasang; "> " starts a verse paragraph
#     whose lines are separated by \l (U+2028)
#   - footnotes: "{૨}" in the text is the printed mark, "^૨ text" a footnote paragraph (end of the prasang);
#     the QR-code video notes are left out
#   - <n>#title|<title as printed>  replaces the title
#   - blank lines and lines starting with "##" are comments; "## done <n>" marks prasangs proofread through <n>
import re

# Systematic OCR slips fixed everywhere before the line corrections (checked against the page images):
#  - ટ/ઠ/ડ/ઢ + ય is printed as a conjunct (પડ્યા, કાઢ્યો, પ્રાગટ્ય); the OCR drops the virama
#  - the dash between words is an en dash
#  - a quote that opens “ and closes ’ is a single-quoted one (‘…’) in the book
#  - the OCR's zero-width joiners (સન્‍્માન) and doubled viramas; તેયાર for તૈયાર; સ્તાન/સતાન for સ્નાન
def normalize(t):
    t = t.replace('‍', '').replace('્્', '્')
    t = re.sub(r'([ટઠડઢ])ય', r'\1્ય', t)
    t = re.sub(r'(પૂછ|ઇચ્છ)ય', r'\1્ય', t)
    t = re.sub(r'(?<!્)જયા', 'જ્યા', t)
    t = re.sub('ર(?=[૦-૯])|(?<=[૦-૯])ર', '૨', t)   # ર read for the digit ૨
    t = re.sub('(?<![઀-૿])કેક(?=ન)', 'કૈંક', t)   # કેકની -> કૈંકની
    t = t.replace('તેયાર', 'તૈયાર').replace('કહયું', 'કહ્યું').replace('મિત્તિટ', 'મિનિટ').replace('પુન:', 'પુનઃ').replace('અંધારુ ', 'અંધારું ').replace('પોઢચા', 'પોઢ્યા').replace('દ્રારા', 'દ્વારા')
    t = re.sub('રાજય(?!ોગ)', 'રાજ્ય', t)
    t = re.sub('(?<![઀-૿])(હીં|તહીં)(?![઀-૿])', 'નહીં', t)   # નહીં read as હીં/તહીં
    t = re.sub('(?<![઀-૿])તથી(?![઀-૿])', 'નથી', t)   # નથી read as તથી
    t = re.sub('(દ્િ|દિ|હિ|દ્રિ|હ્િ)(?=શતાબ્દી|તીય)', 'દ્વિ', t)   # દ્વિશતાબ્દી, દ્વિતીય, અદ્વિતીય
    t = t.replace('દઢ', 'દૃઢ').replace('ઇતિશ્રી', 'ઈતિશ્રી').replace('ઇતિહાસ', 'ઈતિહાસ').replace('ઇશારો', 'ઈશારો').replace('એતિહાસિક', 'ઐતિહાસિક')
    t = t.replace('વિધયા', 'વિદ્યા').replace('વિધાનગર', 'વિદ્યાનગર').replace('પ્રસન્ત', 'પ્રસન્ન').replace('પડોંચ', 'પહોંચ').replace('બેન્ડ', 'બૅન્ડ').replace('હારિભક્ત', 'હરિભક્ત').replace('સંપન્ત', 'સંપન્ન').replace('પૂજય', 'પૂજ્ય').replace('સમેય', 'સમૈય').replace('પુરષોત્તમ', 'પુરુષોત્તમ').replace(': ઊ’', ': ‘').replace('જયોત', 'જ્યોત').replace('અન્તકૂટ', 'અન્નકૂટ').replace('ડોક્ટર', 'ડૉક્ટર').replace('હારિજન', 'હરિજન').replace('ફૂકત', 'ફૂંકત').replace('મેડિકલ', 'મૅડિકલ').replace(' પ૨ ', ' પર ').replace(' ૫૨ ', ' પર ').replace('રૅગ', 'રંગ').replace('રૅભ', 'રંભ').replace('માહૉલ', 'માહોલ').replace('શ્રીજી-મહારાજ', 'શ્રીજીમહારાજ').replace('હેલિકોપ્ટર', 'હેલિકૉપ્ટર').replace('પહોંચયા', 'પહોંચ્યા').replace('ગુરુસમૃતિ', 'ગુરુસ્મૃતિ').replace('કોમ્પ્યુટર', 'કૉમ્પ્યુટર').replace('કાર્યકમ', 'કાર્યક્રમ').replace('ઇજનેર', 'ઈજનેર').replace('ઇત્યાદિ', 'ઈત્યાદિ').replace('ઉત્સાડ', 'ઉત્સાહ').replace('હોસ્ટેલ', 'હૉસ્ટેલ').replace('રૉત્રિ', 'રાત્રિ').replace('મહત્વ', 'મહત્ત્વ').replace('ફિલોસોફી', 'ફિલોસૉફી').replace('જીવનપર્યત', 'જીવનપર્યંત').replace('નગર-યાત્રા', 'નગરયાત્રા').replace('હોર્ન', 'હૉર્ન').replace('બેરાં', 'બૈરાં').replace('એવરેસ્ટ', 'ઍવરેસ્ટ').replace('એન્જિનિયર', 'ઍન્જિનિયર').replace('ઇજનરૂપ', 'ઈજનરૂપ').replace('પ્રકુતિ', 'પ્રકૃતિ').replace('સર્વાગ', 'સર્વાંગ').replace('ઇન્ડસ્ટ્રી', 'ઈન્ડસ્ટ્રી').replace('મહાપુરષ', 'મહાપુરુષ').replace('હેયાં', 'હૈયાં').replace('શુંખલા', 'શૃંખલા').replace('પરતુ ', 'પરંતુ ').replace('વિઘાનગર', 'વિદ્યાનગર').replace('ગુરૂ', 'ગુરુ').replace('મોબાઈલ', 'મોબાઇલ').replace('ઉજજવળ', 'ઉજ્જવળ').replace('કોલોની', 'કૉલોની').replace('મોટાપુરષ', 'મોટાપુરુષ').replace('તાદેશ', 'તાદૃશ').replace('ઊપજયું', 'ઊપજ્યું').replace('વિધાર્થી', 'વિદ્યાર્થી').replace('ઇન્ટરકોમ', 'ઈન્ટરકૉમ').replace('ચૉત્રિ', 'રાત્રિ').replace('પ્રાકટચ', 'પ્રાકટ્ય').replace('સ્કુરે', 'સ્ફુરે').replace('તયારે', 'ત્યારે').replace('ઇશારો', 'ઈશારો')
    t = re.sub('(?<![઀-૿])સોને(?![઀-૿])', 'સૌને', t)
    t = re.sub('દોધ(?=[ાાીુેો])', 'દીધ', t)   # દોધી/દોધો -> દીધી/દીધો
    t = re.sub(r'(?<=[઀-૿])\?', ' ?', t)
    t = re.sub('(?<![઀-૿])હારા(?![઀-૿])', 'દ્વારા', t)   # હારા -> દ્વારા
    t = re.sub('(્યુ)(?![઀-૿])', '\\1ં', t)   # કર્યુ -> કર્યું
    t = t.replace('સ્મૂતિ', 'સ્મૃતિ')   # the book sets a space before ?
    t = re.sub('(?<![઀-૿])ઓફ(?![઀-૿])', 'ઑફ', t)
    # dates: તા. ૨૧/૮ના રોજ / ૮/૭ની સવારે, read as ૮નતા, ૭તતા, ૭તી
    t = re.sub('(?<=[૦-૯]/[૦-૯])(નતા|તતા|તા)(?= રોજ)', 'ના', t)
    t = re.sub('(?<=[૦-૯]/[૦-૯])(નતી|તી)(?= )', 'ની', t)
    t = re.sub('(?<![઀-૿])સોએ(?![઀-૿])', 'સૌએ', t)   # સોએ -> સૌએ
    t = re.sub('(?<=[૦-૯])ઃ(?=[૦-૯])', ':', t)
    t = re.sub(r'^[_?!\s]+(?=[^\s_?!])', '', t)   # OCR specks at a paragraph start
    # ઑ in loanwords as printed (હૉલ, ઑફિસ, કૉલેજ, હૉસ્પિટલ)
    t = re.sub(r'હોલ(?=માં|ના|ની|નું|ને|નો|થી|[\s,.!’]|$)', 'હૉલ', t)
    t = t.replace('ઓફિસ', 'ઑફિસ').replace('કોલેજ', 'કૉલેજ').replace('હોસ્પિટલ', 'હૉસ્પિટલ')
    # dropped ૃ (દૃશ્ય, દૃષ્ટિ, હૃદય) and દ્ + consonant read as દ્દ (ઉદ્‌ઘાટન, દ્વારા, અદ્‌ભુત, સદ્‌ગુરુ)
    t = t.replace('દશ્ય', 'દૃશ્ય').replace('દષ્ટ', 'દૃષ્ટ').replace('હદય', 'હૃદય')
    t = t.replace('જીર્ણોદ્દાર', 'જીર્ણોદ્ધાર').replace('દ્દાર', 'દ્વાર').replace('વિદ્દાન', 'વિદ્વાન').replace('ઉદ્દેગ', 'ઉદ્વેગ')
    t = t.replace('દ્દધ', 'દ્‌ઘ')
    t = re.sub(r'દ્દ([ઘગભબનવ])', 'દ્‌\\1', t)
    # loanwords are printed with ઈ inside the word (હાઈસ્કૂલ, સાઈકલ, ટાઈમ)
    t = re.sub(r'(?<=[઀-૿])ઇ', 'ઈ', t).replace('બદઈરાદો', 'બદઇરાદો')
    # the colon that introduces a quote is printed tight: "બોલ્યા: ‘…"
    t = re.sub(r'([઀-૿)]) [:ઃ] ', r'\1: ', t)
    t = re.sub(r'([઀-૿])ઃ(?= [‘“]|$)', r'\1:', t)
    t = re.sub(r'(?<=[઀-૿]):(?=[઀-૿])', 'ઃ', t)   # પ્રાતઃપૂજા
    t = re.sub('(?<=[૦-૯])ઃ(?=[૦-૯])', ':', t)   # times: ૬:૪૫
    t = re.sub(r'(?<![઀-૿])(સ્તાન|સતાન)(?![મ])', 'સ્નાન', t)
    t = t.replace(' - ', ' – ')
    t = re.sub(r'“([^“”‘’\n]*)’', r'‘\1’', t)
    return t


def apply_proof(out, path, strict=True):
    bad = []
    try:
        lines = open(path, encoding='utf8').read().split('\n')
    except FileNotFoundError:
        return 0
    by_n = {p['n']: p for p in out}
    for p in out:
        p['paras'] = [normalize(x) for x in p['paras']]
        p['title'] = normalize(p['title'])
    count = 0
    for k, l in enumerate(lines, 1):
        if not l.strip() or l.startswith('##'):
            continue
        key, _, rest = l.partition('|')
        p = by_n.get(int(key.split('#')[0]))
        if key.endswith('#title'):
            p['title'] = rest; count += 1; continue
        old, sep, new = rest.partition('|')
        old = old.replace('\\n', '\n'); new = new.replace('\\n', '\n').replace('\\l', ' ')
        body = '\n'.join(p['paras'])
        if not sep or old not in body:
            bad.append(f'line {k}: not found in {key}: {old}')
            continue
        body = body.replace(old, new, 1)
        p['paras'] = [x for x in body.split('\n') if x.strip()]
        count += 1
    if bad and strict:
        raise SystemExit('proof.txt errors:\n' + '\n'.join(bad))
    for b in bad: print(b)
    return count
