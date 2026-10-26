import { esc } from '../ui.js';
import logoSvg from '../../public/icones/logo-horizontal-slogan.svg?raw';

/** Ficha somente dos campos escolhidos; não consulta o inventário nem o plano. */
export function htmlFichaModelo(dados, fonte, logo) {
  const tarefas = dados.tarefas || [];
  const detalhe = (rotulo, valor) => valor ? `<p><strong>${rotulo}:</strong> ${esc(valor)}</p>` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(dados.titulo)} · ficha PCM Direto</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:11pt/1.45 Arial,sans-serif;color:#0e1726;margin:0 auto;padding:24px;max-width:850px}header img{width:250px;max-width:100%;height:auto}h1{font-size:25pt;line-height:1.15}h2{font-size:14pt;margin:0 0 8px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:7px 0}.origem{font-size:9pt;color:#4a5668}.tarefa{border:1px solid #dde3ea;padding:14px;margin:14px 0;break-inside:avoid}.seguranca{color:#7a0019;font-weight:bold}.acoes{background:#edf3f7;padding:14px;margin-bottom:24px}button{font:inherit;padding:10px;margin:4px;cursor:pointer}footer{border-top:2px solid #b85c00;margin-top:22px;padding-top:12px;font-size:9pt}h1,h2{break-after:avoid;overflow-wrap:anywhere}@media print{body{padding:0;max-width:none}.acoes{display:none}header img{width:220px}}
    </style></head><body><div class="acoes"><p>Confira a ficha e escolha <strong>Salvar como PDF</strong> no destino da impressão.</p><button id="imprimir-ficha" type="button">Imprimir / salvar PDF</button><button id="fechar-ficha" type="button">Fechar ficha</button></div>
    <header><img src="${esc(logo)}" alt="PCM Direto — Manutenção planejada. Direto ao ponto."><p class="origem">MODELO DE REFERÊNCIA · MÁQUINAS E TAREFAS</p><h1>${esc(dados.titulo)}</h1><p class="origem">${esc(fonte)}</p></header>
    ${detalhe('Descrição', dados.descricao)}${detalhe('Fabricante', dados.fabricante)}${detalhe('Modelo', dados.modelo)}${detalhe('Características', dados.caracteristicas)}${detalhe('Contribuição', dados.apelido)}
    <p><strong>${tarefas.length} tarefas de referência.</strong> ${esc(dados.aviso || 'Confirme aplicabilidade, periodicidades e condições de execução com o manual do equipamento.')} Esta ficha não é um plano aprovado da sua fábrica.</p>
    ${tarefas.map((t, i) => `<section class="tarefa"><h2>${esc(t.id || 'Tarefa ' + (i + 1))}${t.seguranca ? ' <span class="seguranca">· SEGURANÇA</span>' : ''}</h2><p>${esc(t.descricao)}</p><p>${esc(t.periodicidade)} · ${esc(t.especialidade)} · ${esc(String(t.duracao_horas).replace('.', ','))} h por execução</p><p class="origem">Origem: ${esc(t.origem)} · Versão: ${esc(t.versao)}</p>${detalhe('Observação', t.observacao)}</section>`).join('')}
    <footer><p>O material apoia a organização do PCM e não substitui a avaliação de profissional habilitado nem o texto oficial das normas. As periodicidades são base genérica e devem ser confirmadas com o manual do fabricante.</p><p>PCM Direto · pcmdireto.me · MIT</p></footer></body></html>`;
}

export function abrirFichaModelo(dados, fonte) {
  // A aba de impressão não herda o controle offline da janela original.
  const logo = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoSvg);
  const html = htmlFichaModelo(dados, fonte, logo);
  const janela = window.open('about:blank', '_blank');
  if (!janela) throw new Error('Permita abrir a ficha em uma nova aba para imprimir ou salvar em PDF.');
  janela.opener = null;
  janela.document.open(); janela.document.write(html); janela.document.close();
  janela.document.getElementById('imprimir-ficha').onclick = () => janela.print();
  janela.document.getElementById('fechar-ficha').onclick = () => janela.close();
  return janela;
}
