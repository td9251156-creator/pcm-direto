"""Gera fichas públicas a partir da biblioteca versionada, sem dados de fábrica.

Ferramenta editorial: Python 3 + reportlab. Não é necessária para usar ou compilar o app.
"""
from hashlib import sha256
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

RAIZ = Path(__file__).resolve().parents[1]
BIBLIOTECA = json.loads((RAIZ / 'src/dados/biblioteca.json').read_text(encoding='utf-8'))
DESTINO = RAIZ / 'public/modelos/maquinas'
DESTINO.mkdir(parents=True, exist_ok=True)
AZUL = colors.HexColor('#0B3D63')
LARANJA = colors.HexColor('#B85C00')
SEGURANCA = colors.HexColor('#7A0019')
ESTILO = ParagraphStyle('corpo', fontName='Helvetica', fontSize=10, leading=14, textColor=AZUL, alignment=TA_LEFT)
PEQUENO = ParagraphStyle('fonte', parent=ESTILO, fontSize=8, leading=11, textColor=colors.HexColor('#465565'))
TITULO = ParagraphStyle('titulo', parent=ESTILO, fontName='Helvetica-Bold', fontSize=25, leading=29, spaceAfter=10)


def paragrafo(texto, estilo=ESTILO):
    return Paragraph(escape(str(texto)), estilo)


for tipo in BIBLIOTECA['tipos']:
    fonte = {'versao': BIBLIOTECA['versao'], 'data': BIBLIOTECA['data'], 'aviso': BIBLIOTECA['aviso'], 'tipo': tipo}
    resumo = sha256(json.dumps(fonte, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    arquivo = DESTINO / f"pcm-modelo-{tipo['id']}.pdf"
    documento = SimpleDocTemplate(str(arquivo), pagesize=A4, leftMargin=42, rightMargin=42,
                                 topMargin=104, bottomMargin=79, title=f"{tipo['nome']} — máquinas e tarefas",
                                 author='PCM Direto', subject=f'Biblioteca SHA256 {resumo}', pageCompression=1)

    def pagina(canvas, doc):
        largura, altura = A4
        canvas.saveState()
        canvas.drawImage(str(RAIZ / 'public/icones/icone-512.png'), 42, altura - 76, width=44, height=44)
        canvas.setFillColor(AZUL)
        canvas.setFont('Helvetica-Bold', 16)
        canvas.drawString(98, altura - 45, 'PCM Direto')
        canvas.setFont('Helvetica', 9)
        canvas.drawString(98, altura - 61, 'Manutenção planejada: simples, aberta e eficiente')
        canvas.setStrokeColor(LARANJA)
        canvas.line(42, altura - 88, largura - 42, altura - 88)
        aviso = paragrafo('O material apoia a organização do PCM e não substitui a avaliação de profissional habilitado nem o texto oficial das normas. As periodicidades são base genérica e devem ser confirmadas com o manual do fabricante.', PEQUENO)
        _, h = aviso.wrap(largura - 84, 45)
        aviso.drawOn(canvas, 42, 39)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(AZUL)
        canvas.drawString(42, 24, f"pcmdireto.me · MIT · Biblioteca {BIBLIOTECA['versao']} · {tipo['sigla']}")
        canvas.drawRightString(largura - 42, 24, f'Página {doc.page}')
        canvas.restoreState()

    elementos = [paragrafo('MODELO DE REFERÊNCIA · MÁQUINAS E TAREFAS', PEQUENO), Spacer(1, 9),
                 paragrafo(tipo['nome'], TITULO),
                 paragrafo(f"{len(tipo['tarefas'])} tarefas · Biblioteca {BIBLIOTECA['versao']} · Data da biblioteca: {BIBLIOTECA['data']}", PEQUENO),
                 Spacer(1, 12), paragrafo('Use como ponto de partida. Confirme a aplicabilidade, as periodicidades e as condições de execução com o manual do equipamento. Este PDF não representa um plano aprovado da sua fábrica.'), Spacer(1, 18)]
    for tarefa in tipo['tarefas']:
        seguro = tarefa['seguranca']
        cabecalho = f"{tarefa['id']}" + (' · SEGURANÇA' if seguro else '')
        dados = [[paragrafo(cabecalho, ParagraphStyle('codigo', parent=ESTILO, fontName='Helvetica-Bold', textColor=SEGURANCA if seguro else AZUL)),
                  paragrafo(tarefa['periodicidade'])],
                 [paragrafo(tarefa['descricao']), ''],
                 [paragrafo(f"Especialidade: {tarefa['especialidade']} · Duração estimada: {str(tarefa['duracao_horas']).replace('.', ',')} h por execução", PEQUENO), ''],
                 [paragrafo(f"Origem: {tarefa['origem']} · Versão: {tarefa['versao']}", PEQUENO), '']]
        if tarefa.get('observacao'):
            dados.append([paragrafo(f"Observação: {tarefa['observacao']}", PEQUENO), ''])
        tabela = Table(dados, colWidths=[documento.width * .65, documento.width * .35], hAlign='LEFT')
        tabela.setStyle(TableStyle([
            ('SPAN', (0, 1), (-1, 1)), ('SPAN', (0, 2), (-1, 2)), ('SPAN', (0, 3), (-1, 3)),
            *([('SPAN', (0, 4), (-1, 4))] if len(dados) > 4 else []),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FFF0F1' if seguro else '#EDF3F7')),
            ('BOX', (0, 0), (-1, -1), .5, colors.HexColor('#CED9E1')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elementos.append(KeepTogether([tabela, Spacer(1, 12)]))
    documento.build(elementos, onFirstPage=pagina, onLaterPages=pagina)
    print(f"Gerado: {arquivo.name} ({len(tipo['tarefas'])} tarefas)")
