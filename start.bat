@echo off
title TikTok Stickers Studio - Local Server
echo ========================================================
echo   TikTok Stickers Studio (qbox.re DA)
echo   Lancement du serveur local pour tester le site...
echo ========================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python detecte. Demarrage sur http://localhost:8080 ...
    start http://localhost:8080
    python -m http.server 8080
    goto end
)

where npx >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node/npx detecte. Demarrage sur http://localhost:8080 ...
    start http://localhost:8080
    npx serve . -p 8080
    goto end
)

echo [INFO] Utilisation du serveur PowerShell natif Windows...
start http://localhost:8080
powershell -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8080/'); $listener.Start(); Write-Host 'Serveur actif sur http://localhost:8080 - Appuyez sur Ctrl+C pour quitter.'; while($listener.IsListening){ $context = $listener.GetContext(); $rel = $context.Request.Url.LocalPath.TrimStart('/'); if([string]::IsNullOrEmpty($rel)){ $rel = 'index.html' }; $path = Join-Path (Get-Location) $rel; if(Test-Path $path -PathType Leaf){ $bytes = [System.IO.File]::ReadAllBytes($path); $context.Response.ContentLength64 = $bytes.Length; if($path.EndsWith('.html')){$context.Response.ContentType='text/html; charset=utf-8'}elseif($path.EndsWith('.js') -or $path.EndsWith('.mjs')){$context.Response.ContentType='application/javascript'}elseif($path.EndsWith('.css')){$context.Response.ContentType='text/css'} $context.Response.OutputStream.Write($bytes, 0, $bytes.Length) }else{ $context.Response.StatusCode = 404 }; $context.Response.Close() }"

:end
pause

