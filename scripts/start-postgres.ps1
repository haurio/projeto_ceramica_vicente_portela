# Reinicia o serviço PostgreSQL (precisa de admin).
# Se falhar com "could not find postgres program executable", o Windows Application Control
# (WDAC/Device Guard) está bloqueando C:\Program Files\PostgreSQL\18\bin\postgres.exe
# por não ser assinado. Nesse caso: liberar o executável na política da empresa ou
# reiniciar o PC e iniciar o serviço antes de qualquer bloqueio.

$ErrorActionPreference = 'Stop'
$serviceName = 'postgresql-x64-18'

Write-Host "Status atual:" (Get-Service $serviceName).Status
Restart-Service $serviceName -Force
Start-Sleep -Seconds 3
$status = (Get-Service $serviceName).Status
Write-Host "Novo status:" $status

if ($status -ne 'Running') {
    Write-Host "Falha ao iniciar. Veja o Event Viewer > Application (fonte PostgreSQL)."
    exit 1
}

$env:PGPASSWORD = $env:DB_PASSWORD
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = 'Brazil_2026' }
$env:PGSSLMODE = 'disable'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h 127.0.0.1 -U postgres -d portela -c 'SELECT 1 AS ok;'
