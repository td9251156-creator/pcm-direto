"""Copia os modelos recebidos sem regravar os pacotes Office."""
from pathlib import Path
import zipfile,json,hashlib,posixpath,shutil
from lxml import etree as E
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'Templates-Refeitos-Recebidos'
DEST=ROOT/'public/modelos'
N={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
R='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
catalog=[
 ('01','Governança','Controle documental','Organização, lista mestra, pessoas e referências.',True),
 ('02','Operação','Ativos e criticidade','Inventário de ativos e avaliação de criticidade.',True),
 ('03-04','Operação','Plano e cronograma','Tarefas, ocorrências previstas e execuções.',True),
 ('05','Operação','Ficha de falha','Sintoma, causa, ação e tempo de parada.',False),
 ('06','Materiais','Peças críticas','Peças, estoque e reposição.',False),
 ('07','Resultados e ações','Indicadores mensais','Dados e análise mensal da manutenção.',False),
 ('08','Resultados e ações','Ação corretiva','Problema, ação, responsável, prazo e eficácia.',False),
 ('K01','Operação','Ativos e preventiva','Controle separado de ativos e planos.',False),
 ('K02','Operação','Ordens de serviço','Abertura, planejamento e conclusão das OS.',False),
 ('K03','Operação','Checklists de manutenção','Roteiros diário, semanal e mensal.',False),
 ('K04','Materiais','Estoque e almoxarifado','Materiais, entradas, saídas e compras sugeridas.',False),
 ('K05','Materiais','Pedidos de compra','Pedidos, valores, recebimentos e prazos.',False),
 ('K06','Resultados e ações','Indicadores por ativo','Corretivas, produção e indicadores por equipamento.',False),
 ('K07','Resultados e ações','Plano de ação 5W2H','Ações, responsáveis, prazos e avanço.',False),
 ('K08','Governança','Documentos e evidências','Calibrações, treinamentos, requisitos e registros.',False),
 ('K09','Gestão integrada','Gestão integrada de manutenção','Alternativa aos controles separados, em um único arquivo.',False),
 ('W1','Manuais','Gestão de ativos','Manual com cadastro, criticidade e responsabilidades.',True),
 ('W2','Manuais','Estratégia de manutenção','Manual de planejamento e revisão das estratégias.',True),
]
DEST.mkdir(exist_ok=True)
contract={'versao':'2.0.0-refeitos','modelos':[],'arquivos':{}}
for code,group,title,description,automatic in catalog:
 candidates=list(SOURCE.glob('PCMD-'+code+'-*.xlsx'))+list(SOURCE.glob('PCMD-'+code+'-*.docx'))
 assert len(candidates)==1,(code,candidates)
 p=candidates[0];target=DEST/p.name;shutil.copyfile(p,target)
 item={'codigo':'PCMD-'+code,'grupo':group,'titulo':title,'descricao':description,'arquivo':p.name,'preenchimento':'parcial' if automatic else 'manual','sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 with zipfile.ZipFile(p) as z:
  assert not any('vbaProject' in n or 'externalLinks/' in n for n in z.namelist()),p
  if p.suffix=='.xlsx':
   wb=E.fromstring(z.read('xl/workbook.xml'));rels={r.get('Id'):r.get('Target') for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
   item['abas']={}
   for sh in wb.find('s:sheets',N):
    path=rels[sh.get(R)];path=path.lstrip('/') if path.startswith('/') else posixpath.normpath('xl/'+path)
    item['abas'][sh.get('name')]=path
   item['nomes']={n.get('name'):n.text for n in wb.findall('s:definedNames/s:definedName',N) if not n.get('name').startswith('_xlnm.')}
 contract['modelos'].append(item);contract['arquivos'][p.name]={'bytes':p.stat().st_size,'sha256':item['sha256']}
shutil.copyfile(SOURCE/'PCMD-refeitos.zip',DEST/'PCMD-refeitos.zip')
contract['arquivos']['PCMD-refeitos.zip']={'bytes':(DEST/'PCMD-refeitos.zip').stat().st_size,'sha256':hashlib.sha256((DEST/'PCMD-refeitos.zip').read_bytes()).hexdigest()}
preview=ROOT/'artifacts/refeitos/office'
for item in contract['modelos']:
 p=preview/Path(item['arquivo']).with_suffix('.pdf').name
 assert p.exists(),f'Prévia Office ausente: {p.name}'
 target=DEST/'previas'/p.name;target.parent.mkdir(exist_ok=True);shutil.copyfile(p,target)
 contract['arquivos']['previas/'+p.name]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
for p in [ROOT/'src/dados/modelos-refeitos.json',DEST/'manifesto.json']:
 p.write_text(json.dumps(contract,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('18 modelos originais integrados com rastreabilidade por SHA256.')
