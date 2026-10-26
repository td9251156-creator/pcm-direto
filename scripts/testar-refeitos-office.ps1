param([string]$Entrada='public/modelos',[string]$Saida='artifacts/refeitos/CENARIOS-EXCEL.json')
$ErrorActionPreference='Stop';$root=(Resolve-Path -LiteralPath $Entrada).Path;$result=@();$excel=$null
function Check($label,$actual,$expected){$ok=if($expected -is [string]){[string]$actual -eq $expected}else{[math]::Abs([double]$actual-[double]$expected)-lt 0.000001};$script:result+=@{cenario=$label;esperado=$expected;recebido=$actual;ok=$ok};Write-Output ("$label : $ok")}
try{
 $excel=New-Object -ComObject Excel.Application;$excel.Visible=$false;$excel.DisplayAlerts=$false;$excel.AutomationSecurity=3;$excel.AskToUpdateLinks=$false
 foreach($code in @('02','03-04','07','K03','K04','K06')){
  $file=Get-ChildItem -LiteralPath $root -Filter "PCMD-$code-*.xlsx" | Select-Object -First 1;$wb=$null
  try{
   $wb=$excel.Workbooks.Open($file.FullName,0,$true)
   switch($code){
    '02'{
     $ws=$wb.Worksheets.Item('Ativos');$ws.Range('A4').Value2='UTL-MOT-001';$ws.Range('B4').Value2='Motor fictício';$ws.Range('C4').Value2='motor_eletrico';$ws.Range('G4').Value2='UTL';$ws.Range('H4').Value2=1
     $wb.Worksheets.Item('Cadastros').Range('A23').Value2='UTL';foreach($col in @('J','K','L','M','N')){$ws.Range($col+'4').Value2=1};$ws.Range('J4').Value2=3
     $excel.CalculateFullRebuild();Check 'Criticidade: segurança 3 gera A' $ws.Range('Q4').Value2 'A';Check 'Criticidade: soma das notas' $ws.Range('P4').Value2 7
     $ws.Range('J4').Value2=3.5;$excel.CalculateFullRebuild();Check 'Criticidade: nota fracionária fica pendente' $ws.Range('Q4').Value2 'Pendente'
    }
    '03-04'{
     $pl=$wb.Worksheets.Item('Plano Mestre');foreach($kv in @{A4='UTL-MOT-001';B4='MOT-01';D4='Atividade fictícia';E4='base genérica a validar com manual do fabricante';F4='0.1';G4='Mensal';H4='Não';I4='Mensal';K4='Mecânica';N4='Sim'}.GetEnumerator()){$pl.Range($kv.Key).Value2=$kv.Value};$pl.Range('L4').Value2=1
     $cr=$wb.Worksheets.Item('Cronograma');$cr.Range('C7').Value2=2026;$oc=$wb.Worksheets.Item('Ocorrências');$oc.Range('A4').Value2='UTL-MOT-001';$oc.Range('B4').Value2='MOT-01';$oc.Range('C4').Value2=46027
     $excel.CalculateFullRebuild();Check 'Plano: frequência mensal' $pl.Range('J4').Value2 12;Check 'Ocorrência válida conta uma vez' $oc.Range('O4').Value2 1
     $oc.Range('A5').Value2='UTL-MOT-001';$oc.Range('B5').Value2='MOT-01';$oc.Range('C5').Value2=46027;$excel.CalculateFullRebuild();Check 'Ocorrência duplicada não conta novamente' $oc.Range('O5').Value2 0
     $ex=$wb.Worksheets.Item('Execuções');$ex.Range('A4').Value2='UTL-MOT-001';$ex.Range('B4').Value2='MOT-01';$ex.Range('E4').Value2=46027;$ex.Range('F4').Value2=46028;$ex.Range('J4').Value2='app';$ex.Range('K4').Value2='Não';$excel.CalculateFullRebuild();Check 'Execução vinculada conclui a previsão' $oc.Range('Q4').Value2 1
     $ex.Range('K4').Value2='Sim';$excel.CalculateFullRebuild();Check 'Cancelada sai da contagem' $oc.Range('Q4').Value2 0
    }
    '07'{
     $ws=$wb.Worksheets.Item('Indicadores');foreach($kv in @{A4=46023;B4=100;C4=2;D4=10;E4=10;F4=8}.GetEnumerator()){$ws.Range($kv.Key).Value2=[double]$kv.Value};$excel.CalculateFullRebuild()
     Check 'Indicadores: MTBF' $ws.Range('H4').Value2 45;Check 'Indicadores: MTTR' $ws.Range('I4').Value2 5;Check 'Indicadores: disponibilidade' $ws.Range('J4').Value2 0.9;Check 'Indicadores: aderência' $ws.Range('K4').Value2 0.8
     $ws.Range('D4').Value2=-1;$excel.CalculateFullRebuild();Check 'Indicadores: negativo bloqueia resultado' $ws.Range('J4').Text ''
    }
    'K03'{
     $ws=$wb.Worksheets.Item('Checklist Diário');$ws.Range('D10').Value2='X';$ws.Range('E10').Value2='X';$excel.CalculateFullRebuild();Check 'Checklist: dupla marcação gera erro' ($ws.Range('H10').Text.StartsWith('ERRO')) $true
    }
    'K04'{
     $it=$wb.Worksheets.Item('Itens');$it.Range('A4').Value2='PECA-TESTE';$it.Range('B4').Value2='Peça fictícia';$it.Range('F4').Value2=5;$it.Range('G4').Value2=10
     $mo=$wb.Worksheets.Item('Movimenta');$mo.Range('A4').Value2=46023;$mo.Range('B4').Value2='Entrada';$mo.Range('C4').Value2='PECA-TESTE';$mo.Range('E4').Value2=8;$mo.Range('A5').Value2=46023;$mo.Range('B5').Value2='Saída';$mo.Range('C5').Value2='PECA-TESTE';$mo.Range('E5').Value2=3
     $excel.CalculateFullRebuild();Check 'Estoque: entrada menos saída' $it.Range('H4').Value2 5;Check 'Estoque: saldo vezes custo' $it.Range('I4').Value2 50
    }
    'K06'{
     $wb.Worksheets.Item('Listas').Range('A4').Value2='AT-TESTE';$pr=$wb.Worksheets.Item('Apontamento de Produção')
     $pr.Range('A4').Value2='AT-TESTE';$pr.Range('B4').Value2=46023;$pr.Range('C4').Value2=10;$pr.Range('D4').Value2=8;$pr.Range('E4').Value2=90;$pr.Range('F4').Value2=100;$pr.Range('G4').Value2=81
     $excel.CalculateFullRebuild();$kpi=$wb.Worksheets.Item('KPIs por Ativo');Check 'OEE: disponibilidade operacional' $kpi.Range('I4').Value2 0.8;Check 'OEE: produto dos componentes' $kpi.Range('L4').Value2 0.648
     $pr.Range('D4').Value2=11;$excel.CalculateFullRebuild();Check 'Produção: tempo impossível gera erro' ($pr.Range('I4').Text.StartsWith('ERRO')) $true
    }
   }
  }finally{if($wb){$wb.Close($false);[void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($wb)}}
 }
}finally{if($excel){$excel.Quit();[void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel)}}
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $Saida -Encoding utf8
if(@($result | Where-Object {-not $_.ok}).Count){exit 1}
