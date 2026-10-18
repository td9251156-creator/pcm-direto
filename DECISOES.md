# Decisões do projeto

## Nome
**PCM Direto** (nome definitivo). Antes da publicação, conferir disponibilidade no Registro.br e no INPI.

## Escopo do MVP
- Entrada: cadastro manual, colar do Excel e CSV.
- TAGs padronizadas e validação ao vivo.
- Biblioteca de 4 tipos de equipamento em um único JSON, com periodicidades genéricas.
- Plano preventivo, cronograma anual de carga balanceada e ficha de falha mínima.
- Saída: .xlsx (Leia-me, Resumo, Equipamentos, Plano, Cronograma, Ficha de Falha) e .docx de resumo.
- 4 telas (Início, Equipamentos, Revisão, Entrega), PWA instalável, rascunho no navegador.
- Fora do MVP: login, servidor, banco de dados, indicadores, normas e integração com outros sistemas.

## Tecnologia
HTML, CSS e JavaScript puro, sem framework. Vite só para rodar localmente e gerar a versão publicada.
Bibliotecas: ExcelJS (.xlsx) e docx (.docx), ambas MIT. Hospedagem no GitHub Pages, custo zero.

## Identidade visual
Paleta "Azul aço": azul #0B3D63 (topo, cabeçalhos, botões), laranja #B85C00 (foco do teclado),
aviso em amarelo #FFF4C2 e selo de segurança em vinho #7A0019. Cores centralizadas em src/marca.js.
Logo: quadrado azul #13304A, "PCM" em branco, barra e "DIRETO" em laranja #D97030 (public/icones/logo.svg),
letras em DejaVu Sans Bold convertidas em desenho.

## Licença
MIT — Copyright (c) 2026 Thiago Oliveira Lima. Uso, cópia e modificação livres, sem garantia.

## Governança
- Mantenedor único: Thiago Oliveira Lima, que decide o que entra no projeto.
- Mudanças por *pull request*, com lint e testes passando no GitHub Actions.
- Mudanças na biblioteca técnica precisam indicar a origem de cada tarefa.
- Contato público: pcmdireto@gmail.com.

## Riscos conhecidos
| Risco | Como tratamos |
|---|---|
| Periodicidades genéricas aplicadas sem validação | Aviso discreto no rodapé de todas as telas (decisão de 18/10/2026: sai o destaque amarelo para melhorar a leitura) e completo em todos os arquivos gerados; origem marcada em cada tarefa |
| Usuário afrouxar tarefa de segurança | Bloqueio no app: só aceita periodicidade igual ou mais frequente |
| Interpretação como garantia de conformidade | Nenhuma citação de norma sem fonte oficial; nenhuma promessa de conformidade |
| Perda do rascunho (limpeza do navegador) | Rascunho só no localStorage; orientar a baixar a planilha ao final |
| Dependências desatualizadas | Poucas dependências; revisar alertas do `npm audit` periodicamente |
| Planilha em versões antigas do Excel | Só funções clássicas (PROCV, ÍNDICE, CORRESP), sem macros nem matriz dinâmica |
