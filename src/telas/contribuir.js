import { esc } from '../ui.js';
import { CAMPOS_FEEDBACK, OPCOES_APOIO, novoFeedback, prepararFeedback } from '../logica/feedback.js';

const repositorio = 'https://github.com/td9251156-creator/pcm-direto';
// Rascunho só durante esta sessão. Não usa estado operacional, storage ou envio em segundo plano.
const respostas = novoFeedback();

export function telaContribuir(main) {
  main.innerHTML = `<header class="cabecalho-tela"><p class="sobretitulo">Projeto aberto · MIT</p><h2>Ajude a tornar o PCM mais simples</h2><p>Você pode contribuir com experiência de manutenção, documentação, testes ou código. Não precisa contratar serviço nem usar uma ferramenta de IA.</p></header>
    <section class="grade duas"><article class="cartao"><h3>Testar e contar como foi</h3><p>Explore o exemplo com dados fictícios e anote onde precisou de ajuda.</p><a class="botao" href="#feedback">Responder sobre minha experiência</a><p><a href="${repositorio}/issues/new?template=1-relatar-erro.yml">Relatar um erro</a></p></article>
    <article class="cartao"><h3>Melhorar uma orientação</h3><p>Conte qual explicação ou exemplo ajudaria a usar um modelo.</p><a href="${repositorio}/issues/new?template=3-sugerir-artigo.yml">Sugerir um artigo ou revisão</a></article>
    <article class="cartao"><h3>Propor conteúdo técnico</h3><p>Informe origem, versão e o que precisa de confirmação. Não envie manuais de terceiros sem autorização nem dados da fábrica.</p><a href="${repositorio}/issues/new?template=2-sugerir-tarefa.yml">Sugerir tarefa ou máquina</a></article>
    <article class="cartao"><h3>Contribuir com código</h3><p>Escolha uma tarefa, combine o escopo, implemente com testes e envie um pull request. A revisão vem antes da integração.</p><a href="${repositorio}/blob/main/CONTRIBUTING.md">Ler o guia de contribuição</a></article></section>
    <section class="cartao"><h3>Como a contribuição chega ao projeto</h3><ol><li>Escolha um problema ou tarefa e confira se já existe uma discussão.</li><li>Combine o resultado e o escopo com o mantenedor.</li><li>Prepare a contribuição com exemplos fictícios, indicando fontes quando houver conteúdo técnico.</li><li>O mantenedor revisa e pode pedir ajustes; somente uma contribuição aceita e integrada entra no produto.</li></ol><p>Ferramentas de IA são opcionais. Quem contribui precisa compreender e revisar o que entrega.</p><p><a href="${repositorio}/discussions">Conversar nas Discussões</a> · <a href="${repositorio}/blob/main/CODE_OF_CONDUCT.md">Código de Conduta</a></p></section>
    <section class="cartao"><h3>Prefere falar por e-mail?</h3><p><a href="mailto:pcmdireto@gmail.com">pcmdireto@gmail.com</a>. Não envie dados reais, backups ou credenciais. Para vulnerabilidades, use esse canal privado: não publique detalhes em issues ou no questionário.</p><a href="${repositorio}/blob/main/SECURITY.md">Política de segurança</a></section>`;
}

