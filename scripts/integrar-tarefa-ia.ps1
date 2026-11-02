# Confere e prepara a integração da tarefa de um agente (pasta em "PCM Direto\agentes\<tipo>-<tarefa>").
# 1) grava num commit o que o agente deixou sem commit; 2) conferidor com o perfil do ramo; 3) validador de propostas
# (máquinas) ou npm run verificar (código); 4) mostra o resumo. Com -AbrirPR, envia o ramo e abre o PR (nunca faz merge).
# Uso (na pasta app): powershell -File scripts/integrar-tarefa-ia.ps1 -Tarefa maquinas-redutor-sew-r [-AbrirPR]
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z]+-[a-z0-9-]{3,40}$')][string]$Tarefa,
  [switch]$AbrirPR
)
$ErrorActionPreference = 'Stop'
$raiz = (git rev-parse --show-toplevel).Trim()
$pasta = Join-Path (Join-Path (Split-Path $raiz -Parent) 'agentes') $Tarefa
if (-not (Test-Path $pasta)) { throw "Pasta não encontrada: $pasta" }
$ramo = (git -C $pasta branch --show-current).Trim()
$tipo = ($ramo -split '/')[1]
Write-Host "Tarefa: $Tarefa · ramo $ramo"

# 1) O que ficou sem commit vira um commit da entrega (os arquivos ignorados, como .env, nunca entram).
$pendentes = git -C $pasta status --porcelain
if ($pendentes) {
  Write-Host "Gravando o que ficou sem commit:"; $pendentes | ForEach-Object { Write-Host "  $_" }
  git -C $pasta add -A
  git -C $pasta -c user.name="Agente $tipo" -c user.email="agente@local" commit -q -m "Entrega da tarefa $Tarefa ($ramo)"
}
if (-not (git -C $pasta log --oneline "origin/main..HEAD")) { throw 'O ramo não tem nada novo em relação à main.' }

# 2) Conferidor (perfil do ramo); usa o script da própria pasta app, sempre o mais recente.
Push-Location $pasta
try {
  node (Join-Path $raiz 'scripts/conferir-entrega-ia.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Conferência com bloqueios. Corrija na pasta do agente e rode de novo.' }
  # 3) Validação conforme o tipo.
  if ($tipo -eq 'maquinas') {
    $propostas = git diff --name-only origin/main...HEAD -- 'propostas-maquinas/*.json'
    foreach ($p in $propostas) { node scripts/validar-proposta-maquinas.mjs $p; if ($LASTEXITCODE -ne 0) { throw "Proposta com erros: $p" } }
  } elseif ($tipo -ne 'divulgacao') {
    if (-not (Test-Path 'node_modules')) { npm ci }
    npm run verificar
    if ($LASTEXITCODE -ne 0) { throw 'npm run verificar falhou. Corrija antes de integrar.' }
  }
  Write-Host ""
  Write-Host "Pronto para integrar: $ramo"
  if ($AbrirPR) {
    git push -u origin $ramo
    gh pr create --base main --head $ramo --title "Entrega $Tarefa" --body "Entrega do agente ($tipo), conferida por scripts/integrar-tarefa-ia.ps1. Revisão do coordenador antes do merge."
  } else {
    Write-Host "Para abrir o PR: rode de novo com -AbrirPR (o merge continua sendo seu, depois da revisão)."
  }
} finally { Pop-Location }
