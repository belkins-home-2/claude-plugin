@echo off
rem bh2 for Windows: cmd and PowerShell run this, Git Bash runs bin/bh2. The same lookup as bin/bh2:
rem BH2_CLI, else cli\cli.ts beside this bin\.
setlocal
set "plugin=%~dp0.."
if defined BH2_CLI (set "cli=%BH2_CLI%") else (set "cli=%plugin%\cli\cli.ts")
if exist "%cli%" goto node
echo bh2: no command at "%cli%" 1>&2
echo hint: install the plugin again (README.md), or set BH2_CLI to cli.ts 1>&2
exit /b 2

:node
where node >nul 2>nul
if not errorlevel 1 goto version
echo bh2: Node is not installed 1>&2
echo hint: bh2 runs on Node 22.18 or newer - winget install OpenJS.NodeJS.LTS 1>&2
exit /b 2

:version
for /f "tokens=1,2 delims=." %%a in ('node -v') do (set "major=%%a" & set "minor=%%b")
set "major=%major:v=%"
if %major% GTR 22 goto run
if %major% EQU 22 if %minor% GEQ 18 goto run
echo bh2: Node v%major%.%minor% is too old 1>&2
echo hint: bh2 is TypeScript run as it is; Node 22.18 or newer strips the types 1>&2
exit /b 2

:run
node --disable-warning=ExperimentalWarning "%cli%" %*
exit /b %errorlevel%
