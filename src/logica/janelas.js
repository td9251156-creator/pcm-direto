// Janelas de parada (decisão D4 do mantenedor, 01/11/2026): tolerância fixa de ±2 dias para tarefas comuns.
// A sugestão não altera datas do plano: mostra o que cabe na janela, por ordem, e aponta conflitos.
// Segurança nunca é adiada (só pode ser antecipada) e, se antecipada, a próxima execução deve vir até
// a data antecipada + intervalo. Data (tolerância) e capacidade (horas) são conferidas separadamente.

export const TOLERANCIA_DIAS = 2;
const DIA = 86400000;
const dias = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DIA);
const somar = (data, n) => new Date(Date.parse(`${data}T00:00:00Z`) + n * DIA).toISOString().slice(0, 10);
const arred = (n) => Math.round(n * 100) / 100;

const dataValida = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && somar(v, 0) === v;
/** Uma janela: { id, data: AAAA-MM-DD, horas: > 0 e ≤ 24, descricao }. */
export function janelaValida(j) {
  return j !== null && typeof j === 'object' && typeof j.id === 'string' && /^[A-Za-z0-9_-]+$/.test(j.id) && dataValida(j.data) &&
    typeof j.horas === 'number' && Number.isFinite(j.horas) && j.horas > 0 && j.horas <= 24 &&
    typeof j.descricao === 'string' && j.descricao.length <= 120;
}

/**
 * @param janela { data, horas }
 * @param pendentes ocorrências ainda não executadas: { id, tag, descricao, dataPrevista, horas, seguranca, intervaloDias? }
 * @returns { incluidas, naoCouberam, conflitos, ocupacao, capacidade }
 */
export function sugerirJanela(janela, pendentes, tolerancia = TOLERANCIA_DIAS) {
  const candidatas = [];
  for (const o of pendentes) {
    const desloc = dias(janela.data, o.dataPrevista); // > 0: adiada; < 0: antecipada
    if (o.seguranca) {
      // Segurança: só no prazo ou antecipada (até a tolerância); nunca adiada.
      if (desloc <= 0 && desloc >= -tolerancia) candidatas.push({ ...o, desloc });
    } else if (Math.abs(desloc) <= tolerancia) candidatas.push({ ...o, desloc });
  }
  candidatas.sort((a, b) => Number(b.seguranca) - Number(a.seguranca) || a.dataPrevista.localeCompare(b.dataPrevista) || a.tag.localeCompare(b.tag));
  const incluidas = []; const naoCouberam = []; const conflitos = []; let ocupacao = 0;
  for (const c of candidatas) {
    const horas = Number.isFinite(c.horas) && c.horas > 0 ? c.horas : 0;
    if (ocupacao + horas <= janela.horas + 1e-9) {
      ocupacao += horas;
      incluidas.push({ ...c, proximaAte: c.seguranca && c.desloc < 0 && c.intervaloDias ? somar(janela.data, c.intervaloDias) : null });
    } else {
      naoCouberam.push(c);
      if (c.seguranca) conflitos.push(`${c.tag} · ${c.descricao}: tarefa de segurança não cabe na janela. Reorganize a equipe ou a parada; ela não será adiada.`);
    }
  }
  return { incluidas, naoCouberam, conflitos, ocupacao: arred(ocupacao), capacidade: janela.horas };
}
