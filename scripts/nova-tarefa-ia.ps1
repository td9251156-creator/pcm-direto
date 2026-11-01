# Cria uma pasta de trabalho separada (git worktree) e um ramo para uma tarefa de IA, a partir da main atual.
# Assim a ferramenta trabalha sem mexer no que está aberto nesta pasta.
# Uso: powershell -File scripts/nova-tarefa-ia.ps1 -Ferramenta opencode -Tarefa testes-criticidade [-Base coord/ia-contribuicao]
param(
  [Parameter(Mandatory = $true)][ValidateSet('opencode', 'copilot', 'claude')][string]$Ferramenta,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]{3,40}$')][string]$Tarefa,
  # Ponto de partida: a main publicada (padrão) ou um ramo local ainda não publicado.
  [string]$Base = 'origin/main'
)
$ErrorActionPreference = 'Stop'
$raiz = (git rev-parse --show-toplevel).Trim()
$ramo = "ia/$Ferramenta/$Tarefa"
$pasta = Join-Path (Split-Path $raiz -Parent) "pcm-$Ferramenta-$Tarefa"
git -C $raiz fetch origin main
git -C $raiz worktree add -b $ramo $pasta $Base
Push-Location $pasta
try { npm ci } finally { Pop-Location }
Write-Host ""
Write-Host "Pronto. Pasta: $pasta  ·  Ramo: $ramo"
Write-Host "Abra essa pasta na ferramenta (ex.: cd `"$pasta`"; opencode) e cole o pedido da tarefa."
Write-Host "Ao terminar: npm run verificar  e  node scripts/conferir-entrega-ia.mjs"
Write-Host "Para apagar a pasta depois de integrar: git worktree remove `"$pasta`""
