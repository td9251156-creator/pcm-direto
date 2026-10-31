// Filtros comuns às três visões. Setor e família vêm do cadastro de ativos, por TAG.
export const FILTRO_VAZIO = { inicio: null, fim: null, setor: null, familia: null, tag: null };

export function opcoesDeFiltro(bases) {
  const unicos = (campo) => [...new Set(bases.ativos.map((a) => a[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return { setores: unicos('setor'), familias: unicos('familia'), tags: unicos('tag') };
}

export function tagsPermitidas(bases, filtro) {
  const ativos = bases.ativos.filter((a) =>
    (!filtro.setor || a.setor === filtro.setor) &&
    (!filtro.familia || a.familia === filtro.familia) &&
    (!filtro.tag || a.tag === filtro.tag));
  return new Set(ativos.map((a) => a.tag));
}

export const filtroPorAtivo = (filtro) => Boolean(filtro.setor || filtro.familia || filtro.tag);

export function descreverFiltros(filtro) {
  const itens = [];
  if (filtro.inicio || filtro.fim) itens.push(`Período: ${filtro.inicio ?? 'início'} a ${filtro.fim ?? 'referência'}`);
  if (filtro.setor) itens.push(`Setor: ${filtro.setor}`);
  if (filtro.familia) itens.push(`Família: ${filtro.familia}`);
  if (filtro.tag) itens.push(`TAG: ${filtro.tag}`);
  return itens;
}

// Datas ISO (AAAA-MM-DD) comparam como texto; ignora a hora quando existir.
export const dia = (v) => (v ? String(v).slice(0, 10) : null);
export const noPeriodo = (data, filtro) => {
  const d = dia(data);
  return Boolean(d) && (!filtro.inicio || d >= filtro.inicio) && (!filtro.fim || d <= filtro.fim);
};
