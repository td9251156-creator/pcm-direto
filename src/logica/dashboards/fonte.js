// Camada única de fonte dos dashboards: recebe { metadados, bases } e devolve cópia normalizada.
// Só leitura: nunca altera o objeto recebido. Um adaptador de dados reais deve devolver o mesmo formato.
const CHAVES = {
  ativos: 'tag', ordens_servico: 'numero_os', falhas: 'referencia_falha',
  custos_manutencao: 'referencia_lancamento',
};
const TEXTOS = ['tag', 'numero_os', 'referencia_falha', 'referencia_lancamento', 'setor', 'familia', 'status', 'categoria_custo'];
const DATAS = ['data_abertura', 'data_prevista', 'data_conclusao', 'inicio_falha', 'fim_falha', 'inicio_reparo', 'fim_reparo', 'data_lancamento', 'competencia', 'inicio_periodo', 'fim_periodo'];
const DATA_ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
const STATUS = ['ABERTA', 'PLANEJADA', 'PROGRAMADA', 'EM_EXECUCAO', 'CONCLUIDA', 'CANCELADA'];
const NUMEROS = ['horas_estimadas', 'horas_restantes', 'valor_realizado', 'valor_orcado', 'horas_operacao'];

const texto = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());
// Vazio continua null; zero real continua 0; texto não numérico vira null e é contado nos avisos.
const numero = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export function normalizarFonte(fonte) {
  const avisos = [];
  const bases = {};
  for (const nome of ['ativos', 'ordens_servico', 'falhas', 'custos_manutencao', 'operacao_ativos', 'orcamento_manutencao']) {
    const origem = Array.isArray(fonte?.bases?.[nome]) ? fonte.bases[nome] : [];
    if (!Array.isArray(fonte?.bases?.[nome])) avisos.push(`Base ${nome} ausente: tratada como vazia.`);
    const chave = CHAVES[nome];
    const vistos = new Set();
    let duplicados = 0, invalidos = 0, datas = 0, status = 0;
    bases[nome] = [];
    for (const bruto of origem) {
      const linha = { ...bruto };
      for (const campo of TEXTOS) if (campo in linha) linha[campo] = texto(linha[campo]);
      for (const campo of NUMEROS) {
        if (!(campo in linha)) continue;
        const n = numero(linha[campo]);
        if (Number.isNaN(n)) { invalidos++; linha[campo] = null; } else linha[campo] = n;
      }
      for (const campo of DATAS) {
        if (!(campo in linha)) continue;
        const v = linha[campo] === null ? '' : String(linha[campo]).trim();
        if (!v) linha[campo] = null;
        else if (!DATA_ISO.test(v)) { datas++; linha[campo] = null; } else linha[campo] = v;
      }
      if (nome === 'ordens_servico' && linha.status && !STATUS.includes(linha.status)) status++;
      if (chave) {
        if (!linha[chave]) { invalidos++; continue; }
        if (vistos.has(linha[chave])) { duplicados++; continue; }
        vistos.add(linha[chave]);
      }
      bases[nome].push(linha);
    }
    if (duplicados) avisos.push(`${duplicados} registro(s) repetido(s) em ${nome} ignorado(s) pela chave ${chave}.`);
    if (datas) avisos.push(`${datas} data(s) fora do formato AAAA-MM-DD em ${nome} tratada(s) como ausente(s).`);
    if (status) avisos.push(`${status} OS com status desconhecido tratada(s) como em aberto.`);
    if (invalidos) avisos.push(`${invalidos} valor(es) inválido(s) em ${nome} tratado(s) como ausente(s).`);
  }
  const m = fonte?.metadados ?? {};
  return {
    bases, avisos,
    metadados: {
      demonstracao: m.natureza === 'DEMONSTRACAO_FICTICIA',
      referencia: m.data_referencia ?? null,
      periodo: { inicio: m.periodo?.inicio ?? null, fim: m.periodo?.fim ?? null },
      ultimoMesParcial: Boolean(m.periodo?.ultimo_mes_parcial),
      moeda: m.moeda ?? 'BRL',
      versao: m.versao ?? null,
    },
  };
}

// A demonstração fica fora do pacote inicial e só é lida ao abrir o dashboard.
export async function carregarDemonstracao() {
  const modulo = await import('../../dados/demo-dashboards.json');
  return normalizarFonte(modulo.default);
}
