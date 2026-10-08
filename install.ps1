# Sets up bh2 for Belkins Home 2.0 on Windows, with no WSL. In PowerShell:
#
#   irm https://raw.githubusercontent.com/belkins-home-2/claude-plugin/main/install.ps1 | iex
#
# Installs what is missing (Node 22.18+, Git, Claude Code), then the plugin, puts bh2 on the PATH,
# copies the work folder to ~\work\belkins-home-2 (~\bh2-work when that folder holds other files)
# and, in a console, connects bh2 through a link to approve in Belkins Home. Every step checks
# first, so running it again only finishes what is left.
$ErrorActionPreference = 'Stop'

$Marketplace = Join-Path $HOME '.claude\plugins\marketplaces\belkins-home-2'

function Step($text) { Write-Host "==> $text" -ForegroundColor Cyan }
function Have($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = @(
    [Environment]::GetEnvironmentVariable('Path', 'Machine'),
    [Environment]::GetEnvironmentVariable('Path', 'User'),
    (Join-Path $HOME '.local\bin')
  ) -join ';'
}
function Winget($id) {
  if (-not (Have winget)) {
    throw "winget is missing: install 'App Installer' from the Microsoft Store, then run this again"
  }
  winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements
  Refresh-Path
}
# True when the node on the PATH is 22.18 or newer: it runs bh2's TypeScript as it is.
function Node-Ok {
  if (-not (Have node)) { return $false }
  if ((node -v) -match '^v(\d+)\.(\d+)') {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    return ($major -gt 22) -or ($major -eq 22 -and $minor -ge 18)
  }
  return $false
}

Step 'Node 22.18 or newer'
if (-not (Node-Ok)) { Winget 'OpenJS.NodeJS.LTS' }
if (-not (Node-Ok)) {
  throw "node on the PATH is still $(node -v): remove the old Node, open a new PowerShell and run this again"
}

Step 'Git'
if (-not (Have git)) { Winget 'Git.Git' }

Step 'Claude Code'
if (-not (Have claude)) {
  Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression
  Refresh-Path
}
if (-not (Have claude)) { throw 'claude is not on the PATH: open a new PowerShell and run this again' }

Step 'The belkins-home-2 plugin'
if (Test-Path $Marketplace) {
  claude plugin marketplace update belkins-home-2
} else {
  claude plugin marketplace add https://github.com/belkins-home-2/claude-plugin.git
}
claude plugin install belkins-home-2@belkins-home-2
$Bin = Join-Path $Marketplace 'plugin\bin'
if (-not (Test-Path (Join-Path $Bin 'bh2.cmd'))) { throw "the plugin did not install: no $Bin\bh2.cmd" }

Step 'The work folder, and bh2 on the PATH'
$Setup = node --disable-warning=ExperimentalWarning (Join-Path $Marketplace 'plugin\cli\cli.ts') setup | Out-String
if ($LASTEXITCODE -ne 0) { throw 'bh2 setup failed: run this again' }
$Setup = $Setup | ConvertFrom-Json
Refresh-Path

Step 'Connect bh2 to your account'
# cmd swallows the output: Windows PowerShell would turn a native command's redirected stderr into
# an error that stops the script.
cmd /c 'bh2 whoami >nul 2>&1'
if ($LASTEXITCODE -eq 0) {
  Write-Host 'Already connected.'
} elseif ([Console]::IsOutputRedirected) {
  Write-Host 'Run "bh2 login" to connect.'
} else {
  bh2 login
  if ($LASTEXITCODE -ne 0) { throw 'bh2 login did not finish: run "bh2 login" again' }
}

Write-Host ''
if ($Setup.taken) { Write-Host "$($Setup.taken -join ', ') already holds other files, so setup left it as it is." }
Write-Host "Done. Open Claude Code in $($Setup.workspace) and name the client in your first message." -ForegroundColor Green
