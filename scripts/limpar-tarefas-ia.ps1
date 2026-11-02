# Lista as pastas de agentes e remove só as já integradas na main e sem nada pendente. Sem -Confirmar, apenas simula.
# Nunca apaga pasta com alteração sem commit nem ramo com commits fora da main.
# Uso (na pasta app): powershell -File scripts/limpar-tarefas-ia.ps1 [-Confirmar]
param([switch]$Confirmar)
$ErrorActionPreference = 'Stop'
$raiz = (git rev-parse --show-toplevel).Trim()
$agentes = (Join-Path (Split-Path $raiz -Parent) 'agentes').Replace('\', '/')
git -C $raiz fetch -q origin main
$linhas = git -C $raiz worktree list --porcelain
$atual = $null; $pastas = @()
foreach ($l in $linhas) {
  if ($l -like 'worktree *') { $atual = @{ pasta = $l.Substring(9) } ; $pastas += $atual }
  elseif ($l -like 'branch refs/heads/*') { $atual.ramo = $l.Substring(18) }
}
foreach ($w in $pastas) {
  if ($w.pasta -eq $raiz.Replace('\', '/')) { continue }
  $dentro = $w.pasta.StartsWith($agentes)
  $pendente = (git -C $w.pasta status --porcelain | Measure-Object).Count
  $fora = if ($w.ramo) { [int](git -C $raiz rev-list --count "origin/main..$($w.ramo)") } else { 0 }
  $situacao = if ($pendente) { "$pendente alteração(ões) sem commit" } elseif ($fora) { "$fora commit(s) ainda não integrado(s)" } else { 'integrada' }
  $marca = if (-not $dentro) { ' (pasta antiga, fora de agentes\)' } else { '' }
  Write-Host "$($w.pasta) · $($w.ramo) · $situacao$marca"
  if ($situacao -eq 'integrada' -and $dentro) {
    if ($Confirmar) { git -C $raiz worktree remove $w.pasta; git -C $raiz branch -d $w.ramo | Out-Null; Write-Host '  removida (o ramo estava integrado).' }
    else { Write-Host '  seria removida (rode com -Confirmar).' }
  }
}
git -C $raiz worktree prune
