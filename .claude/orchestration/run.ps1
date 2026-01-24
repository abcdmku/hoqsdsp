# CamillaDSP Frontend - Parallel Agent Orchestrator (Windows)
# Usage: .\run.ps1 [options]

param(
    [int]$MaxParallel = 4,
    [string]$Phase = "",
    [switch]$Resume,
    [switch]$DryRun,
    [switch]$Status,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Show help
if ($Help) {
    Write-Host @"

CamillaDSP Frontend - Parallel Agent Orchestrator

Usage: .\run.ps1 [options]

Options:
  -MaxParallel <n>    Maximum parallel agents (default: 4)
  -Phase <id>         Run specific phase only (e.g., P1, P2)
  -Resume             Resume from saved state
  -DryRun             Show what would be done without executing
  -Status             Show current orchestration status
  -Help               Show this help message

Examples:
  .\run.ps1                           # Run full orchestration
  .\run.ps1 -MaxParallel 2            # Run with 2 parallel agents
  .\run.ps1 -Phase P1                 # Run only Phase 1
  .\run.ps1 -Resume                   # Resume from last state
  .\run.ps1 -Status                   # Show current status

"@
    exit 0
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."

    # Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Err "Node.js is required but not found. Install from https://nodejs.org"
        exit 1
    }
    $nodeVersion = (node --version).Substring(1).Split('.')[0]
    if ([int]$nodeVersion -lt 20) {
        Write-Err "Node.js 20+ is required. Current version: $(node --version)"
        exit 1
    }
    Write-Success "Node.js $(node --version)"

    # Git
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Err "Git is required but not found"
        exit 1
    }
    Write-Success "Git $(git --version)"

    # Check if in git repo
    if (-not (Test-Path .git)) {
        Write-Err "Not in a git repository"
        exit 1
    }
    Write-Success "Git repository detected"

    # tsx (for running TypeScript)
    $tsxInstalled = npm list -g tsx 2>$null | Select-String "tsx"
    if (-not $tsxInstalled) {
        Write-Warn "tsx not found globally, installing..."
        npm install -g tsx
    }
    Write-Success "tsx available"
}

# Show current status
function Show-Status {
    $stateFile = ".claude/orchestration/state.json"

    if (-not (Test-Path $stateFile)) {
        Write-Info "No orchestration state found. Run without -Status to start."
        return
    }

    $state = Get-Content $stateFile | ConvertFrom-Json

    Write-Host ""
    Write-Host "=" * 60
    Write-Host "ORCHESTRATION STATUS"
    Write-Host "=" * 60
    Write-Host ""
    Write-Host "Started: $($state.startedAt)"
    Write-Host "Last Updated: $($state.lastUpdated)"
    Write-Host ""

    # Count tasks by status
    $completed = 0
    $failed = 0
    $inProgress = 0
    $pending = 0

    foreach ($task in $state.tasks.PSObject.Properties) {
        switch ($task.Value.status) {
            "completed" { $completed++ }
            "failed" { $failed++ }
            "in_progress" { $inProgress++ }
            "pending" { $pending++ }
        }
    }

    $total = $completed + $failed + $inProgress + $pending

    Write-Host "Tasks:"
    Write-Success "  Completed: $completed"
    if ($failed -gt 0) { Write-Err "  Failed: $failed" }
    if ($inProgress -gt 0) { Write-Warn "  In Progress: $inProgress" }
    Write-Info "  Pending: $pending"
    Write-Host "  Total: $total"
    Write-Host ""

    Write-Host "Completed Phases: $($state.completedPhases -join ', ')"
    Write-Host "Completed Groups: $($state.completedGroups -join ', ')"
    Write-Host ""

    # Show failed tasks
    if ($failed -gt 0) {
        Write-Err "Failed Tasks:"
        foreach ($task in $state.tasks.PSObject.Properties) {
            if ($task.Value.status -eq "failed") {
                Write-Host "  - $($task.Name): $($task.Value.error)"
            }
        }
    }
}

# Main execution
function Main {
    Write-Host ""
    Write-Host "=" * 60
    Write-Host "CamillaDSP Frontend - Parallel Agent Orchestrator"
    Write-Host "=" * 60
    Write-Host ""

    if ($Status) {
        Show-Status
        return
    }

    Test-Prerequisites

    # Build command arguments
    $args = @()

    if ($MaxParallel -ne 4) {
        $args += "--max-parallel"
        $args += $MaxParallel
    }

    if ($Phase) {
        $args += "--phase"
        $args += $Phase
    }

    if ($Resume) {
        $args += "--resume"
    }

    if ($DryRun) {
        $args += "--dry-run"
    }

    Write-Info "Starting orchestrator with arguments: $($args -join ' ')"
    Write-Host ""

    # Run the orchestrator
    $orchestratorPath = ".claude/orchestration/orchestrate.ts"

    if (-not (Test-Path $orchestratorPath)) {
        Write-Err "Orchestrator script not found at $orchestratorPath"
        exit 1
    }

    npx tsx $orchestratorPath @args

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Orchestrator failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }

    Write-Success "Orchestration completed!"
}

Main
