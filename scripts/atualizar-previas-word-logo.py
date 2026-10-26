"""Atualiza somente o XObject do logo nas prévias estáticas Word já existentes."""
from pathlib import Path
from hashlib import sha256
import json
import io
from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, FloatObject
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
PASTA = ROOT / 'public/modelos/previas'
logo = Image.open(ROOT / 'public/marca/logo/PCM-Direto_modelo-slogan.png')
logo_pdf = io.BytesIO()
canvas = Canvas(logo_pdf, pagesize=logo.size)
canvas.drawImage(ImageReader(logo), 0, 0, width=logo.width, height=logo.height, mask='auto')
canvas.showPage()
canvas.save()
logo_pdf.seek(0)
logo_reader = PdfReader(logo_pdf)
objetos_logo = logo_reader.pages[0]['/Resources']['/XObject']
logo_original_ref = objetos_logo.raw_get(next(iter(objetos_logo)))
relatorio = {}
for arquivo in sorted(PASTA.glob('PCMD-W*.pdf')):
    original = arquivo.read_bytes()
    reader = PdfReader(arquivo)
    textos = [p.extract_text() for p in reader.pages]
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    logo_ref = logo_original_ref.clone(writer)
    alteradas = 0
    paginas_e_alvos = []
    for pagina in writer.pages:
        recursos = pagina['/Resources'].get('/XObject', {})
        alvos = []
        for chave, ref in recursos.items():
            objeto = ref.get_object()
            if objeto.get('/Subtype') == '/Image' and 4.1 < objeto.get('/Width', 0) / max(1, objeto.get('/Height', 0)) < 4.4:
                alvos.append(chave)
        paginas_e_alvos.append((pagina, alvos))
    for pagina, alvos in paginas_e_alvos:
        recursos = pagina['/Resources'].get('/XObject', {})
        for chave in alvos:
            recursos[chave] = logo_ref
        conteudo = ContentStream(pagina.get_contents(), writer)
        for i, (operandos, operador) in enumerate(conteudo.operations):
            if operador != b'Do' or operandos[0] not in alvos:
                continue
            matriz, comando = conteudo.operations[i - 1]
            assert comando == b'cm' and len(matriz) == 6 and matriz[1] == matriz[2] == 0
            largura, altura = float(matriz[0]), float(matriz[3])
            assert largura > 0 and altura > 0
            nova_largura = altura * logo.width / logo.height
            matriz[0] = FloatObject(nova_largura)
            matriz[4] = FloatObject(float(matriz[4]) + (largura - nova_largura) / 2)
            alteradas += 1
        pagina.replace_contents(conteudo)
    if not alteradas:
        continue
    temporario = arquivo.with_suffix('.pdf.tmp')
    writer.write(temporario)
    resultado = PdfReader(temporario)
    assert len(resultado.pages) == len(reader.pages)
    assert [p.extract_text() for p in resultado.pages] == textos
    assert all(abs(float(a) - float(b)) < .00001 for nova, antiga in zip(resultado.pages, reader.pages)
               for a, b in zip(nova.mediabox, antiga.mediabox))
    temporario.replace(arquivo)
    relatorio[arquivo.name] = {'sha256Origem': sha256(original).hexdigest(), 'sha256Atual': sha256(arquivo.read_bytes()).hexdigest(),
                             'paginas': len(reader.pages), 'logosAtualizados': alteradas, 'textosEPaginasPreservados': True}
    print(arquivo.name, alteradas, 'logos; textos e páginas preservados')
if relatorio:
    (ROOT / 'docs/integridade-previas-word-logo.json').write_text(json.dumps(relatorio, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
