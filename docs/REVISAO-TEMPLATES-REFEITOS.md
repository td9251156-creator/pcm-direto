# Revisão dos modelos refeitos — integração local

## Resultado

Os 18 arquivos do PCMD-refeitos.zip estão no banco de documentos local, separados por finalidade,
com busca, download individual, ZIP original e prévias PDF. Os originais permanecem intactos em
Templates-Refeitos-Recebidos, com os hashes SHA256 registrados no manifesto do aplicativo.
As versões e funções anteriores não foram apagadas. Não houve publicação, push ou integração à main.

## Preenchimento pelo aplicativo

Na Entrega, o novo pacote gera cinco arquivos parcialmente preenchidos:

- PCMD-01: organização, elaborador, dados de emissão e situação dos documentos realmente emitidos.
- PCMD-02: ativos, fabricantes, modelos, setores e tipos da biblioteca atual.
- PCMD-03-04: tarefas, referências, segurança, frequências, datas previstas e últimas marcações existentes.
- PCMD-W1 e W2: metadados, ativos e tarefas nos anexos, preservando a estrutura dos manuais.

As últimas marcações do aplicativo não possuem vínculo explícito com uma ocorrência prevista:
são exportadas como legado, sem fabricar esse vínculo nem contar como conclusão da previsão.
Criticidade, responsáveis pelas tarefas, estratégia, metas e aprovação não são presumidos.
Os documentos ficam Em elaboração, com os dados ausentes vazios ou A definir.

Os outros 13 arquivos seguem intactos na pasta preenchimento-manual do pacote. Os controles
separados e o CMMS não sincronizam entre si. Use uma única fonte de registro para cada operação.

Os limites do modelo são respeitados: 300 ativos, 2000 tarefas, 5000 ocorrências, 3000 execuções,
30 setores/tipos/especialidades. Excesso gera mensagem e interrompe a emissão; nenhum registro é truncado.
A área de impressão das tabelas preenchidas acompanha os dados; a capacidade original das tabelas permanece.

## Evidências

- 16 planilhas recebidas: abertas e recalculadas no Excel, sem erros de fórmula.
- Dois manuais recebidos: renderizados no Word, com as três páginas de cada documento conferidas visualmente.
- 19 cenários no Excel: criticidade e nota fracionária, duplicidade de ocorrência, vínculo/cancelamento,
  indicadores, dupla marcação de checklist, estoque e OEE, incluindo tempo de produção impossível.
- Três planilhas geradas pelo navegador: recalculadas no Excel sem erros de fórmula.
- Dois manuais preenchidos: renderizados no Word, textos, tabelas e anexos conferidos visualmente.
- Navegador isolado: download dos 18 editáveis e 18 PDFs, busca, celular, ZIP com cinco preenchidos
  e 13 manuais idênticos aos originais. Fórmulas, proteção e mídia preservadas nas cópias preenchidas.

As prévias das planilhas mostram a primeira página da aba inicial; não são uma conferência de impressão
integral de todas as abas e registros. Uso no Excel antigo, em aparelhos reais e revisão técnica humana
independente permanecem fora da evidência desta rodada. Nenhuma conformidade normativa é prometida.

## Reproduzir a importação local

1. Preservar os arquivos recebidos em Templates-Refeitos-Recebidos.
2. Executar scripts/conferir-refeitos-office.ps1 (Excel e Word instalados).
3. Executar scripts/importar-refeitos.py com o Python configurado no ambiente.
4. Executar testes/modelos-refeitos.test.js, scripts/verificar-refeitos-navegador.mjs e a regressão do aplicativo.
5. Conferir os arquivos reais gerados no Excel e Word antes de autorizar a publicação.

## Verificações do aplicativo nesta rodada

Lint e build aprovados. A regressão completa no navegador aprovou geração offline do pacote dos
18 modelos, além dos fluxos anteriores de importação, checklist, backup e recuperação.
A suíte com prazo de 60 segundos por teste aprovou 155 de 156 testes. A falha restante é a mesma
limitação preexistente: agentes-ia.test.js tenta criar symlink no Windows e recebe EPERM. Nenhum
teste foi desativado. Com o prazo padrão de 5 segundos, o carregamento inicial do ExcelJS também
pode exceder o limite nesta máquina. Os testes específicos da integração passaram.

## Atualização da Entrega: seleção de documentos

O padrão agora é Essencial (cinco parcialmente preenchidos). Completo mantém os 18 arquivos; Escolher permite uma seleção individual, mantendo a ordem do catálogo e rejeitando seleção vazia ou desconhecida. Somente arquivos selecionados entram no ZIP. Uma seleção inteiramente manual dispensa equipamentos e elaborador; os arquivos permanecem idênticos aos originais. Os preenchedores e fórmulas não foram alterados nesta etapa.

Identificação e seleção ficam somente em memória durante a navegação. A geração continua protegida contra envio duplicado ao trocar de tela. Recarregar limpa esse rascunho. O script scripts/verificar-entrega-lean.mjs confere ZIPs reais, persistência temporária, bloqueios e larguras de 320 a 1366 px. Nesta atualização, 157 de 158 testes unitários passaram no prazo padrão; a única falha é o symlink EPERM preexistente no Windows.


## Integração à versão atual do GitHub — 26/10/2026

O mantenedor autorizou integrar e publicar preservando as funcionalidades existentes. Os 18 arquivos foram isolados em public/modelos/refeitos; não substituem os seis documentos de gestão nem os seus contratos e exemplos. O preenchimento adicional usa o rascunho e informa essa origem na interface. Para revisão ativa, execuções, falhas e aprovação explícita permanece a emissão de Documentos. A evidência anterior de Excel/Word refere-se ao mesmo conteúdo e preenchedores; a integração foi conferida por hashes e geração no navegador. O teste Windows de symlink já foi resolvido pela base atual: todos os 239 testes passaram nesta integração.
