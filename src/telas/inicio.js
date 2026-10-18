// Tela 1: Início
import biblioteca from '../dados/biblioteca.json';
import { estado, limpar, carregarExemplo } from '../estado.js';
import { esc, avisar } from '../ui.js';

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
      <h2>Plano de manutenção preventiva a partir da sua lista de equipamentos</h2>
      <ol>
        <li><strong>Equipamentos:</strong> cadastre, cole do Excel ou importe um CSV. A TAG sai padronizada.</li>
        <li><strong>Revisão:</strong> confira as tarefas e periodicidades de cada equipamento.</li>
        <li><strong>Entrega:</strong> baixe a planilha (.xlsx) com plano, cronograma e ficha de falha, e o resumo (.docx).</li>
      </ol>
      <p>
        Rascunho atual: <strong>${n} equipamento${n === 1 ? '' : 's'}</strong>
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
      <ul>${biblioteca.tipos.map((t) => `<li>${esc(t.nome)} (${esc(t.sigla)}) — ${t.tarefas.length} tarefas</li>`).join('')}</ul>
      <p class="origem">${esc(biblioteca.nome)}, versão ${esc(biblioteca.versao)} (${esc(biblioteca.data)}). ${esc(biblioteca.aviso)}</p>
    </section>

    <section class="cartao">
      <h3>Seus dados</h3>
      <p>Tudo é feito neste navegador. Nenhum dado é enviado para servidor. O rascunho fica salvo aqui mesmo,
      então limpar os dados do navegador apaga a lista: ao terminar, baixe a planilha.</p>
    </section>
  `;

  main.querySelector('#ir-equipamentos').addEventListener('click', () => ir('equipamentos'));
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
