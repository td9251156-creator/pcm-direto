"""Troca somente o logo e suas dimensões, preservando as demais partes OOXML."""
from pathlib import Path
import hashlib
import json
import posixpath
import re
import zipfile
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PASTA = ROOT / 'public/modelos'
LOGO = (ROOT / 'public/marca/logo/PCM-Direto_modelo-slogan.png').read_bytes()
ANTIGO = '32f8408bec6bd7058e76432a7acad7aa3005ee49dba260507c9a2ca3b019d8c9'
VERSAO = '2.0.1-marca'
sha = lambda b: hashlib.sha256(b).hexdigest()


def ajustar_xml(texto, ids, normalizar=False):
    padrao = r'<(?:\w+:)?(?:oneCellAnchor|inline)\b[^>]*>.*?</(?:\w+:)?(?:oneCellAnchor|inline)>'

    def bloco(m):
        s = m.group()
        if not any(re.search(r'\b(?:r:)?embed="' + re.escape(i) + '"', s) for i in ids):
            return s

        def extensao(ext):
            t = ext.group()
            cx = re.search(r'\bcx="(\d+)"', t)
            cy = re.search(r'\bcy="(\d+)"', t)
            if not cx or not cy:
                return t
            largura = 0 if normalizar else round(int(cy[1]) * 1230 / 356)
            t = re.sub(r'\bcx="\d+"', f'cx="{largura}"', t)
            return re.sub(r'\bcy="\d+"', 'cy="0"', t) if normalizar else t

        return re.sub(r'<(?:\w+:)?(?:ext|extent)\b[^>]*/>', extensao, s)

    return re.sub(padrao, bloco, texto, flags=re.S)


relatorio_path = ROOT / 'docs/integridade-logos-templates.json'
relatorio = json.loads(relatorio_path.read_text(encoding='utf-8')) if relatorio_path.exists() else {'logoSha256': sha(LOGO), 'versao': VERSAO, 'arquivos': {}}
for arquivo in sorted(PASTA.iterdir()):
    if arquivo.suffix not in ('.xlsx', '.docx'):
        continue
    original = arquivo.read_bytes()
    with zipfile.ZipFile(arquivo) as z:
        partes = {n: z.read(n) for n in z.namelist()}
        imagens = [n for n, b in partes.items() if '/media/' in n and sha(b) == ANTIGO]
        if not imagens:
            continue
        alteradas = {n: LOGO for n in imagens}
        geometria = {}
        for nome in partes:
            if not nome.endswith('.xml') or '/_rels/' in nome:
                continue
            rel = posixpath.join(posixpath.dirname(nome), '_rels', posixpath.basename(nome) + '.rels')
            if rel not in partes:
                continue
            ids = [r.attrib['Id'] for r in ET.fromstring(partes[rel])
                   if posixpath.normpath(posixpath.join(posixpath.dirname(nome), r.attrib.get('Target', ''))).lstrip('/') in imagens]
            if not ids:
                continue
            texto = partes[nome].decode('utf-8')
            novo = ajustar_xml(texto, ids)
            if novo != texto:
                assert ajustar_xml(novo, ids, True) == ajustar_xml(texto, ids, True)
                alteradas[nome] = novo.encode('utf-8')
                geometria[nome] = {'ids': ids, 'sha256SemDimensoes': sha(ajustar_xml(texto, ids, True).encode('utf-8'))}
        assert geometria, f'Não foi localizada a posição do logo em {arquivo.name}'
        temporario = arquivo.with_suffix(arquivo.suffix + '.tmp')
        with zipfile.ZipFile(temporario, 'w') as destino:
            for info in z.infolist():
                destino.writestr(info, alteradas.get(info.filename, partes[info.filename]))
    temporario.replace(arquivo)
    relatorio['arquivos'][arquivo.name] = {
        'sha256Origem': sha(original), 'sha256Atual': sha(arquivo.read_bytes()),
        'imagens': imagens, 'geometria': geometria,
        'partesPreservadas': {n: sha(b) for n, b in partes.items() if n not in alteradas},
    }
    relatorio_path.write_text(json.dumps(relatorio, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(arquivo.name, len(imagens), 'logos substituídos')

if relatorio['arquivos']:
    (ROOT / 'docs/integridade-logos-templates.json').write_text(json.dumps(relatorio, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

manifesto_path = PASTA / 'manifesto.json'
manifesto = json.loads(manifesto_path.read_text(encoding='utf-8'))
manifesto['versao'] = VERSAO
manifesto['alteracao'] = 'Logo oficial do modelo; conteúdo, fórmulas, validações e proteção preservados.'
for nome, info in manifesto['arquivos'].items():
    b = (PASTA / nome).read_bytes()
    if sha(b) != info['sha256']:
        info.setdefault('sha256Origem', info['sha256'])
    info.update(sha256=sha(b), bytes=len(b))
manifesto_path.write_text(json.dumps(manifesto, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
contrato_path = ROOT / 'src/dados/contrato-modelos.json'
contrato = json.loads(contrato_path.read_text(encoding='utf-8'))
contrato['versao'] = VERSAO
for nome, info in contrato['modelos'].items():
    info['sha256'] = sha((PASTA / nome).read_bytes())
contrato_path.write_text(json.dumps(contrato, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