export function telaFeedback(main) {
  main.innerHTML = `<header class="cabecalho-tela"><p class="sobretitulo">Depois de experimentar</p><h2>Como foi usar o PCM Direto?</h2><p>Cinco perguntas para orientar as próximas melhorias. As respostas ficam apenas na memória ao navegar; recarregar ou fechar a página as descarta.</p></header>
    <section class="cartao"><p id="privacidade-feedback">Use exemplos fictícios. Não informe TAGs, nomes, registros reais da fábrica ou vulnerabilidades. Nenhum dado da sua base será incluído automaticamente.</p><form id="form-feedback" aria-describedby="privacidade-feedback">${CAMPOS_FEEDBACK.map((c,i)=>`<div><label for="feedback-${c.id}">${i+1}. ${esc(c.titulo)}${c.obrigatorio?' (obrigatório)':' (opcional)'}</label>${c.id==='apoio'?`<select name="${c.id}" id="feedback-${c.id}">${OPCOES_APOIO.map(o=>`<option>${esc(o)}</option>`).join('')}</select><p class="origem">Pergunta de interesse, sem cobrança nem compromisso.</p>`:`<textarea name="${c.id}" id="feedback-${c.id}" rows="3" maxlength="${c.limite}" ${c.obrigatorio?'required':''} aria-describedby="limite-${c.id}"></textarea><p class="origem" id="limite-${c.id}">Até ${c.limite} caracteres.</p>`}</div>`).join('')}
    <div class="acoes"><button type="button" id="copiar-feedback">Copiar respostas</button><a class="botao secundario" id="abrir-feedback-github" href="${repositorio}/issues/new?template=6-feedback-de-uso.yml" target="_blank" rel="noopener noreferrer">Abrir no GitHub com minhas respostas</a></div>
    <p class="origem">Ao abrir no GitHub, suas respostas serão encaminhadas para preencher o formulário. Confira o texto antes de publicar: a issue será pública. Esse caminho exige conta no GitHub.</p>
    <p id="status-feedback" role="status" aria-live="polite"></p><div id="resumo-feedback" hidden><label for="texto-feedback">Respostas para copiar e colar</label><textarea id="texto-feedback" rows="12" readonly></textarea></div></form></section>
    <section class="cartao"><h3>Sem conta no GitHub?</h3><p>Copie as respostas e envie pelo seu e-mail para <a href="mailto:pcmdireto@gmail.com">pcmdireto@gmail.com</a>. Nada é enviado automaticamente.</p><p><a href="#contribuir">Outras formas de contribuir</a> · <a href="${repositorio}/blob/main/SECURITY.md">Como relatar uma vulnerabilidade em privado</a></p></section>`;
  const form = main.querySelector('#form-feedback');
  const status = main.querySelector('#status-feedback');
  const resumo = main.querySelector('#resumo-feedback');
  const texto = main.querySelector('#texto-feedback');
  const github = main.querySelector('#abrir-feedback-github');
  const formularioVazio = github.href;
  let versao = 0;
  for (const c of CAMPOS_FEEDBACK) {
    const campo = form.elements[c.id]; campo.value = respostas[c.id];
    campo.addEventListener('input', () => { respostas[c.id] = campo.value; campo.setCustomValidity(''); versao++; resumo.hidden = true; texto.value = ''; status.textContent = ''; github.href = formularioVazio; });
  }
  form.addEventListener('submit', e => e.preventDefault());
  function preparar() {
    if (!form.reportValidity()) return null;
    try { return prepararFeedback(Object.fromEntries(CAMPOS_FEEDBACK.map(c => [c.id,form.elements[c.id].value]))); }
    catch (erro) { status.textContent = erro.message; form.elements.dificuldade.focus(); return null; }
  }
  function mostrarTexto(resultado) { resumo.hidden = false; texto.value = resultado.texto; }
  main.querySelector('#copiar-feedback').addEventListener('click', async () => {
    const resultado = preparar(); if (!resultado) return;
    mostrarTexto(resultado); const visita = versao;
    try { await navigator.clipboard.writeText(resultado.texto); if(form.isConnected && visita===versao)status.textContent = 'Respostas copiadas. Nenhuma mensagem foi enviada.'; }
    catch { if(form.isConnected && visita===versao){status.textContent = 'Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.';texto.focus();texto.select();} }
  });
  github.addEventListener('click', e => {
    const resultado = preparar(); if (!resultado) { e.preventDefault(); return; }
    e.currentTarget.href = resultado.url;
    mostrarTexto(resultado);
    status.textContent = resultado.preenchido ? 'O GitHub abrirá com suas respostas. A publicação precisa ser confirmada lá.' : 'As respostas excedem o tamanho do link. Copie o texto integral abaixo e cole no formulário que será aberto, sem preenchimento.';
  });
}
