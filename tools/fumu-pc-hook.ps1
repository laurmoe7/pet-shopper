# Claude Code on Lauren's PC tells Mini Fumu "Claude replied" / "Claude needs you", in every project.
# Run once in PowerShell (it asks for the Backup & sync code and checks it with the sync server):
#   irm https://raw.githubusercontent.com/laurmoe7/pet-shopper/main/tools/fumu-pc-hook.ps1 | iex
# To take it off again:
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/laurmoe7/pet-shopper/main/tools/fumu-pc-hook.ps1))) -Remove
# It writes, in %USERPROFILE%\.claude: fumu-notify.ps1 (the hook), fumu-code.txt (the code, encrypted for this Windows user only,
# never in this repository) and the Stop and Notification hooks in settings.json (other settings are kept). Only the two short
# phrases are sent, never the conversation, like the cloud hook in .claude/hooks/fumu-notify.sh.
param([switch]$Remove)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Remove-TypeData System.Array -ErrorAction SilentlyContinue   # Windows PowerShell 5.1 would write lists as {"value": [...]}
$url = 'https://pet-shopper-sync.laurmoe.workers.dev'
$dir = Join-Path $env:USERPROFILE '.claude'
$hook = Join-Path $dir 'fumu-notify.ps1'
$codeFile = Join-Path $dir 'fumu-code.txt'
$settingsFile = Join-Path $dir 'settings.json'
$utf8 = New-Object System.Text.UTF8Encoding($false)   # no BOM: Claude Code cannot read settings.json with one
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# settings.json without our old entries (so running this twice never makes two pings)
$settings = if (Test-Path $settingsFile) { Get-Content -Raw $settingsFile | ConvertFrom-Json } else { $null }
if (-not $settings) { $settings = New-Object PSObject }
if (-not $settings.hooks) { $settings | Add-Member -NotePropertyName hooks -NotePropertyValue (New-Object PSObject) -Force }
foreach ($ev in 'Stop', 'Notification') {
  $kept = @(@($settings.hooks.$ev) | Where-Object { $_ -and -not (($_ | ConvertTo-Json -Depth 20 -Compress) -match 'fumu-notify') })
  if ($kept.Count) { $settings.hooks | Add-Member -NotePropertyName $ev -NotePropertyValue $kept -Force }
  else { $settings.hooks.PSObject.Properties.Remove($ev) }
}

if ($Remove) {
  [IO.File]::WriteAllText($settingsFile, ($settings | ConvertTo-Json -Depth 20), $utf8)
  Remove-Item -Force -ErrorAction SilentlyContinue $hook, $codeFile
  Write-Host 'Done: Claude Code on this PC no longer tells Fumu.'
  return
}

$code = (Read-Host 'Paste your Backup & sync code (Fumu: Options > Backup & sync)').Trim()
try { Invoke-RestMethod -Uri "$url/v1/doc" -Headers @{ Authorization = "Bearer $code" } -TimeoutSec 10 | Out-Null }
catch { Write-Host "That code did not work ($($_.Exception.Message)). Nothing was changed."; return }
[IO.File]::WriteAllText($codeFile, (ConvertTo-SecureString $code -AsPlainText -Force | ConvertFrom-SecureString), $utf8)

[IO.File]::WriteAllText($hook, @'
# Made by pet-shopper's tools/fumu-pc-hook.ps1: tells Mini Fumu "Claude replied" or "Claude needs you".
param([string]$kind = 'done')
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $text = if ($kind -eq 'needs') { 'Claude needs you' } else { 'Claude replied' }
  # the same words twice within a few seconds are one alert
  $lock = Join-Path $env:TEMP "fumu-notify-$kind"
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  if ((Test-Path $lock) -and ($now - [long](Get-Content $lock)) -lt 8) { exit 0 }
  Set-Content $lock $now
  $secure = Get-Content (Join-Path $PSScriptRoot 'fumu-code.txt') | ConvertTo-SecureString
  $code = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  $body = @{ kind = 'text'; text = $text; from = 'claude' } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Post -Uri 'https://pet-shopper-sync.laurmoe.workers.dev/v1/inbox' -Headers @{ Authorization = "Bearer $code" } -ContentType 'application/json' -Body $body -TimeoutSec 5 | Out-Null
} catch {}
exit 0
'@, $utf8)

# forward slashes work both in Git Bash (which Claude Code uses on Windows) and in cmd
$cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$($hook -replace '\\', '/')`""
foreach ($pair in @(@('Stop', 'done'), @('Notification', 'needs'))) {
  $entry = [pscustomobject]@{ hooks = @([pscustomobject]@{ type = 'command'; command = "$cmd $($pair[1])" }) }
  $settings.hooks | Add-Member -NotePropertyName $pair[0] -NotePropertyValue (@(@($settings.hooks.($pair[0])) | Where-Object { $_ }) + $entry) -Force
}
[IO.File]::WriteAllText($settingsFile, ($settings | ConvertTo-Json -Depth 20), $utf8)
Write-Host "Done. Claude Code on this PC now tells Fumu when it replies or needs you (restart open Claude Code windows)."
Write-Host "Settings: $settingsFile"
