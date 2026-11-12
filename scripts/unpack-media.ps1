# Recreates the original dice textures from GitHub bundles on Windows without Python.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$required = Join-Path $root 'rozgrywka\assets\premium-atlases.js'
$texture = Join-Path $root 'assets\emerald-d20-albedo.webp'
if ((Test-Path $required) -and (Test-Path $texture)) { exit 0 }
$pieces = @(Get-ChildItem (Join-Path $root 'bundles') -Filter 'media.part*' -File | Where-Object { $_.Name -match '^media\.part\d{3}$' } | Sort-Object Name)
if ($pieces.Count -lt 1) { throw 'Brak plikow bundles/media.part*. Pobierz pelna paczke v11.' }
$tmp = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString('N')+'.zip')
$stream = [IO.File]::Open($tmp,[IO.FileMode]::CreateNew)
try {
  foreach ($piece in $pieces) {
    $src = [IO.File]::OpenRead($piece.FullName)
    try { $src.CopyTo($stream) } finally { $src.Dispose() }
  }
} finally { $stream.Dispose() }
try {
  $expected = (Get-Content (Join-Path $root 'bundles\media.sha256') -Raw).Trim().Split()[0].ToLowerInvariant()
  $actual = (Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw 'Blad sumy SHA-256 archiwum z teksturami.' }
  Expand-Archive -LiteralPath $tmp -DestinationPath $root -Force
  if (-not ((Test-Path $required) -and (Test-Path $texture))) {throw 'Archiwum nie odtworzylo wszystkich plikow.'}
  Write-Host 'Zasoby graficzne odtworzone z repozytorium.' -ForegroundColor Green
} finally { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
