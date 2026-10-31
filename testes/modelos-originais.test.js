import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import manifesto from '../public/modelos/manifesto.json';
import contrato from '../src/dados/contrato-modelos.json';
it('confere os 6 arquivos do formato anterior mantidos para o preenchimento e sua rastreabilidade no manifesto',()=>{
  // Exemplos e prévias foram retirados: os downloads em branco agora são da Biblioteca PCM v2.
  expect(Object.keys(manifesto.arquivos)).toHaveLength(6);
  expect(Object.keys(manifesto.arquivos).some(n=>/Exemplo|\.pdf$/.test(n))).toBe(false);expect(manifesto.versao).toBe(contrato.versao);
  for(const [nome,info] of Object.entries(manifesto.arquivos)){
    const bytes=readFileSync(new URL('../public/modelos/'+nome,import.meta.url));
    expect(bytes.length,nome).toBe(info.bytes);expect(createHash('sha256').update(bytes).digest('hex'),nome).toBe(info.sha256);
  }
});
it('contrato aponta para as abas e os arquivos publicados corretos',async()=>{
  for(const [nome,info] of Object.entries(contrato.modelos)){
    expect(info.sha256).toBe(manifesto.arquivos[nome].sha256);
    if(!info.abas?.length)continue;
    const zip=await JSZip.loadAsync(readFileSync(new URL('../public/modelos/'+nome,import.meta.url)));
    const wb=await zip.file('xl/workbook.xml').async('string');
    for(const aba of info.abas){expect(wb).toContain('name="'+aba.nome+'"');expect(zip.file(aba.arquivo)).not.toBeNull();}
  }
});
