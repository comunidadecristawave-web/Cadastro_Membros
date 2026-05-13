Set-Location "$PSScriptRoot"

$dotnetPath = "C:\Program Files\dotnet\dotnet.exe"
if (-not (Test-Path $dotnetPath)) {
  Write-Host "dotnet nao encontrado em: $dotnetPath" -ForegroundColor Red
  Write-Host "Instale .NET SDK 8 e tente novamente." -ForegroundColor Yellow
  exit 1
}

Write-Host "Subindo API em http://localhost:5180 ..." -ForegroundColor Cyan
& $dotnetPath run --project "src/CadastroMembros.Api/CadastroMembros.Api.csproj" --urls "http://localhost:5180"