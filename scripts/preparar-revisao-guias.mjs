// Gera somente o documento de conferência; não muda os indicadores de publicação.
import { writeFile } from 'node:fs/promises';
import { GUIAS_PORTAL } from '../src/dados/guias-portal.js';
import { MODELOS_V2 } from '../src/dados/modelos-v2.js';
import { aplicacaoModelo } from '../src/dados/aplicacao-modelos.js';
const linhas=['# Guias para revisão técnica do mantenedor','','Os textos abaixo foram incluídos na prévia como orientações editoriais, após conferência com o catálogo, os arquivos e as capacidades atuais do app. Isso não equivale à revisão técnica humana; use este documento para registrar ajustes sem precisar ler código.','','Fonte: `src/dados/guias-portal.js`. Para regenerar: `node scripts/preparar-revisao-guias.mjs`.','','Confira se a orientação é adequada ao público, se o exemplo é claro e se há alguma afirmação técnica a corrigir. Registre ajustes por código: 003, 008 e 002. Não é necessário revisar código JavaScript.',''];
for(const g of GUIAS_PORTAL.filter(g=>g.codigo!=='PCM-MAN-004')){
 const m=MODELOS_V2.find(m=>m.codigo===g.codigo);const a=aplicacaoModelo(m);
 linhas.push(`## ${g.codigo} — ${g.titulo}`,'',`**Situação:** orientação editorial incluída na prévia; conferência humana pendente. **Arquivo:** ${m.formato}, ${m.revisao}.`,``,`[Abrir o modelo e sua orientação já publicada](https://pcmdireto.me/modelos/${g.codigo.toLowerCase()}/)`,'',`**Limite atual do app:** ${a.texto}`,'',g.resumo,'');
 for(const[titulo,paragrafos]of g.secoes)linhas.push('### '+titulo,'',...paragrafos.flatMap(p=>[p,'']));
 linhas.push('**Conferência humana:** pendente. Registrar ajustes observados na aplicação, sem tratar os testes automáticos como aprovação técnica.','');
}
await writeFile('docs/portal/REVISAO-GUIAS.md',linhas.join('\n'));
console.log('Documento de revisão gerado; indicadores de publicação preservados.');
