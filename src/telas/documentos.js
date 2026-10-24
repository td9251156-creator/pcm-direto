import JSZip from 'jszip';
import { estado,salvar } from '../estado.js';
import { prepararEmissao,preencherXlsx,preencherDocx } from '../saida/pcmd.js';
import { MODELOS_DOCUMENTAIS } from './comunidade.js';
import { telaEntrega } from './entrega.js';
import { novoId } from '../logica/entrada.js';
import { textoData } from '../logica/cronograma.js';
import { esc,baixar,avisar } from '../ui.js';

export function telaDocumentos(main){
  const revisao=estado.programacao.revisoes.at(-1);const hoje=textoData(new Date());
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Documentos PCMD</p><h2>Seu PCM, documentado.</h2><p>Os seis modelos usam o mesmo retrato dos dados e a mesma data de corte. As partes não preenchidas dos arquivos originais são preservadas.</p></header><section class="cartao"><h3>Preparar emissão</h3>${revisao?`<p>Revisão de plano ${revisao.numero} · vigência ${esc(revisao.vigencia)}.</p>`:'<p><a href="#planejar">Ative uma revisão do plano</a> para gerar documentos preenchidos. Os modelos em branco continuam no <a href="#comunidade">Banco de modelos</a>.</p>'}<form id="emissao-pcmd"><div class="grade duas"><div><label for="data-corte">Data de corte dos registros</label><input id="data-corte" name="dataCorte" type="date" value="${hoje}" max="${hoje}" required></div><div><label for="emissao-elaborador">Elaborado por</label><input id="emissao-elaborador" name="elaborador" value="${esc(revisao?.elaborador??'')}" maxlength="120" required></div></div><label><input name="aprovado" type="checkbox" id="emissao-aprovada"> Estes documentos já foram efetivamente aprovados pelo responsável</label><label for="emissao-aprovador">Aprovador</label><input id="emissao-aprovador" name="aprovador" maxlength="120" disabled><p class="origem">Sem aprovação, a situação será “Em elaboração” e o aprovador ficará “A definir”.</p><button ${revisao?'':'disabled'} id="gerar-pcmd">Gerar pacote PCMD completo (.zip)</button><p id="progresso-pcmd" role="status"></p></form></section><section class="grade duas">${MODELOS_DOCUMENTAIS.map(([c,n,d,a,ext])=>`<article class="cartao"><p class="sobretitulo">${c} · ${ext.toUpperCase()}</p><h3>${n}</h3><p>${d}</p><a href="./modelos/${a}.${ext}" download>Baixar modelo em branco</a></article>`).join('')}</section><details class="cartao"><summary>Outros formatos · exportações anteriores</summary><div id="formatos-anteriores"></div></details><section class="cartao"><h3>Após gerar</h3><p>Extraia o ZIP. Abra as planilhas no Excel ou LibreOffice e recalcule as fórmulas. Confira impressão, pendências e campos “A definir” antes de usar ou aprovar. As periodicidades devem ser confirmadas com o manual do fabricante.</p><a href="#apoio">Ler o guia dos modelos PCMD</a></section>`;
  const legados=main.querySelector('#formatos-anteriores');telaEntrega(legados);for(const h of legados.querySelectorAll('h3'))if(h.textContent==='Seus modelos PCMD')h.closest('section').remove();
  const form=main.querySelector('#emissao-pcmd');form.elements.aprovado.onchange=()=>{form.elements.aprovador.disabled=!form.elements.aprovado.checked;form.elements.aprovador.required=form.elements.aprovado.checked;};
  form.onsubmit=async e=>{e.preventDefault();const b=main.querySelector('#gerar-pcmd');if(b.disabled)return;b.disabled=true;const progresso=main.querySelector('#progresso-pcmd');try{
    const fd=new FormData(form);const emissao=prepararEmissao(estado,{dataCorte:fd.get('dataCorte'),elaborador:fd.get('elaborador'),aprovador:fd.get('aprovador')??'',aprovado:fd.has('aprovado')});
    const zip=new JSZip();
    for(let i=0;i<MODELOS_DOCUMENTAIS.length;i++){
      const [codigo,,,arquivo,ext]=MODELOS_DOCUMENTAIS[i];progresso.textContent=`Gerando ${codigo} · ${i+1} de 6…`;
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const resposta=await fetch(`./modelos/${arquivo}.${ext}`);if(!resposta.ok)throw new Error(`Modelo ${codigo} indisponível. Aguarde o carregamento offline ou tente conectado.`);
      const bytes=await resposta.arrayBuffer();const saida=ext==='xlsx'?await preencherXlsx(bytes,`${arquivo}.${ext}`,emissao):await preencherDocx(bytes,emissao);
      zip.file(`${arquivo}-Preenchido.${ext}`,saida);
    }
    zip.file('LEIA-ME.txt',`PCM Direto · modelos 1.0.0\nPlano revisão ${emissao.revisao.numero}\nData de corte: ${emissao.meta.dataCorte}\nSituação: ${emissao.meta.situacao}\nRecalcule as fórmulas no Excel (Ctrl+Alt+F9) ou LibreOffice (Ctrl+Shift+F9). Confira os campos A definir, a impressão e as pendências.\nAs periodicidades são base genérica a validar com manual do fabricante.\nAs chaves técnicas do PCMD-03/04 incluem revisão para preservar diferentes versões da mesma tarefa.\n`);
    const conteudo=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    if(estado.programacao.revisoes.some(r=>r.id===emissao.revisao.id)){
      estado.programacao.emissoes.push(...MODELOS_DOCUMENTAIS.map(([modelo])=>({id:novoId(),modelo,versaoModelo:'1.0.0',revisaoId:emissao.revisao.id,dataCorte:emissao.meta.dataCorte})));
      await salvar();
    }
    baixar(conteudo,`pcm-direto-pacote-${emissao.meta.dataCorte}.zip`,'application/zip');progresso.textContent='Pacote gerado. Confira os arquivos e recalcule as fórmulas antes de usar.';avisar('Pacote PCMD preparado para download.');
  }catch(erro){progresso.textContent=erro.message;avisar(erro.message);}finally{b.disabled=false;}};
}
