import { defineConfig } from 'vite';

// base relativa ('./') para o app funcionar em qualquer endereço,
// inclusive em https://<usuario>.github.io/pcm-direto/
export default defineConfig({
  base: './',
  build: {
    // As bibliotecas de planilha e documento são grandes; o aviso padrão não ajuda aqui.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['testes/**/*.test.js'],
    passWithNoTests: true,
  },
});
