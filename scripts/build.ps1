# Compila o Kuarq para Windows x64 (autocontido) em desktop\app.
#   .\scripts\build.ps1            -> compila em desktop\app
#   .\scripts\build.ps1 -Zip       -> também gera dist\Kuarq-<versao>-win-x64.zip
param(
  [switch]$Zip,
  [string]$Output = "desktop\app"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (Get-Process Kuarq -ErrorAction SilentlyContinue) {
  throw "Feche o Kuarq antes de compilar: os arquivos em uso não podem ser substituídos."
}

node scripts/check.mjs
if ($LASTEXITCODE -ne 0) { throw "As verificações falharam." }

dotnet publish desktop/Kuarq.Desktop.csproj -c Release -r win-x64 --self-contained true -o $Output
if ($LASTEXITCODE -ne 0) { throw "A compilação falhou." }

if ($Zip) {
  [xml]$project = Get-Content desktop/Kuarq.Desktop.csproj
  $version = $project.Project.PropertyGroup.Version | Where-Object { $_ } | Select-Object -First 1
  New-Item -ItemType Directory -Force dist | Out-Null
  $archive = "dist\Kuarq-$version-win-x64.zip"
  if (Test-Path $archive) { Remove-Item $archive }
  Compress-Archive -Path "$Output\*" -DestinationPath $archive
  Write-Host "Pacote gerado: $archive"
}
Write-Host "Kuarq compilado em $Output"
