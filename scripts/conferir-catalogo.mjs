// Consulta apenas metadados públicos; não cria conta, conteúdo nem altera o banco.
import {readFile} from 'node:fs/promises';
const texto=await readFile('.env.production','utf8');
const campos=Object.fromEntries(texto.split(/\r?\n/).filter(s=>/^VITE_/.test(s)).map(s=>s.split('=')));
for(const tabela of ['catalogo_modelos','catalogo_interacoes','catalogo_comentarios']){
 const r=await fetch(campos.VITE_SUPABASE_URL+'/rest/v1/'+tabela+'?select=*&limit=0',{headers:{apikey:campos.VITE_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(15000)});
 const json=await r.json();console.log(JSON.stringify({tabela,status:r.status,codigo:json.code??null,mensagem:r.ok?'Consulta pública disponível':json.message}));
}
