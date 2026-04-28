#Requires -Version 5.1
param(
    [Parameter(Mandatory)] [string]$PlanFile
)

$ErrorActionPreference = 'Stop'

$absPlan = (Resolve-Path $PlanFile).Path
$plan = Get-Content $absPlan -Raw -Encoding UTF8 | ConvertFrom-Json
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$runScript = Join-Path $PSScriptRoot 'run-task.ps1'

Write-Host ("=== fanout dispatch  plan={0}  tasks={1} ===" -f $absPlan, $plan.tasks.Count) -ForegroundColor Magenta
$startAll = Get-Date

$jobs = @()
foreach ($t in $plan.tasks) {
    $taskAbs = Join-Path $PSScriptRoot $t.task
    if (-not (Test-Path $taskAbs)) {
        Write-Host ("!! task file not found: {0}" -f $taskAbs) -ForegroundColor Red
        continue
    }

    Write-Host (">> dispatch cc{0} <- {1}" -f $t.account, $t.task) -ForegroundColor Cyan

    $job = Start-Job -Name ("cc{0}-{1}" -f $t.account, [IO.Path]::GetFileNameWithoutExtension($t.task)) -ScriptBlock {
        param($script, $account, $task)
        & $script -Account $account -TaskFile $task
    } -ArgumentList $runScript, $t.account, $taskAbs

    $jobs += [PSCustomObject]@{
        Account = $t.account
        Task    = $t.task
        Job     = $job
    }
}

Write-Host ("== {0} jobs running, waiting... ==" -f $jobs.Count) -ForegroundColor Yellow

$results = @()
foreach ($j in $jobs) {
    Wait-Job $j.Job | Out-Null
    $output = Receive-Job $j.Job -Keep
    $state = $j.Job.State
    Remove-Job $j.Job -Force

    $results += [PSCustomObject]@{
        Account = $j.Account
        Task    = $j.Task
        State   = $state
    }

    Write-Host ("`n=== cc{0}  {1}  [{2}] ===" -f $j.Account, $j.Task, $state) -ForegroundColor Magenta
    $output | ForEach-Object { Write-Host $_ }
}

$elapsedAll = ((Get-Date) - $startAll).TotalSeconds
Write-Host ("`n=== all done in {0:F1}s ===" -f $elapsedAll) -ForegroundColor Magenta
$results | Format-Table -AutoSize
