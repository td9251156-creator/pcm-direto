// Siglas curtas precisam ser palavras inteiras; palavras maiores mantêm a busca por trecho.
const normalizar = valor => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR').replace(/\bo\.s\.(?=$|[^a-z0-9])/g, 'os');
export function correspondeBuscaModelo(texto, consulta, siglasModelo = '') {
  const conteudo = normalizar(texto);
  const palavras = conteudo.split(/[^a-z0-9]+/).filter(Boolean);
  const termos = normalizar(consulta).split(/[^a-z0-9]+/).filter(Boolean);
  if (!termos.length) return !consulta.trim();
  const siglas = normalizar(siglasModelo).split(/[^a-z0-9]+/).filter(Boolean);
  return termos.every(t => t === 'os' ? siglas.includes(t) : t.length <= 2 ? palavras.includes(t) : conteudo.includes(t));
}

// O mesmo índice editorial alimenta o HTML público e as duas listas do app.
export function indiceBuscaModelo(modelo) {
  return {
    texto: [modelo.codigo, modelo.titulo, modelo.quando, modelo.grupo, modelo.formato, ...modelo.abas].join(' '),
    siglas: modelo.codigo === 'PCM-MAN-004' ? 'OS' : '',
  };
}

export function modeloCorrespondeBusca(modelo, consulta) {
  const indice = indiceBuscaModelo(modelo);
  return correspondeBuscaModelo(indice.texto, consulta, indice.siglas);
}
