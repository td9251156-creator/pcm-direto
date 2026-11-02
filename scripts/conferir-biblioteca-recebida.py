"""Importador específico do pacote recebido em 02/11/2026 (biblioteca 2.0.2).
Confere os originais e, com --aplicar, copia bytes e atualiza o manifesto.
Não regrava Excel/Word. Não acessa banco ou rede. Uso: python scripts/conferir-biblioteca-recebida.py pacote.zip [--aplicar]
"""
import argparse, copy, hashlib, io, json, posixpath, re, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
S = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'


def destino(origem, alvo):
    return alvo.lstrip('/') if alvo.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(origem), alvo))


def estrutura(dados):
    with zipfile.ZipFile(io.BytesIO(dados)) as z:
        wb = ET.fromstring(z.read('xl/workbook.xml'))
        rels = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        abas = []
        for sh in wb.find('s:sheets', S):
            arq = destino('xl/workbook.xml', rels[sh.attrib[REL]])
            root = ET.fromstring(z.read(arq))
            rp = posixpath.join(posixpath.dirname(arq), '_rels', posixpath.basename(arq)+'.rels')
            rel = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read(rp))} if rp in z.namelist() else {}
            tabelas = []
            for part in root.findall('s:tableParts/s:tablePart', S):
                tab = ET.fromstring(z.read(destino(arq, rel[part.attrib[REL]])))
                ref = tab.attrib['ref']
                tabelas.append({'nome': tab.attrib['name'], 'intervalo': ref, 'linhaDados': int(re.search(r'\d+', ref).group())+1,
                                'campos': [c.attrib['name'] for c in tab.find('s:tableColumns', S)]})
            abas.append({'nome': sh.attrib['name'], 'tabelas': tabelas})
        return abas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('zip')
    parser.add_argument('--aplicar', action='store_true')
    args = parser.parse_args()
    path = ROOT/'src/dados/biblioteca-pcm-v2.json'
    atual = json.loads(path.read_text())
    versao = re.fullmatch(r'biblioteca-pcm-v(\d+)\.(\d+)\.(\d+)', atual['versao'])
    if args.aplicar and (not versao or tuple(map(int, versao.groups())) > (2, 0, 2)):
        raise ValueError('Este importador é apenas do pacote 2.0.2 e não pode sobrescrever uma biblioteca posterior ou desconhecida.')
    novo = copy.deepcopy(atual)
    novo['versao'] = 'biblioteca-pcm-v2.0.2'
    extra = 'PCM-MAN-017_Procedimento-MTBF-MTTR-Disponibilidade_R00.docx'
    esperados = {m['arquivo'] for m in atual['modelos']} | {extra}
    with zipfile.ZipFile(args.zip) as pack:
        arquivos = {}
        for item in pack.infolist():
            if item.is_dir():
                continue
            nome = Path(item.filename).name
            if nome not in esperados or nome in arquivos:
                raise ValueError('Arquivo inesperado ou duplicado: '+nome)
            if item.file_size > 20_000_000:
                raise ValueError('Arquivo acima do limite: '+nome)
            arquivos[nome] = pack.read(item)
        if set(arquivos) != esperados:
            raise ValueError('Pacote incompleto.')
        for m in novo['modelos']:
            dados = arquivos[m['arquivo']]
            h = hashlib.sha256(dados).hexdigest()
            mudou = h != m['sha256']
            print(m['codigo'], 'alterado' if mudou else 'idêntico', h)
            m.update(sha256=h, bytes=len(dados))
            if m['formato'] == 'xlsx':
                m['abas'] = estrutura(dados)
            if mudou:
                m['origemAtualizacao'] = 'Original enviado pelo mantenedor em Biblioteca-PCM-v2.zip; revisão R00 preservada, pacote 2.0.2.'
        if args.aplicar:
            for nome, dados in arquivos.items():
                (ROOT/'public/modelos/biblioteca-v2'/nome).write_bytes(dados)
            path.write_text(json.dumps(novo, ensure_ascii=False, indent=2)+'\n')
            print('20 originais copiados sem regravação; manifesto atualizado. Sem aplicação no banco.')


if __name__ == '__main__':
    main()
