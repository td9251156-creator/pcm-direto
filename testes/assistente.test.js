import {beforeEach,afterEach,it,expect,vi} from 'vitest';
let salvo,pausa,falhar,gravar;
beforeEach(()=>{
  vi.resetModules();salvo=null;pausa=null;falhar=false;
  vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{},removeItem:()=>{}});
  gravar=vi.fn(async dados=>{
    if(pausa)await pausa;
    if(falhar)throw new Error('Quota fictícia excedida');
    salvo=structuredClone(dados);return 1;
  });
  vi.doMock('../src/repositorio.js',()=>({abrirRepositorio:async()=>({ler:async()=>null,gravar})}));
});
afterEach(()=>{vi.unstubAllGlobals();vi.doUnmock('../src/repositorio.js');});
async function abrir(){const app=await import('../src/estado.js');await app.inicializarPersistencia();app.estado.gestao.organizacao.nome='Organização fictícia';gravar.mockClear();return app;}

it('só confirma a próxima etapa depois de gravar e impede envio repetido',async()=>{
  const app=await abrir();let liberar;pausa=new Promise(r=>{liberar=r;});
  const primeira=app.alterarPassoAssistente(2);await vi.waitFor(()=>expect(gravar).toHaveBeenCalledTimes(1));
  expect(app.estado.metadados.passo).toBe(1);expect(app.assistenteGravando()).toBe(true);
  expect((await app.alterarPassoAssistente(2)).ok).toBe(false);expect(gravar).toHaveBeenCalledTimes(1);
  liberar();expect((await primeira).ok).toBe(true);expect(app.estado.metadados.passo).toBe(2);
  expect(salvo.rascunho.metadados.passo).toBe(2);expect(app.assistenteGravando()).toBe(false);
});
it('falha de gravação mantém a etapa e os dados digitados disponíveis',async()=>{
  const app=await abrir();const anterior=structuredClone(salvo);falhar=true;
  const resultado=await app.alterarPassoAssistente(2);
  expect(resultado.ok).toBe(false);expect(app.estado.metadados.passo).toBe(1);
  expect(app.estado.gestao.organizacao.nome).toBe('Organização fictícia');expect(salvo).toEqual(anterior);
  expect(app.assistenteGravando()).toBe(false);
});
it('recusa saltos e exige os pré-requisitos antes de avançar',async()=>{
  const app=await abrir();expect((await app.alterarPassoAssistente(4)).ok).toBe(false);
  app.estado.gestao.organizacao.nome='';expect((await app.alterarPassoAssistente(2)).ok).toBe(false);
  app.estado.gestao.organizacao.nome='Organização fictícia';expect((await app.alterarPassoAssistente(2)).ok).toBe(true);
  gravar.mockClear();expect((await app.alterarPassoAssistente(3)).ok).toBe(false);expect(gravar).not.toHaveBeenCalled();
  expect((await app.alterarPassoAssistente(1)).ok).toBe(true);expect(app.estado.metadados.passo).toBe(1);
});
it('outras gravações pendentes preservam a etapa que está sendo confirmada',async()=>{
  const app=await abrir();let liberar;pausa=new Promise(r=>{liberar=r;});
  const primeira=app.alterarPassoAssistente(2);await vi.waitFor(()=>expect(gravar).toHaveBeenCalledTimes(1));
  app.estado.gestao.organizacao.nome='Organização atualizada';const outra=app.salvar();
  liberar();await primeira;await outra;
  expect(salvo.rascunho.metadados.passo).toBe(2);expect(salvo.rascunho.gestao.organizacao.nome).toBe('Organização atualizada');
});
it('entrada na demonstração aguarda a etapa pendente e preserva a base ao sair',async()=>{
  const app=await abrir();let liberar;pausa=new Promise(r=>{liberar=r;});
  const primeira=app.alterarPassoAssistente(2);await vi.waitFor(()=>expect(gravar).toHaveBeenCalledTimes(1));
  const meta=app.estado.metadados;const demo=app.demonstrar();await Promise.resolve();
  expect(app.estado.metadados).toBe(meta);expect(app.emDemonstracao()).toBe(false);
  liberar();await primeira;await demo;expect(app.emDemonstracao()).toBe(true);
  app.sairDaDemonstracao();expect(app.estado.metadados.passo).toBe(2);expect(app.estado.gestao.organizacao.nome).toBe('Organização fictícia');
});
it('falha ao voltar não altera a etapa que já estava guardada',async()=>{
  const app=await abrir();await app.alterarPassoAssistente(2);falhar=true;
  expect((await app.alterarPassoAssistente(1)).ok).toBe(false);
  expect(app.estado.metadados.passo).toBe(2);expect(salvo.rascunho.metadados.passo).toBe(2);
});
it('com equipamentos válidos chega à ativação sem mudar o formato dos dados',async()=>{
  const app=await abrir();await app.alterarPassoAssistente(2);
  app.estado.equipamentos=[{id:'eq1',setor:'UTL',tipo:'motor_eletrico',numero:1,tag:'UTL-MOT-001',descricao:'Motor fictício'}];
  expect((await app.alterarPassoAssistente(3)).ok).toBe(true);expect((await app.alterarPassoAssistente(4)).ok).toBe(true);
  expect(salvo.versao).toBe(3);expect(salvo.rascunho.metadados.passo).toBe(4);expect(salvo.rascunho.equipamentos).toHaveLength(1);
});
