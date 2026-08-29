Set-Location "$PSScriptRoot"

Start-Process powershell -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-File","$PSScriptRoot\subir-api.ps1"
Start-Process powershell -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-File","$PSScriptRoot\subir-frontend.ps1"

Write-Host "API abrira em: http://localhost:5180/swagger" -ForegroundColor Green
Write-Host "Frontend abrira em: http://localhost:8000/login.html" -ForegroundColor Green