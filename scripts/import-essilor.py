"""Import the supplied Essilor price matrices. Original sources are preserved.
Run with the bundled Python runtime (pdfplumber). The shop requested the supplied
2026.1 prices for the simulator on 2026-10-07, pending its next price update.
"""
import json
import re
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'lentes/tabela_essilor.pdf'
TARGET = ROOT / 'public/assets/lentes-data.json'
TREATMENTS = ['Crizal Prevencia', 'Crizal Sapphire HR', 'Crizal Rock', 'Crizal Easy Pro', 'Optifog', 'Trio Easy Clean', 'Verniz HC']
KODAK_TREATMENTS = TREATMENTS[:5] + ['No Reflex', 'Trio Easy Clean', 'Verniz HC']
MATERIALS = {'O': ('Orma', '1.50'), 'A': ('Airwear (policarbonato)', '1.59'), 'S': ('Stylis', '1.67'), 'H': ('Stylis', '1.74'), 'R': ('Resina', '1.60'), 'F': ('Resina', '1.56')}
TECH = {'i': 'Incolor', 'b': 'Blue UV Filter', 't': 'Transitions Gen S', 'x': 'Transitions XTRActive'}
XR = 'Ob Ot Ox Ab At Ax Sb St Sx Hb Ht'.split()
EYEZEN = 'Ob Ot Ox Ab At Ax Sb St Hb Ht'.split()
PHYSIO = 'Oi Ob Ot Ab At Ax Sb St Hb'.split()
COMFORT = 'Oi Ob Ot Ox Ab At Ax Sb St'.split()
LIBERTY = 'Oi Ob Ot Ox Ab At Ax'.split()
KODAK = 'Oi Ob Ot Ox Ab At Ax Sb St Hb Ht'.split()
AUDIT = []
tree = json.loads(TARGET.read_text(encoding='utf-8'))
for brand in ['Varilux', 'Eyezen', 'Essilor', 'Stellest', 'KODAK']:
    tree.pop(brand, None)

def add(brand, category, line, code, treatment, price, page, option=None):
    material, index = MATERIALS[code[0]]
    option = option or TECH[code[1]]
    assert isinstance(price, (int, float)) and price > 0
    config = {'m': material, 'i': index, 't': treatment, 'p': price}
    options = tree.setdefault(brand, {}).setdefault(category, {}).setdefault(line, {})
    options.setdefault(option, []).append(config)
    AUDIT.append({'brand': brand, 'category': category, 'line': line, 'option': option, 'page': page, **config})

