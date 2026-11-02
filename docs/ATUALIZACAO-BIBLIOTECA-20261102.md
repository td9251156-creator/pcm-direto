# Biblioteca recebida — integração de 02/11/2026

Pacote `Biblioteca-PCM-v2.zip`: 20 documentos originais (19 modelos e um procedimento de indicadores). Dez planilhas mudaram; os outros dez documentos, incluindo todos os Word, são idênticos aos anteriores. Os bytes recebidos foram preservados sem regravar os originais.

A coleção passa de `biblioteca-pcm-v2.0.1` para `biblioteca-pcm-v2.0.2`. A revisão documental **R00** foi mantida conforme os arquivos enviados; versão do pacote e revisão de documento são coisas distintas. Os modelos continuam em desenvolvimento. A identidade dos arquivos está no manifesto do app, com hashes, tamanhos, abas, tabelas e campos obtidos do XML.

## O que foi integrado

- **002:** novas posições do Plano F:R. ID e segurança explícitos, classificação da origem e versão; pessoa responsável em N. Componente, tipo, executante e parada somente quando conhecidos na biblioteca congelada da revisão. Nunca usar especialidade como executante. AUTONOMA não é convertida para uma opção inexistente na lista. A origem textual genérica é classificada como Outra; a referência completa permanece na revisão/backups do app e não é exportada automaticamente nessa coluna de classificação. Referências documentais continuam no fluxo do 001.
- **004:** horas executadas e origem do registro separadas de horas estimadas/restantes; observação em P. Estimativa não vira apontamento real. Uma OS de fora não é eliminada pelo prefixo APP-. Horas apontadas reimportadas só complementam um registro local com ID e TAG correspondentes; status, datas e cancelamento continuam sob controle da operação local. Uma antiga programação já encerrada não reaparece como OS pendente.
- **008:** colunas próprias de horas de parada e reparo. Conclusão conhecida sem hora é preservada como data, com estilo só data. O leitor reconhece esse formato sem fabricar meia-noite, preserva horários ocultos por formatação e aceita planilhas anteriores sem as colunas novas. Zero, ausência e falha aberta continuam distintos.
- **011:** E = quantidade de reparos completos e F = horas desses reparos; MTTR em M = F/E. G:J recebem preventiva planejada/feita e horas de corretiva/preventiva. Duas falhas com um reparo completo de quatro horas resultam em divisor um e MTTR de quatro horas, não duas.
- **012:** número da OS preservado nos lançamentos. A nova tabela de orçamento por setor não é importada como se fosse outra fonte de lançamentos nem somada à grade anual. O contrato existente continua sendo orçamento geral; não há novo módulo de orçamento por setor.
- **003, 005, 006, 009 e 014:** layout e estruturas recebidos preservados; o app continua preenchendo apenas cadastros nesses documentos, sem inventar programação, execução de checklist ou ocorrências de turno.

A importação aceita os cabeçalhos antigos e novos de 004/008/012. Campos adicionais são opcionais em bases e backups existentes. Reimportação compara a chave e o conteúdo; não apaga registros ausentes do arquivo.

No Mensal, o procedimento anterior das falhas locais é preservado integralmente: duração sem hora de início pertence ao mês do registro; falha aberta com início conhecido usa o trecho provisório até a referência; conclusão sem hora não é convertida em um fim conhecido. Esses dados não são reescritos. Os tratamentos novos abaixo são restritos às falhas importadas do arquivo 008: intervalos completos prevalecem sobre durações avulsas. Quando só há duração sem limites precisos atravessando meses, não se inventa rateio da indisponibilidade; o aviso não invalida reparos completos de outras falhas. Falhas abertas não contam como reparos completos apenas por terem horas preenchidas.

O dashboard de Confiabilidade mantém seu contrato de união/recorte de intervalos com data e hora completas. Durações avulsas ficam fora desse somatório, com aviso e encaminhamento ao Mensal; data sem hora não vira um intervalo de zero horas.

## Evidências e reprodução

- `python3 scripts/conferir-biblioteca-recebida.py pacote.zip`: é específico deste pacote 2.0.2 e confere os 20 arquivos, por nome e SHA-256; sem alterações por padrão. `--aplicar` copia os bytes e regenera o manifesto; não altera o conteúdo dos documentos. Recusa sobrescrever um manifesto posterior a 2.0.2; não usar como importador genérico de revisões futuras.
- `node scripts/gerar-carga-biblioteca.mjs`: gera a carga da versão 2.0.2 em desenvolvimento. A carga é apenas um arquivo local; não foi executada no Supabase de produção.
- Testes de geração abrangem mais de 100 linhas, fórmulas/referências, preservação de mídia, metadados e tabelas. Casos específicos verificam MTTR, datas sem hora, durações ausentes/zero, formatos antigos e reimportação sem duplicação.
- Conferência estrutural do pacote não encontrou VBA nem vínculos externos `xl/externalLinks`, nem as funções modernas verificadas (LET, FILTER, UNIQUE, SORT, SORTBY, XLOOKUP, LAMBDA, SEQUENCE e `_xlfn`). Isso não comprova recálculo correto no editor.

## Pendências de conferência humana

1. Abrir os originais e os gerados no Excel/LibreOffice, recalcular, conferir impressão, listas e proteção. Os testes de XML não substituem essa conferência.
2. **002:** as validações recebidas G21:G29 e H21:H29 não cobrem G30/H30. Os originais foram mantidos exatamente como enviados; a integração não corrige a lista silenciosamente. Conferir esse limite e seu efeito na expansão antes da aprovação documental.
3. **012:** a fórmula recebida de realizado no orçamento por setor usa critérios com curinga prefixado (`*`), podendo casar sufixos (por exemplo, A e BA). Conferir a intenção no Excel antes de usar a consolidação; essa tabela não entra no cálculo operacional do app.
4. Conferir o conteúdo técnico das atividades padrão e dos novos checklists. Preservar uma referência não equivale a validar tarefa, periodicidade ou conformidade.

Nenhuma alteração no banco online, publicação ou migração de dados operacionais foi feita nesta entrega.
