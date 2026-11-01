// Procedimento PCM-MAN-017 "MTBF, MTTR e Disponibilidade", enviado pelo mantenedor em 01/11/2026.
// HP = horas planejadas digitadas (ativo × mês); HI = indisponibilidade das falhas, cortada na virada do mês;
// HO = HP − HI; N = falhas com início no mês; MTBF = HO ÷ N; MTTR = reparos completos ÷ nº de reparos completos;
// disponibilidade = HO ÷ HP × 100. "Sem dado" (null) nunca vale zero.

const H = 3600000;
// Datas e horas locais, sem fuso: tratadas como UTC só para fazer contas.
const ms = (texto) => (texto ? Date.parse(texto.length === 10 ? `${texto}T00:00:00Z` : `${texto.slice(0, 19)}Z`) : NaN);
const arred = (n) => Math.round(n * 100) / 100;
const horasOk = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/**
 * Falhas de um ativo nas duas fontes: registro do app (equipamentoId) e falhas importadas do 008 (mesma TAG).
 * Uma falha importada com a mesma referência de uma falha do app (008 gerado pelo próprio app) não é contada duas vezes.
 */
export function falhasDoAtivo(gestao, equipamentoId, tag) {
  const doApp = gestao.falhas.filter((f) => f.equipamentoId === equipamentoId);
  const ids = new Set(doApp.map((f) => f.id));
  const lista = doApp.map((f) => ({
    origem: 'app', data: f.data,
    inicio: f.horaInicio ? ms(`${f.data}T${f.horaInicio}:00`) : null,
    // Sem conclusão = falha aberta. Conclusão sem hora: fim desconhecido.
    aberta: !f.dataConclusao,
    fim: f.dataConclusao && f.horaFim ? ms(`${f.dataConclusao}T${f.horaFim}:00`) : null,
    paradaInformada: horasOk(f.horasParada) ? f.horasParada : null,
    reparo: f.dataConclusao && horasOk(f.horasReparo) ? f.horasReparo : null,
  }));
  for (const f of gestao.operacao?.falhas ?? []) {
    if (f.tag !== tag || ids.has(f.referencia_falha)) continue;
    const ir = ms(f.inicio_reparo), fr = ms(f.fim_reparo);
    lista.push({ origem: 'importada', data: f.inicio_falha.slice(0, 10), inicio: ms(f.inicio_falha), aberta: !f.fim_falha,
      fim: f.fim_falha ? ms(f.fim_falha) : null, paradaInformada: null,
      reparo: Number.isFinite(ir) && Number.isFinite(fr) && fr >= ir ? (fr - ir) / H : null });
  }
  return lista;
}

function uniaoEmHoras(intervalos) {
  const ord = intervalos.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let total = 0; let atual = null;
  for (const [a, b] of ord) {
    if (!atual || a > atual[1]) { if (atual) total += atual[1] - atual[0]; atual = [a, b]; } else atual[1] = Math.max(atual[1], b);
  }
  if (atual) total += atual[1] - atual[0];
  return total / H;
}

/**
 * Indicadores de um ativo num mês (AAAA-MM). `hp`: horas planejadas digitadas (null = sem dado). `agora`: ISO local
 * usado como fim provisório de falha aberta no mês corrente.
 */
export function indicadores017(falhas, mes, hp, agora) {
  const [ano, m] = mes.split('-').map(Number);
  const iniMes = Date.UTC(ano, m - 1, 1); const fimMes = Date.UTC(ano, m, 1);
  const limiteAberta = Math.min(fimMes, ms(agora));
  const alertas = []; const intervalos = []; let horasInformadas = 0; let provisoria = false; let semHoras = 0;
  const doMes = falhas.filter((f) => f.data.slice(0, 7) === mes);
  for (const f of falhas) {
    if (f.inicio !== null && Number.isFinite(f.inicio)) {
      if (f.fim !== null && f.fim < f.inicio) {
        // Só bloqueia o mês da própria falha.
        if (f.data.slice(0, 7) === mes) alertas.push('Falha com fim antes do início: corrija o registro.');
        continue;
      }
      const fim = f.fim ?? (f.aberta ? limiteAberta : null);
      if (fim === null) { if (f.data.slice(0, 7) === mes) semHoras++; continue; }
      if (f.fim === null && f.inicio < fimMes && fim > iniMes) provisoria = true;
      const a = Math.max(f.inicio, iniMes), b = Math.min(fim, fimMes);
      if (b > a) intervalos.push([a, b]);
    } else if (f.data.slice(0, 7) === mes) {
      // Sem hora de início: usa as horas de parada informadas na própria falha (sem divisão entre meses).
      if (f.paradaInformada !== null) horasInformadas += f.paradaInformada; else semHoras++;
    }
  }
  const incoerente = alertas.length > 0;
  const hi = incoerente || semHoras ? null : arred(uniaoEmHoras(intervalos) + horasInformadas);
  if (semHoras) alertas.push(`${semHoras} falha(s) do mês sem hora de início/fim nem horas de parada: HI não calculada.`);
  if (horasInformadas && hi !== null) alertas.push('Parte da HI veio das horas de parada informadas na falha (sem hora de início).');
  const hpValida = horasOk(hp) ? hp : null;
  if (hi !== null && hpValida !== null && hi > hpValida) alertas.push('HI maior que HP: confira as horas planejadas e as falhas.');
  const ho = hi !== null && hpValida !== null && hi <= hpValida ? arred(hpValida - hi) : null;
  const n = doMes.length;
  // MTTR: reparos completos das falhas iniciadas no mês; falha aberta fica fora.
  const reparos = doMes.filter((f) => f.reparo !== null && !f.aberta).map((f) => f.reparo);
  return {
    hp: hpValida, hi, ho, n, reparos: reparos.length, provisoria, alertas: [...new Set(alertas)],
    mtbf: ho !== null && n > 0 ? arred(ho / n) : null,
    mttr: !incoerente && reparos.length ? arred(reparos.reduce((s, r) => s + r, 0) / reparos.length) : null,
    disponibilidade: ho !== null && hpValida > 0 ? arred((ho / hpValida) * 100) : null,
  };
}
