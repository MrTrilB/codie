param(
    [string]$Version = '1.103.2',
    [string]$DestinationPath = 'C:\vscode-test'
)

Write-Host "fetch-vscode-test.ps1 starting. Version=$Version Destination=$DestinationPath"

if (-not (Test-Path -LiteralPath $DestinationPath)) {
    New-Item -Path $DestinationPath -ItemType Directory -Force | Out-Null
    Write-Host "Created destination: $DestinationPath"
}

$zipPath = Join-Path $DestinationPath 'vscode.zip'
$archiveName = "vscode-win32-x64-archive-$Version"
$downloadUrl = "https://update.code.visualstudio.com/$Version/win32-x64-archive/stable"

Write-Host "Downloading VS Code $Version from $downloadUrl ..."
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing -ErrorAction Stop
} catch {
    Write-Error "Download failed: $_"
    exit 2
}

Write-Host "Extracting to $DestinationPath ..."
try {
    Expand-Archive -LiteralPath $zipPath -DestinationPath $DestinationPath -Force -ErrorAction Stop
    Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
} catch {
    Write-Error "Extraction failed: $_"
    exit 3
}

# Try to find the Code.exe inside the extracted folder
$candidates = Get-ChildItem -Path $DestinationPath -Recurse -Filter 'Code.exe' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName

if ($candidates -and $candidates.Count -gt 0) {
    Write-Host "Found Code.exe at:`n$candidates"
    Write-Host "You can now run tests pointing to one of these paths using the --vscodeExecutablePath option or programmatic runTests()."
    exit 0
} else {
    Write-Warning "Code.exe not found under $DestinationPath. Listing extracted folders:"
    Get-ChildItem -Path $DestinationPath -Directory | ForEach-Object { Write-Host " - $_.FullName" }
    Write-Error "VS Code extraction completed but executable was not found (OneDrive may block .exe creation). Try running this script as Administrator or use a different DestinationPath outside OneDrive, e.g. C:\vscode-test." 
    exit 4
}
