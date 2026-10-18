// Junta plano, cronograma e números do resumo em um só objeto,
// usado pelas telas e pelos geradores de planilha e documento.
import { gerarPlano } from './plano.js';
import { montarCronograma, resumoCarga, lerData, proximaSegunda, dataDaSemana } from './cronograma.js';

export const AVISO =
  'O material apoia a organização do PCM e não substitui a avaliação de profissional habilitado nem o texto oficial das normas. ' +
  'As periodicidades são base genérica e devem ser confirmadas com o manual do fabricante.';

/** Soma valores agrupando por uma chave: somarPor(lista, 'especialidade', l => l.horas) */
function somarPor(lista, campo, valor) {
  const mapa = {};
  for (const item of lista) mapa[item[campo]] = (mapa[item[campo]] ?? 0) + valor(item);
  return mapa;
}

/**
 * inicio: data da semana 1 no formato "2027-01-04". Sem data, usa a próxima segunda-feira.
 * capacidade: horas disponíveis por semana em cada especialidade (vazio = sem limite).
 */
export function montarDados(equipamentos, biblioteca, ajustes = {}, inicio = null, capacidade = {}) {
  const dataInicio = inicio ? lerData(inicio) : proximaSegunda();
  const plano = gerarPlano(equipamentos, biblioteca, ajustes);
  const ativas = plano.filter((l) => l.ativa);
  const { itens, carga, cargaPorEspecialidade: porEsp, semanasAcima } = montarCronograma(plano, capacidade);
  const carga2 = resumoCarga(carga);

  // Carga semanal de cada especialidade: média, semana mais carregada e capacidade
  const cargaPorEspecialidade = Object.fromEntries(Object.entries(porEsp).map(([esp, c]) => [
    esp, { ...resumoCarga(c), capacidade: Number(capacidade[esp]) || 0, semanasAcima: semanasAcima[esp] },
  ]));

  return {
    geradoEm: new Date(),
    inicio: dataInicio,
    biblioteca: { nome: biblioteca.nome, versao: biblioteca.versao, data: biblioteca.data },
    equipamentos,
    plano,
    cronograma: itens,
    carga,
    resumo: {
      equipamentos: equipamentos.length,
      tarefas: ativas.length,
      tarefasSeguranca: ativas.filter((l) => l.seguranca).length,
      retiradas: plano.length - ativas.length,
      horasAno: carga2.total,
      mediaSemana: carga2.media,
      picoSemana: carga2.pico,
      semanaPico: carga2.semanaPico,
      dataSemanaPico: dataDaSemana(dataInicio, carga2.semanaPico),
      cargaPorEspecialidade,
      horasPorEspecialidade: somarPor(ativas, 'especialidade', (l) => l.duracaoHoras * l.vezesAno),
      equipamentosPorTipo: somarPor(
        equipamentos.map((e) => ({ tipo: biblioteca.tipos.find((t) => t.id === e.tipo)?.nome ?? e.tipo })),
        'tipo',
        () => 1,
      ),
    },
  };
}

/** Nome do arquivo com a data: pcm-direto-2026-10-18.xlsx */
export function nomeArquivo(extensao, data = new Date()) {
  const d = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  return `pcm-direto-${d}.${extensao}`;
}
