param([string]$Entrada='../Templates-Refeitos-Recebidos',[string]$Saida='artifacts/refeitos/office')
$ErrorActionPreference='Stop'
$inputRoot=(Resolve-Path -LiteralPath $Entrada).Path
[void](New-Item -ItemType Directory -Force -Path $Saida)
$outputRoot=(Resolve-Path -LiteralPath $Saida).Path
$excel=$null;$word=$null;$linksAnterior=$null;$result=@()
try {
 $excel=New-Object -ComObject Excel.Application
 $excel.Visible=$false;$excel.DisplayAlerts=$false;$excel.AutomationSecurity=3;$excel.AskToUpdateLinks=$false
 foreach($file in Get-ChildItem -LiteralPath $inputRoot -Filter '*.xlsx'){
  $wb=$null
  try {
   $wb=$excel.Workbooks.Open($file.FullName,0,$true);$excel.CalculateFullRebuild();$errors=@()
   foreach($ws in $wb.Worksheets){try{$cells=$ws.Cells.SpecialCells(-4123,16);foreach($c in $cells){$errors+=($ws.Name+'!'+$c.Address()+':'+$c.Text)}}catch{}}
   $visible=@($wb.Worksheets | Where-Object {$_.Visible -eq -1});$sheet=$visible[0]
   $sheet.ExportAsFixedFormat(0,(Join-Path $outputRoot ($file.BaseName+'.pdf')),0,$true,$false,1,1)
   $result+=@{arquivo=$file.Name;erros=$errors;abas=$wb.Worksheets.Count;resultado=if($errors.Count){'REVISAR'}else{'OK'}}
   Write-Output ($file.Name+': '+$errors.Count+' erros de fórmula')
  }finally{if($wb){$wb.Close($false);[void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($wb)}}
 }
 $excel.Quit();[void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel);$excel=$null
 $word=New-Object -ComObject Word.Application
 $word.Visible=$false;$word.DisplayAlerts=0;$word.AutomationSecurity=3;$linksAnterior=$word.Options.UpdateLinksAtOpen;$word.Options.UpdateLinksAtOpen=$false
 foreach($file in Get-ChildItem -LiteralPath $inputRoot -Filter '*.docx'){
  $doc=$null
  try{$doc=$word.Documents.Open($file.FullName,$false,$true,$false);$doc.ExportAsFixedFormat((Join-Path $outputRoot ($file.BaseName+'.pdf')),17);$result+=@{arquivo=$file.Name;paginas=$doc.ComputeStatistics(2);resultado='RENDERIZADO'};Write-Output ('Word: '+$file.Name)}
  finally{if($doc){$doc.Close(0);[void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc)}}
 }
}finally{
 if($excel){$excel.Quit();[void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel)}
 if($word){if($null -ne $linksAnterior){$word.Options.UpdateLinksAtOpen=$linksAnterior};$word.Quit();[void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)}
}
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $outputRoot 'VERIFICACAO-OFFICE.json') -Encoding utf8
