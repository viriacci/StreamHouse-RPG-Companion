# StreamHouse local preview server. Windows PowerShell 5.1, no external runtimes.
# Binds ONLY to 127.0.0.1. GET/HEAD for public application resources.
param([int]$Port = 8765)
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$listener = $null
$selectedPort = 0

foreach ($candidate in $Port..($Port + 15)) {
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, [int]$candidate)
        $listener.Start()
        $selectedPort = $candidate
        break
    } catch [System.Net.Sockets.SocketException] {
        if ($listener) { $listener.Stop() }
        $listener = $null
    }
}
if (-not $listener) {
    Write-Error "All localhost ports from $Port to $($Port+15) are busy."
    exit 2
}

function Send-Response($stream, [int]$code, [string]$status, [string]$method, [string]$filepath, [string]$mime) {
    $length = [long]0
    if ($code -eq 200) { $length = (Get-Item -LiteralPath $filepath).Length }
    $header = "HTTP/1.1 $code $status`r`nContent-Type: $mime`r`nContent-Length: $length`r`nConnection: close`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`n`r`n"
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($bytes, 0, $bytes.Length)
    if ($method -eq 'GET' -and $code -eq 200) {
        $file = [System.IO.File]::OpenRead($filepath)
        try { $file.CopyTo($stream) } finally { $file.Dispose() }
    }
}

$mimeTypes = @{
    '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'
    '.mjs'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'
    '.json'='application/json; charset=utf-8'; '.svg'='image/svg+xml'
    '.webp'='image/webp'; '.png'='image/png'; '.jpg'='image/jpeg'
    '.jpeg'='image/jpeg'; '.gif'='image/gif'; '.ico'='image/x-icon'
    '.woff2'='font/woff2'; '.txt'='text/plain; charset=utf-8'
}

$url = "http://127.0.0.1:$selectedPort/"
Write-Host ""
Write-Host "StreamHouse RPG Companion / local preview" -ForegroundColor Yellow
Write-Host "Open: $url" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server."
try { Start-Process $url } catch { Write-Host "Open the address above in a browser." }

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 8000
            $client.SendTimeout = 15000
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            try {
                $request = $reader.ReadLine()
                if ([string]::IsNullOrWhiteSpace($request)) { continue }
                $parts = $request.Split(' ')
                if ($parts.Length -lt 2) { continue }
                $method = $parts[0].ToUpperInvariant()
                $raw = $parts[1]
                # Read the request headers; no POST/PUT bodies are accepted.
                for ($i = 0; $i -lt 100; $i++) {
                    $line = $reader.ReadLine()
                    if ([string]::IsNullOrEmpty($line)) { break }
                }
                if ($method -ne 'GET' -and $method -ne 'HEAD') {
                    Send-Response $stream 405 'Method Not Allowed' $method '' 'text/plain'
                    continue
                }
                $requested = [System.Uri]::UnescapeDataString(($raw -split '[?#]',2)[0])
                if (-not $requested.StartsWith('/')) {
                    Send-Response $stream 400 'Bad Request' $method '' 'text/plain'
                    continue
                }
                # Keep the preview server restricted to the application itself.
                if ($requested -match '^/(?:bundles|supabase|scripts|docs|tests)(?:/|$)' -or
                    $requested -match '/\.' -or $requested.Contains([string][char]0)) {
                    Send-Response $stream 403 'Forbidden' $method '' 'text/plain'
                    continue
                }
                if ($requested.EndsWith('/')) { $requested += 'index.html' }
                $relative = ($requested.Substring(1) -replace '/', [System.IO.Path]::DirectorySeparatorChar)
                $target = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
                if (-not $target.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
                    Send-Response $stream 403 'Forbidden' $method '' 'text/plain'
                    continue
                }
                $ext = [System.IO.Path]::GetExtension($target).ToLowerInvariant()
                if (-not $mimeTypes.ContainsKey($ext) -or -not [System.IO.File]::Exists($target)) {
                    Send-Response $stream 404 'Not Found' $method '' 'text/plain'
                    continue
                }
                Send-Response $stream 200 'OK' $method $target $mimeTypes[$ext]
            } finally { $reader.Dispose() }
        } catch {
            Write-Host "Request error: $($_.Exception.Message)" -ForegroundColor DarkYellow
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
