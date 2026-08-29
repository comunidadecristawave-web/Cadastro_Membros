param(
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'frontend'

if (-not (Test-Path $root)) {
  Write-Host "Pasta nao encontrada: $root" -ForegroundColor Red
  exit 1
}

$listener = New-Object System.Net.HttpListener
$prefixes = @(
  "http://localhost:$Port/",
  "http://127.0.0.1:$Port/"
)

foreach ($prefix in $prefixes) {
  $listener.Prefixes.Add($prefix)
}
$listener.Start()

Write-Host "Frontend ativo em: $($prefixes -join ' | ')" -ForegroundColor Green
Write-Host "Pressione Ctrl+C para parar." -ForegroundColor Yellow

function Get-ContentType([string]$path) {
  switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8' }
    '.css'  { 'text/css; charset=utf-8' }
    '.js'   { 'application/javascript; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.svg'  { 'image/svg+xml' }
    '.png'  { 'image/png' }
    '.jpg'  { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.ico'  { 'image/x-icon' }
    '.txt'  { 'text/plain; charset=utf-8' }
    default { 'application/octet-stream' }
  }
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    try {
      $urlPath = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($urlPath -eq '/') { $urlPath = '/index.html' }

      $relativePath = $urlPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
      $fullPath = [IO.Path]::GetFullPath((Join-Path $root $relativePath))
      $safeRoot = [IO.Path]::GetFullPath($root)

      if (-not $fullPath.StartsWith($safeRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
        $bytes = [Text.Encoding]::UTF8.GetBytes('403 - Forbidden')
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
      }

      if (-not (Test-Path $fullPath -PathType Leaf)) {
        $res.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes('404 - Not Found')
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
      }

      $fileBytes = [IO.File]::ReadAllBytes($fullPath)
      $res.StatusCode = 200
      $res.ContentType = Get-ContentType $fullPath
      $res.ContentLength64 = $fileBytes.Length
      $res.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
      $res.Close()
    } catch {
      $res.StatusCode = 500
      $bytes = [Text.Encoding]::UTF8.GetBytes('500 - Internal Server Error')
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
    }
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
