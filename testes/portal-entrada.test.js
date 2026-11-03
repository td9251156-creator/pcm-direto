import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const codigo=readFileSync('src/portal-entrada.js','utf8');
function abrir(endereco,{instalado=false,mediaAusente=false,falhar=false}={}) {
  const url=new URL(endereco),destinos=[],eventos={};
  const location={href:url.href,search:url.search,hash:url.hash,replace:destino=>{if(falhar)throw new Error('Navegação indisponível');destinos.push(String(destino));}};
  const document={documentElement:{dataset:{}}};
  const contexto={location,document,navigator:{standalone:instalado},URL,addEventListener:(nome,acao)=>eventos[nome]=acao};
  if(!mediaAusente)contexto.matchMedia=()=>({matches:instalado});
  runInNewContext(codigo,contexto,{timeout:1000});return{location,document,destinos,eventos};
}
describe('entrada antiga sem exibir o portal',()=>{
  it.each(['inicio','apoio','entrega-modelos','marca','falhas?ativo=ficticio'])('preserva destino e parâmetros: %s',rota=>{
    const r=abrir('https://pcmdireto.me/?origem=ficticia#'+rota);
    expect(r.destinos).toEqual(['https://pcmdireto.me/app.html?origem=ficticia#'+rota]);expect(r.document.documentElement.dataset.entrada).toBe('app');
  });
  it('aceita todas as telas válidas do app, além dos aliases legados',()=>{
    const main=readFileSync('src/main.js','utf8').split('const TELAS = {')[1].split('\n};')[0];
    const telas=[...main.matchAll(/^ {2}(?:'([^']+)'|([a-z][a-z-]*)):\s*\{/gm)].map(m=>m[1]||m[2]);
    expect(telas.length).toBeGreaterThan(20);
    for(const tela of telas)expect(abrir('https://pcmdireto.me/#'+tela).destinos).toEqual(['https://pcmdireto.me/app.html#'+tela]);
  });
  it('mantém o portal e suas âncoras públicas, inclusive sem matchMedia',()=>{
    const r=abrir('https://pcmdireto.me/#principal',{mediaAusente:true});expect(r.destinos).toEqual([]);expect(r.document.documentElement.dataset.entrada).toBeUndefined();
  });
  it('trata um link legado acionado depois de o portal já estar aberto',()=>{
    const r=abrir('https://pcmdireto.me/');r.location.hash='#inicio';r.eventos.hashchange();expect(r.destinos).toEqual(['https://pcmdireto.me/app.html#inicio']);
  });
  it('preserva a instalação antiga e a base relativa de publicação',()=>{
    const r=abrir('https://exemplo.invalid/pcm-direto/?fonte=pwa',{instalado:true});expect(r.destinos).toEqual(['https://exemplo.invalid/pcm-direto/app.html?fonte=pwa']);
  });
  it('não mantém o portal escondido se o navegador recusar a navegação',()=>{
    const r=abrir('https://pcmdireto.me/#inicio',{falhar:true});expect(r.document.documentElement.dataset.entrada).toBeUndefined();
  });
});
