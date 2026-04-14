param(
    [int]$Port = 8011,
    [string]$CaptureDir = 'W:\Repos\_My Games\LOCAL-ONLY\captures\mandate-2029',
    [string]$StampDate = (Get-Date -Format 'yyyy-MM-dd')
)

$ErrorActionPreference = 'Stop'

$repoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $repoDir 'scripts\review-server.js'
$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node) {
    throw 'Node.js was not found in PATH.'
}

$chrome = if (Get-Command chrome.exe -ErrorAction SilentlyContinue) {
    (Get-Command chrome.exe).Source
} elseif (Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe') {
    'C:\Program Files\Google\Chrome\Application\chrome.exe'
} elseif (Test-Path 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe') {
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
} else {
    $null
}

if (-not $chrome) {
    throw 'Google Chrome was not found.'
}

function Stop-ProcessTree {
    param([int]$ProcessId)

    $children = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId }
    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId $child.ProcessId
    }

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $ProcessId -Force
    }
}

function Wait-ForHttpOk {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 45,
        [string]$ExpectedText = 'Mandate 2029'
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
            if ($response.StatusCode -eq 200 -and $response.Content -match [regex]::Escape($ExpectedText)) {
                return
            }
        } catch {
            Start-Sleep -Milliseconds 700
            continue
        }
        Start-Sleep -Milliseconds 700
    }

    throw "Timed out waiting for $Url"
}

function Invoke-Capture {
    param(
        [string]$Url,
        [string]$OutputPath,
        [string]$ProfileDir,
        [int]$Width = 1600,
        [int]$Height = 1400,
        [int]$VirtualTimeBudget = 6000
    )

    Remove-Item -Recurse -Force $ProfileDir -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null
    & $chrome '--headless=new' "--user-data-dir=$ProfileDir" '--disable-gpu' "--window-size=$Width,$Height" "--virtual-time-budget=$VirtualTimeBudget" "--screenshot=$OutputPath" $Url | Out-Null
    if (-not (Test-Path $OutputPath)) {
        throw "Capture failed for $Url"
    }
}

New-Item -ItemType Directory -Force -Path $CaptureDir | Out-Null
$tempRoot = Join-Path $env:TEMP 'mandate-2029-review-capture'
Remove-Item -Recurse -Force $tempRoot -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$server = Start-Process -FilePath $node -ArgumentList "`"$serverScript`" $Port `"$repoDir`"" -PassThru

try {
    Wait-ForHttpOk -Url "http://127.0.0.1:$Port/"

    $captures = @(
        @{
            Label = 'Title review state'
            Url = "http://127.0.0.1:$Port/?review=1"
            Output = Join-Path $CaptureDir 'title-review-latest.png'
            Profile = Join-Path $tempRoot 'title'
            Width = 1600
            Height = 1400
            VirtualTimeBudget = 5000
        },
        @{
            Label = 'Opening autostart review state'
            Url = "http://127.0.0.1:$Port/?autostart=1&review=1"
            Output = Join-Path $CaptureDir 'autostart-review-latest.png'
            Profile = Join-Path $tempRoot 'autostart'
            Width = 1600
            Height = 1800
            VirtualTimeBudget = 6500
        },
        @{
            Label = 'Live event review state'
            Url = "http://127.0.0.1:$Port/?autostart=1&review=1&state=event"
            Output = Join-Path $CaptureDir 'event-review-latest.png'
            Profile = Join-Path $tempRoot 'event'
            Width = 1600
            Height = 1800
            VirtualTimeBudget = 6500
        },
        @{
            Label = 'Late run-in checkpoint'
            Url = "http://127.0.0.1:$Port/?autostart=1&review=1&state=run-in"
            Output = Join-Path $CaptureDir 'run-in-review-latest.png'
            Profile = Join-Path $tempRoot 'run-in'
            Width = 1600
            Height = 1800
            VirtualTimeBudget = 6500
        },
        @{
            Label = 'Election result review state'
            Url = "http://127.0.0.1:$Port/?autostart=1&review=1&state=result"
            Output = Join-Path $CaptureDir 'result-review-latest.png'
            Profile = Join-Path $tempRoot 'result'
            Width = 1600
            Height = 1800
            VirtualTimeBudget = 6500
        }
    )

    foreach ($capture in $captures) {
        Invoke-Capture @capture
        $stampedOutput = Join-Path $CaptureDir (([System.IO.Path]::GetFileNameWithoutExtension($capture.Output) -replace '-latest$', '') + "-$StampDate.png")
        Copy-Item -Force -Path $capture.Output -Destination $stampedOutput
        $capture['StampedOutput'] = $stampedOutput
    }

    $reviewPackPath = Join-Path $CaptureDir 'REVIEW-PACK.md'
    $reviewPack = @(
        '# Mandate 2029 Review Pack',
        '',
        "- Generated: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))",
        "- Local URL: http://127.0.0.1:$Port/",
        '- Default review route: `?autostart=1&review=1`',
        '- Extra deterministic states: `state=event`, `state=run-in`, `state=result`',
        '',
        '## Captures',
        ''
    )
    foreach ($capture in $captures) {
        $reviewPack += ('- {0}: `{1}`' -f $capture.Label, (Split-Path -Leaf $capture.StampedOutput))
        $reviewPack += ('  Route: `{0}`' -f $capture.Url)
    }
    $reviewPack += ''
    $reviewPack += 'Review mode intentionally ignores local save load/write behavior so captures always land in the same curated slice.'
    Set-Content -Path $reviewPackPath -Value $reviewPack

    Get-ChildItem $CaptureDir | Where-Object { $_.Name -like '*review-latest.png' } | Sort-Object Name | Select-Object Name, Length, LastWriteTime
} finally {
    if ($server -and -not $server.HasExited) {
        Stop-ProcessTree -ProcessId $server.Id
    }
}
