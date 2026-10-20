// Ajudantes pequenos para montar as telas.
import { armazenamento } from './estado.js';

export function atualizarAvisoArmazenamento() {
  const aviso = document.getElementById('aviso-armazenamento');
  if (aviso) aviso.hidden = Object.values(armazenamento).every(Boolean);
}

/** Protege texto antes de colocar no HTML (evita que um texto colado vire código). */
export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Formata número no padrão brasileiro: 474,5 */
export function num(n, casas = 1) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

/** Baixa um arquivo gerado no navegador. */
export function baixar(conteudo, nome, tipo) {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Mensagem curta para leitores de tela e para quem está olhando. */
export function avisar(texto) {
  atualizarAvisoArmazenamento();
  const area = document.getElementById('mensagens');
  if (!area) return;
  area.textContent = texto;
}
