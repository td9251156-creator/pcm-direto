// Modelos do formato anterior (PCMD) mantidos apenas para o preenchimento automático em
// "Documentos da revisão ativa", até que cada modelo da Biblioteca PCM v2 equivalente receba os dados.
// Não são oferecidos para download em branco. Retirar cada linha quando o substituto v2 estiver pronto.
import contratoModelos from './contrato-modelos.json';

export const VERSAO_MODELOS = contratoModelos.versao;

// [código, nome, descrição, arquivo sem extensão, extensão, substituto previsto na Biblioteca v2]
export const MODELOS_DOCUMENTAIS = [
  ['PCMD-01', 'Controle documental', 'Lista mestra, organização, pessoas e referências.', 'PCMD-01-Controle-Documental', 'xlsx', 'PCM-MAN-001'],
  ['PCMD-02', 'Ativos e criticidade', 'Inventário de ativos e avaliação A/B/C.', 'PCMD-02-Ativos-Criticidade', 'xlsx', 'PCM-MAN-002'],
  ['PCMD-03/04', 'Plano e cronograma', 'Plano mestre, ocorrências e acompanhamento mensal.', 'PCMD-03-04-Plano-Cronograma', 'xlsx', 'PCM-MAN-002'],
  ['PCMD-05', 'Ficha de falha', 'Sintoma, causa, ação, peça e parada.', 'PCMD-05-Ficha-Falha', 'xlsx', 'PCM-MAN-008'],
  ['PCMD-W1', 'Gestão de ativos', 'Manual para organizar ativos e responsabilidades.', 'PCMD-W1-Manual-Gestao-Ativos', 'docx', 'PCM-MAN-018'],
  ['PCMD-W2', 'Estratégia de manutenção', 'Manual de planejamento e revisão das estratégias.', 'PCMD-W2-Manual-Estrategia-Manutencao', 'docx', 'PCM-MAN-019'],
];

export const AVISO_TRANSICAO = 'Formato anterior, mantido só para o preenchimento automático enquanto os modelos da Biblioteca PCM v2 não recebem os dados. Os modelos em branco atuais estão em Modelos para sua rotina.';
