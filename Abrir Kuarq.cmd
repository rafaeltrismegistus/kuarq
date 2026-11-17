@echo off
setlocal
set "APP=%~dp0desktop\app\Kuarq.exe"
if not exist "%APP%" set "APP=%~dp0desktop\app\Toolkit.exe"
if not exist "%APP%" (
  echo Compile o Kuarq conforme o README.
  pause
  exit /b 1
)
start "" "%APP%"
