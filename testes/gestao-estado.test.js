import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import padrao from '../src/dados/biblioteca.json';
import { criarGestao } from '../src/logica/gestao.js';
import { criarBackup, verificarBackup } from '../src/logica/backup.js';

const eq = { id: 'eq1', setor: 'UTL', tipo: 'motor_eletrico', descricao: 'Motor fictício', numero: 1, tag: 'UTL-MOT-001' };
const CHAVE = 'pcm-direto:rascunho:v1';
let dados;
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22T12:00:00'));
  dados = new Map();
  vi.stubGlobal('localStorage', { getItem: k => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, String(v)), removeItem: k => dados.delete(k) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
async function abrir() {
  const app = await import('../src/estado.js'); app.carregar();
  app.estado.equipamentos = [structuredClone(eq)]; app.estado.inicio = '2026-01-05';
  return app;
}

describe('gestão e preservação dos dados', () => {
  it('registra uma ocorrência da revisão uma única vez e permite refazer após cancelamento', async () => {
    const app = await abrir();
    const { prepararRevisao } = await import('../src/logica/programacao.js');
    const r = prepararRevisao(app.estado.programacao, app.dadosAtuais(), app.estado.gestao,
      { id: 'rev1', vigencia: '2026-10-22', elaborador: 'Pessoa A', resumo: 'Revisão fictícia' }, '2026-10-22');
    expect(r.ok).toBe(true); app.estado.programacao = r.programacao;
    const id = r.programacao.ocorrencias[0].id;
    expect((await app.registrarOcorrencia(id)).ok).toBe(true);
    expect((await app.registrarOcorrencia(id)).ok).toBe(false);
    expect(app.estado.gestao.historico).toHaveLength(1);
    expect(app.estado.gestao.historico[0].ocorrenciaId).toBe(id);
    await app.cancelarExecucao(app.estado.gestao.historico[0].id);
    expect((await app.registrarOcorrencia(id)).ok).toBe(true);
    expect(app.estado.gestao.historico).toHaveLength(2);
  });
  it('abre marcação v1 como legado, preserva observação e não duplica ao reabrir', async () => {
    dados.set(CHAVE, JSON.stringify({ equipamentos: [eq], execucoes: { 'eq1|MOT-01': { data: '2026-10-20', observacao: 'Conferência fictícia' } } }));
    const app = await import('../src/estado.js'); app.carregar();
    expect(app.estado.gestao.historico).toHaveLength(1);
    expect(app.estado.gestao.historico[0]).toMatchObject({ origem: 'legado', dataPrevista: '', observacao: 'Conferência fictícia' });
    (await app.salvar()); app.carregar(); expect(app.estado.gestao.historico).toHaveLength(1);
    expect((await app.cancelarExecucao(app.estado.gestao.historico[0].id)).ok).toBe(true);
    app.carregar(); expect(app.estado.gestao.historico[0].cancelada).toBe(true);
    expect(app.estado.execucoes).toEqual({});
  });
  it('persiste cadastros e criticidade e aceita backup v2 e roundtrip v3', async () => {
    const app = await abrir(); const g = criarGestao();
    g.organizacao.nome = 'Indústria Exemplo';
    g.pessoas.push({ id: 'pessoa-a', nome: 'Pessoa A', funcao: 'Responsável', especialidade: 'Elétrica', ativo: true });
    g.criticidade.notas.eq1 = [3, 1, 1, 1, 1];
    g.metas.aderencia = 90;
    expect((await app.atualizarGestao(g)).ok).toBe(true);
    app.carregar(); expect(app.estado.gestao).toEqual(g);
    const backup = criarBackup(app.estado);
    expect(backup.versao).toBe(3); expect(verificarBackup(backup, padrao).ok).toBe(true);
    const antigo = structuredClone(backup); antigo.versao = 2;
    delete antigo.rascunho.programacao; delete antigo.rascunho.metadados;
    expect(verificarBackup(antigo, padrao).ok).toBe(true);
    app.estado.gestao = criarGestao(); expect((await app.restaurarBackup(backup)).ok).toBe(true);
    expect(app.estado.gestao).toEqual(g);
  });
  it('não troca os dados quando o backup tem novos cadastros inválidos', async () => {
    const app = await abrir(); (await app.salvar()); const antes = new Map(dados);
    const backup = criarBackup(app.estado); backup.rascunho.gestao.metas.aderencia = 101;
    expect((await app.restaurarBackup(backup)).ok).toBe(false); expect(dados).toEqual(antes);
    backup.rascunho.gestao = null; expect(verificarBackup(backup, padrao).ok).toBe(false);
    expect(verificarBackup({ ...backup, versao: 4 }, padrao).ok).toBe(false);
  });
  it('preserva original de rascunho com gestão malformada e não o substitui silenciosamente', async () => {
    const original = JSON.stringify({ equipamentos: [eq], gestao: { versao: 99 } }); dados.set(CHAVE, original);
    const app = await import('../src/estado.js'); app.carregar();
    expect(dados.get(CHAVE)).toBe(original); expect(app.recuperacao).toEqual([{ chave: CHAVE, original }]);
    expect(app.estado.equipamentos).toEqual([]);
    (await app.salvar()); expect([...dados.values()].some(v => v.includes('"original"'))).toBe(true);
  });
  it('registra realizações distintas, recusa duplicidade de vínculo e datas futuras e preserva ao remover ativo', async () => {
    const app = await abrir(); const linha = app.dadosAtuais().plano.find(l => l.tarefaId === 'MOT-01');
    const { ocorrenciasPlanejadas } = await import('../src/logica/gestao.js');
    const prevista = ocorrenciasPlanejadas(app.dadosAtuais()).find(o => o.tarefaId === linha.tarefaId);
    const registro = { data: '2026-10-20', observacao: 'Teste fictício', dataPrevista: prevista.dataPrevista, responsavelId: '' };
    expect((await app.registrarExecucao(linha, registro)).ok).toBe(true);
    expect((await app.registrarExecucao(linha, registro)).ok).toBe(false);
    expect((await app.registrarExecucao(linha, { ...registro, dataPrevista: '', data: '2026-10-21' })).ok).toBe(true);
    expect((await app.registrarExecucao(linha, { ...registro, dataPrevista: '', data: '2026-10-23' })).ok).toBe(false);
    expect(app.estado.gestao.historico).toHaveLength(2);
    (await app.remover('eq1')); expect(app.estado.gestao.historico).toHaveLength(2);
    (await app.salvar()); app.carregar(); expect(app.estado.gestao.historico).toHaveLength(2);
    expect(app.estado.execucoes).toEqual({});
  });
  it('preserva cadastros e registros anteriores ao começar lista em branco', async () => {
    const app = await abrir(); app.estado.gestao.organizacao.nome = 'Indústria Exemplo';
    app.estado.gestao.falhas.push({ id: 'falha1', equipamentoId: 'eq1', tag: eq.tag, data: '2026-10-20', sintoma: 'Ruído fictício', causa: '', acao: '', horasParada: null, peca: '', responsavelId: '' });
    (await app.limpar()); app.carregar(); expect(app.estado.equipamentos).toEqual([]);
    expect(app.estado.gestao.organizacao.nome).toBe('Indústria Exemplo'); expect(app.estado.gestao.falhas).toHaveLength(1);
  });
  it('desfazer remoção não ressuscita uma execução cancelada enquanto o ativo estava fora da lista', async () => {
    const app = await abrir(); const linha = app.dadosAtuais().plano[0];
    expect((await app.registrarExecucao(linha, { data: '2026-10-20', observacao: '', dataPrevista: '', responsavelId: '' })).ok).toBe(true);
    const id = app.estado.gestao.historico[0].id;
    (await app.remover('eq1')); (await app.cancelarExecucao(id));
    expect((await app.desfazerRemocao()).ok).toBe(true);
    expect(app.estado.execucoes).toEqual({});
    app.carregar(); expect(app.estado.execucoes).toEqual({});
    expect(app.estado.gestao.historico[0].cancelada).toBe(true);
  });
  it('migra e reabre tarefas antigas com descrição extensa sem truncar o histórico', async () => {
    const bib = structuredClone(padrao); bib.tipos[0].tarefas[0].descricao = 'Descrição fictícia extensa. '.repeat(150);
    dados.set('pcm-direto:biblioteca:v1', JSON.stringify(bib));
    dados.set(CHAVE, JSON.stringify({ equipamentos: [eq], execucoes: { 'eq1|MOT-01': { data: '2026-10-20', observacao: '' } } }));
    const app = await import('../src/estado.js'); app.carregar();
    expect(app.estado.gestao.historico[0].descricao).toBe(bib.tipos[0].tarefas[0].descricao);
    expect((await app.salvar())).toBe(true); app.carregar();
    expect(app.recuperacao).toEqual([]); expect(app.estado.equipamentos).toHaveLength(1);
    expect((await app.registrarExecucao(app.dadosAtuais().plano[0], { data: '2026-10-22', observacao: '' })).ok).toBe(true);
  });
});

it('mantém a execução e a cópia persistida quando cancelar falha ao gravar', async () => {
  const app=await abrir();const linha=app.dadosAtuais().plano[0];
  expect((await app.registrarExecucao(linha,{data:'2026-10-20',observacao:'Execução fictícia',responsavelId:''})).ok).toBe(true);
  const antes=structuredClone(app.estado.gestao.historico);const execucoes=structuredClone(app.estado.execucoes);const salvo=dados.get(CHAVE);
  localStorage.setItem=()=>{throw new DOMException('Quota de teste','QuotaExceededError');};
  const r=await app.cancelarExecucao(antes[0].id);
  expect(r.ok).toBe(false);expect(r.guardado).toBe(false);
  expect(app.estado.gestao.historico).toEqual(antes);expect(app.estado.execucoes).toEqual(execucoes);expect(dados.get(CHAVE)).toBe(salvo);
});

it('impede refazer o mesmo vínculo antes de concluir o cancelamento',async()=>{
  const app=await abrir();const linha=app.dadosAtuais().plano[0];const registro={data:'2026-10-20',observacao:'Teste',responsavelId:''};
  await app.registrarExecucao(linha,registro);const id=app.estado.gestao.historico[0].id;
  localStorage.setItem=()=>{throw new DOMException('Quota de teste','QuotaExceededError');};
  const cancelando=app.cancelarExecucao(id);
  expect((await app.registrarExecucao(linha,registro)).ok).toBe(false);
  expect((await cancelando).ok).toBe(false);
  expect(app.estado.gestao.historico.filter(h=>!h.cancelada)).toHaveLength(1);
});

it('preserva clone concorrente e execução original quando cancelar não pode ser guardado',async()=>{
  const app=await abrir();const linha=app.dadosAtuais().plano[0];
  await app.registrarExecucao(linha,{data:'2026-10-20',observacao:'Teste',responsavelId:''});const id=app.estado.gestao.historico[0].id;
  localStorage.setItem=()=>{throw new DOMException('Quota de teste','QuotaExceededError');};
  const cancelando=app.cancelarExecucao(id);
  const copia=structuredClone(app.estado.gestao);copia.organizacao.nome='Nome concorrente preservado';app.estado.gestao=copia;
  expect((await cancelando).ok).toBe(false);
  expect(app.estado.gestao.historico[0].cancelada).toBe(false);expect(app.estado.gestao.organizacao.nome).toBe('Nome concorrente preservado');
});

it('aguarda cancelamento antes da demonstração e não o desfaz ao voltar para a base',async()=>{
  const app=await abrir();const linha=app.dadosAtuais().plano[0];
  await app.registrarExecucao(linha,{data:'2026-10-20',observacao:'Teste',responsavelId:''});const id=app.estado.gestao.historico[0].id;
  const cancelando=app.cancelarExecucao(id);const demo=app.demonstrar();
  expect((await cancelando).ok).toBe(true);await demo;app.sairDaDemonstracao();
  expect(app.estado.gestao.historico.find(h=>h.id===id).cancelada).toBe(true);
  await app.salvar();app.carregar();expect(app.estado.gestao.historico.find(h=>h.id===id).cancelada).toBe(true);
});

it('recusa ativar com prévia de uma base que mudou e mantém o plano quando a gravação falha',async()=>{
  const app=await abrir();const referencia=app.referenciaRevisao();
  app.estado.capacidade.Mecânica=1;
  const meta={id:'rev-nova',vigencia:'2026-10-22',elaborador:'Pessoa fictícia',resumo:'Teste'};
  expect((await app.ativarRevisao(meta,referencia)).ok).toBe(false);expect(app.estado.programacao.revisoes).toHaveLength(0);
  localStorage.setItem=()=>{throw new DOMException('Quota','QuotaExceededError');};
  const ativando=app.ativarRevisao(meta,app.referenciaRevisao());
  expect(app.estado.programacao.revisoes).toHaveLength(0);
  expect((await app.registrarExecucao(app.dadosAtuais().plano[0],{data:'2026-10-20',observacao:''})).ok).toBe(false);
  expect((await ativando).ok).toBe(false);expect(app.estado.programacao.revisoes).toHaveLength(0);
  expect(verificarBackup(criarBackup(app.estado),padrao).ok).toBe(true);
});

it('prévia vence com responsáveis, histórico, biblioteca e virada do dia; demonstração aguarda ativação',async()=>{
  const app=await abrir();const meta={id:'r1',vigencia:'2026-10-22',elaborador:'Pessoa',resumo:'Teste'};
  for(const alterar of [()=>{app.estado.gestao.responsaveis['eq1|MOT-01']='p1';},()=>{app.estado.biblioteca.versao+='x';},()=>{app.estado.ajustes['eq1|MOT-01']={ativa:true};},()=>{vi.setSystemTime(new Date('2026-10-23T12:00:00'));}]){
    const referencia=app.referenciaRevisao();alterar();expect((await app.ativarRevisao(meta,referencia)).ok).toBe(false);
  }
  vi.setSystemTime(new Date('2026-10-22T12:00:00'));app.estado.gestao.responsaveis={};
  const ativando=app.ativarRevisao(meta);const demo=app.demonstrar();expect((await ativando).ok).toBe(true);await demo;app.sairDaDemonstracao();
  expect(app.estado.programacao.revisoes).toHaveLength(1);expect(verificarBackup(criarBackup(app.estado),padrao).ok).toBe(true);
  const antesDaExecucao=app.referenciaRevisao();const proxima={...meta,id:'r2'};
  expect((await app.registrarOcorrencia(app.estado.programacao.ocorrencias[0].id)).ok).toBe(true);
  expect((await app.ativarRevisao(proxima,antesDaExecucao)).ok).toBe(false);
  const antesDoCancelamento=app.referenciaRevisao();const cancelando=app.cancelarExecucao(app.estado.gestao.historico[0].id);
  expect((await app.ativarRevisao(proxima,antesDoCancelamento)).ok).toBe(false);await cancelando;
  expect((await app.ativarRevisao(proxima,antesDoCancelamento)).ok).toBe(false);
});

it('preserva emissão documental concluída enquanto uma revisão aguarda gravação',async()=>{
  const app=await abrir();const meta={id:'r1',vigencia:'2026-10-22',elaborador:'Pessoa',resumo:'Teste'};
  await app.ativarRevisao(meta);const ativando=app.ativarRevisao({...meta,id:'r2'});
  const emissao={id:'emissao1',revisaoId:'r1',dataCorte:'2026-10-22',modelo:'PCMD-01',versaoModelo:'1'};
  app.estado.programacao.emissoes.push(emissao);const gravando=app.salvar();
  expect((await ativando).ok).toBe(true);expect(await gravando).toBe(true);
  expect(app.estado.programacao.emissoes).toEqual([emissao]);app.carregar();expect(app.estado.programacao.emissoes).toEqual([emissao]);
});

it('exemplo abre com revisão ativa e tarefas na semana atual, sem alterar a base ao sair',async()=>{
  const app=await abrir();const { painelDaSemana }=await import('../src/logica/programacao.js');
  expect(app.estado.programacao.revisoes).toHaveLength(0);
  await app.demonstrar();
  expect(app.estado.programacao.revisoes).toHaveLength(1);
  expect(app.estado.inicio).toBe('2026-10-19');
  const semana=painelDaSemana(app.estado.programacao,app.estado.gestao.historico,'2026-10-22');
  expect(semana.vencidas.length+semana.nestaSemana.length).toBeGreaterThan(0);
  const hoje=painelDaSemana(app.estado.programacao,app.estado.gestao.historico);
  expect(hoje.vencidas).toHaveLength(3);expect(hoje.concluidas).toBeGreaterThan(0);
  expect(app.estado.gestao.historico.every(h=>h.data===h.dataPrevista)).toBe(true);
  app.sairDaDemonstracao();
  expect(app.estado.programacao.revisoes).toHaveLength(0);
  expect(app.estado.gestao.historico).toHaveLength(0);
  expect(app.estado.equipamentos.map(e=>e.id)).toEqual(['eq1']);
});
