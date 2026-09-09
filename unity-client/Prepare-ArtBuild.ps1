$ErrorActionPreference='Stop'
$source=$PSScriptRoot
$destination=Join-Path $source 'Artifacts/ArtBuildWorkspace'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
foreach($folder in @('Assets','Packages','ProjectSettings')) {
    & robocopy.exe (Join-Path $source $folder) (Join-Path $destination $folder) /E /R:1 /W:1 /NFL /NDL /NJH /NJS
    if($LASTEXITCODE -ge 8) { throw ('Could not copy '+$folder) }
}
Write-Output ('Independent build project: '+$destination)
