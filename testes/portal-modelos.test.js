import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { paginasModelos } from '../scripts/portal-modelos.mjs';
import { MODELOS_V2 } from '../src/dados/modelos-v2.js';
import manifesto from '../src/dados/biblioteca-pcm-v2.json';

describe('catálogo público independente do app', () => {
  it('gera catálogo e 19 páginas com conteúdo real e download original sem JavaScript', () => {
    const paginas = paginasModelos();
    expect(paginas.size).toBe(20);
    const catalogo = paginas.get('modelos/index.html');
    expect(catalogo.match(/data-modelo="/g)).toHaveLength(19);
    for (const m of MODELOS_V2) {
      const html = paginas.get(`modelos/${m.codigo.toLowerCase()}/index.html`);
      expect(html).toContain(`<h1>${m.titulo}</h1>`);
      expect(html).toContain(`href="../../${m.url.slice(2)}" download`);
      expect(html).toContain(`https://pcmdireto.me/modelos/${m.codigo.toLowerCase()}/`);
      expect(html).toContain(`data-comunidade-modelo="${m.codigo}"`);
      expect(html).toContain(`app.html?modelo=${m.codigo}#inicio`);
      for (const aba of m.abas) expect(html).toContain(aba.replace(/&/g, '&amp;'));
      const dados = manifesto.modelos.find(x => x.codigo === m.codigo);
      expect(createHash('sha256').update(readFileSync('public/' + dados.url)).digest('hex')).toBe(dados.sha256);
    }
  });
});

import { todasPaginas } from '../scripts/portal-modelos.mjs';
import { GUIAS_PORTAL } from '../src/dados/guias-portal.js';
it('publica os quatro guias, preserva rascunhos e mantém callback fora da indexação', () => {
  const paginas=todasPaginas();
  expect(GUIAS_PORTAL.filter(g=>g.publicado)).toHaveLength(4);
  for(const g of GUIAS_PORTAL.filter(g=>g.publicado)){
    const html=paginas.get(`guias/${g.slug}/index.html`);
    expect(html).toContain(`data-comunidade-modelo="${g.codigo}"`);
    expect(html).toContain(`app.html?modelo=${g.codigo}#inicio`);
    expect(html).toContain(`modelos/${g.codigo.toLowerCase()}/`);
  }
  for(const g of GUIAS_PORTAL.filter(g=>!g.publicado))expect(paginas.has(`guias/${g.slug}/index.html`)).toBe(false);
  expect(paginas.get('guias/index.html')).toContain('href="../guias/" aria-current="page"');
  expect(paginas.get('comunidade/index.html')).toContain('href="../comunidade/" aria-current="page"');
  expect(paginas.get('comunidade/acesso/index.html')).toContain('noindex,nofollow');
});


it('oferece link público limpo nos modelos e guias publicados, sem compartilhar o retorno de login',()=>{
 const paginas=todasPaginas();
 for(const [caminho,html] of paginas){
  const material=/^(modelos\/pcm-man-[0-9]{3}|guias\/[a-z0-9-]+)\/index\.html$/.test(caminho);
  expect(html.includes('data-compartilhar aria-labelledby'),caminho).toBe(material);
  if(material){
   const url='https://pcmdireto.me/'+caminho.replace(/index\.html$/,'');
   expect(html).toContain('readonly value="'+url+'"');
   expect(html).toContain('src="../../src/portal-compartilhar.js"');
   expect(html.match(/id="link-compartilhar"/g)).toHaveLength(1);
  }
 }
});

it('não gera uma página para um futuro guia ainda não liberado',()=>{
 const rascunho={...GUIAS_PORTAL[0],slug:'rascunho-ficticio-nao-publicar',publicado:false};
 GUIAS_PORTAL.push(rascunho);
 try{expect(todasPaginas().has('guias/rascunho-ficticio-nao-publicar/index.html')).toBe(false);}
 finally{GUIAS_PORTAL.pop();}
});
