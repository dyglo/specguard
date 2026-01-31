$ErrorActionPreference = "Stop"

# Get Repo Root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Get-Item $ScriptDir).Parent.Parent.Parent.FullName

# Check Python
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    $PythonCmd = "python"
} elseif (Get-Command "python3" -ErrorAction SilentlyContinue) {
    $PythonCmd = "python3"
} else {
    Write-Host "Error: Python not found." -ForegroundColor Red
    exit 1
}

$SpecPath = Join-Path $RepoRoot ".ai\specguard\spec.yaml"
$ReportDir = Join-Path $RepoRoot ".ai\specguard\reports"
$ValidatorScript = Join-Path $RepoRoot ".ai\specguard\specguard.py"

Write-Host "🚀 Running SpecGuard Validator..." -ForegroundColor Cyan

# Run Validator
& $PythonCmd $ValidatorScript validate --spec $SpecPath --repo-root $RepoRoot --report-dir $ReportDir
$ExitCode = $LASTEXITCODE

if ($ExitCode -eq 0) {
    Write-Host "✅ SpecGuard: PASS" -ForegroundColor Green
} else {
    Write-Host "❌ SpecGuard: FAIL" -ForegroundColor Red
}

exit $ExitCode
