param(
  [int]$Width = 1366,
  [int]$Height = 768,
  [int]$First = 1,
  [int]$Last = 12,
  [string]$BaseUrl = 'http://localhost:3016',
  [string]$BrowserSession = 'final-pass'
)

$ErrorActionPreference = 'Stop'
$browserCli = Join-Path $PSScriptRoot '../node_modules/.bin/agent-browser.cmd'
$auditSource = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'audit-presentation-layout.js') -Raw
$auditEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($auditSource))
$titles = @(
  'Meet Tanga',
  'Place it on the map',
  'Work completed',
  'Read the landscape',
  'Follow a recorded hole',
  'Reveal the host rock',
  'Understand the model',
  'The global peer field',
  'Fit a concept to ground',
  'Examine the testwork',
  'Connect to the port',
  'Evidence to decisions'
)
$modes = @(
  'project',
  'tanzania',
  'work_completed',
  'topography',
  'drillholes',
  'subsurface',
  'resource',
  'ranking',
  'mine_planning',
  'metallurgy',
  'accessibility',
  'comparison'
)
$mapModes = @('project', 'tanzania', 'work_completed', 'ranking', 'accessibility', 'comparison')

if ($First -lt 1 -or $Last -gt $modes.Count -or $First -gt $Last) {
  throw "Choose a valid chapter range between 1 and $($modes.Count)."
}
if (-not (Test-Path -LiteralPath $browserCli)) {
  throw "agent-browser CLI was not found at $browserCli."
}

$captureRoot = Join-Path $PSScriptRoot '../.playwright-mcp'
$captureRoot = [IO.Path]::GetFullPath($captureRoot)
New-Item -ItemType Directory -Path $captureRoot -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

& $browserCli --session $BrowserSession set viewport $Width $Height
if ($LASTEXITCODE -ne 0) { throw 'Could not set the browser viewport.' }
& $browserCli --session $BrowserSession open "$BaseUrl/#project"
if ($LASTEXITCODE -ne 0) { throw "Could not open $BaseUrl/#project" }

for ($slideIndex = $First; $slideIndex -le $Last; $slideIndex++) {
  $title = $titles[$slideIndex - 1]
  $mode = $modes[$slideIndex - 1]
  & $browserCli --session $BrowserSession find role tab click --name "Scene ${slideIndex}: $title"
  if ($LASTEXITCODE -ne 0) { throw "Navigation failed for chapter $slideIndex ($title)." }

  & $browserCli --session $BrowserSession wait --fn "document.querySelector('.tanga-deck')?.dataset.mode === '$mode'"
  if ($LASTEXITCODE -ne 0) { throw "Wrong mode for chapter $slideIndex ($mode)." }

  if ($mapModes -contains $mode) {
    $readySource = "(()=>{const d=document.querySelector('.tanga-deck');return !!d&&d.dataset.mode==='$mode'&&!d.classList.contains('tanga-deck--transitioning')&&d.dataset.mapState==='ready'})()"
  } else {
    $readySource = "(()=>{const d=document.querySelector('.tanga-deck');return !!d&&d.dataset.mode==='$mode'&&!d.classList.contains('tanga-deck--transitioning')&&d.dataset.threeState==='ready'})()"
  }
  & $browserCli --session $BrowserSession wait --fn $readySource
  if ($LASTEXITCODE -ne 0) { throw "Scene readiness failed for chapter $slideIndex ($mode)." }

  if ($mode -eq 'metallurgy') {
    & $browserCli --session $BrowserSession wait --fn "(()=>{const e=document.querySelector('.tanga-process-canvas');return !!e&&e.dataset.ready==='true'&&e.dataset.cameraSettled==='true'&&e.dataset.roofSettled==='true'})()"
    if ($LASTEXITCODE -ne 0) { throw 'Metallurgy factory camera or roof did not settle.' }
  }

  $auditResult = (& $browserCli --session $BrowserSession eval -b $auditEncoded) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "Layout audit failed for chapter $slideIndex." }
  $auditObject = $auditResult | ConvertFrom-Json
  $capturePath = Join-Path $captureRoot "verify-$stamp-$($Width)x$($Height)-$($slideIndex.ToString('00'))-$mode.png"
  & $browserCli --session $BrowserSession screenshot $capturePath
  if ($LASTEXITCODE -ne 0) { throw "Screenshot failed for chapter $slideIndex." }

  [pscustomobject]@{
    chapter = $slideIndex
    title = $title
    mode = $mode
    viewport = "$Width x $Height"
    ready = $true
    overlapCount = $auditObject.overlaps.Count
    outsideCount = $auditObject.outside.Count
    screenshot = $capturePath
    overlaps = $auditObject.overlaps
    outside = $auditObject.outside
  } | ConvertTo-Json -Depth 8 -Compress
}

& $browserCli --session $BrowserSession errors
