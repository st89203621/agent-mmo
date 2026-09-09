param(
    [string]$EditorPath = 'C:\Program Files\Tuanjie\Hub\Editor\2022.3.62t14\Editor\Tuanjie.exe',
    [string]$SdkPath = '',
    [string]$NdkPath = '',
    [string]$JdkPath = '',
    [string]$BuildProjectPath = ''
)

$ErrorActionPreference = 'Stop'
$projectPath = if ($BuildProjectPath) { (Resolve-Path -LiteralPath $BuildProjectPath).Path } else { $PSScriptRoot }
$toolchain = Join-Path $PSScriptRoot 'Artifacts\AndroidToolchain'
if (!$SdkPath) { $SdkPath = Join-Path $toolchain 'SDK' }
if (!$NdkPath) { $NdkPath = Join-Path $toolchain 'android-ndk-r23b' }
if (!$JdkPath) { $JdkPath = Join-Path $toolchain 'OpenJDK' }
foreach ($path in @($EditorPath, (Join-Path $SdkPath 'platforms\android-35\android.jar'),
    (Join-Path $SdkPath 'cmdline-tools\6.0\bin\sdkmanager.bat'),
    (Join-Path $NdkPath 'source.properties'), (Join-Path $JdkPath 'bin\java.exe'))) {
    if (!(Test-Path -LiteralPath $path)) { throw "Required build tool is missing: $path" }
}
$env:LUNHUI_ANDROID_SDK = $SdkPath
$env:LUNHUI_ANDROID_NDK = $NdkPath
$env:LUNHUI_ANDROID_JDK = $JdkPath
$logPath = Join-Path $projectPath 'build-android.log'
$arguments = @('-batchmode', '-quit', '-buildTarget', 'Android',
    '-projectPath', ('"' + $projectPath + '"'),
    '-executeMethod', 'Lunhui.Prototype.PrototypeSetup.BuildAndroid',
    '-logFile', ('"' + $logPath + '"'))
Write-Output "Building Android APK. Log: $logPath"
$startedAt = Get-Date
$editorProcess = Start-Process -FilePath $EditorPath -ArgumentList $arguments -WindowStyle Hidden -PassThru
# Wait for the editor itself; Gradle and licensing daemons can outlive a build.
$editorProcess.WaitForExit()
if ($editorProcess.ExitCode -ne 0) { throw "Editor failed with exit code $($editorProcess.ExitCode). See $logPath" }
$apkPath = Join-Path $projectPath 'Builds\Android\LunhuiOnline-Prototype.apk'
if (!(Test-Path -LiteralPath $apkPath)) { throw "Editor exited without producing an APK. See $logPath" }
$apk = Get-Item -LiteralPath $apkPath
if ($apk.LastWriteTime -lt $startedAt) { throw 'The APK predates this build; refusing to report a stale build as successful.' }
Write-Output "APK: $apkPath"
Write-Output ('Size: {0:N1} MB' -f ($apk.Length / 1MB))
Get-FileHash -LiteralPath $apkPath -Algorithm SHA256
