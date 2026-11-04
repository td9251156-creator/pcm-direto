// Cadastros: transação atrasada, envio repetido, navegação e quota, somente dados fictícios.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { iniciarServidor, executarComRecursos } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const origem = 'http://127.0.0.1:4225';
await executarComRecursos({
  criarServidor: () => iniciarServidor({ raiz: process.cwd(), porta: 4225 }),
  criarNavegador: () => chromium.launch({ args: process.env.PCM_SEM_SANDBOX === '1' ? ['--no-sandbox'] : [] }),
  executar: async ({ navegador }) => {
    const contexto = await navegador.newContext({ serviceWorkers: 'block' });
    const p = await contexto.newPage();
    const erros = []; p.on('pageerror', e => erros.push(e.message));
    const persistido = () => p.evaluate(() => new Promise((resolve, reject) => {
      const r = indexedDB.open('pcm-direto:base:v3', 1); r.onerror = () => reject(r.error);
      r.onsuccess = () => { const db = r.result; const tx = db.transaction('base'); const q = tx.objectStore('base').get('principal'); tx.oncomplete = () => { db.close(); resolve(q.result); }; };
    }));
    const abrir = async () => { await p.goto(origem + '/app.html#cadastros'); await p.locator('#g-pessoa-nome').waitFor(); };
    async function atrasar() {
      await p.evaluate(() => new Promise(resolve => {
        sessionStorage.removeItem('liberar-cadastro');
        const r = indexedDB.open('pcm-direto:base:v3', 1);
        r.onsuccess = () => {
          const db = r.result; const tx = db.transaction('base', 'readwrite'); const s = tx.objectStore('base');
          const manter = () => { const q = s.get('principal'); q.onsuccess = () => { if (!sessionStorage.getItem('liberar-cadastro')) manter(); }; };
          tx.oncomplete = () => db.close(); manter(); resolve();
        };
      }));
    }
    const liberar = () => p.evaluate(() => sessionStorage.setItem('liberar-cadastro', '1'));
    await abrir();
    await p.locator('#g-nome').fill('Organização fictícia em rascunho');
    await p.locator('#g-pessoa-nome').fill('Pessoa fictícia A');
    await atrasar();
    await p.evaluate(() => { const f = document.querySelector('#form-pessoa'); f.requestSubmit(); f.requestSubmit(); });
    const durante = await p.evaluate(() => ({ bloqueado: document.querySelector('#salvar-pessoa').disabled, ocupado: document.querySelector('#tela-cadastros').getAttribute('aria-busy'), mensagem: document.querySelector('#mensagens').textContent }));
    await liberar();
    await p.getByRole('button', { name: 'Editar Pessoa fictícia A', exact: true }).first().waitFor();
    const salvo = await persistido();
    assert.equal(salvo.dados.rascunho.gestao.pessoas.length, 1, 'Envio repetido durante gravação não pode duplicar a pessoa');
    assert.equal(durante.bloqueado, true); assert.equal(durante.ocupado, 'true'); assert.match(durante.mensagem, /Guardando/);
    assert.equal(await p.locator('#g-nome').inputValue(), 'Organização fictícia em rascunho', 'Outro formulário preserva o rascunho');
    assert.equal(await p.locator('#g-pessoa-nome').inputValue(), '');
    assert.equal(await p.locator('#g-pessoa-nome').isDisabled(), false);
    assert.equal(await p.evaluate(() => document.activeElement.id), 'g-pessoa-nome');
    // Mesmo endereço após sair e voltar não autoriza uma resposta antiga a apagar o formulário novo.
    await p.locator('#g-nome').fill('Organização fictícia salva'); await atrasar(); await p.locator('#salvar-organizacao').click();
    await p.evaluate(() => { location.hash = 'apoio'; }); await p.locator('#buscar-apoio').waitFor();
    await p.evaluate(() => { location.hash = 'cadastros'; }); await p.locator('#g-pessoa-nome').fill('Rascunho novo fictício');
    await liberar(); assert.equal((await persistido()).dados.rascunho.gestao.organizacao.nome, 'Organização fictícia salva');
    await p.waitForFunction(() => document.querySelector('#mensagens')?.textContent.includes('guardados'));
    assert.equal(await p.locator('#g-pessoa-nome').inputValue(), 'Rascunho novo fictício');
    await p.reload(); await p.locator('#g-nome').waitFor(); assert.equal(await p.locator('#g-nome').inputValue(), 'Organização fictícia salva');
    // Erro de quota mantém a cópia persistida e os campos digitados, sem mensagem de sucesso.
    const antes = await persistido();
    await p.evaluate(() => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (..._args) { this.transaction.abort(); throw new DOMException('Quota fictícia', 'QuotaExceededError'); }; window.restaurarPutCadastro = () => { IDBObjectStore.prototype.put = put; }; });
    await p.locator('#g-pessoa-nome').fill('Pessoa fictícia não persistida'); await p.locator('#salvar-pessoa').click();
    await p.locator('#mensagens').filter({ hasText: 'Não foi possível guardar no aparelho.' }).waitFor();
    assert.equal(await p.locator('#g-pessoa-nome').inputValue(), 'Pessoa fictícia não persistida');
    assert.equal(await p.locator('#g-pessoa-nome').isDisabled(), false); assert.equal(await p.locator('#tela-cadastros').getAttribute('aria-busy'), null);
    assert.deepEqual(await persistido(), antes);
    const idNaoPersistido = await p.locator('#form-pessoa input[name="id"]').inputValue();
    assert.ok(idNaoPersistido, 'Inclusão aplicada na memória mantém o ID para permitir nova tentativa');
    await p.locator('#salvar-pessoa').click();
    await p.waitForFunction(() => !document.querySelector('#salvar-pessoa').disabled);
    assert.equal(await p.locator('#form-pessoa input[name="id"]').inputValue(), idNaoPersistido);
    await p.locator('#g-referencia').fill('Referência fictícia para teste');
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      await p.locator('#salvar-requisito').click();
      await p.waitForFunction(() => !document.querySelector('#salvar-requisito').disabled);
    }
    // O rótulo permanece Inativar após a falha: repetir deve manter a intenção, sem reativar.
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      await p.getByRole('button', { name: 'Inativar Pessoa fictícia A', exact: true }).click();
      await p.waitForFunction(() => !document.querySelector('[data-ativar-pessoa]').disabled);
    }
    for (const largura of [320, 390, 820, 1280]) { await p.setViewportSize({ width: largura, height: 900 }); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
    await p.evaluate(() => { location.hash = 'dados'; });
    const [download] = await Promise.all([p.waitForEvent('download'), p.locator('#baixar-backup').click()]);
    const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(backup.rascunho.gestao.pessoas.filter(pessoa => pessoa.nome === 'Pessoa fictícia não persistida').length, 1, 'Nova tentativa após quota não duplica no backup em memória');
    assert.equal(backup.rascunho.gestao.requisitos.filter(r => r.referencia === 'Referência fictícia para teste').length, 1);
    assert.equal(backup.rascunho.gestao.pessoas.find(p => p.nome === 'Pessoa fictícia A').ativo, false, 'Repetir Inativar após quota não reativa a pessoa');
    assert.deepEqual(await persistido(), antes);
    assert.deepEqual(erros, []); await contexto.close();
    console.log('Cadastros: envio único durante transação, estado ocupado, rascunhos/foco, saída e retorno à rota, reload, quota e quatro larguras aprovados.');
  },
});
