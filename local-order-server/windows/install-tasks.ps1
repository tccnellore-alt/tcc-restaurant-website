$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Data = Join-Path $env:ProgramData "TCC\OrderServer"
$Backup = Join-Path $Data "backups"
New-Item -ItemType Directory -Force -Path $Data,$Backup | Out-Null

$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node) { throw "Node.js LTS is not installed. Install Node.js LTS, then run this setup again." }
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) { throw "npm.cmd was not found in PATH." }

if (-not (Test-Path (Join-Path $Root ".env"))) {
  Copy-Item (Join-Path $Root ".env.example") (Join-Path $Root ".env")
  Write-Warning "Created .env from template. Edit it and add the local admin token and Supabase service key before starting cloud sync."
}
Push-Location $Root
try { npm install } finally { Pop-Location }

$settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable -MultipleInstances IgnoreNew
$startup = New-ScheduledTaskTrigger -AtStartup
$daily = New-ScheduledTaskTrigger -Daily -At 3:30am

function Register-TccTask($Name,$Executable,$Arguments,$Trigger,$TaskSettings) {
  $action = New-ScheduledTaskAction -Execute $Executable -Argument $Arguments -WorkingDirectory $Root
  Register-ScheduledTask -TaskName $Name -Action $action -Trigger $Trigger -Settings $TaskSettings -User (whoami) -RunLevel Highest -Force | Out-Null
}

Register-TccTask "TCC Local Order Server" $npm "start" $startup $settings
Register-TccTask "TCC Local Cloud Sync" $npm "run cloud-sync" $startup $settings
Register-TccTask "TCC Local QR Cache Sync" $npm "run sync-qr" $startup $settings
Register-TccTask "TCC Local Order Server Backup" $node ('"{0}"' -f (Join-Path $Root "backup.js")) $daily $settings

Write-Host "Tasks registered. Review .env and Windows Firewall before starting tasks."
Write-Host "Local test desk: http://127.0.0.1:8787/desk/desk.html"
