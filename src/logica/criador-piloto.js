export const CHAVE_RASCUNHO_CRIADOR = 'pcm-direto:criador:v1';
export const VERSAO_CRIACAO = 1;

export const MODELOS_CRIADOR = Object.freeze({
  'PCM-MAN-005': { titulo: 'Checklist de preventiva', limite: 30 },
  'PCM-MAN-016': { titulo: 'Procedimento operacional (POP)', limite: 8 },
});

const texto = (valor, limite = 500) => String(valor ?? '').trim().slice(0, limite);

export function criacaoVazia(codigo = 'PCM-MAN-005') {
  if (!MODELOS_CRIADOR[codigo]) throw new Error('Modelo não disponível neste piloto.');
  const agora = new Date().toISOString();
  return {
    esquema: 'pcm-direto/criacao', versao: VERSAO_CRIACAO, modelo: codigo,
    criadoEm: agora, atualizadoEm: agora,
    dados: codigo === 'PCM-MAN-005'
      ? { titulo: '', elaborado: '', aprovado: '', tag: '', equipamento: '', servico: '', tecnico: '', itens: [] }
      : { titulo: '', elaborado: '', aprovado: '', numero: '', area: '', responsavel: '', objetivo: '', aplica: '', naoAplica: '', perigo: '', controle: '', materiais: '', registro: '', passos: [] },
  };
}

export function normalizarCriacao(entrada) {
  if (!entrada || entrada.esquema !== 'pcm-direto/criacao' || entrada.versao !== VERSAO_CRIACAO || !MODELOS_CRIADOR[entrada.modelo]) {
    throw new Error('Este arquivo não é uma criação compatível com o piloto atual.');
  }
  const base = criacaoVazia(entrada.modelo);
  const d = entrada.dados && typeof entrada.dados === 'object' ? entrada.dados : {};
  if (entrada.modelo === 'PCM-MAN-005') {
    base.dados = {
      titulo: texto(d.titulo, 120), elaborado: texto(d.elaborado, 100), aprovado: texto(d.aprovado, 100),
      tag: texto(d.tag, 50), equipamento: texto(d.equipamento, 120), servico: texto(d.servico, 120), tecnico: texto(d.tecnico, 100),
      itens: (Array.isArray(d.itens) ? d.itens : []).map(x => texto(x, 200)).filter(Boolean).slice(0, 30),
    };
  } else {
    base.dados = {
      titulo: texto(d.titulo, 120), elaborado: texto(d.elaborado, 100), aprovado: texto(d.aprovado, 100), numero: texto(d.numero, 40),
      area: texto(d.area, 100), responsavel: texto(d.responsavel, 100), objetivo: texto(d.objetivo, 500), aplica: texto(d.aplica, 300),
      naoAplica: texto(d.naoAplica, 300), perigo: texto(d.perigo, 300), controle: texto(d.controle, 300), materiais: texto(d.materiais, 500),
      registro: texto(d.registro, 500), passos: (Array.isArray(d.passos) ? d.passos : []).map(p => ({
        acao: texto(p?.acao, 250), ponto: texto(p?.ponto, 250), critico: Boolean(p?.critico),
        tempo: Number.isFinite(Number(p?.tempo)) && p?.tempo !== '' && p?.tempo != null ? Math.max(0, Math.min(999, Number(p.tempo))) : null,
      })).filter(p => p.acao).slice(0, 8),
    };
  }
  base.criadoEm = /^\d{4}-\d\d-\d\dT/.test(entrada.criadoEm || '') ? entrada.criadoEm : base.criadoEm;
  base.atualizadoEm = new Date().toISOString();
  return base;
}

export function validarCriacao(criacao) {
  const c = normalizarCriacao(criacao);
  const erros = [];
  if (!c.dados.titulo) erros.push('Informe um título.');
  if (c.modelo === 'PCM-MAN-005' && c.dados.itens.length === 0) erros.push('Inclua pelo menos um item da checklist.');
  if (c.modelo === 'PCM-MAN-016' && c.dados.passos.length === 0) erros.push('Inclua pelo menos um passo do procedimento.');
  return { ok: erros.length === 0, erros, criacao: c };
}
