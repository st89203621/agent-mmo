#Requires -Version 5.1
param(
    [Parameter(Mandatory)] [ValidateRange(1,5)] [int]$Account,
    [Parameter(Mandatory)] [string]$TaskFile,
    [string]$LogDir,
    [string]$WorkDir
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $WorkDir) { $WorkDir = $repoRoot }
if (-not $LogDir) { $LogDir = Join-Path $PSScriptRoot 'logs' }
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

$absTask = (Resolve-Path $TaskFile).Path
$taskName = [IO.Path]::GetFileNameWithoutExtension($absTask)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $LogDir "$taskName-cc$Account-$stamp.log"
$errFile = Join-Path $LogDir "$taskName-cc$Account-$stamp.err"

$configDir = Join-Path $env:USERPROFILE ".claude-acc$Account"
$credPath = Join-Path $configDir ".credentials.json"
if (-not (Test-Path $credPath)) {
    throw "Account cc$Account not logged in (no credentials at $configDir)"
}

Write-Host (">> [cc{0}] {1} start  -> {2}" -f $Account, $taskName, $logFile) -ForegroundColor Cyan
$startTime = Get-Date

$promptBytes = [System.IO.File]::ReadAllBytes($absTask)
if ($promptBytes.Length -ge 3 -and $promptBytes[0] -eq 0xEF -and $promptBytes[1] -eq 0xBB -and $promptBytes[2] -eq 0xBF) {
    $promptBytes = $promptBytes[3..($promptBytes.Length - 1)]
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'claude'
$psi.WorkingDirectory = $WorkDir
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
$psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8
$psi.Arguments = '-p --dangerously-skip-permissions --permission-mode bypassPermissions'
$psi.EnvironmentVariables['CLAUDE_CONFIG_DIR'] = $configDir

$proc = [System.Diagnostics.Process]::Start($psi)
$stdoutTask = $proc.StandardOutput.ReadToEndAsync()
$stderrTask = $proc.StandardError.ReadToEndAsync()
$proc.StandardInput.BaseStream.Write($promptBytes, 0, $promptBytes.Length)
$proc.StandardInput.Close()
$proc.WaitForExit()

$stdout = $stdoutTask.Result
$stderr = $stderrTask.Result

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($logFile, $stdout, $utf8NoBom)
if ($stderr -and $stderr.Length -gt 0) {
    [System.IO.File]::WriteAllText($errFile, $stderr, $utf8NoBom)
}

$exitCode = $proc.ExitCode
$elapsed = ((Get-Date) - $startTime).TotalSeconds
$color = 'Green'
if ($exitCode -ne 0) { $color = 'Red' }
Write-Host (">> [cc{0}] {1} done. exit={2}  {3:F1}s  bytes={4}" -f $Account, $taskName, $exitCode, $elapsed, $stdout.Length) -ForegroundColor $color

if ($stdout.Length -lt 1000) {
    Write-Host '--- output ---' -ForegroundColor Yellow
    Write-Host $stdout
    Write-Host '--------------' -ForegroundColor Yellow
}

exit $exitCode