with pdfplumber.open(SOURCE) as pdf:
    def matrix(page, start, end, brand, category, line, codes, centers, treatments):
        words = pdf.pages[page-1].extract_words(x_tolerance=3, y_tolerance=2)
        first_prices = sorted((w for w in words if start <= w['top'] <= end and re.fullmatch(r'(?:\d{1,3}\.)?\d{1,3},00',w['text']) and 100 <= w['x0'] <= 460), key=lambda w:w['top'])
        if first_prices:
            first_y = first_prices[0]['top']
            first_row = sorted((w for w in first_prices if abs(w['top']-first_y)<3),key=lambda w:w['x0'])
            if len(first_row)==len(treatments):
                centers = [(w['x0']+w['x1'])/2 for w in first_row]
        rows = {}
        for w in words:
            value = w['text']
            if not re.fullmatch(r'(?:\d{1,3}\.)?\d{1,3},0(?:0)?', value):
                continue
            price = float(value.replace('.', '').replace(',', '.'))
            x = (w['x0'] + w['x1']) / 2
            if not (start <= w['top'] <= end and min(centers)-15 <= x <= max(centers)+15 and price >= 100):
                continue
            key = next((y for y in rows if abs(y-w['top']) < 3), w['top'])
            col = min(range(len(centers)), key=lambda i: abs(centers[i]-x))
            assert abs(centers[col]-x) < 15, (page,line,value,x)
            assert col not in rows.setdefault(key, {}), (page,line,'duplicate column',value)
            rows[key][col] = price
        ordered = sorted(rows.items())
        assert len(ordered) == len(codes), (page,line,len(ordered),len(codes),ordered)
        for code, (_, prices) in zip(codes, ordered):
            for col, price in sorted(prices.items()):
                add(brand, category, line, code, treatments[col], price, page)

    # Centers and row boundaries are taken from the rendered source matrices.
    c5 = [183,232,278,321,367]
    matrix(4,140,335,'Varilux','Progressiva','XR Pro',XR,c5,TREATMENTS[:5])
    matrix(4,495,690,'Varilux','Progressiva','XR Track',XR,c5,TREATMENTS[:5])
    matrix(5,140,335,'Varilux','Progressiva','XR Track Lite',XR,[215,270,319,362,412],TREATMENTS[:5])
    matrix(5,495,690,'Varilux','Progressiva','XR Design',XR,[213,270,318,364,412],TREATMENTS[:5])
    matrix(6,150,310,'Varilux','Progressiva','Physio Extensee Track',PHYSIO,[185,234,285,334,385],TREATMENTS[:5])
    matrix(6,510,675,'Varilux','Progressiva','Physio Extensee',PHYSIO,[181,233,284,334,386],TREATMENTS[:5])
    matrix(7,145,302,'Varilux','Progressiva','Comfort Max',COMFORT,[192,235,276,319,363,403,445],TREATMENTS)
    matrix(7,510,582,'Varilux','Progressiva','Comfort','Oi Ot Ai At'.split(),[192,235,276,319,363,403,445],TREATMENTS[:-1]+['Sem antirreflexo'])
    matrix(8,145,260,'Varilux','Progressiva','Liberty 3.0',LIBERTY,[155,201,247,292,337,382,427],TREATMENTS)
    matrix(8,460,510,'Varilux','Progressiva','Liberty','Oi Ai'.split(),[158,203,249,294,340,384,430],TREATMENTS[:-1]+['Sem antirreflexo'])
    for start,end,line in [(140,200,'Digitime Near'),(245,307,'Digitime Mid')]:
        matrix(9,start,end,'Varilux','Ocupacional',line,'Ob Ab Sb'.split(),[192,235,276,315,357,398,440],TREATMENTS)
    matrix(9,360,373,'Varilux','Progressiva','Roadpilot',['Oi'],[385],['Trio Easy Clean'])
    for line in ['Sport','Sport Wrap']:
        matrix(9,470,501,'Varilux','Progressiva',line,'Ab At'.split(),[192,235,276,315,357],TREATMENTS[:5])
    for line in ['Boost 0.4','Boost 0.6','Boost 0.85']:
        matrix(10,132,298,'Eyezen','Visão Simples Digital',line,EYEZEN,[173,222,265,308,349],TREATMENTS[:5])
    matrix(10,450,630,'Eyezen','Visão Simples Digital','Start',EYEZEN,[173,224,274,324,375],TREATMENTS[:5])
    matrix(11,145,175,'Eyezen','Visão Simples Jovem','Kids','Ab At'.split(),[178,225,271,315,358],TREATMENTS[:5])
    for line,price,treatment,option in [('Stellest',1999,'Crizal Rock','Incolor'),('Stellest 2.0',2299,'Crizal Rock','Incolor'),('Stellest Sun',2199,'Crizal Sun XProtect','Solar')]:
        add('Stellest','Controle de Miopia',line,'Ai',treatment,price,11,option)
    matrix(12,130,340,'Essilor','Visão Simples','Visão simples surfaçada','Oi Ob Ot Ox Ai Ab At Ax Sb St Hb Ht'.split(),[163,204,246,287,327,368,409,452],['Crizal Prevencia','Crizal Sapphire HR','Crizal Rock','Crizal Easy Pro','Optifog','No Reflex','Trio Easy Clean','Sem antirreflexo'])
    for start,end,line in [(508,520,'Interview 0.80'),(530,543,'Interview 1.30')]:
        matrix(12,start,end,'Essilor','Ocupacional',line,['Oi'],[150,191,231,274,313,359,405],TREATMENTS[:-1]+['Sem antirreflexo'])
    for start,end,line,centers in [(130,322,'Unique Infinite',[185,226,264,300,336,371,408,445]),(360,552,'Unique UHD',[185,228,271,307,341,375,409,445]),(592,743,'Network UHD',[183,226,264,300,337,376,410,448])]:
        codes = 'Oi Ob Ot Ox Ab At Ax Sb St'.split() if line=='Network UHD' else KODAK
        matrix(13,start,end,'KODAK','Progressiva',line,codes,centers,KODAK_TREATMENTS)
    matrix(14,145,253,'KODAK','Progressiva','Precise UHD','Oi Ot Ab At Sb St'.split(),[155,199,238,275,311,348,385,421],KODAK_TREATMENTS)
    matrix(14,340,412,'KODAK','Progressiva','Precise','Oi Ot Ai At'.split(),[158,200,239,276,310,345,382,420],KODAK_TREATMENTS[:-1]+['Sem antirreflexo'])
    matrix(14,495,562,'KODAK','Ocupacional','SoftWear','Ob Ab Sb'.split(),[168,210,248,283,316,351,389,426],KODAK_TREATMENTS)
    matrix(15,125,323,'KODAK','Visão Simples Digital','Single',KODAK,[190,233,271,305,335,371,407,443],KODAK_TREATMENTS)

