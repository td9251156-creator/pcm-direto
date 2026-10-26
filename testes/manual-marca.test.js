import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MARCA} from '../src/marca.js';

it('usa a paleta final e mantém os downloads originais da marca',()=>{
  expect(MARCA.primaria).toBe('0B2A5B');expect(MARCA.destaque).toBe('B85600');
  const manifesto=JSON.parse(readFileSync('public/marca/manifesto.json','utf8'));
  for(const [arquivo,sha] of Object.entries(manifesto.sha256)){
    expect(createHash('sha256').update(readFileSync('public/marca/'+arquivo)).digest('hex'),arquivo).toBe(sha);
  }
});
it('todos os links fixos da página da marca existem e fontes não dependem da rede',()=>{
  const pagina=readFileSync('src/telas/marca.js','utf8');
  for(const m of pagina.matchAll(/(?:src|href)="\.\/([^"$]+)"/g))expect(existsSync('public/'+m[1]),m[1]).toBe(true);
  const fontes=readFileSync('public/fontes/fontes.css','utf8');
  expect(fontes).not.toMatch(/https?:\/\//);
  for(const m of fontes.matchAll(/url\(\.\/([^)]+)\)/g))expect(existsSync('public/fontes/'+m[1])).toBe(true);
});
