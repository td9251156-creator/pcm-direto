import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Gera o sw.js na pasta final com a lista de todos os arquivos do app,
// para o aplicativo abrir e gerar planilhas mesmo sem internet.
function serviceWorker() {
  return {
    name: 'pcm-service-worker',
    apply: 'build',
    generateBundle(_opcoes, pacote) {
      // Arquivos gerados pelo build + arquivos fixos da pasta public (manifesto e ícones)
      const publicos = readdirSync('public', { recursive: true })
        .map((f) => String(f).split(path.sep).join('/'))
        .filter((f) => statSync('public/' + f).isFile());
      const arquivos = [...Object.keys(pacote), ...publicos].filter((f) => !f.endsWith('.map')).sort();
      const versao = createHash('sha1').update(arquivos.join('|')).digest('hex').slice(0, 10);
      const codigo = readFileSync('src/sw.js', 'utf8')
        .replace('[/*ARQUIVOS*/]', JSON.stringify(arquivos.map((f) => './' + f)))
        .replace('/*VERSAO*/', versao);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: codigo });
    },
  };
}

// base relativa ('./') para o app funcionar em qualquer endereço,
// inclusive em https://<usuario>.github.io/pcm-direto/
export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  build: {
    // As bibliotecas de planilha e documento são grandes; o aviso padrão não ajuda aqui.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['testes/**/*.test.js'],
  },
});
