// Empacota o material já revisado; não publica nem agenda conteúdo em redes sociais.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
const zip=new JSZip();const manifesto=[];
const arquivos=(await readdir('divulgacao/portal/kit')).filter(n=>n.endsWith('.png')||n.endsWith('.pdf')||n.endsWith('.json')||n.endsWith('.md')).map(n=>['kit/'+n,'divulgacao/portal/kit/'+n]);
if(arquivos.filter(([n])=>n.endsWith('.png')).length!==16)throw new Error('O kit precisa dos 16 slides PNG.');
if(arquivos.filter(([n])=>n.endsWith('.pdf')).length!==4)throw new Error('O kit precisa dos quatro PDFs LinkedIn.');
arquivos.push(...['README.md','perfis-e-fixada.md','conjuntos-iniciais.md','MEDICAO-28-DIAS.md','agenda-publicacoes.csv','acompanhamento.csv'].map(n=>[n,'divulgacao/portal/'+n]),['LICENSE','LICENSE'],['CREDITOS.md','CREDITOS.md'],['LICENSES/archivo-OFL.txt','public/fontes/archivo-OFL.txt'],['LICENSES/ibmplexmono-OFL.txt','public/fontes/ibmplexmono-OFL.txt']);
for(const[nome,caminho]of arquivos.sort(([a],[b])=>a.localeCompare(b))){const bytes=await readFile(caminho);zip.file(nome,bytes,{date:new Date('1980-01-01T00:00:00Z')});manifesto.push(createHash('sha256').update(bytes).digest('hex')+'  '+nome);}
zip.file('MANIFESTO-SHA256.txt',manifesto.join('\n')+'\n',{date:new Date('1980-01-01T00:00:00Z')});
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/PCM-Direto-kit-divulgacao.zip',await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('Kit com 16 slides, legendas, alternativas de texto, perfis e medição pronto em artifacts/PCM-Direto-kit-divulgacao.zip. Nenhuma postagem enviada.');
