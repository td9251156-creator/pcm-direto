// Tela 1: Início
import { estado, limpar, carregarExemplo, restaurarBackup } from '../estado.js';
import { criarBackup } from '../logica/backup.js';
import { verificarBackup } from '../logica/backup.js';
import { BIBLIOTECA_PADRAO } from '../estado.js';
import { esc, avisar, baixar } from '../ui.js';

let pedidoInstalacao = null; // evento do navegador para instalar o app
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pedidoInstalacao = e;
  document.getElementById('instalar')?.removeAttribute('hidden');
});

export function telaInicio(main, ir) {
  const n = estado.equipamentos.length;
  main.innerHTML = `
    <section class="cartao">
      <p class="slogan">Manutenção planejada. <strong>Direto ao ponto.</strong></p>
      <h2>Plano de manutenção preventiva a partir da sua lista de equipamentos</h2>
      <ol>
        <li><strong>Equipamentos:</strong> cadastre, cole do Excel ou importe um CSV. A TAG sai padronizada.</li>
        <li><strong>Revisão:</strong> confira as tarefas e periodicidades de cada equipamento.</li>
        <li><strong>Entrega:</strong> baixe a planilha (.xlsx) com plano, cronograma e ficha de falha, e o resumo (.docx).</li>
      </ol>
      <p>
        Lista aberta neste aparelho: <strong>${n} equipamento${n === 1 ? '' : 's'}</strong>
        ${estado.exemplo ? ' — exemplo com dados fictícios, para você ver o resultado.' : '.'}
      </p>
      <div class="acoes">
        <button type="button" id="ir-equipamentos">${estado.exemplo ? 'Ver o exemplo' : 'Continuar a lista'}</button>
        <button type="button" class="secundario" id="em-branco">Começar lista em branco</button>
        <button type="button" class="secundario" id="exemplo">Recarregar o exemplo</button>
        <button type="button" class="secundario" id="instalar" ${pedidoInstalacao ? '' : 'hidden'}>Instalar como aplicativo</button>
      </div>
    </section>

    <section class="cartao">
      <h3>Equipamentos atendidos pela biblioteca</h3>
      <ul>${estado.biblioteca.tipos.map((t) => `<li>${esc(t.nome)} (${esc(t.sigla)}) — ${t.tarefas.length} tarefas</li>`).join('')}</ul>
      <p><a href="#biblioteca">Ver e editar a biblioteca técnica</a> (tarefas, periodicidades e novos tipos).</p>
      <p><a href="#execucao">Abrir checklist de execução</a> (marcação, data e observação técnica).</p>
      <p class="origem">${esc(estado.biblioteca.nome)}, versão ${esc(estado.biblioteca.versao)} (${esc(estado.biblioteca.data)}). ${esc(estado.biblioteca.aviso)}</p>
    </section>

    <section class="cartao">
      <h3>Seus dados</h3>
      <p>Tudo é feito neste navegador. Nenhum dado é enviado para servidor. O rascunho fica salvo aqui mesmo,
      então limpar os dados do navegador apaga a lista: ao terminar, baixe a planilha.</p>
      <p>O backup completo guarda equipamentos, biblioteca, ajustes, capacidade, data do plano e marcações de execução.</p>
      <button type="button" id="baixar-backup">Baixar backup completo (.json)</button>
      <div class="acoes"><div><label for="restaurar-backup">Restaurar backup completo (.json)</label>
        <input type="file" id="restaurar-backup" accept=".json,application/json"></div></div>
    </section>
  `;

  main.querySelector('#ir-equipamentos').addEventListener('click', () => ir('equipamentos'));
  main.querySelector('#baixar-backup').addEventListener('click', () => {
    baixar(JSON.stringify(criarBackup(estado), null, 2), 'pcm-direto-backup.json', 'application/json');
    avisar('Backup completo baixado. Guarde o arquivo em um lugar seguro.');
  });
  main.querySelector('#restaurar-backup').addEventListener('change', async (e) => {
    const arquivo = e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    let dados;
    try { dados = JSON.parse(await arquivo.text()); } catch { avisar('O arquivo não é um JSON válido. A lista atual foi mantida.'); return; }
    const valido = verificarBackup(dados, BIBLIOTECA_PADRAO);
    if (!valido.ok) { avisar(valido.motivo); return; }
    if (!confirm(`Restaurar ${valido.rascunho.equipamentos.length} equipamento(s) e a biblioteca deste backup? Isso substitui a lista atual. Baixe o backup atual antes, se quiser guardá-lo.`)) return;
    const r = restaurarBackup(dados);
    if (!r.ok) { avisar(r.motivo); return; }
    telaInicio(main, ir);
    avisar('Backup restaurado neste aparelho.');
  });
  main.querySelector('#em-branco').addEventListener('click', () => {
    if (n && !confirm('Apagar a lista atual e começar em branco?')) return;
    limpar();
    avisar('Lista em branco. Cadastre o primeiro equipamento.');
    ir('equipamentos');
  });
  main.querySelector('#exemplo').addEventListener('click', () => {
    if (n && !estado.exemplo && !confirm('Trocar a lista atual pelo exemplo?')) return;
    carregarExemplo();
    avisar('Exemplo carregado.');
    telaInicio(main, ir);
  });
  main.querySelector('#instalar').addEventListener('click', async () => {
    if (!pedidoInstalacao) return;
    pedidoInstalacao.prompt();
    await pedidoInstalacao.userChoice;
    pedidoInstalacao = null;
    main.querySelector('#instalar')?.setAttribute('hidden', '');
  });
}
