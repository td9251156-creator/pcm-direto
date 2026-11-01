import { estado, dadosAtuais } from '../estado.js';
import { criticidadeAtivo, CRITERIOS_CRITICIDADE } from '../logica/gestao.js';
import { esc } from '../ui.js';
import { copiaGestao, guardar } from './gestao-ui.js';

// Descrições das notas no quadro "Notas" da aba Criticidade do PCM-MAN-002 (índice = nota − 1).
const NOTAS = [
  ['Sem lesão ou vazamento crível', 'Primeiros socorros ou pequeno vazamento contido', 'Lesão com atendimento médico ou vazamento reportável', 'Lesão com afastamento ou vazamento que sai da planta', 'Lesão grave ou morte, ou dano ambiental grande'],
  ['Sem efeito no produto', 'Defeito pego na máquina, pouca perda', 'Perda ou retrabalho de um lote', 'Defeito pode escapar para etapas seguintes ou o cliente', 'Defeito chega ao cliente ou afeta item de segurança ou legal'],
  ['Máquina reserva ou capacidade sobrando: sem perda', 'Há reserva; pequena queda de ritmo', 'A linha desacelera ou o contorno custa tempo', 'A linha ou área para, sem reserva', 'A planta para ou uma entrega é perdida'],
  ['Menos de uma vez por ano', 'Cerca de uma vez por ano', 'A cada 3 a 6 meses', 'Cerca de uma vez por mês', 'Toda semana ou mais'],
];
const NIVEL = ['Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto'];

export function telaCriticidade(main) {
  const g = estado.gestao; const equipamentos = dadosAtuais().equipamentos;
  const convertidas = new Set(g.criticidade.convertidas);
  main.innerHTML = `<section class="cartao"><h2>Criticidade dos ativos</h2><p>Mesmo método da aba Criticidade do PCM-MAN-002: dê notas de 1 a 5 para segurança, qualidade e produção pelo pior caso crível de falha, e a frequência de falha de 1 a 5. Sem todas as notas, o resultado fica Pendente.</p>
    <p>Consequência = maior nota entre segurança, qualidade e produção. A classe sai da matriz do modelo; segurança 5 é sempre classe A. A classificação não muda as tarefas, as frequências ou as travas de segurança.</p>
    ${convertidas.size ? `<p class="pendencia">${convertidas.size} avaliação(ões) convertida(s) da escala antiga de 1 a 3 (1→1, 2→3, 3→5; a nota de custo/tempo de reparo não existe no novo método). Confira cada uma e salve para confirmar.</p>` : ''}</section>
    <section><h3>Avaliação por equipamento</h3>${equipamentos.map(eq => {
      const notas = g.criticidade.notas[eq.id] || Array(4).fill(null); const r = criticidadeAtivo(notas);
      return `<form class="cartao avaliacao" data-equipamento="${eq.id}"><h3>${esc(eq.tag)} · ${esc(eq.descricao)}</h3>${convertidas.has(eq.id) ? '<p class="pendencia">Convertida da escala antiga: confira e salve.</p>' : ''}<div class="grade duas">${CRITERIOS_CRITICIDADE.map((c, i) => `<div><label for="nota-${eq.id}-${i}">${c}</label><select id="nota-${eq.id}-${i}" name="nota-${i}"><option value="">Não avaliado</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${notas[i] === n ? 'selected' : ''}>${n} · ${NIVEL[n - 1]}: ${esc(NOTAS[i][n - 1])}</option>`).join('')}</select></div>`).join('')}</div><p>Consequência: <strong>${r.consequencia ?? 'Pendente'}</strong> · Classe: <strong>${r.classe}</strong></p><button id="salvar-notas-${eq.id}">Salvar avaliação de ${esc(eq.tag)}</button></form>`;
    }).join('') || '<p>Nenhum ativo válido. <a href="#equipamentos">Cadastre ou corrija os equipamentos.</a></p>'}</section>`;
  main.querySelectorAll('.avaliacao').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault(); const nova = copiaGestao(); const id = f.dataset.equipamento;
    nova.criticidade.notas[id] = CRITERIOS_CRITICIDADE.map((_, i) => f.elements[`nota-${i}`].value === '' ? null : Number(f.elements[`nota-${i}`].value));
    nova.criticidade.convertidas = nova.criticidade.convertidas.filter(c => c !== id);
    (await guardar(nova, () => telaCriticidade(main), `salvar-notas-${id}`));
  }));
}
