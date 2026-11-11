# Install the MSI silently and confirm the packaged app serves the nickname page.
$ErrorActionPreference = "Stop"
$msi = Get-ChildItem -Recurse -Path "src-tauri\target\release\bundle" -Filter *.msi | Select-Object -First 1
if (-not $msi) { throw "no msi" }
Write-Output "install $($msi.FullName)"
$install = Start-Process msiexec.exe -ArgumentList "/i `"$($msi.FullName)`" /qn /norestart" -Wait -PassThru
if ($install.ExitCode -ne 0 -and $install.ExitCode -ne 3010) {
  throw "msiexec exited $($install.ExitCode)"
}
$candidates = @(
  "$env:ProgramFiles\ymzz-bingce\ymzz-bingce.exe",
  "${env:ProgramFiles(x86)}\ymzz-bingce\ymzz-bingce.exe"
)
$exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) {
  $found = Get-ChildItem -Path $env:ProgramFiles, ${env:ProgramFiles(x86)} -Recurse -Filter ymzz-bingce.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { $exe = $found.FullName }
}
if (-not $exe) { throw "installed ymzz-bingce.exe was not found" }
Write-Output "launch $exe"
$proc = Start-Process -FilePath $exe -PassThru
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $page = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:1413/ -TimeoutSec 2
    if ($page.Content -match "稟冊" -or $page.Content -match "怎麼稱呼你") {
      $ok = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 1
  }
}
if (-not $ok) {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  throw "installed app did not serve the nickname page"
}
if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
Write-Output "YMZZ_SMOKE windows installed core"
