param(
    [int]$Port = 8011,
    [string]$CaptureRoot = 'W:\Repos\_My Games\LOCAL-ONLY\captures\mandate-2029',
    [string]$BrowserPath
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$serverScript = Join-Path $PSScriptRoot 'review-server.js'
$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node) {
    throw 'Node.js was not found in PATH.'
}

function Resolve-EdgeBrowserPath {
    param([string]$PreferredPath)

    if ($PreferredPath -and (Test-Path $PreferredPath)) {
        return $PreferredPath
    }

    $candidates = @(
        'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $command = Get-Command msedge.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw 'Microsoft Edge was not found.'
}

$browser = Resolve-EdgeBrowserPath -PreferredPath $BrowserPath

function Stop-ProcessTree {
    param([int]$ProcessId)

    Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId } | ForEach-Object {
        Stop-ProcessTree -ProcessId $_.ProcessId
    }

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $ProcessId -Force
    }
}

function Wait-ForHttpOk {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                return
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    throw "Timed out waiting for $Url"
}

function Invoke-Capture {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Width = 1600,
        [int]$Height = 1400,
        [int]$BudgetMs = 6000
    )

    $dateLabel = Get-Date -Format 'yyyy-MM-dd'
    $filePath = Join-Path $CaptureRoot "$Name-$dateLabel.png"
    $profileDir = Join-Path $env:TEMP "mandate-2029-capture-$Name"

    Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

    & $browser `
        '--headless=new' `
        "--user-data-dir=$profileDir" `
        '--disable-gpu' `
        '--disable-sync' `
        '--no-first-run' `
        '--no-default-browser-check' `
        "--window-size=$Width,$Height" `
        "--virtual-time-budget=$BudgetMs" `
        "--screenshot=$filePath" `
        $Url | Out-Null

    return Get-Item $filePath
}

New-Item -ItemType Directory -Force -Path $CaptureRoot | Out-Null

$server = Start-Process -FilePath $node -ArgumentList "`"$serverScript`" $Port `"$repoRoot`"" -PassThru
try {
    Wait-ForHttpOk -Url "http://127.0.0.1:$Port/"

    $captures = @(
        Invoke-Capture -Name 'title-review' -Url "http://127.0.0.1:$Port/?review=1" -Height 1400 -BudgetMs 5000
        Invoke-Capture -Name 'autostart-review' -Url "http://127.0.0.1:$Port/?autostart=1&review=1" -Height 1800 -BudgetMs 6000
        Invoke-Capture -Name 'event-review' -Url "http://127.0.0.1:$Port/?autostart=1&review=1&state=event" -Height 1800 -BudgetMs 6000
        Invoke-Capture -Name 'run-in-review' -Url "http://127.0.0.1:$Port/?autostart=1&review=1&state=run-in" -Height 1800 -BudgetMs 6000
        Invoke-Capture -Name 'result-review' -Url "http://127.0.0.1:$Port/?autostart=1&review=1&state=result" -Height 1800 -BudgetMs 6000
    )

    $captures | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
} finally {
    if ($server -and -not $server.HasExited) {
        Stop-ProcessTree -ProcessId $server.Id
    }
}
