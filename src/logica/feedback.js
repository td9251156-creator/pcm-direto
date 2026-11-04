export const CAMPOS_FEEDBACK = [
  { id: 'dificuldade', titulo: 'Qual foi a principal dificuldade?', limite: 500, obrigatorio: true },
  { id: 'faltou', titulo: 'O que faltou?', limite: 500 },
  { id: 'tema', titulo: 'Qual norma ou auditoria importa para você?', limite: 200 },
  { id: 'apoio', titulo: 'Que forma de apoio você consideraria?' },
  { id: 'comentario', titulo: 'Quer deixar outro comentário?', limite: 500 },
];
export const OPCOES_APOIO = ['Prefiro não responder', 'Patrocínio', 'Serviço', 'Ambos', 'Nenhum'];
export const novoFeedback = () => ({ dificuldade: '', faltou: '', tema: '', apoio: OPCOES_APOIO[0], comentario: '' });
const FORMULARIO = 'https://github.com/td9251156-creator/pcm-direto/issues/new?template=6-feedback-de-uso.yml';

// Aceita somente as cinco respostas; nunca incorpora estado do app ou dados do navegador.
export function prepararFeedback(entrada) {
  const respostas = {};
  for (const c of CAMPOS_FEEDBACK) {
    const valor = entrada[c.id];
    if (typeof valor !== 'string' || (c.obrigatorio && !valor.trim()) || (c.limite && valor.length > c.limite) || (c.id === 'apoio' && !OPCOES_APOIO.includes(valor))) throw new Error(`Confira: ${c.titulo}`);
    respostas[c.id] = valor.trim();
  }
  const texto = CAMPOS_FEEDBACK.map((c,i) => `${i+1}. ${c.titulo}\n${respostas[c.id] || 'Não informado'}`).join('\n\n');
  const url = new URL(FORMULARIO);
  for (const c of CAMPOS_FEEDBACK) url.searchParams.set(c.id,respostas[c.id]);
  const preenchido = url.href.length <= 2000;
  return { texto, url: preenchido ? url.href : FORMULARIO, preenchido };
}
