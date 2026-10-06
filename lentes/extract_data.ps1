if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
    Install-Module -Name ImportExcel -Force -Scope CurrentUser
}
Import-Module ImportExcel
$path = 'c:\Users\munch\Desktop\optica_ocular\lentes\base_precificacao_lentes_auditada.xlsx'

# Get sheet names
$sheets = Get-ExcelSheetInfo -Path $path
Write-Host "=== SHEETS ==="
$sheets | ForEach-Object { Write-Host $_.Name }

# Read each sheet
foreach ($sheet in $sheets) {
    Write-Host "`n=== SHEET: $($sheet.Name) ==="
    $data = Import-Excel -Path $path -WorksheetName $sheet.Name
    $data | ConvertTo-Json -Depth 5
}
