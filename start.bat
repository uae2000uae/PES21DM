@echo off
rem PES 2021 Option Studio - start the local site and open it in the browser
cd /d "%~dp0"
if not exist ".env" if exist ".env.example" copy ".env.example" ".env" >nul
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
start "" http://localhost:8080
%PY% server.py
pause
