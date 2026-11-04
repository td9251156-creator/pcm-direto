import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('rodapé público simplificado', () => {
  it('retira o aviso extenso solicitado e preserva o rodapé do app', () => {
    for (const arquivo of ['app.html', 'index.html', 'public/conheca.html']) {
      const html = readFileSync(arquivo, 'utf8');
      expect(html).not.toContain('O material apoia a organização do PCM');
      expect(html).toContain('<footer');
    }
    expect(readFileSync('app.html', 'utf8')).toContain('dados da fábrica somente neste aparelho');
  });
});
