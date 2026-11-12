@echo off
setlocal EnableExtensions
title StreamHouse RPG Companion - start lokalny
pushd "%~dp0" || goto failed

if not exist "index.html" (
  echo BLAD: Nie znaleziono plikow projektu. Rozpakuj CALY ZIP do jednego folderu.
  goto failed
)
if not exist "assets\emerald-d20-albedo.webp" goto media
if not exist "rozgrywka\assets\premium-atlases.js" goto media
goto start

:media
echo Brakuje tekstur. Probuje przywrocic je z archiwum GitHub...
if not exist "scripts\unpack-media.ps1" goto missing_media
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\unpack-media.ps1"
if errorlevel 1 goto missing_media
goto start

:missing_media
echo BLAD: Brakuje tekstur. Pobierz pelna paczke v11.1 i rozpakuj ja ponownie.
goto failed

:start
echo.
echo ===========================================
echo   StreamHouse RPG Companion - wersja 11.1

echo ===========================================
echo Serwer uruchomi strone w przegladarce.
echo Zatrzymanie: Ctrl+C lub zamkniecie tego okna.
echo.

rem Najpierw sprobuj kompletnego interpretera, nie samego polecenia/aliasu.
where py.exe >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import http.server" >nul 2>nul
  if not errorlevel 1 goto use_py
)
where python.exe >nul 2>nul
if not errorlevel 1 (
  python -c "import http.server" >nul 2>nul
  if not errorlevel 1 goto use_python
)
where node.exe >nul 2>nul
if not errorlevel 1 goto use_node

goto use_powershell

:use_py
py -3 -u "scripts\start-local.py"
if not errorlevel 1 goto stopped
echo Python launcher zakonczyl prace z bledem. Sprawdzam alternatywe...
goto use_powershell

:use_python
python -u "scripts\start-local.py"
if not errorlevel 1 goto stopped
echo Python zakonczyl prace z bledem. Sprawdzam alternatywe...
goto use_powershell

:use_node
node "scripts\start-local.mjs"
if not errorlevel 1 goto stopped
echo Node.js zakonczyl prace z bledem. Sprawdzam alternatywe...
goto use_powershell

:use_powershell
if not exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" goto missing_runtime
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "scripts\start-local.ps1"
if not errorlevel 1 goto stopped
echo Wbudowany serwer PowerShell zakonczyl prace z bledem.
goto failed

:missing_runtime
echo BLAD: Brak Pythona, Node.js i Windows PowerShell.
echo Wymagany jest Windows 10/11 lub Python 3.
goto failed

:stopped
echo.
echo Serwer zostal zatrzymany.
pause
popd
exit /b 0

:failed
echo.
echo Uruchomienie nie powiodlo sie. Komunikat bledu zostal powyzej.
echo Jesli to blad Windows, zrob zrzut calego tego okna.
pause
popd
exit /b 1
