<#
.SYNOPSIS
  Register this repo with the Cursor Cloud Agent worker (My Machines).

.DESCRIPTION
  Adds mbse-shepherd to homelab/start-cursor-agent-worker.ps1 and starts
  `agent worker ... start` as Quatermaster-mbse-shepherd.

.EXAMPLE
  .\scripts\install-agent-worker.ps1
#>
[CmdletBinding()]
param(
    [string]$HomelabScript = 'C:\Users\Quatermaster\homelab\start-cursor-agent-worker.ps1',
    [string]$RepoRoot = ''
)

$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) {
    $RepoRoot = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { 'C:\workspace\mbse-shepherd' }
}
$RepoRoot = (Resolve-Path $RepoRoot).Path
$slug = 'mbse-shepherd'
$entry = "@{ Slug = '$slug'; Path = '$RepoRoot' }"

if (-not (Test-Path $HomelabScript)) {
    throw "Missing homelab worker script: $HomelabScript`nRun: irm 'https://cursor.com/install?win32=true' | iex`nThen create homelab/start-cursor-agent-worker.ps1"
}

$content = Get-Content -Raw -Encoding UTF8 $HomelabScript
if ($content -notmatch [regex]::Escape($RepoRoot)) {
    $content = $content -replace '(\s*\@\{ Slug = ''mbse-shepard-monitoring''[^\}]+\}\s*\r?\n)(\s*\@\{ Slug = ''omf-private'')', "`$1    $entry`r`n`$2"
    if ($content -notmatch [regex]::Escape($RepoRoot)) {
        $content = $content -replace '(\s*\@\{ Slug = ''risu-ai''[^\}]+\}\s*\r?\n)(\))', "`$1    $entry`r`n`$2"
    }
    Set-Content -Path $HomelabScript -Value $content -Encoding UTF8 -NoNewline
    Write-Host "Added $slug to $HomelabScript" -ForegroundColor Green
} else {
    Write-Host "Already listed in $HomelabScript" -ForegroundColor DarkGray
}

$autostart = Join-Path (Split-Path $HomelabScript -Parent) 'install-cursor-agent-autostart.ps1'
if (Test-Path $autostart) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $autostart
} else {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $HomelabScript
}

Write-Host ""
Write-Host "In Cursor: Agents -> environment -> My Machines -> Quatermaster-mbse-shepherd" -ForegroundColor Cyan
Write-Host "Slack/GitHub: worker=Quatermaster-mbse-shepherd" -ForegroundColor DarkGray
