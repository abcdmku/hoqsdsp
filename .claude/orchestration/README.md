# CamillaDSP Frontend - Parallel Agent Orchestrator

This system orchestrates multiple AI agents working in parallel to build the CamillaDSP Frontend application. Each agent works on an independent git worktree and changes are merged back to main.

## Quick Start

### Windows (PowerShell)
```powershell
cd .claude/orchestration
npm install
.\run.ps1
```

### Linux/macOS (Bash)
```bash
cd .claude/orchestration
npm install
./run.sh
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                              │
│  - Reads task-graph.json                                    │
│  - Manages state.json                                       │
│  - Coordinates parallel execution                           │
└─────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   WORKTREE 1  │  │   WORKTREE 2  │  │   WORKTREE 3  │
│  task-1.2.1   │  │  task-1.2.2   │  │  task-1.2.3   │
│               │  │               │  │               │
│   Agent A     │  │   Agent B     │  │   Agent C     │
│ (gpt-5.2-max) │  │ (codex-max)   │  │ (codex-max)   │
└───────────────┘  └───────────────┘  └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                    ┌─────────────┐
                    │    MERGE    │
                    │   to main   │
                    └─────────────┘
```

### Execution Flow

1. **Load Task Graph**: Read `task-graph.json` for dependencies and tasks
2. **Check Dependencies**: Determine which tasks are ready to run
3. **Create Worktrees**: Each parallel task gets its own git worktree
4. **Spawn Agents**: Launch AI agents with appropriate context
5. **Monitor Progress**: Track completion and handle failures
6. **Merge Changes**: Merge completed work back to main
7. **Update State**: Track progress for resumability

### Models Used

| Task Type | Model | Use Case |
|-----------|-------|----------|
| `ui` | gpt-5.2-max | React components, styling, accessibility |
| `code` | gpt-5.2-codex-max | TypeScript, business logic, algorithms |
| `review` | gpt-5.2-max | Code review, documentation |

## Command Reference

### Basic Usage

```bash
# Run full orchestration (default: 4 parallel agents)
./run.ps1

# Run with specific parallelism
./run.ps1 -MaxParallel 2

# Run specific phase only
./run.ps1 -Phase P1

# Resume from saved state
./run.ps1 -Resume

# Dry run (show plan without executing)
./run.ps1 -DryRun

# Show current status
./run.ps1 -Status
```

### Advanced Options

```bash
# TypeScript CLI directly
npx tsx orchestrate.ts --max-parallel 6 --phase P2 --resume
```

## File Structure

```
.claude/orchestration/
├── orchestrate.ts      # Main orchestration script
├── run.ps1             # Windows runner
├── run.sh              # Linux/macOS runner
├── package.json        # Dependencies
├── task-graph.json     # Task definitions and dependencies
├── state.json          # Execution state (auto-generated)
├── contexts/           # Agent context files
│   ├── foundation.md
│   ├── types.md
│   ├── websocket.md
│   ├── filters.md
│   ├── ui-core.md
│   └── ...
└── logs/               # Agent execution logs (auto-generated)
    ├── task-1.1.1.log
    ├── task-1.1.2.log
    └── ...
```

## Task Graph Structure

The `task-graph.json` defines:

- **Phases**: Major development phases (P1-P12)
- **Parallel Groups**: Tasks within a phase that can run simultaneously
- **Tasks**: Individual units of work
- **Dependencies**: What must complete before a task can start

Example:
```json
{
  "phases": [{
    "id": "P1",
    "name": "Foundation",
    "parallel_groups": [{
      "group_id": "P1-A",
      "tasks": [{
        "id": "1.1.1",
        "name": "Initialize React project",
        "type": "code",
        "dependencies": []
      }]
    }, {
      "group_id": "P1-B",
      "depends_on_groups": ["P1-A"],
      "tasks": [
        { "id": "1.1.2", "dependencies": ["1.1.1"] },
        { "id": "1.1.3", "dependencies": ["1.1.1"] }
      ]
    }]
  }]
}
```

## State Management

State is persisted in `state.json`:

```json
{
  "version": "1.0.0",
  "startedAt": "2024-01-15T10:00:00Z",
  "lastUpdated": "2024-01-15T12:30:00Z",
  "completedPhases": ["P1"],
  "completedGroups": ["P1-A", "P1-B", "P1-C"],
  "tasks": {
    "1.1.1": { "status": "completed", "completedAt": "..." },
    "1.1.2": { "status": "completed", "completedAt": "..." },
    "1.2.1": { "status": "in_progress", "startedAt": "..." }
  }
}
```

## Handling Failures

### Automatic Recovery
- Failed merges are retried with rebase
- Network errors trigger agent restart
- Timeouts kill agents gracefully

### Manual Recovery
1. Check logs: `logs/task-<id>.log`
2. Fix issues manually if needed
3. Resume: `./run.ps1 -Resume`

### Resetting State
```bash
# Remove state to start fresh
rm state.json

# Or remove specific task state
# Edit state.json and set task status to "pending"
```

## Context Files

Each task type has a context file providing:
- Technology stack information
- Code patterns to follow
- API references
- Quality requirements

Agents receive this context automatically based on the `context_file` field in `task-graph.json`.

## Parallel Groups by Phase

| Phase | Groups | Max Parallel Tasks |
|-------|--------|-------------------|
| P1: Foundation | 7 | 6 |
| P2: WebSocket | 7 | 8 |
| P3: Config Engine | 8 | 11 |
| P4: Core UI | 7 | 5 |
| P5: Matrix/Pipeline | 7 | 5 |
| P6: Filter Editors | 6 | 13 |
| P7: Monitoring | 10 | 7 |

## Troubleshooting

### Worktree Issues
```bash
# List all worktrees
git worktree list

# Remove orphaned worktree
git worktree remove .worktrees/task-X --force

# Prune worktree references
git worktree prune
```

### Merge Conflicts
1. The orchestrator attempts automatic rebase
2. If that fails, manually resolve:
   ```bash
   git checkout agent/task-X
   git rebase main
   # Fix conflicts
   git rebase --continue
   git checkout main
   git merge agent/task-X
   ```

### Agent Timeouts
- Default timeout: 10 minutes
- Edit `CONFIG.commandTimeout` in `orchestrate.ts` to adjust
- Check logs for what the agent was doing

## Contributing

To add new tasks:
1. Add to `task-graph.json`
2. Create/update context file in `contexts/`
3. Define `outputs` array (files the task must create)
4. Run with `--dry-run` to verify dependencies
