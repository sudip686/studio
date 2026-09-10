param([int]$Width=1366,[int]$Height=768,[int]$First=1,[int]$Last=11)
$ErrorActionPreference='Stop'
$browserCli=Join-Path $PSScriptRoot '../node_modules/.bin/agent-browser.cmd'
$auditSource=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'audit-presentation-layout.js') -Raw
$auditEncoded=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($auditSource))
$titles=@('The opportunity','A place in Tanzania','The project footprint','Read the ground','Inside the geology','Test the interpretation','Build the model','Shape a mining concept','From rock to concentrate','Connect to market','The case and next steps')
$modes=@('ranking','tanzania','project','topography','subsurface','drillholes','resource','mine_planning','metallurgy','accessibility','comparison')
& $browserCli --session final-pass set viewport $Width $Height
for($slideIndex=$First;$slideIndex -le $Last;$slideIndex++){
  if($slideIndex -eq 1){
    & $browserCli --session final-pass open http://localhost:9004/#ranking
    & $browserCli --session final-pass eval 'location.reload()'
    & $browserCli --session final-pass wait --text 'Begin the story'
  }else{
    & $browserCli --session final-pass find role tab click --name "Scene ${slideIndex}: $($titles[$slideIndex-1])"
  }
  if($LASTEXITCODE -ne 0){throw "Navigation failed for chapter $slideIndex"}
  & $browserCli --session final-pass wait --fn "document.querySelector('.tanga-deck[data-mode]')?.dataset.mode === '$($modes[$slideIndex-1])'"
  if($LASTEXITCODE -ne 0){throw "Wrong mode for chapter $slideIndex"}
  $waitSource="!document.querySelector('.tanga-deck--transitioning') && (!document.querySelector('.tanga-deck--three-active') || document.querySelector('[data-ready]')?.dataset.ready === 'true' || document.querySelector('[data-mode]')?.dataset.mode === 'metallurgy' || !!document.querySelector('.tanga-deck--cover'))"
  & $browserCli --session final-pass wait --fn $waitSource
  if($LASTEXITCODE -ne 0){throw "Readiness failed for chapter $slideIndex"}
  if($slideIndex -ge 5 -and $slideIndex -le 8){
    & $browserCli --session final-pass wait --fn "document.querySelector('[data-camera-moving]')?.dataset.cameraMoving === 'false'"
    if($LASTEXITCODE -ne 0){throw "Camera did not settle for chapter $slideIndex"}
  }
  $auditResult=(& $browserCli --session final-pass eval -b $auditEncoded) -join "`n"
  if($LASTEXITCODE -ne 0){throw "Layout audit failed for chapter $slideIndex"}
  $auditResult
  & $browserCli --session final-pass screenshot
  $auditObject=$auditResult|ConvertFrom-Json
  if($auditObject.overlaps.Count -or $auditObject.outside.Count){throw "Layout conflict detected for chapter $slideIndex"}
  if($slideIndex -eq 1){
    & $browserCli --session final-pass find role button click --name 'Begin the story'
    if($LASTEXITCODE -ne 0){throw 'Could not dismiss opening cover'}
  }
}
& $browserCli --session final-pass errors
