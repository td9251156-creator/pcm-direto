// Eventos do SDK e API simulados: não envia e-mails nem usa contas reais.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iniciarServidor, executarComRecursos } from './navegador.mjs';
const ferramenta = process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href;
const { chromium } = await import(ferramenta);
await executarComRecursos({
  criarServidor: () => iniciarServidor({ raiz: fileURLToPath(new URL('../', import.meta.url)), porta: 4177 }),
  criarNavegador: () => chromium.launch({ executablePath: process.env.PCM_CHROMIUM || undefined, args: process.env.PCM_SEM_SANDBOX === '1' ? ['--no-sandbox'] : [] }),
  executar: async ({ navegador }) => {
    const contexto = await navegador.newContext({ serviceWorkers: 'block' });
    contexto.setDefaultTimeout(5000);
    let canal;
    await contexto.addInitScript(() => {
      const Canal = window.BroadcastChannel;
      window.BroadcastChannel = class extends Canal {
        constructor(nome) { super(nome); window.canalAuthTeste = nome; }
      };
    });
    let segurarModeracao = false;
    let liberarModeracao;
    let recebeuModeracao;
    let segurarSalvamento = false;
    let liberarSalvamento;
    let recebeuSalvamento;
    let envios = 0;
    await contexto.route('https://*.supabase.co/**', route => {
      const url = route.request().url();
      if (url.includes('/rpc/catalogo_enviar')) envios++;
      if (segurarModeracao && url.includes('/rpc/catalogo_e_moderador')) {
        segurarModeracao = false;
        recebeuModeracao();
        return new Promise(resolve => { liberarModeracao = async () => {
          await route.fulfill({ contentType: 'application/json', body: 'true' }); resolve();
        }; });
      }
      if (segurarSalvamento && url.includes('/rpc/catalogo_salvar')) {
        segurarSalvamento = false;
        recebeuSalvamento();
        return new Promise(resolve => { liberarSalvamento = async () => {
          await route.fulfill({ contentType: 'application/json', body: '"rascunho-ficticio"' }); resolve();
        }; });
      }
      return route.fulfill({
      contentType: 'application/json',
      body: url.includes('/rpc/catalogo_e_moderador') ? 'false' : '[]',
      });
    });
    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on('pageerror', e => erros.push(e.message));
    await pagina.goto('http://127.0.0.1:4177/#catalogo');
    await pagina.locator('[data-login]').waitFor();
    canal = await pagina.evaluate(() => window.canalAuthTeste);
    assert.ok(canal, 'O SDK criou seu canal de sessão');
    const outra = await contexto.newPage();
    await outra.goto('http://127.0.0.1:4177/#apoio');
    const sessao = { user: { id: '00000000-0000-4000-8000-000000000001', email: 'colaborador@example.invalid' } };
    async function emitir(evento, valor) {
      await outra.evaluate(({ canal, evento, valor }) => {
        const c = new BroadcastChannel(canal);
        c.postMessage({ event: evento, session: valor }); c.close();
      }, { canal, evento, valor });
    }
    await emitir('SIGNED_IN', sessao);
    await pagina.locator('[data-novo]').waitFor();
    await pagina.locator('[data-novo]').click();
    await pagina.locator('#c-titulo').fill('Rascunho fictício ainda não salvo');
    await emitir('TOKEN_REFRESHED', sessao);
    await emitir('SIGNED_IN', sessao);
    await pagina.waitForTimeout(150);
    assert.equal(await pagina.locator('#c-titulo').inputValue(), 'Rascunho fictício ainda não salvo');
    await pagina.locator('#c-descricao').fill('Descrição fictícia para testar uma resposta atrasada.');
    await pagina.locator('[name="consentimento"]').check();
    segurarSalvamento = true;
    const salvamentoRecebido = new Promise(resolve => { recebeuSalvamento = resolve; });
    await pagina.getByRole('button', { name: 'Salvar e enviar para revisão', exact: true }).click();
    await salvamentoRecebido;
    await emitir('SIGNED_OUT', null);
    await pagina.locator('[data-login]').waitFor();
    await liberarSalvamento();
    await pagina.waitForTimeout(150);
    assert.equal(envios, 0, 'Não envia para revisão uma resposta de salvamento da sessão anterior');
    assert.equal(await pagina.locator('[data-modelo]').count(), 0);
    assert.equal(await pagina.locator('[data-novo]').count(), 0);
    await emitir('SIGNED_IN', sessao);
    await pagina.locator('[data-sair]').click();
    await pagina.locator('[data-login]').waitFor();
    segurarModeracao = true;
    const moderacaoRecebida = new Promise(resolve => { recebeuModeracao = resolve; });
    await emitir('SIGNED_IN', sessao);
    await moderacaoRecebida;
    await emitir('SIGNED_OUT', null);
    await pagina.locator('[data-login]').waitFor();
    await liberarModeracao();
    await pagina.waitForTimeout(150);
    assert.equal(await pagina.locator('[data-vista="moderacao"]').count(), 0, 'Resposta antiga não devolve acesso de moderador');
    // A assinatura da tela anterior não pode afetar outra rota.
    await pagina.evaluate(() => { location.hash = 'apoio'; });
    await pagina.locator('#buscar-apoio').waitFor();
    await emitir('SIGNED_IN', sessao);
    await pagina.waitForTimeout(100);
    assert.equal(await pagina.locator('[data-conta]').count(), 0);
    assert.deepEqual(erros, []);
    await contexto.close();

    // Isola a continuação de Sair: o SDK já pode ter anunciado a conta seguinte
    // antes de a Promise da operação anterior resolver.
    const fonte = (await readFile(new URL('../src/telas/catalogo.js', import.meta.url), 'utf8'))
      .replace(/^import .*;\r?\n/gm, '').replace('export function telaCatalogo', 'function telaCatalogo');
    const isolada = await navegador.newPage();
    try {
      await isolada.setContent('<main></main>');
      await isolada.evaluate(fonte => {
        const dependencias = {
          configuracao: () => ({ configurado: true }),
          observarSessaoCatalogo: async cb => {
            window.emitirAuthTeste = cb;
            setTimeout(() => cb({ user: { id: 'A', email: 'a@example.invalid' } }, 'INITIAL_SESSION'), 0);
            return () => {};
          },
          sairCatalogo: () => new Promise(resolve => { window.concluirSaidaTeste = resolve; }),
          listarCatalogo: async () => [], moderadorCatalogo: async () => false,
          esc: valor => String(valor ?? ''), avisar: () => {},
        };
        Function(...Object.keys(dependencias), fonte + ';return telaCatalogo;')(...Object.values(dependencias))(document.querySelector('main'), () => {});
      }, fonte);
      await isolada.locator('[data-sair]').click();
      await isolada.evaluate(() => window.emitirAuthTeste({ user: { id: 'B', email: 'b@example.invalid' } }, 'SIGNED_IN'));
      await isolada.getByText('Conectado como b@example.invalid.', { exact: false }).waitFor();
      await isolada.evaluate(async () => { window.concluirSaidaTeste(); await new Promise(resolve => setTimeout(resolve, 0)); });
      assert.equal(await isolada.locator('[data-login]').count(), 0, 'Saída antiga não sobrescreve uma sessão mais recente');
      assert.ok((await isolada.locator('[data-conta]').innerText()).includes('b@example.invalid'));
    } finally { await isolada.close(); }
    console.log('Sessão: entrada/saída entre abas e formulário preservado na renovação aprovados (API simulada).');
  },
});
