import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import contrato from '../src/dados/modelos-refeitos.json';
import biblioteca from '../src/dados/biblioteca.json';
import {prepararModelos,selecionarModelos,gerarModelo} from '../src/saida/modelos-refeitos.js';
import {guiaModelo} from '../src/dados/guias-modelos.js';
import {EXEMPLO} from '../src/dados/exemplo.js';
import {atribuirTags} from '../src/logica/tag.js';
const estado=()=>({biblioteca:structuredClone(biblioteca),equipamentos:[{id:'eq1',setor:'UTL',tipo:'motor_eletrico',numero:1,tag:'UTL-MOT-001',descricao:'Motor fictício'}],inicio:'2026-01-05',capacidade:{},ajustes:{},execucoes:{}});
it('seleciona somente documentos conhecidos, sem duplicar e sem aceitar seleção vazia',()=>{
  expect(selecionarModelos().length).toBe(18);
  expect(selecionarModelos(['PCMD-K04','PCMD-02','PCMD-K04']).map(m=>m.codigo)).toEqual(['PCMD-02','PCMD-K04']);
  expect(()=>selecionarModelos([])).toThrow('pelo menos um');
  expect(()=>selecionarModelos(['../arquivo'])).toThrow('desconhecido');
});
afterEach(()=>vi.unstubAllGlobals());
it('recusa um documento desconhecido antes de acessar dados ou arquivos',async()=>{
  await expect(gerarModelo(null,null,'../arquivo')).rejects.toThrow('desconhecido');
});
it('oferece explicação e orientação inicial para cada modelo',()=>{
  for(const m of contrato.modelos){expect(guiaModelo(m.codigo).quando.length).toBeGreaterThan(20);expect(guiaModelo(m.codigo).comecar.length).toBeGreaterThan(20);}
});
it('baixa um único modelo manual sem exigir equipamentos e preserva seus bytes',async()=>{
  const modelo=contrato.modelos.find(m=>m.codigo==='PCMD-K04');const bytes=readFileSync('public/modelos/refeitos/'+modelo.arquivo);
  const buscar=vi.fn(async()=>new Response(bytes));vi.stubGlobal('fetch',buscar);
  const arquivo=await gerarModelo(null,null,modelo.codigo);
  expect(Buffer.from(arquivo.conteudo)).toEqual(bytes);expect(arquivo.nome).toBe(modelo.arquivo);expect(arquivo.tipo).toContain('spreadsheetml.sheet');expect(buscar).toHaveBeenCalledTimes(1);
});
it('recusa arquivo incompatível e modelo indisponível sem fornecer um download enganoso',async()=>{
  vi.stubGlobal('fetch',async()=>new Response('outro arquivo'));
  await expect(gerarModelo(null,null,'PCMD-K04')).rejects.toThrow('incompatível');
  vi.stubGlobal('fetch',async()=>new Response('',{status:404}));
  await expect(gerarModelo(null,null,'PCMD-K04')).rejects.toThrow('indisponível');
});
it('mantém os 18 modelos recebidos e as abas reais ligadas pelos relacionamentos',async()=>{
  expect(contrato.modelos).toHaveLength(18);
  expect(contrato.modelos.filter(m=>m.preenchimento==='parcial')).toHaveLength(5);
  for(const [nome,info] of Object.entries(contrato.arquivos)){
    const bytes=readFileSync('public/modelos/refeitos/'+nome);expect(createHash('sha256').update(bytes).digest('hex'),nome).toBe(info.sha256);
  }
  for(const m of contrato.modelos){
    const zip=await JSZip.loadAsync(readFileSync('public/modelos/refeitos/'+m.arquivo));
    expect(Object.keys(zip.files).some(n=>/vbaProject|externalLinks\//.test(n))).toBe(false);
    for(const path of Object.values(m.abas??{}))expect(zip.file(path),m.arquivo+' '+path).not.toBeNull();
  }
});
it('prepara as ocorrências sem inventar vínculo de execução e captura um retrato dos dados',()=>{
  const e=estado();const result=prepararModelos(e,{elaborador:'Pessoa fictícia',organizacao:'Indústria fictícia'});
  expect(result.ocorrencias.length).toBe(result.dados.plano.filter(t=>t.ativa).reduce((n,t)=>n+t.vezesAno,0));
  e.equipamentos[0].descricao='Outra descrição';expect(result.dados.equipamentos[0].descricao).toBe('Motor fictício');
});
it('recusa excesso de capacidade, autor ausente e dados inválidos sem truncar',()=>{
  const e=estado();expect(()=>prepararModelos(e,{})).toThrow('elaborou');
  e.equipamentos[0].descricao='';expect(()=>prepararModelos(e,{elaborador:'Pessoa fictícia'})).toThrow('Confira');
  const many=estado();many.equipamentos=Array.from({length:301},(_,i)=>({...many.equipamentos[0],id:'eq'+i,numero:i+1,tag:'UTL-MOT-'+String(i+1).padStart(3,'0')}));
  expect(()=>prepararModelos(many,{elaborador:'Pessoa fictícia'})).toThrow('Nenhum registro foi cortado');
});
it('o exemplo completo da abertura cabe nos novos modelos',()=>{
  const e=estado();e.equipamentos=atribuirTags(EXEMPLO.map((a,i)=>({...a,id:'ex'+i})),Object.fromEntries(biblioteca.tipos.map(t=>[t.id,t.sigla])));
  const result=prepararModelos(e,{elaborador:'Pessoa fictícia'});expect(result.dados.equipamentos).toHaveLength(9);expect(result.ocorrencias.length).toBeLessThanOrEqual(5000);
});
