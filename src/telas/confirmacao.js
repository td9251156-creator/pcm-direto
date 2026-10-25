import { esc } from '../ui.js';
import { dataExibida } from '../logica/consulta-execucao.js';

export function confirmarCancelamento(registro){
  const anterior=document.activeElement;
  const dialogo=document.createElement('dialog');
  dialogo.className='confirmacao-acao';dialogo.dataset.dialogoApp='';
  dialogo.setAttribute('role','alertdialog');dialogo.setAttribute('aria-labelledby','titulo-confirmacao');dialogo.setAttribute('aria-describedby','descricao-confirmacao');
  dialogo.innerHTML=`<h2 id="titulo-confirmacao">Cancelar esta execução?</h2><p><strong>${esc(registro.tag)}</strong> · realizada em ${dataExibida(registro.data)}</p><p>${esc(registro.descricao)}</p><p id="descricao-confirmacao">O registro será mantido no histórico como cancelado. Confira a execução selecionada antes de continuar.</p><form method="dialog" class="acoes"><button value="voltar" class="secundario" autofocus>Voltar</button><button value="confirmar" class="perigo">Cancelar execução</button></form>`;
  document.body.append(dialogo);
  return new Promise(resolve=>{
    dialogo.addEventListener('close',()=>{
      const confirmou=dialogo.returnValue==='confirmar';dialogo.remove();
      if(anterior?.isConnected)anterior.focus();
      resolve(confirmou);
    },{once:true});
    dialogo.showModal();dialogo.querySelector('[value=voltar]').focus();
  });
}
