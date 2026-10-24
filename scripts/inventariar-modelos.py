"""Lê os modelos originais sem regravar seus pacotes OOXML."""
import json,sys,zipfile,re
from pathlib import Path
from xml.etree import ElementTree as ET
S={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
W={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
saida={}
for arquivo in Path(sys.argv[1]).rglob('*'):
    if arquivo.suffix not in ['.xlsx','.docx'] or '-Exemplo' in arquivo.name: continue
    with zipfile.ZipFile(arquivo) as z:
        if arquivo.suffix=='.xlsx':
            wb=ET.fromstring(z.read('xl/workbook.xml'))
            strings=[]
            if 'xl/sharedStrings.xml' in z.namelist():
                strings=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml'))]
            abas=[]
            for i,aba in enumerate(wb.find('s:sheets',S)):
                xml=ET.fromstring(z.read(f'xl/worksheets/sheet{i+1}.xml'))
                celulas={}
                for row in xml.findall('s:sheetData/s:row',S):
                    if int(row.attrib['r'])>10:continue
                    for c in row:
                        v=c.find('s:v',S);f=c.find('s:f',S)
                        valor=v.text if v is not None else ''.join(c.find('s:is',S).itertext()) if c.find('s:is',S) is not None else ''
                        if c.attrib.get('t')=='s':valor=strings[int(valor)]
                        if valor or f is not None:celulas[c.attrib['r']]='='+f.text if f is not None else valor
                abas.append({'nome':aba.attrib['name'],'arquivo':f'xl/worksheets/sheet{i+1}.xml','celulas':celulas})
            saida[arquivo.name]={'abas':abas,'nomes':{n.attrib['name']:n.text for n in wb.findall('s:definedNames/s:definedName',S)}}
        else:
            partes={}
            for nome in z.namelist():
                if nome.startswith('word/') and nome.endswith('.xml'):
                    try:
                        root=ET.fromstring(z.read(nome));textos=[''.join(p.itertext()) for p in root.findall('.//w:p',W)]
                        marcadores=sorted(set(re.findall(r'\{\{[^}]+\}\}', '\n'.join(textos))))
                        if marcadores:partes[nome]={'marcadores':marcadores,'paragrafos':[t for t in textos if '{{' in t or 'repet' in t]}
                    except ET.ParseError:pass
            saida[arquivo.name]={'partes':partes}
print(json.dumps(saida,ensure_ascii=False,indent=2))
