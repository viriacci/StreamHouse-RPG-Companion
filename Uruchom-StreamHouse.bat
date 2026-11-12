@echo off
setlocal
cd /d "%~dp0"
title StreamHouse RPG Companion v11 - serwer lokalny
if not exist "assets\emerald-d20-albedo.webp" goto restore
if not exist "rozgrywka\assets\premium-atlases.js" goto restore
goto launch
:restore
echo Przywracanie obrazow i tekstur z paczek GitHub...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\unpack-media.ps1"
if errorlevel 1 goto error
:launch
where py >nul 2>nul
if not errorlevel 1 (py -3 "scripts\start-local.py" & goto end)
where python >nul 2>nul
if not errorlevel 1 (python "scripts\start-local.py" & goto end)
where node >nul 2>nul
if not errorlevel 1 (node "scripts\start-local.mjs" & goto end)
echo.
echo Brak Pythona lub Node.js. Do lokalnego uruchomienia potrzebny jest jeden z nich.
echo https://www.python.org/downloads/
goto error
:error
echo.
echo Start nie powiodl sie. Sprawdz komunikat powyzej.
pause
:end
endlocal
