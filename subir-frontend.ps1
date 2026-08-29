Set-Location "$PSScriptRoot"

Write-Host "Subindo Frontend em http://localhost:8000 ..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\subir-frontend-ps.ps1" -Port 8000