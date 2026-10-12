# Makes Claude Code on this PC tell Fumu when it replied or needs you (any folder, any project).
# Run it once in PowerShell:   powershell -ExecutionPolicy Bypass -File tools\install-pc-hook.ps1
# It asks for your Backup & sync code (Options > Backup & sync), keeps it encrypted for your Windows user only, writes
#   C:\Users\<name>\.claude\hooks\fumu-notify.ps1   (the hook: posts "Claude replied" / "Claude needs you" to the sync server's inbox)
#   C:\Users\<name>\.claude\fumu-sync-code.txt      (your code, encrypted; only this Windows user can read it)
# and adds a Stop and a Notification hook to C:\Users\<name>\.claude\settings.json (a copy is kept as settings.json.bak).
# Only the two short phrases are sent, never the conversation. Run it again to change the code; it never adds the hooks twice.
$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:USERPROFILE '.claude'
$hooks = Join-Path $dir 'hooks'
$script = Join-Path $hooks 'fumu-notify.ps1'
$codeFile = Join-Path $dir 'fumu-sync-code.txt'
$settingsFile = Join-Path $dir 'settings.json'
$utf8 = New-Object System.Text.UTF8Encoding($false)

# read the current settings first, so a file that cannot be read stops everything before anything is changed
$settings = [pscustomobject]@{}
if (Test-Path $settingsFile) {
  $raw = Get-Content $settingsFile -Raw
  if ($raw -and $raw.Trim()) { $settings = $raw | ConvertFrom-Json }
}

$secure = Read-Host 'Paste your Backup & sync code' -AsSecureString
if ($secure.Length -eq 0) { throw 'No code given, nothing was changed.' }
New-Item -ItemType Directory -Force -Path $hooks | Out-Null
[IO.File]::WriteAllText($codeFile, ($secure | ConvertFrom-SecureString), $utf8)

$hook = @'
param([string]$kind)
$ErrorActionPreference = 'SilentlyContinue'
$text = if ($kind -eq 'needs') { 'Claude needs you' } else { 'Claude replied' }
# the same words twice within a few seconds are one alert
$lock = Join-Path $env:TEMP ('fumu-notify-' + ($text -replace '[^A-Za-z]', '_'))
$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
if (Test-Path $lock) {
  $then = 0
  [void][long]::TryParse(((Get-Content $lock -Raw) + '').Trim(), [ref]$then)
  if ($now - $then -lt 8) { exit 0 }
}
Set-Content -Path $lock -Value $now
$file = Join-Path $env:USERPROFILE '.claude\fumu-sync-code.txt'
if (-not (Test-Path $file)) { exit 0 }
$secure = ((Get-Content $file -Raw) + '').Trim() | ConvertTo-SecureString
$code = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
$body = '{"kind":"text","text":"' + $text + '","from":"claude"}'
try {
  Invoke-RestMethod -Method Post -Uri 'https://pet-shopper-sync.laurmoe.workers.dev/v1/inbox' -Headers @{ Authorization = "Bearer $code" } -ContentType 'application/json' -Body $body -TimeoutSec 5 | Out-Null
} catch { }
exit 0
'@
[IO.File]::WriteAllText($script, $hook, $utf8)

if (Test-Path $settingsFile) { Copy-Item $settingsFile ($settingsFile + '.bak') -Force }
if (-not $settings.PSObject.Properties['hooks']) { $settings | Add-Member -NotePropertyName hooks -NotePropertyValue ([pscustomobject]@{}) }
foreach ($pair in @(@('Stop', 'done'), @('Notification', 'needs'))) {
  $event = $pair[0]
  $command = 'powershell -NoProfile -ExecutionPolicy Bypass -File "' + $script + '" ' + $pair[1]
  $entry = [pscustomobject]@{ hooks = @([pscustomobject]@{ type = 'command'; command = $command }) }
  $others = @()
  if ($settings.hooks.PSObject.Properties[$event]) {
    # keep whatever hooks were there, except an earlier copy of this one
    $others = @($settings.hooks.$event | Where-Object { $_ -and -not (($_ | ConvertTo-Json -Depth 10 -Compress).Contains('fumu-notify.ps1')) })
    $settings.hooks.$event = @($others + $entry)
  } else {
    $settings.hooks | Add-Member -NotePropertyName $event -NotePropertyValue @($entry)
  }
}
[IO.File]::WriteAllText($settingsFile, ($settings | ConvertTo-Json -Depth 20), $utf8)

Write-Host ''
Write-Host 'Done. New Claude Code sessions on this PC will tell Fumu when they reply or need you.'
Write-Host ('Hook:     ' + $script)
Write-Host ('Settings: ' + $settingsFile)