# Ready-made configurations, matched to the full printed rows on pages 10,12,15.
add('Eyezen','Visão Simples','Start Stock','Ri','Crizal Sapphire HR',1249,10,'Blue UV Filter')
for code,treatment,price,option in [('Hi','Crizal Sapphire HR',2089,'Incolor'),('Si','Crizal Sapphire HR',1479,'Blue UV Filter'),('At','Crizal Sapphire HR',1349,'Transitions Gen S cinza'),('At','Sem antirreflexo',689,'Transitions Gen S cinza'),('Ab','Crizal Sapphire HR',929,None),('Ab','Crizal Rock',819,None),('Ab','Crizal Easy Pro',569,None),('Ot','Crizal Easy Pro',989,'Transitions Gen S cinza'),('Ot','Sem antirreflexo',489,'Transitions Gen S cinza'),('Ob','Crizal Prevencia',799,None),('Ob','Crizal Sapphire HR',799,None),('Ob','Crizal Rock',579,None),('Ob','Crizal Easy Pro',439,None)]:
    add('Essilor','Visão Simples','Lentes prontas',code,treatment,price,12,option)
for line,code,treatment,price,option in [('City','Sb','Padrão',989,None),('City','Ab','Padrão',429,None),('City','Fb','Padrão',329,None),('No Reflex','Ot','No Reflex',649,'Transitions Gen S cinza'),('Blue','Sb','Padrão',879,None),('Blue','Ab','Padrão',319,None),('Blue','Fb','Padrão',219,None),('Intro','Ai','Padrão',209,None),('Intro','Fi','Padrão',109,None)]:
    add('KODAK','Visão Simples',line,code,treatment,price,15,option)
for brand in tree.values():
    for category in brand.values():
        for line in category.values():
            for configs in line.values():
                configs.sort(key=lambda c:c['p'])
TARGET.write_text(json.dumps(tree,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(ROOT/'qa/essilor-source-map.json').write_text(json.dumps({'source':'lentes/tabela_essilor.pdf','edition':'2026.1','shop_price_selection':'User requested these supplied values on 2026-10-07; pending next update.','configurations':AUDIT},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'imported':len(AUDIT),'brands':{b:sum(len(c) for cat in tree[b].values() for line in cat.values() for c in line.values()) for b in ['Varilux','Eyezen','Essilor','Stellest','KODAK']}},ensure_ascii=False))
