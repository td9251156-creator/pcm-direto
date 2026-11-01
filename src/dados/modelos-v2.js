// Catálogo de downloads da Biblioteca PCM v2. Arquivo, revisão e abas vêm do manifesto conferido por hash;
// aqui ficam apenas título com acentos, finalidade e uma orientação curta de uso, sem regras técnicas.
import manifesto from './biblioteca-pcm-v2.json';

const TEXTOS = {
  'PCM-MAN-001': ['Controle documental', 'Documentação', 'Para saber quais documentos estão em uso, em que revisão e quem responde por eles.'],
  'PCM-MAN-002': ['Criticidade, MFMEA e plano', 'Planejamento', 'Para avaliar a importância dos ativos, analisar modos de falha (MFMEA) e montar o plano e o cronograma.'],
  'PCM-MAN-003': ['Planner de manutenção', 'Planejamento', 'Para distribuir o trabalho nas visões semanal, mensal e anual.'],
  'PCM-MAN-004': ['Ordens de serviço', 'Execução', 'Para abrir, acompanhar e encerrar ordens de serviço com o cadastro de ativos.'],
  'PCM-MAN-005': ['Checklist de preventiva', 'Execução', 'Para registrar os itens conferidos em uma inspeção ou preventiva.'],
  'PCM-MAN-006': ['Passagem de turno', 'Execução', 'Para registrar o que ficou pendente e o estado dos equipamentos na troca de turno.'],
  'PCM-MAN-007': ['Segurança no trabalho', 'Segurança', 'Para organizar permissão de trabalho, etiqueta de bloqueio e acompanhamento de segurança.'],
  'PCM-MAN-008': ['Falhas e Pareto', 'Falhas e melhoria', 'Para registrar falhas e ver quais ocorrem com mais frequência.'],
  'PCM-MAN-009': ['Ação corretiva', 'Falhas e melhoria', 'Para acompanhar a solução de um problema e verificar se a ação funcionou.'],
  'PCM-MAN-010': ['Estoque e peças críticas', 'Materiais e custos', 'Para controlar peças críticas, materiais, movimentos e reservas.'],
  'PCM-MAN-011': ['Indicadores mensais', 'Resultados e auditoria', 'Para reunir os resultados do mês e registrar a análise da manutenção.'],
  'PCM-MAN-012': ['Orçamento e custos', 'Materiais e custos', 'Para comparar o orçamento anual com os custos lançados.'],
  'PCM-MAN-013': ['Auditorias da manutenção', 'Resultados e auditoria', 'Para planejar e registrar auditorias internas da manutenção.'],
  'PCM-MAN-014': ['Manutenção autônoma', 'Execução', 'Para apoiar os cuidados básicos feitos pela operação, com etiquetas e quadro de acompanhamento.'],
  'PCM-MAN-015': ['Auditoria 5S e melhorias', 'Falhas e melhoria', 'Para pontuar o 5S, acompanhar a tendência e registrar melhorias antes e depois.'],
  'PCM-MAN-016': ['POP e lição de um ponto', 'Documentação', 'Para escrever um procedimento operacional ou uma lição de um ponto.'],
  'PCM-MAN-017': ['Procedimento', 'Documentação', 'Para redigir um procedimento formal com controle de revisão.'],
  'PCM-MAN-018': ['Manual de gestão de ativos', 'Documentação', 'Para descrever como a organização cuida dos ativos e das responsabilidades.'],
  'PCM-MAN-019': ['Manual de estratégia de manutenção', 'Documentação', 'Para registrar como as estratégias de manutenção são definidas e revisadas.'],
};

export const GRUPOS_V2 = ['Planejamento', 'Execução', 'Falhas e melhoria', 'Segurança', 'Materiais e custos', 'Resultados e auditoria', 'Documentação'];
export const VERSAO_BIBLIOTECA_V2 = manifesto.versao;

const nomeAba = (aba) => (typeof aba === 'string' ? aba : aba.nome);

export const MODELOS_V2 = manifesto.modelos.map((m) => {
  const [titulo, grupo, quando] = TEXTOS[m.codigo] ?? [m.titulo, 'Documentação', ''];
  const formato = m.arquivo.endsWith('.docx') ? 'Word' : 'Excel';
  const abas = (m.abas ?? []).map(nomeAba).filter((a) => a && !/^(Leia-me|Cadastros|Revisões)$/i.test(a));
  const revisao = /_(R\d+)\.(xlsx|docx)$/.exec(m.arquivo)?.[1] ?? '';
  return { codigo: m.codigo, titulo, grupo, quando, formato, arquivo: m.arquivo, revisao, abas, url: `./${m.url}` };
});
