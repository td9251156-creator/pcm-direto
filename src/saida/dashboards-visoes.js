// Registro das visões: tela, tabela e arquivo "Baixar HTML" usam o mesmo cálculo e os mesmos filtros suportados.
import { calcularManutencao } from '../logica/dashboards/manutencao.js';
import { calcularConfiabilidade } from '../logica/dashboards/confiabilidade.js';
import { calcularCustos, setoresDeCustos } from '../logica/dashboards/custos.js';
import { visaoManutencao, visaoConfiabilidade, visaoCustos } from './dashboards-visao.js';

export const VISOES = {
  manutencao: {
    titulo: 'Manutenção e Programação', filtros: ['inicio', 'fim', 'setor', 'familia', 'tag'],
    notaPeriodo: 'O período muda só o gráfico mensal e o cumprimento; abertas, atrasadas, backlog e pendências são sempre a posição na referência.',
    calcular: (f, filtro) => visaoManutencao(calcularManutencao(f, filtro)),
  },
  confiabilidade: { titulo: 'Confiabilidade', filtros: ['inicio', 'fim', 'setor', 'familia', 'tag'], calcular: (f, filtro) => visaoConfiabilidade(calcularConfiabilidade(f, filtro)) },
  custos: { titulo: 'Custos', filtros: ['inicio', 'fim', 'setor'], setores: (f) => setoresDeCustos(f.bases), calcular: (f, filtro) => visaoCustos(calcularCustos(f, filtro)) },
};

// Filtros ativos que uma visão não consegue aplicar (ex.: TAG em Custos).
export const filtrosIgnorados = (visao, filtro) => ['setor', 'familia', 'tag'].filter((k) => filtro[k] && !visao.filtros.includes(k));
