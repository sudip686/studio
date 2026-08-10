param(
  [Parameter(Mandatory = $true)]
  [string]$Url,

  [int]$TimeoutSeconds = 20
)

$ErrorActionPreference = "Stop"

Write-Host "Verifying Tanga deployment: $Url"

try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSeconds
  Write-Host "HTTP status: $($response.StatusCode)"

  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
    throw "Unexpected HTTP status $($response.StatusCode)"
  }

  $html = $response.Content
  $requiredMarkers = @(
    "__next",
    "Tanga",
    "Sakariya"
  )

  foreach ($marker in $requiredMarkers) {
    if ($html -notmatch [regex]::Escape($marker)) {
      Write-Warning "Marker not found in initial HTML: $marker"
    } else {
      Write-Host "Marker found: $marker"
    }
  }

  Write-Host "Basic deployment check completed."
  Write-Host "Next: run Playwright screenshot QA for the golden commands."
} catch {
  Write-Error "Deployment verification failed: $($_.Exception.Message)"
  exit 1
}

