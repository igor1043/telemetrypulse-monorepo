$ErrorActionPreference = 'Stop'

$repo = Resolve-Path (Join-Path $PSScriptRoot '..')
$backend = Join-Path $repo 'scripts\start-backend.ps1'
$frontend = Join-Path $repo 'scripts\start-frontend.ps1'

Start-Process -FilePath powershell.exe -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $backend)
Start-Sleep -Seconds 8
Start-Process -FilePath powershell.exe -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $frontend)

Write-Host 'Backend:  http://localhost:8080'
Write-Host 'Frontend: http://localhost:4200'
