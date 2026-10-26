import {it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import relatorio from '../docs/integridade-logos-templates.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const logo=readFileSync('public/marca/logo/PCM-Direto_modelo-slogan.png');

function normalizar(texto,ids){
  return texto.replace(/<(?:\w+:)?(?:oneCellAnchor|inline)\b[^>]*>[\s\S]*?<\/(?:\w+:)?(?:oneCellAnchor|inline)>/g,bloco=>{
    if(!ids.some(id=>bloco.includes(`embed="${id}"`)))return bloco;
    return bloco.replace(/<(?:\w+:)?(?:ext|extent)\b[^>]*\/>/g,ext=>ext.replace(/\b(cx|cy)="\d+"/g,'$1="0"'));
  });
}

it('todos os templates e exemplos públicos usam a imagem oficial do modelo',async()=>{
  expect(sha(logo)).toBe(relatorio.logoSha256);
  for(const pasta of ['public/modelos','public/modelos/refeitos','public/marca/templates']){
    for(const nome of readdirSync(pasta).filter(n=>/\.(xlsx|docx)$/.test(n))){
      const zip=await JSZip.loadAsync(readFileSync(pasta+'/'+nome));
      const imagens=Object.keys(zip.files).filter(n=>/\/media\//.test(n)&&!zip.files[n].dir);
      expect(imagens.length,nome).toBeGreaterThan(0);
      for(const imagem of imagens)expect(sha(await zip.file(imagem).async('nodebuffer')),nome+' '+imagem).toBe(relatorio.logoSha256);
    }
  }
});

it('troca dos logos preserva todas as partes funcionais e o conteúdo do Word',async()=>{
  expect(Object.keys(relatorio.arquivos)).toHaveLength(12);
  for(const [nome,info] of Object.entries(relatorio.arquivos)){
    const bytes=readFileSync('public/modelos/'+nome);expect(sha(bytes),nome).toBe(info.sha256Atual);
    const zip=await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).sort()).toEqual([...Object.keys(info.partesPreservadas),...info.imagens,...Object.keys(info.geometria)].sort());
    for(const [parte,hash] of Object.entries(info.partesPreservadas))expect(sha(await zip.file(parte).async('nodebuffer')),nome+' '+parte).toBe(hash);
    for(const [parte,geometria] of Object.entries(info.geometria)){
      const texto=await zip.file(parte).async('string');
      expect(sha(normalizar(texto,geometria.ids)),nome+' '+parte).toBe(geometria.sha256SemDimensoes);
      for(const bloco of texto.match(/<(?:\w+:)?(?:oneCellAnchor|inline)\b[^>]*>[\s\S]*?<\/(?:\w+:)?(?:oneCellAnchor|inline)>/g)||[]){
        if(!geometria.ids.some(id=>bloco.includes(`embed="${id}"`)))continue;
        for(const ext of bloco.match(/<(?:\w+:)?(?:ext|extent)\b[^>]*\/>/g)||[]){
          const cx=ext.match(/\bcx="(\d+)"/),cy=ext.match(/\bcy="(\d+)"/);
          if(cx&&cy)expect(Math.abs(Number(cx[1])/Number(cy[1])-1230/356)).toBeLessThan(.00001);
        }
      }
    }
  }
});
