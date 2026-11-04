# Kit visual PCM Direto

16 slides PNG em 1080×1350 e quatro PDFs LinkedIn de quatro páginas, um por tema. Não há pessoas, empresas ou dados operacionais reais. A marca e as fontes locais foram carregadas na exportação; o conteúdo não apresentou corte no tamanho de saída.

| Tema | Arquivos | Destino |
|---|---|---|
| OS | tema-1-slide-1.png até tema-1-slide-4.png | https://pcmdireto.me/modelos/pcm-man-004/ |
| Semana | tema-2-slide-1.png até tema-2-slide-4.png | https://pcmdireto.me/modelos/pcm-man-003/ |
| Falhas | tema-3-slide-1.png até tema-3-slide-4.png | https://pcmdireto.me/modelos/pcm-man-008/ |
| Plano | tema-4-slide-1.png até tema-4-slide-4.png | https://pcmdireto.me/modelos/pcm-man-002/ |

Publique na ordem 1→4 dentro de cada tema. Use a legenda correspondente em `../conjuntos-iniciais.md` e os textos de `TEXTOS-ALTERNATIVOS.md`. Ajuste o link do perfil antes de usar uma chamada “no perfil”. A prévia reúne os quatro guias editoriais. Confira a página de destino antes da postagem; a validação humana dos materiais permanece separada.

As imagens não são postagens enviadas, e os roteiros de gravação não são vídeos prontos. Não altere a marca nem acrescente promessas de conformidade ou resultados garantidos. Código, conteúdo e créditos do projeto: LICENSE e CREDITOS.md no repositório; identidade PCM Direto preservada.

Para regenerar, prepare o Chromium conforme `docs/TESTES-NAVEGADOR.md` e execute `node scripts/exportar-divulgacao.mjs`. O script renderiza o HTML local de carrosséis e não usa conta das redes. Para um ZIP com imagens, legendas, perfis e medição: `node scripts/empacotar-divulgacao.mjs`.

Para o formato Documento do LinkedIn, use `tema-1-linkedin.pdf` até `tema-4-linkedin.pdf`. Cada PDF tem quatro páginas com texto; não são prévias dos modelos de manutenção. Os PNGs continuam sendo a opção para o carrossel do Instagram.
