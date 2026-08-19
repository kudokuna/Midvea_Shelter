$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDirectory = Join-Path $projectRoot 'dist'
$manifest = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'manifest.json') | ConvertFrom-Json
$packagePath = Join-Path $distDirectory "midvea-shelter-$($manifest.version).zip"
if (-not (Test-Path -LiteralPath $distDirectory)) { New-Item -ItemType Directory -Path $distDirectory | Out-Null }
if (Test-Path -LiteralPath $packagePath) { Remove-Item -LiteralPath $packagePath }
$packageItems = @(
    '_locales', 'assets', 'icons', 'manifest.json', 'index.html', 'styles.css', 'brand-mark.svg',
    'i18n.js', 'app.js', 'about.js', 'background.js', 'notes.js', 'pomodoro.js',
    'soundscape.js', 'weather.js', 'backup.js', 'privacy.html', 'privacy.js', 'asset-sources.html'
) | ForEach-Object { Join-Path $projectRoot $_ }
$missingItems = $packageItems | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missingItems) { throw "Missing package files: $($missingItems -join ', ')" }
Compress-Archive -LiteralPath $packageItems -DestinationPath $packagePath -CompressionLevel Optimal
Write-Host "Chrome Web Store package: $packagePath"
