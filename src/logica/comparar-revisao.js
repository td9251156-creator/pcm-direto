const chave=t=>`${t.equipamentoId}|${t.tarefaId}`;
const campos=['tag','descricao','periodicidade','duracaoHoras','especialidade','seguranca','observacao','origem','versao'];

/** Compara retratos por ID; mudança de TAG não vira remoção e inclusão. */
export function compararTarefas(anterior,atual,responsaveisAntes={},responsaveisDepois={}){
  const antes=new Map(anterior.filter(t=>t.ativa).map(t=>[chave(t),t]));
  const depois=new Map(atual.filter(t=>t.ativa).map(t=>[chave(t),t]));
  return [...new Set([...antes.keys(),...depois.keys()])].flatMap(id=>{
    const a=antes.get(id);const b=depois.get(id);
    const responsavelAntes=responsaveisAntes[id]||'';const responsavelDepois=responsaveisDepois[id]||'';
    if(a&&b&&campos.every(c=>a[c]===b[c])&&responsavelAntes===responsavelDepois)return [];
    return [{id,antes:a,depois:b,responsavelAntes,responsavelDepois,situacao:!a?'Incluída':!b?'Retirada':'Alterada'}];
  });
}

/** Horas somente das ocorrências afetadas, na mesma vigência da prévia. */
export function cargaAfetada(substituidas,adicionadas){
  const carga=new Map();
  for(const [lista,campo] of [[substituidas,'antes'],[adicionadas,'depois']])for(const o of lista){
    const item=carga.get(o.especialidade)||{especialidade:o.especialidade,antes:0,depois:0};
    item[campo]+=o.horas;carga.set(o.especialidade,item);
  }
  return [...carga.values()].sort((a,b)=>a.especialidade.localeCompare(b.especialidade,'pt-BR'));
}
