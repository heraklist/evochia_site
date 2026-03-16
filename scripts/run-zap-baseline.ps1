param(
  [string]$Target = $(if ($env:ZAP_TARGET_URL) { $env:ZAP_TARGET_URL } else { "https://www.evochia.gr" })
)

$ErrorActionPreference = "Stop"

$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCommand) {
  $fallbackDockerPath = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
  if (Test-Path $fallbackDockerPath) {
    $dockerCommand = Get-Item $fallbackDockerPath
  }
}

if (-not $dockerCommand) {
  throw "Docker is required for the ZAP baseline scan. Install Docker Desktop first."
}

$dockerExe = if ($dockerCommand.Source) { $dockerCommand.Source } elseif ($dockerCommand.FullName) { $dockerCommand.FullName } else { [string]$dockerCommand }
$dockerBinDir = Split-Path -Parent $dockerExe
if ($dockerBinDir -and -not $env:Path.Split(';').Contains($dockerBinDir)) {
  $env:Path = "$dockerBinDir;$env:Path"
}
$reportDir = Join-Path $PSScriptRoot "..\.reports\zap"
$resolvedReportDir = [System.IO.Path]::GetFullPath($reportDir)
New-Item -ItemType Directory -Force -Path $resolvedReportDir | Out-Null
Remove-Item (Join-Path $resolvedReportDir "zap-report.json") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $resolvedReportDir "zap-report.html") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $resolvedReportDir "zap-report.md") -ErrorAction SilentlyContinue

$dockerArgs = @(
  "run",
  "--rm",
  "-t",
  "-v", "$($resolvedReportDir):/zap/wrk",
  "ghcr.io/zaproxy/zaproxy:stable",
  "zap-baseline.py",
  "-t", $Target,
  "-J", "zap-report.json",
  "-r", "zap-report.html",
  "-w", "zap-report.md",
  "-m", "5"
)

& $dockerExe @dockerArgs

if ($LASTEXITCODE -ne 0) {
  throw "ZAP baseline failed with exit code $LASTEXITCODE."
}
