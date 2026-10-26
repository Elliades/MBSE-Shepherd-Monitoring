# OMF-ISAE plugin, install without administrator rights.
# Copies the plugin archive that sits next to this script into the user's own
# Cameo folder. Nothing is written outside %LOCALAPPDATA%.
#
# Usage (from the folder that holds this script and the plugin .zip):
#   powershell -ExecutionPolicy Bypass -File .\install-plugin.ps1
#   powershell -ExecutionPolicy Bypass -File .\install-plugin.ps1 -Version 2026x

param(
  [string]$Version = '2026x'
)

$ErrorActionPreference = 'Stop'

# The newest plugin archive next to this script (1.1.1 today: no edit needed for the next version).
$Archive = Get-ChildItem -LiteralPath $PSScriptRoot -Filter 'com.elliades.isae.mbseShepherd_*.zip' |
  Sort-Object Name | Select-Object -Last 1
if (-not $Archive) {
  throw "No plugin archive (com.elliades.isae.mbseShepherd_*.zip) found next to this script in $PSScriptRoot"
}

$Target = Join-Path $env:LOCALAPPDATA ".magic.systems.of.systems.architect\$Version"
New-Item -ItemType Directory -Force -Path $Target | Out-Null

Write-Host "Plugin archive: $($Archive.Name)"
Write-Host "Target folder:  $Target"

# The archive holds data\, plugins\ and profiles\: they go straight into the target folder.
Expand-Archive -LiteralPath $Archive.FullName -DestinationPath $Target -Force

$Installed = Join-Path $Target 'plugins\com.elliades.isae.mbseShepherd'
if (-not (Test-Path -LiteralPath $Installed)) {
  throw "Extraction finished but $Installed is missing. The archive may be damaged: download it again."
}

Write-Host ''
Write-Host 'Plugin installed.' -ForegroundColor Green
Write-Host 'Start Cameo (MagicDraw) now. The plugin is loaded at startup.'
Write-Host ''
Read-Host 'Press Enter to close this window'
