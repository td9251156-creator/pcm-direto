import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MARCA} from '../src/marca.js';

it('usa a paleta final e preserva os recursos visuais oficiais do aplicativo',()=>{
  expect(MARCA.primaria).toBe('0B2A5B');expect(MARCA.destaque).toBe('B85600');
  const manifesto=JSON.parse(readFileSync('public/marca/manifesto.json','utf8'));
  for(const [arquivo,sha] of Object.entries(manifesto.sha256)){
    expect(createHash('sha256').update(readFileSync('public/marca/'+arquivo)).digest('hex'),arquivo).toBe(sha);
  }
});
it('as fontes locais existem e não dependem da rede',()=>{
  const fontes=readFileSync('public/fontes/fontes.css','utf8');
  expect(fontes).not.toMatch(/https?:\/\//);
  for(const m of fontes.matchAll(/url\(\.\/([^)]+)\)/g))expect(existsSync('public/fontes/'+m[1])).toBe(true);
});

it('usa a assinatura completa do modelo no aplicativo e na apresentação',async()=>{
  for(const nome of ['index.html','public/conheca.html']){
    const html=readFileSync(nome,'utf8');expect(html).toContain('./marca/logo/PCM-Direto_horizontal-slogan_cor.svg');expect(html).not.toContain('<span class="marca-slogan">');
  }
  expect(readFileSync('public/icones/logo-horizontal-slogan.svg','utf8')).toBe(readFileSync('public/marca/logo/PCM-Direto_horizontal-slogan_cor.svg','utf8'));
});
