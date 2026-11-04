import { MODELOS_V2 } from '../dados/modelos-v2.js';
import { esc } from '../ui.js';

// Orientação de uso do arquivo; não acrescenta tarefas, periodicidades ou aprovação técnica.
export function ligarOrientacaoModelos(lista) {
  lista.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-como-usar]');
    if (!botao) return;
    const modelo = MODELOS_V2.find(m => m.codigo === botao.dataset.comoUsar);
    if (!modelo) return;
    const dialogo = document.createElement('dialog');
    dialogo.className = 'orientacao-modelo'; dialogo.dataset.dialogoApp = '';
    dialogo.setAttribute('aria-labelledby', 'titulo-orientacao-modelo');
    dialogo.setAttribute('aria-describedby', 'finalidade-orientacao-modelo');
    dialogo.innerHTML = `<p class="sobretitulo">${esc(modelo.codigo)} · ${esc(modelo.formato)} · ${esc(modelo.revisao)}</p><h2 id="titulo-orientacao-modelo">Como usar ${esc(modelo.titulo)}</h2><p id="finalidade-orientacao-modelo">${esc(modelo.quando)}</p><h3>O que contém</h3><p>${esc(modelo.abas.join(', ') || 'Documento Word com estrutura para preencher e revisar.')}</p><h3>Seu primeiro passo</h3><ol><li>${modelo.formato === 'Excel' ? 'Leia a aba Leia-me e confira os cadastros necessários.' : 'Leia o documento e identifique os campos que sua equipe precisa preencher.'}</li><li>Teste o preenchimento com dados fictícios, sem informações da sua fábrica.</li><li>Confira os dados${modelo.formato === 'Excel' ? ', recalcule as fórmulas' : ''} e revise a impressão antes de aplicar.</li></ol><p class="origem">Modelo em desenvolvimento. Baixar ou gerar não significa aprovação. Tarefas e periodicidades precisam da avaliação responsável e do manual do fabricante.</p><div class="acoes"><a class="botao" href="${esc(modelo.url)}" download>Baixar ${esc(modelo.titulo)} em ${modelo.formato}</a><form method="dialog"><button class="secundario" autofocus>Fechar orientações</button></form></div>`;
    document.body.append(dialogo);
    dialogo.addEventListener('keydown', evento => {
      if (evento.key !== 'Tab') return;
      const controles = [...dialogo.querySelectorAll('a[href], button:not(:disabled)')];
      const destino = evento.shiftKey ? controles.at(-1) : controles[0];
      if (document.activeElement === (evento.shiftKey ? controles[0] : controles.at(-1))) { evento.preventDefault(); destino.focus(); }
    });
    dialogo.addEventListener('close', () => { dialogo.remove(); if (botao.isConnected) botao.focus(); }, { once: true });
    dialogo.showModal();
    dialogo.querySelector('button').focus();
  });
}
