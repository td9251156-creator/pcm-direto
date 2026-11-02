# Cria a pasta de trabalho de um agente (git worktree) em "PCM Direto\agentes\", com um ramo próprio a partir da main.
# A pasta "app" fica só para o desenvolvimento original e a integração; nenhum agente trabalha nela.
# Tipos e áreas permitidas (o conferidor bloqueia o resto):
#   maquinas   -> ramo ia/maquinas/<tarefa>   · só propostas-maquinas/   (agente banco-maquinas do Copilot)
#   divulgacao -> ramo ia/divulgacao/<tarefa> · só divulgacao/           (agente redes-sociais do Copilot)
#   opencode | copilot | claude -> ramo ia/<tipo>/<tarefa> · código, exceto arquivos protegidos
# Uso: powershell -File scripts/nova-tarefa-ia.ps1 -Tipo maquinas -Tarefa redutor-sew-r [-Base origin/main]
param(
  [Parameter(Mandatory = $true)][ValidateSet('maquinas', 'divulgacao', 'opencode', 'copilot', 'claude')][Alias('Ferramenta')][string]$Tipo,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]{3,40}$')][string]$Tarefa,
  # Ponto de partida: a main publicada (padrão) ou um ramo local ainda não publicado.
  [string]$Base = 'origin/main'
)
$ErrorActionPreference = 'Stop'
$raiz = (git rev-parse --show-toplevel).Trim()
$ramo = "ia/$Tipo/$Tarefa"
$agentes = Join-Path (Split-Path $raiz -Parent) 'agentes'
$pasta = Join-Path $agentes "$Tipo-$Tarefa"
if (Test-Path $pasta) { throw "A pasta $pasta já existe. Use outro nome de tarefa ou integre/limpe a anterior." }
New-Item -ItemType Directory -Force $agentes | Out-Null
$leiame = Join-Path $agentes 'LEIA-ME.txt'
if (-not (Test-Path $leiame)) {
  Set-Content -Encoding utf8 $leiame "Pastas de trabalho dos agentes de IA do PCM Direto (uma por tarefa).`r`nCriadas por app\scripts\nova-tarefa-ia.ps1; integradas por app\scripts\integrar-tarefa-ia.ps1; limpas por app\scripts\limpar-tarefas-ia.ps1.`r`nNão edite a pasta app a partir daqui. Guia: app\docs\CONTRIBUIR-COM-IA.md"
}
git -C $raiz fetch origin main
git -C $raiz worktree add -b $ramo $pasta $Base
# Agentes de conteúdo só precisam do Node para o validador; os de código precisam das dependências.
if ($Tipo -notin @('maquinas', 'divulgacao')) { Push-Location $pasta; try { npm ci } finally { Pop-Location } }
$agente = @{ maquinas = 'banco-maquinas'; divulgacao = 'redes-sociais' }[$Tipo]
Write-Host ""
Write-Host "Pronto. Pasta: $pasta"
Write-Host "Ramo: $ramo"
if ($agente) { Write-Host "Abra essa pasta no VS Code e use o agente $agente no chat do Copilot." }
else { Write-Host "Abra essa pasta na ferramenta (ex.: cd `"$pasta`"; opencode) e cole o pedido da tarefa." }
Write-Host "Ao terminar, na pasta app: powershell -File scripts/integrar-tarefa-ia.ps1 -Tarefa $Tipo-$Tarefa"
