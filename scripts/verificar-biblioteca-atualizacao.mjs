// Base antiga real no IndexedDB: atualização aditiva e conflitos sem bloquear a operação.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iniciarServidor, executarComRecursos } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const anterior = JSON.parse(await readFile(new URL('../src/dados/biblioteca-0.2.0.json', import.meta.url), 'utf8'));
await executarComRecursos({
  criarServidor: () => iniciarServidor({ raiz: fileURLToPath(new URL('../', import.meta.url)), porta: 4222 }),
  criarNavegador: () => chromium.launch({ executablePath: process.env.PCM_CHROMIUM || undefined, args: process.env.PCM_SEM_SANDBOX === '1' ? ['--no-sandbox'] : [] }),
  executar: async ({ navegador }) => {
    for (const conflito of [false, true]) {
      const contexto = await navegador.newContext({ serviceWorkers: 'block' });
      const p = await contexto.newPage();
      const biblioteca = structuredClone(anterior);
      biblioteca.tipos[0].tarefas[0].descricao = 'Personalização fictícia preservada';
      if (conflito) {
        const tipo = biblioteca.tipos.find(t => t.id === 'compressor_ar');
        tipo.tarefas.push({ ...tipo.tarefas[0], id: 'CMP-11', descricao: 'Tarefa personalizada fictícia', seguranca: false });
      }
      const backup = { aplicativo: 'PCM Direto', versao: 1, biblioteca, rascunho: {
        equipamentos: [{ id: 'eq-ficticio', setor: 'UTL', tipo: 'motor_eletrico', numero: 1, tag: 'UTL-MOT-001', descricao: 'Motor fictício' }],
        ajustes: {}, execucoes: {}, exemplo: false, inicio: '2026-11-02', capacidade: {} } };
      await p.goto('http://127.0.0.1:4222/');
      await p.evaluate(dados => new Promise((resolve, reject) => {
        const r = indexedDB.open('pcm-direto:base:v3', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('base');
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result; const tx = db.transaction('base', 'readwrite');
          tx.objectStore('base').put({ formato: 3, sequencia: 1, dados }, 'principal');
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
        };
      }), backup);
      await p.goto('http://127.0.0.1:4222/app.html#cadastros');
      await p.locator('#form-organizacao input[name="nome"]').fill('Operação fictícia após atualização');
      await p.locator('#salvar-organizacao').click();
      await p.waitForFunction(() => document.querySelector('#salvar-organizacao') && !document.querySelector('#salvar-organizacao').disabled);
      await p.reload();
      await p.locator('#form-organizacao input[name="nome"]').waitFor();
      assert.equal(await p.locator('#form-organizacao input[name="nome"]').inputValue(), 'Operação fictícia após atualização');
      const salvo = await p.evaluate(() => new Promise(resolve => {
        const r = indexedDB.open('pcm-direto:base:v3', 1);
        r.onsuccess = () => { const db = r.result; const tx = db.transaction('base'); const q = tx.objectStore('base').get('principal'); tx.oncomplete = () => { db.close(); resolve(q.result.dados); }; };
      }));
      assert.equal(salvo.biblioteca.tipos.length, conflito ? 7 : 47);
      assert.equal(salvo.biblioteca.tipos[0].tarefas[0].descricao, 'Personalização fictícia preservada');
      assert.deepEqual(salvo.rascunho.equipamentos, backup.rascunho.equipamentos);
      if (conflito) assert.deepEqual(salvo.biblioteca, biblioteca);
      await contexto.close();
    }
    console.log('Biblioteca: IndexedDB antigo reabriu e gravou com acréscimos e com conflito CMP-11, sem perder personalizações ou ativos.');
  },
});
