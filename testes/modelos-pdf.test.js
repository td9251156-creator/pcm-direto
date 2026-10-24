import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import biblioteca from '../src/dados/biblioteca.json';

describe('Fichas públicas de máquinas e tarefas em PDF', () => {
  for (const tipo of biblioteca.tipos) it(`${tipo.nome}: PDF acompanha o conteúdo e a versão da biblioteca`, () => {
    const fonte = { versao: biblioteca.versao, data: biblioteca.data, aviso: biblioteca.aviso, tipo };
    const hash = createHash('sha256').update(JSON.stringify(fonte)).digest('hex');
    const pdf = readFileSync(new URL(`../public/modelos/maquinas/pcm-modelo-${tipo.id}.pdf`, import.meta.url)).toString('latin1');
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('Biblioteca SHA256 ' + hash);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
  });
});
