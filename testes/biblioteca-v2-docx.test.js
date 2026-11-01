import { it, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { preencherManualWord, metadadosWord } from '../src/saida/biblioteca-v2-docx.js';
import { modeloBibliotecaV2 } from '../src/integracao/biblioteca-pcm-v2.js';

const original = (codigo) => readFileSync('public/' + modeloBibliotecaV2(codigo).url);
const textoDoControle = (xml, tag) => [...xml.matchAll(/<w:sdt>[\s\S]*?<\/w:sdt>/g)].map((m) => m[0])
  .filter((s) => s.includes(`<w:tag w:val="${tag}"/>`))
  .map((s) => [...s.split('<w:sdtContent>')[1].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((t) => t[1]).join(''));
const emissao = (aprovador = '') => ({ estado: { gestao: { organizacao: { nome: 'Fábrica fictícia & Cia' } } }, meta: { revisao: '03', dataCorte: '2026-06-30', elaborador: 'Técnico fictício', aprovador } });

describe('manuais Word 018 e 019: só metadados', () => {
  for (const codigo of ['PCM-MAN-018', 'PCM-MAN-019']) {
    it(`${codigo}: atualiza dados ligados e texto dos campos, sem tocar no restante`, async () => {
      const valores = metadadosWord(emissao());
      expect(valores).toMatchObject({ revisao: '03', data: '30/06/2026', aprovado: 'A definir', situacao: 'Em elaboração' });
      const saida = await preencherManualWord(original(codigo), codigo, valores);
      const z = await JSZip.loadAsync(saida), o = await JSZip.loadAsync(original(codigo));
      const dados = await z.file('customXml/item1.xml').async('string');
      expect(dados).toContain('<pcm:organizacao>Fábrica fictícia &amp; Cia</pcm:organizacao>');
      expect(dados).toContain('<pcm:elaborado>Técnico fictício</pcm:elaborado>');
      expect(dados).toContain(`<pcm:codigo>${codigo}</pcm:codigo>`);
      const cab = await z.file('word/header1.xml').async('string');
      const doc = await z.file('word/document.xml').async('string');
      const rod = await z.file('word/footer1.xml').async('string');
      expect(textoDoControle(cab, 'revisao')).toEqual(['03']);
      expect(textoDoControle(rod, 'data')).toEqual(['30/06/2026']);
      expect(textoDoControle(doc, 'organizacao')).toEqual(['Fábrica fictícia &amp; Cia']);
      expect(textoDoControle(doc, 'aprovado')).toEqual(['A definir']);
      expect(textoDoControle(doc, 'codigo')).toEqual([codigo]);
      // Fora dos controles, o documento continua igual ao original.
      const semControles = (x) => x.replace(/<w:sdt>[\s\S]*?<\/w:sdt>/g, '');
      expect(semControles(doc)).toBe(semControles(await o.file('word/document.xml').async('string')));
      for (const nome of Object.keys(o.files).filter((n) => !o.files[n].dir && !['customXml/item1.xml', 'word/header1.xml', 'word/document.xml', 'word/footer1.xml'].includes(n))) {
        expect(await z.file(nome).async('uint8array'), nome).toEqual(await o.file(nome).async('uint8array'));
      }
    });
  }
  it('"$" e caracteres de controle no nome não corrompem o documento (revisão independente)', async () => {
    const valores = { ...metadadosWord(emissao()), organizacao: "Oficina $2 & $' Ltda", elaborado: 'Ana $&\u000b' };
    const z = await JSZip.loadAsync(await preencherManualWord(original('PCM-MAN-018'), 'PCM-MAN-018', valores));
    const dados = await z.file('customXml/item1.xml').async('string');
    expect(dados).toContain("<pcm:organizacao>Oficina $2 &amp; $' Ltda</pcm:organizacao>");
    expect(dados).toContain('<pcm:elaborado>Ana $&amp;</pcm:elaborado>');
    expect(textoDoControle(await z.file('word/document.xml').async('string'), 'elaborado')).toEqual(['Ana $&amp;']);
  });
  it('aprovação só aparece quando informada', () => {
    expect(metadadosWord(emissao('Gestora Fictícia'))).toMatchObject({ aprovado: 'Gestora Fictícia', situacao: 'Aprovado' });
  });
  it('recusa arquivo diferente do original', async () => {
    const outro = new Uint8Array(original('PCM-MAN-018')); outro[outro.length - 5] ^= 1;
    await expect(preencherManualWord(outro, 'PCM-MAN-018', metadadosWord(emissao()))).rejects.toThrow('diferente do esperado');
  });
});
