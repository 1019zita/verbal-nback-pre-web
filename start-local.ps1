param([int]$Port = 8766)
$ErrorActionPreference = 'Stop'
$taskPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) { $taskPython = (Get-Command python -ErrorAction Stop).Source }
Write-Host "Open http://127.0.0.1:$Port/ in your browser. Press Ctrl+C here to stop."
& $taskPython (Join-Path $PSScriptRoot 'scripts\serve.py') --port $Port
