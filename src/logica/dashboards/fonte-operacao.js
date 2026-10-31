// Adaptador dos dados reais: lê a base local (dados da operação importados + equipamentos do plano)
// e devolve o mesmo formato da demonstração, pela mesma normalização. Só leitura.
import contrato from '../../dados/biblioteca-pcm-v2.json';
import { normalizarFonte } from './fonte.js';
import { criarOperacao } from '../operacao.js';

const DATAS = [['ordens_servico', 'data_abertura'], ['ordens_servico', 'data_conclusao'], ['falhas', 'inicio_falha'], ['custos_manutencao', 'data_lancamento']];
const semImportacao = (r) => { const copia = { ...r }; delete copia.importacao; return copia; };

/**
 * @param operacao gestao.operacao (ou undefined)
 * @param equipamentos [{ tag, descricao, familia, setor }] do plano; completam o cadastro por TAG
 * @param falhasDoApp quantidade de falhas do registro do app (outra população; ver aviso)
 * @param hoje data de referência AAAA-MM-DD
 */
export function fonteDaOperacao({ operacao, equipamentos = [], falhasDoApp = 0 }, hoje) {
  const op = operacao ?? criarOperacao();
  const importados = new Set(op.ativos.map((a) => a.tag));
  const ativos = [
    ...op.ativos.map(({ tag, descricao_ativo, familia, setor }) => ({ tag, descricao_ativo, familia, setor })),
    ...equipamentos.filter((e) => e.tag && !importados.has(e.tag))
      .map((e) => ({ tag: e.tag, descricao_ativo: e.descricao || null, familia: e.familia || null, setor: e.setor || null })),
  ];
  const datas = DATAS.flatMap(([base, campo]) => op[base].map((r) => r[campo]?.slice(0, 10))).filter((d) => d && d <= hoje).sort();
  const [a, m, d] = hoje.split('-').map(Number);
  const fonte = normalizarFonte({
    metadados: {
      natureza: 'OPERACAO_LOCAL', versao: contrato.versao, data_referencia: hoje, moeda: 'BRL',
      // Período padrão: do registro mais antigo até hoje; sem registros, o mês corrente.
      periodo: { inicio: datas[0] ?? `${hoje.slice(0, 7)}-01`, fim: hoje, ultimo_mes_parcial: d !== new Date(Date.UTC(a, m, 0)).getUTCDate() },
    },
    bases: {
      ativos,
      ordens_servico: op.ordens_servico.map(semImportacao),
      falhas: op.falhas.map(semImportacao),
      custos_manutencao: op.custos_manutencao.map(semImportacao),
      operacao_ativos: [],
      orcamento_manutencao: op.orcamento.map((o) => ({ competencia: `${o.competencia}-01`, setor: o.setor, categoria_custo: o.categoria_custo, valor_orcado: o.valor_orcado })),
    },
  });
  if (falhasDoApp) {
    fonte.avisos.push(`${falhasDoApp} falha(s) do registro de Falhas do app não entram aqui: elas têm só a data, sem horário de início e fim. Consulte-as em Falhas e no Mensal.`);
  }
  fonte.metadados.vazia = !op.ordens_servico.length && !op.falhas.length && !op.custos_manutencao.length && !op.orcamento.length;
  return fonte;
}
