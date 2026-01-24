#!/usr/bin/env npx tsx

/**
 * CamillaDSP Frontend - Parallel Agent Orchestrator
 *
 * This script orchestrates multiple AI agents working in parallel on different tasks.
 * Each agent works on an independent git worktree and changes are merged back to main.
 *
 * WORKFLOW FOR EACH TASK:
 * 1. Create git worktree for isolation
 * 2. Run primary agent (Codex/GPT-5.2 for UI, Claude/Opus for code)
 * 3. Primary agent commits its changes
 * 4. Run Opus review agent to check code quality and fix issues
 * 5. Review agent commits any fixes
 * 6. Merge worktree branch to main
 * 7. Cleanup worktree
 *
 * IMPORTANT: This script should be run from the PROJECT ROOT directory,
 * not from the .claude/orchestration folder. The run.ps1 script handles this automatically.
 *
 * Usage:
 *   npx tsx .claude/orchestration/orchestrate.ts [options]
 *
 * Options:
 *   --max-parallel <n>    Maximum parallel agents (default: 4)
 *   --phase <id>          Run specific phase only
 *   --task <id>           Run specific task only (e.g., 5.1.1)
 *   --resume              Resume from saved state
 *   --dry-run             Show what would be done without executing
 *   --validate            Validate all context files exist
 *   --list-contexts       List all context files referenced by tasks
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Ensure we're running from project root (has .git folder)
function ensureProjectRoot(): void {
  if (!fs.existsSync('.git')) {
    // Try to find project root by looking for .git
    let current = process.cwd();
    while (current !== path.dirname(current)) {
      if (fs.existsSync(path.join(current, '.git'))) {
        process.chdir(current);
        log('info', `Changed to project root: ${current}`);
        return;
      }
      current = path.dirname(current);
    }
    throw new Error('Could not find project root (.git directory). Run from project root or a subdirectory.');
  }
}

// Call at startup
ensureProjectRoot();

// ============================================================================
// Types
// ============================================================================

interface Task {
  id: string;
  name: string;
  type: 'ui' | 'code' | 'review';
  context_file: string;
  estimated_complexity: 'low' | 'medium' | 'high';
  outputs: string[];
  dependencies: string[];
}

interface ParallelGroup {
  group_id: string;
  depends_on_groups?: string[];
  tasks: Task[];
}

interface Phase {
  id: string;
  name: string;
  depends_on_phases?: string[];
  parallel_groups: ParallelGroup[];
}

interface TaskGraph {
  version: string;
  project: string;
  models: {
    ui: string;
    code: string;
    review: string;
  };
  phases: Phase[];
}

interface TaskState {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  worktree?: string;
  branch?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  agent_pid?: number;
}

interface OrchestratorState {
  version: string;
  startedAt: string;
  lastUpdated: string;
  completedPhases: string[];
  completedGroups: string[];
  tasks: Record<string, TaskState>;
  activeAgents: number;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  maxParallelAgents: 4,
  worktreeBase: '.worktrees',
  stateFile: '.claude/orchestration/state.json',
  taskGraphFile: '.claude/orchestration/task-graph.json',
  contextDir: '.claude/orchestration/contexts',
  standardsFile: '.claude/orchestration/contexts/standards.md',
  logDir: '.claude/orchestration/logs',
  commandTimeout: 600000, // 10 minutes
  mergeRetries: 3,
  // CLI and model configuration per task type
  // Note: Using 'npx' wrapper for reliable PATH resolution on Windows
  agents: {
    ui: {
      cli: 'npx',
      args: ['codex', '--approval-mode', 'auto-edit', '--quiet'],
      model: 'gpt-5.2-max',           // GPT 5.2 for UI component generation
    },
    code: {
      cli: 'npx',
      args: ['@anthropic-ai/claude-code', '--print', '--dangerously-skip-permissions', '--max-turns', '50'],
      model: 'opus',                   // Opus 4.5 for code implementation
    },
    review: {
      cli: 'npx',
      args: ['@anthropic-ai/claude-code', '--print', '--dangerously-skip-permissions', '--max-turns', '50'],
      model: 'opus',                   // Opus 4.5 for thorough review/refactoring
    },
  },
};

// ============================================================================
// Utilities
// ============================================================================

function log(level: 'info' | 'warn' | 'error' | 'success', message: string): void {
  const colors = {
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    success: '\x1b[32m',
  };
  const reset = '\x1b[0m';
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`${colors[level]}[${timestamp}] ${message}${reset}`);
}

function exec(command: string, options?: { cwd?: string }): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      cwd: options?.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.stderr || error.message}`);
  }
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveContextPath(contextFile: string): string {
  return path.resolve(CONFIG.contextDir, '..', contextFile);
}

function getUniqueContextFiles(taskGraph: TaskGraph): string[] {
  const contexts = new Set<string>();
  for (const phase of taskGraph.phases) {
    for (const group of phase.parallel_groups) {
      for (const task of group.tasks) {
        contexts.add(task.context_file);
      }
    }
  }
  return Array.from(contexts).sort();
}

function validateContextFiles(taskGraph: TaskGraph): { valid: boolean; missing: string[]; found: string[] } {
  const contexts = getUniqueContextFiles(taskGraph);
  const missing: string[] = [];
  const found: string[] = [];

  for (const context of contexts) {
    const fullPath = resolveContextPath(context);
    if (fs.existsSync(fullPath)) {
      found.push(context);
    } else {
      missing.push(context);
    }
  }

  return { valid: missing.length === 0, missing, found };
}

function listContextFiles(taskGraph: TaskGraph): void {
  const contexts = getUniqueContextFiles(taskGraph);

  log('info', `\nContext files referenced by tasks (${contexts.length} total):`);
  log('info', '─'.repeat(60));

  // Group by directory
  const byDir = new Map<string, string[]>();
  for (const ctx of contexts) {
    const dir = path.dirname(ctx);
    if (!byDir.has(dir)) {
      byDir.set(dir, []);
    }
    byDir.get(dir)!.push(path.basename(ctx));
  }

  for (const [dir, files] of byDir) {
    log('info', `\n${dir}/`);
    for (const file of files) {
      const fullPath = resolveContextPath(`${dir}/${file}`);
      const exists = fs.existsSync(fullPath);
      const status = exists ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
      log('info', `  ${status} ${file}`);
    }
  }
  log('info', '');
}

function findTaskById(taskGraph: TaskGraph, taskId: string): { phase: Phase; group: ParallelGroup; task: Task } | null {
  for (const phase of taskGraph.phases) {
    for (const group of phase.parallel_groups) {
      for (const task of group.tasks) {
        if (task.id === taskId) {
          return { phase, group, task };
        }
      }
    }
  }
  return null;
}

// ============================================================================
// State Management
// ============================================================================

class StateManager {
  private state: OrchestratorState;
  private statePath: string;

  constructor(statePath: string) {
    this.statePath = statePath;
    this.state = this.load();
  }

  private load(): OrchestratorState {
    if (fs.existsSync(this.statePath)) {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
    }
    return {
      version: '1.0.0',
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      completedPhases: [],
      completedGroups: [],
      tasks: {},
      activeAgents: 0,
    };
  }

  save(): void {
    this.state.lastUpdated = new Date().toISOString();
    ensureDir(path.dirname(this.statePath));
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  getTaskState(taskId: string): TaskState {
    return this.state.tasks[taskId] || { status: 'pending' };
  }

  setTaskState(taskId: string, state: Partial<TaskState>): void {
    this.state.tasks[taskId] = {
      ...this.getTaskState(taskId),
      ...state,
    };
    this.save();
  }

  isTaskCompleted(taskId: string): boolean {
    return this.getTaskState(taskId).status === 'completed';
  }

  isGroupCompleted(groupId: string): boolean {
    return this.state.completedGroups.includes(groupId);
  }

  markGroupCompleted(groupId: string): void {
    if (!this.state.completedGroups.includes(groupId)) {
      this.state.completedGroups.push(groupId);
      this.save();
    }
  }

  isPhaseCompleted(phaseId: string): boolean {
    return this.state.completedPhases.includes(phaseId);
  }

  markPhaseCompleted(phaseId: string): void {
    if (!this.state.completedPhases.includes(phaseId)) {
      this.state.completedPhases.push(phaseId);
      this.save();
    }
  }

  getActiveAgentCount(): number {
    return this.state.activeAgents;
  }

  incrementActiveAgents(): void {
    this.state.activeAgents++;
    this.save();
  }

  decrementActiveAgents(): void {
    this.state.activeAgents = Math.max(0, this.state.activeAgents - 1);
    this.save();
  }

  getStats(): { total: number; completed: number; failed: number; pending: number } {
    const tasks = Object.values(this.state.tasks);
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      pending: tasks.filter((t) => t.status === 'pending').length,
    };
  }
}

// ============================================================================
// Git Worktree Manager
// ============================================================================

class WorktreeManager {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    ensureDir(baseDir);
  }

  create(taskId: string): string {
    const worktreePath = path.join(this.baseDir, `task-${taskId}`);
    const branchName = `agent/task-${taskId}`;

    if (fs.existsSync(worktreePath)) {
      log('warn', `Worktree already exists for task ${taskId}, removing...`);
      this.remove(taskId);
    }

    // Create branch from main
    try {
      exec(`git branch -D ${branchName} 2>/dev/null || true`);
    } catch {
      // Branch might not exist
    }

    exec(`git worktree add -b ${branchName} "${worktreePath}" main`);
    log('info', `Created worktree for task ${taskId} at ${worktreePath}`);

    return worktreePath;
  }

  remove(taskId: string): void {
    const worktreePath = path.join(this.baseDir, `task-${taskId}`);
    const branchName = `agent/task-${taskId}`;

    try {
      exec(`git worktree remove "${worktreePath}" --force`);
    } catch {
      // Worktree might not exist
    }

    try {
      exec(`git branch -D ${branchName}`);
    } catch {
      // Branch might not exist
    }
  }

  merge(taskId: string): boolean {
    const branchName = `agent/task-${taskId}`;

    for (let attempt = 1; attempt <= CONFIG.mergeRetries; attempt++) {
      try {
        // Fetch latest main
        exec('git fetch origin main');
        exec('git checkout main');
        exec('git pull origin main');

        // Merge the task branch
        exec(`git merge ${branchName} --no-ff -m "Merge task ${taskId}"`);

        log('success', `Merged task ${taskId} to main`);
        return true;
      } catch (error: any) {
        log('warn', `Merge attempt ${attempt} failed for task ${taskId}: ${error.message}`);

        if (attempt < CONFIG.mergeRetries) {
          // Try to resolve conflicts automatically
          try {
            exec('git merge --abort');
          } catch {
            // Ignore if no merge in progress
          }

          // Rebase and retry
          try {
            exec(`git checkout ${branchName}`);
            exec('git rebase main');
            exec('git checkout main');
          } catch {
            log('error', `Could not rebase ${branchName}`);
          }
        }
      }
    }

    log('error', `Failed to merge task ${taskId} after ${CONFIG.mergeRetries} attempts`);
    return false;
  }
}

// ============================================================================
// Agent Runner
// ============================================================================

interface AgentConfig {
  taskId: string;
  taskName: string;
  taskType: 'ui' | 'code' | 'review';
  model: string;
  contextFile: string;
  worktreePath: string;
  outputs: string[];
}

class AgentRunner {
  private logDir: string;

  constructor(logDir: string) {
    this.logDir = logDir;
    ensureDir(logDir);
  }

  async run(config: AgentConfig): Promise<boolean> {
    const { taskId, taskName, model, contextFile, worktreePath, outputs } = config;

    const logFile = path.join(this.logDir, `task-${taskId}.log`);
    const logStream = fs.createWriteStream(logFile);

    // Read context file
    let context = '';
    if (fs.existsSync(contextFile)) {
      context = fs.readFileSync(contextFile, 'utf-8');
      log('success', `  Context loaded: ${path.basename(contextFile)} (${context.length} bytes)`);
    } else {
      log('warn', `  Context file not found: ${contextFile}`);
    }

    // Build the prompt
    const prompt = this.buildPrompt(taskId, taskName, context, outputs, config.taskType);

    log('info', `Starting agent for task ${taskId}: ${taskName}`);
    log('info', `  Model: ${model}`);
    log('info', `  Type: ${config.taskType || 'code'}`);
    log('info', `  Worktree: ${worktreePath}`);
    log('info', `  Log: ${logFile}`);

    // Load standards context for review tasks
    let standards = '';
    if (config.taskType === 'review' && fs.existsSync(path.resolve(CONFIG.standardsFile))) {
      standards = fs.readFileSync(path.resolve(CONFIG.standardsFile), 'utf-8');
      log('info', `  Standards loaded for review task`);
    }

    // Build full prompt with standards if applicable
    const fullPrompt = standards ? `${prompt}\n\n## Standards Reference\n${standards}` : prompt;

    // Write prompt to temp file for logging
    const promptFile = path.join(this.logDir, `task-${taskId}.prompt.md`);
    fs.writeFileSync(promptFile, fullPrompt);

    // Get agent configuration based on task type
    const agentConfig = CONFIG.agents[config.taskType];
    // Check if this is Codex by looking at the args (first arg after 'npx' would be 'codex')
    const isCodex = agentConfig.args[0] === 'codex';

    // Build CLI arguments based on agent type
    let cliArgs: string[];
    if (isCodex) {
      // Codex CLI: npx codex --model <model> --approval-mode auto-edit --quiet "<prompt>"
      // Codex takes prompt as last positional argument
      cliArgs = [
        ...agentConfig.args,
        '--model', agentConfig.model,
        fullPrompt, // Prompt as last argument for Codex
      ];
    } else {
      // Claude Code CLI: npx @anthropic-ai/claude-code --print --model <model>
      // Uses stdin for prompt to avoid command-line length limits
      cliArgs = [
        ...agentConfig.args,
        '--model', agentConfig.model,
      ];
    }

    log('info', `  CLI: ${isCodex ? 'Codex/GPT' : 'Claude Code'}`);
    log('info', `  Task type: ${config.taskType}`);

    // Build command string to avoid Windows shell escaping issues
    const cmdParts = [agentConfig.cli, ...cliArgs];
    const cmdString = cmdParts.map(arg =>
      arg.includes(' ') ? `"${arg}"` : arg
    ).join(' ');

    log('info', `  Command: ${cmdString.substring(0, 100)}...`);

    return new Promise((resolve) => {
      const agent = spawn(
        cmdString,
        [],
        {
          cwd: worktreePath,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true, // Required for npx on Windows
          env: {
            ...process.env,
            ...(isCodex ? {} : { CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' }),
          },
        }
      );

      // For Claude Code, write prompt to stdin
      if (!isCodex) {
        agent.stdin?.write(fullPrompt);
        agent.stdin?.end();
      }

      agent.stdout?.on('data', (data) => {
        logStream.write(data);
      });

      agent.stderr?.on('data', (data) => {
        logStream.write(data);
      });

      const timeout = setTimeout(() => {
        log('warn', `Task ${taskId} timed out, killing agent`);
        agent.kill('SIGTERM');
        resolve(false);
      }, CONFIG.commandTimeout);

      agent.on('close', (code) => {
        clearTimeout(timeout);
        logStream.end();

        if (code === 0) {
          // Verify outputs exist
          const allOutputsExist = outputs.every((output) =>
            fs.existsSync(path.join(worktreePath, output))
          );

          if (allOutputsExist) {
            // Commit changes
            try {
              exec(`git add -A`, { cwd: worktreePath });
              exec(
                `git commit -m "Complete task ${taskId}: ${taskName}" --allow-empty`,
                { cwd: worktreePath }
              );
              log('success', `Task ${taskId} completed successfully`);
              resolve(true);
            } catch (error: any) {
              log('error', `Failed to commit task ${taskId}: ${error.message}`);
              resolve(false);
            }
          } else {
            log('warn', `Task ${taskId} did not produce all expected outputs`);
            resolve(false);
          }
        } else {
          log('error', `Task ${taskId} failed with code ${code}`);
          resolve(false);
        }
      });
    });
  }

  /**
   * Run Opus review on a completed task before merge.
   * Reviews and refactors the code to ensure standards compliance.
   */
  async runReview(taskId: string, taskName: string, worktreePath: string, outputs: string[]): Promise<boolean> {
    const logFile = path.join(this.logDir, `task-${taskId}.review.log`);
    const logStream = fs.createWriteStream(logFile);

    // Load standards context
    let standards = '';
    if (fs.existsSync(path.resolve(CONFIG.standardsFile))) {
      standards = fs.readFileSync(path.resolve(CONFIG.standardsFile), 'utf-8');
    }

    const prompt = this.buildReviewPrompt(taskId, taskName, outputs, standards);

    log('info', `Starting Opus review for task ${taskId}`);
    log('info', `  Review log: ${logFile}`);

    // Write prompt to temp file for logging
    const promptFile = path.join(this.logDir, `task-${taskId}.review.prompt.md`);
    fs.writeFileSync(promptFile, prompt);

    // Use review agent config (Opus)
    const agentConfig = CONFIG.agents.review;
    const cliArgs = [
      ...agentConfig.args,
      '--model', agentConfig.model,
    ];

    // Build command string to avoid Windows shell escaping issues
    const cmdParts = [agentConfig.cli, ...cliArgs];
    const cmdString = cmdParts.map(arg =>
      arg.includes(' ') ? `"${arg}"` : arg
    ).join(' ');

    log('info', `  Review command: ${cmdString}`);

    return new Promise((resolve) => {
      const agent = spawn(
        cmdString,
        [],
        {
          cwd: worktreePath,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true, // Required for npx on Windows
          env: {
            ...process.env,
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          },
        }
      );

      // Write prompt to stdin to avoid command-line length limits
      agent.stdin?.write(prompt);
      agent.stdin?.end();

      agent.stdout?.on('data', (data) => {
        logStream.write(data);
      });

      agent.stderr?.on('data', (data) => {
        logStream.write(data);
      });

      const timeout = setTimeout(() => {
        log('warn', `Review for task ${taskId} timed out, killing agent`);
        agent.kill('SIGTERM');
        resolve(false);
      }, CONFIG.commandTimeout);

      agent.on('close', (code) => {
        clearTimeout(timeout);
        logStream.end();

        if (code === 0) {
          // Commit review changes
          try {
            exec(`git add -A`, { cwd: worktreePath });
            exec(
              `git commit -m "Review task ${taskId}: code quality fixes" --allow-empty`,
              { cwd: worktreePath }
            );
            log('success', `Review for task ${taskId} completed`);
            resolve(true);
          } catch (error: any) {
            log('error', `Failed to commit review for task ${taskId}: ${error.message}`);
            resolve(false);
          }
        } else {
          log('error', `Review for task ${taskId} failed with code ${code}`);
          resolve(false);
        }
      });
    });
  }

  private buildReviewPrompt(taskId: string, taskName: string, outputs: string[], standards: string): string {
    return `
You are Opus 4.5, performing a professional code review for task ${taskId}: "${taskName}"

## Required Skills
Before reviewing, invoke these skills to load best practices:
- Run \`/vercel-react-best-practices\` for React/Next.js performance patterns
- Run \`/web-design-guidelines\` for UI/UX and accessibility compliance

## Your Mission
Review the code that was just created and fix any issues to ensure production quality.
You have full authority to edit files. Make the code better.

## Files to Review
${outputs.map((o) => `- ${o}`).join('\n')}

## Review Protocol

### Phase 1: Critical Issues (MUST FIX)

**Type Safety**
- Zero TypeScript errors - the code must compile cleanly
- No \`any\` types - replace with proper types or \`unknown\` + type guards
- Explicit return types on all exported functions
- Handle null/undefined explicitly - no non-null assertions (!)

**Accessibility (WCAG 2.1 AA)**
- All interactive elements keyboard accessible (Tab, Enter, Space, Escape)
- ARIA labels on icons, images, and custom controls
- Visible focus indicators (focus:ring-2 focus:ring-dsp-accent)
- role attributes for custom widgets (slider, grid, button)

**Error Handling**
- Async operations wrapped in try/catch or .catch()
- User-facing errors are friendly messages, not stack traces
- Loading states shown during async operations

### Phase 2: Performance Issues (SHOULD FIX)

**React Optimization**
- useMemo for expensive calculations
- useCallback for callbacks passed to children
- React.memo for pure presentational components
- No inline object/array literals in JSX (\`style={{}} ❌\`)

**Memory & Resources**
- useEffect cleanup functions for subscriptions
- AbortController for cancellable fetch requests
- Debounce rapid inputs (sliders, search, drag)

### Phase 3: Code Quality (SHOULD FIX)

- Remove unused imports and dead code
- Consistent naming: PascalCase components, camelCase functions
- Import order: external → @/ internal → relative → types
- Use semantic colors (bg-dsp-bg, bg-dsp-surface) not raw values

## Standards Reference
${standards}

## Instructions
1. Read all files listed above to understand context
2. Fix ALL Critical issues - these are non-negotiable
3. Fix Performance issues where practical
4. Fix Code Quality issues
5. Do NOT add features, tests, or documentation
6. Do NOT refactor working code just for style
7. Make minimal, targeted fixes

Begin review.
`.trim();
  }

  private buildPrompt(taskId: string, taskName: string, context: string, outputs: string[], taskType: 'ui' | 'code' | 'review' = 'code'): string {
    const typeInstructions = {
      ui: `
## Required Skills
Before writing code, invoke these skills for best practices:
- Run \`/vercel-react-best-practices\` for React performance patterns
- Run \`/web-design-guidelines\` for UI/UX compliance

## UI Component Guidelines

### Component Architecture
- Use React functional components with explicit TypeScript interfaces
- Single responsibility: one component = one purpose
- Composition over inheritance: build complex UIs from simple primitives
- Colocate related code: component, types, hooks, and styles together
- Use Radix UI primitives for accessible interactive elements

### TypeScript Requirements
- Define Props interface for every component (suffix with Props)
- Explicit return types: \`function Component(): React.ReactElement\`
- No \`any\` - use \`unknown\` with type guards if type is truly unknown
- Use discriminated unions for variant props
- Generic components where reusability is needed

### Styling (Tailwind CSS)
- Dark theme tokens: bg-dsp-bg (#0a0a0a), bg-dsp-surface (#1a1a1a), text-white
- Use cn() utility for conditional class merging
- Group classes logically: layout → sizing → appearance → states
- Filter colors: eq=cyan, dynamics=orange, fir=purple, delay=blue, limiter=red
- No inline styles except for dynamic values (transforms, calculated positions)

### State & Props
- Props for configuration, hooks for behavior
- Lift state only when siblings need it
- Use controlled components for form inputs
- Callbacks: \`on[Event]\` naming (onClick, onChange, onSelect)
- Memoize callbacks with useCallback when passed to children
- Memoize expensive computations with useMemo

### Performance
- React.memo() for pure presentational components
- Virtualize lists with >50 items (react-window)
- Debounce rapid user inputs (100-300ms for sliders/drag)
- Use requestAnimationFrame for drag operations
- Avoid inline object literals in JSX: \`style={{}} ❌\`

### Accessibility (WCAG 2.1 AA)
- All interactive elements keyboard accessible (Tab, Enter, Space, Escape)
- Visible focus indicators (ring-2 ring-dsp-accent)
- ARIA labels for non-text content: aria-label, aria-labelledby
- Role attributes for custom widgets: role="slider", role="grid"
- Live regions for dynamic content: aria-live="polite"
- Color contrast ratio minimum 4.5:1 for text
- Touch targets minimum 44x44px

### Error Handling
- Error boundaries around feature sections
- Graceful degradation: show fallback UI, not crashes
- User-friendly error messages, not stack traces
- Loading states for async operations`,
      code: `
## Code Implementation Guidelines

### Required Skills (if React code)
If implementing React components or hooks, invoke:
- Run \`/vercel-react-best-practices\` for performance patterns

### TypeScript Strict Mode
- Enable all strict flags: strict, noImplicitAny, strictNullChecks
- Explicit return types on all exported functions
- No type assertions (as) unless absolutely necessary
- Use type predicates for type narrowing
- Prefer interfaces for objects, types for unions/primitives

### Functions & Modules
- Pure functions where possible (same input = same output)
- Single responsibility: one function = one task
- Early returns for guard clauses
- Descriptive names: verb + noun (calculateResponse, parseConfig)
- Max 3 parameters; use options object for more

### Async Operations
- Always handle errors: try/catch or .catch()
- Use AbortController for cancellable operations
- Implement timeouts for network requests
- Show loading states during async work
- Clean up subscriptions in useEffect return

### State Management (Zustand)
- Separate stores by domain (connection, config, ui)
- Actions as store methods with verb prefixes (set, update, reset)
- Selectors for derived state (get prefix)
- Immer for immutable updates
- Persist critical state to localStorage

### WebSocket Patterns
- Implement reconnection with exponential backoff
- Message queue for offline buffering
- Request/response correlation with IDs
- Heartbeat for connection health
- Graceful degradation when disconnected`,
      review: `
## Code Review Standards (Opus 4.5)

You are performing a professional code review. Apply these standards rigorously.

### Required Skills
Before reviewing, invoke these skills:
- Run \`/vercel-react-best-practices\` for React performance patterns
- Run \`/web-design-guidelines\` for UI/UX and accessibility audit

### Critical (Must Fix)
These issues MUST be fixed before merge:

**Type Safety**
- [ ] Zero TypeScript errors (\`tsc --noEmit\` passes)
- [ ] No \`any\` types without documented justification
- [ ] All exported functions have explicit return types
- [ ] Null/undefined handled explicitly (no non-null assertions)

**Accessibility**
- [ ] Interactive elements are keyboard accessible
- [ ] ARIA labels present for icons, images, custom controls
- [ ] Focus management correct for modals/dialogs
- [ ] Color is not the only means of conveying information

**Security**
- [ ] No XSS vulnerabilities (user input sanitized)
- [ ] No secrets or credentials in code
- [ ] URLs validated before use

### Important (Should Fix)
Fix these unless there's a documented reason not to:

**Performance**
- [ ] Expensive calculations memoized (useMemo)
- [ ] Callbacks wrapped in useCallback when passed as props
- [ ] No inline object/array literals in JSX
- [ ] Lists >50 items virtualized
- [ ] Images lazy-loaded

**React Patterns**
- [ ] Components are pure (no side effects in render)
- [ ] useEffect dependencies correct (no missing deps)
- [ ] Keys are stable and unique (not array index)
- [ ] Error boundaries around feature sections

**Code Quality**
- [ ] No dead code or unused imports
- [ ] No commented-out code blocks
- [ ] Consistent naming conventions
- [ ] Functions under 50 lines
- [ ] Files under 300 lines

### Style (Nice to Have)
- [ ] JSDoc comments on exported functions
- [ ] Import order: external → internal → relative → types
- [ ] Semantic color variables used (not raw hex)
- [ ] Consistent spacing and formatting

### Review Process
1. Read all files to understand context
2. Check each Critical item - fix if failing
3. Check each Important item - fix if practical
4. Run mental type-check: would \`tsc\` pass?
5. Commit fixes with descriptive message`,
    };

    return `
You are an AI agent working on task ${taskId}: "${taskName}"

## Context
${context}

## Your Task
Complete the implementation for: ${taskName}
${typeInstructions[taskType]}

## Expected Outputs
You must create or modify these files:
${outputs.map((o) => `- ${o}`).join('\n')}

## Instructions
1. Read any existing relevant files first
2. Implement the task following the patterns in the context
3. Ensure all TypeScript types are correct
4. Write clean, well-documented code
5. Do NOT create test files unless specifically asked
6. When done, ensure all expected output files exist

Begin implementation now.
`.trim();
  }
}

// ============================================================================
// Orchestrator
// ============================================================================

class Orchestrator {
  private taskGraph: TaskGraph;
  private state: StateManager;
  private worktrees: WorktreeManager;
  private agents: AgentRunner;
  private maxParallel: number;

  constructor(options: { maxParallel?: number; resume?: boolean }) {
    this.maxParallel = options.maxParallel || CONFIG.maxParallelAgents;

    // Load task graph
    const graphPath = path.resolve(CONFIG.taskGraphFile);
    this.taskGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));

    // Initialize managers
    this.state = new StateManager(CONFIG.stateFile);
    this.worktrees = new WorktreeManager(CONFIG.worktreeBase);
    this.agents = new AgentRunner(CONFIG.logDir);

    if (!options.resume) {
      // Clean start - remove state file
      if (fs.existsSync(CONFIG.stateFile)) {
        fs.unlinkSync(CONFIG.stateFile);
      }
      this.state = new StateManager(CONFIG.stateFile);
    }
  }

  async run(): Promise<void> {
    log('info', '='.repeat(60));
    log('info', 'CamillaDSP Frontend - Parallel Agent Orchestrator');
    log('info', '='.repeat(60));
    log('info', `Max parallel agents: ${this.maxParallel}`);
    log('info', `Total phases: ${this.taskGraph.phases.length}`);

    for (const phase of this.taskGraph.phases) {
      if (this.state.isPhaseCompleted(phase.id)) {
        log('info', `Phase ${phase.id} already completed, skipping`);
        continue;
      }

      // Check phase dependencies
      if (phase.depends_on_phases) {
        const pendingDeps = phase.depends_on_phases.filter(
          (dep) => !this.state.isPhaseCompleted(dep)
        );
        if (pendingDeps.length > 0) {
          log('warn', `Phase ${phase.id} blocked by: ${pendingDeps.join(', ')}`);
          continue;
        }
      }

      log('info', `\n${'='.repeat(60)}`);
      log('info', `Starting Phase ${phase.id}: ${phase.name}`);
      log('info', '='.repeat(60));

      await this.runPhase(phase);
    }

    // Final summary
    const stats = this.state.getStats();
    log('info', '\n' + '='.repeat(60));
    log('info', 'ORCHESTRATION COMPLETE');
    log('info', '='.repeat(60));
    log('info', `Total tasks: ${stats.total}`);
    log('success', `Completed: ${stats.completed}`);
    if (stats.failed > 0) {
      log('error', `Failed: ${stats.failed}`);
    }
    log('info', `Pending: ${stats.pending}`);
  }

  private async runPhase(phase: Phase): Promise<void> {
    for (const group of phase.parallel_groups) {
      if (this.state.isGroupCompleted(group.group_id)) {
        log('info', `Group ${group.group_id} already completed, skipping`);
        continue;
      }

      // Check group dependencies
      if (group.depends_on_groups) {
        const pendingDeps = group.depends_on_groups.filter(
          (dep) => !this.state.isGroupCompleted(dep)
        );
        if (pendingDeps.length > 0) {
          log('warn', `Group ${group.group_id} blocked by: ${pendingDeps.join(', ')}`);
          continue;
        }
      }

      log('info', `\nRunning parallel group ${group.group_id} (${group.tasks.length} tasks)`);
      await this.runParallelGroup(group);
    }

    // Check if all groups in phase are completed
    const allGroupsCompleted = phase.parallel_groups.every((g) =>
      this.state.isGroupCompleted(g.group_id)
    );

    if (allGroupsCompleted) {
      this.state.markPhaseCompleted(phase.id);
      log('success', `Phase ${phase.id} completed!`);
    }
  }

  private async runParallelGroup(group: ParallelGroup): Promise<void> {
    const readyTasks = group.tasks.filter((task) => {
      // Check if task is already completed
      if (this.state.isTaskCompleted(task.id)) {
        return false;
      }

      // Check task dependencies
      const pendingDeps = task.dependencies.filter(
        (dep) => !this.state.isTaskCompleted(dep)
      );
      return pendingDeps.length === 0;
    });

    if (readyTasks.length === 0) {
      log('warn', `No ready tasks in group ${group.group_id}`);
      return;
    }

    log('info', `Found ${readyTasks.length} ready tasks in group ${group.group_id}`);

    // Process tasks in batches based on max parallel
    const batches = this.batchTasks(readyTasks, this.maxParallel);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      log('info', `\nProcessing batch ${i + 1}/${batches.length} (${batch.length} tasks)`);

      // Run batch in parallel
      const results = await Promise.all(
        batch.map((task) => this.runTask(task))
      );

      // Check results
      const failed = batch.filter((_, idx) => !results[idx]);
      if (failed.length > 0) {
        log('error', `Failed tasks: ${failed.map((t) => t.id).join(', ')}`);
      }
    }

    // Check if all tasks in group are completed
    const allTasksCompleted = group.tasks.every((t) => this.state.isTaskCompleted(t.id));

    if (allTasksCompleted) {
      this.state.markGroupCompleted(group.group_id);
      log('success', `Group ${group.group_id} completed!`);
    }
  }

  private async runTask(task: Task): Promise<boolean> {
    // Get agent configuration for this task type
    const agentConfig = CONFIG.agents[task.type];
    // Override model from task graph if specified, otherwise use agent config default
    const model = this.taskGraph.models?.[task.type] || agentConfig.model;
    const contextFile = resolveContextPath(task.context_file);

    log('info', `\nTask ${task.id}: ${task.name}`);
    log('info', `  Type: ${task.type}`);
    log('info', `  Agent: ${agentConfig.cli === 'npx' ? 'Codex (GPT 5.2)' : 'Claude Code (Opus)'}`);
    log('info', `  Model: ${model}`);
    log('info', `  Context: ${task.context_file}`);

    // Create worktree
    let worktreePath: string;
    try {
      worktreePath = this.worktrees.create(task.id);
    } catch (error: any) {
      log('error', `Failed to create worktree for task ${task.id}: ${error.message}`);
      this.state.setTaskState(task.id, { status: 'failed', error: error.message });
      return false;
    }

    // Update state
    this.state.setTaskState(task.id, {
      status: 'in_progress',
      worktree: worktreePath,
      branch: `agent/task-${task.id}`,
      startedAt: new Date().toISOString(),
    });
    this.state.incrementActiveAgents();

    try {
      // Run agent
      const success = await this.agents.run({
        taskId: task.id,
        taskName: task.name,
        taskType: task.type,
        model,
        contextFile,
        worktreePath,
        outputs: task.outputs,
      });

      if (success) {
        // Run Opus review before merge (for non-review tasks)
        if (task.type !== 'review') {
          log('info', `Running Opus review for task ${task.id}...`);
          const reviewSuccess = await this.agents.runReview(
            task.id,
            task.name,
            worktreePath,
            task.outputs
          );

          if (!reviewSuccess) {
            log('warn', `Review failed for task ${task.id}, proceeding with merge anyway`);
            // Don't fail the task if review fails - the code was created successfully
          }
        }

        // Merge changes
        const merged = this.worktrees.merge(task.id);

        if (merged) {
          this.state.setTaskState(task.id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
          });
        } else {
          this.state.setTaskState(task.id, {
            status: 'failed',
            error: 'Merge failed',
          });
          return false;
        }
      } else {
        this.state.setTaskState(task.id, {
          status: 'failed',
          error: 'Agent failed',
        });
        return false;
      }

      return success;
    } finally {
      this.state.decrementActiveAgents();

      // Cleanup worktree
      try {
        this.worktrees.remove(task.id);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private batchTasks(tasks: Task[], batchSize: number): Task[][] {
    const batches: Task[][] = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
      batches.push(tasks.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Run a single task directly, bypassing phase/group dependencies.
   * Useful for testing individual context files.
   */
  async runSingleTask(task: Task): Promise<boolean> {
    log('info', '='.repeat(60));
    log('info', 'Single Task Execution');
    log('info', '='.repeat(60));

    const success = await this.runTask(task);

    log('info', '='.repeat(60));
    if (success) {
      log('success', `Task ${task.id} completed successfully`);
    } else {
      log('error', `Task ${task.id} failed`);
    }
    log('info', '='.repeat(60));

    return success;
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options = {
    maxParallel: CONFIG.maxParallelAgents,
    resume: false,
    dryRun: false,
    validate: false,
    listContexts: false,
    phase: undefined as string | undefined,
    task: undefined as string | undefined,
  };

  // Load task graph early for validation/listing
  const graphPath = path.resolve(CONFIG.taskGraphFile);
  if (!fs.existsSync(graphPath)) {
    log('error', `Task graph not found: ${graphPath}`);
    process.exit(1);
  }
  const taskGraph: TaskGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));

  // Debug: log raw arguments
  log('info', `Raw arguments: ${JSON.stringify(args)}`);

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--max-parallel':
        const maxParallelValue = parseInt(args[++i], 10);
        log('info', `Parsed --max-parallel: ${maxParallelValue}`);
        options.maxParallel = maxParallelValue;
        break;
      case '--resume':
        options.resume = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--validate':
        options.validate = true;
        break;
      case '--list-contexts':
        options.listContexts = true;
        break;
      case '--phase':
        options.phase = args[++i];
        break;
      case '--task':
        options.task = args[++i];
        break;
      case '--help':
        console.log(`
CamillaDSP Frontend - Parallel Agent Orchestrator

Usage: npx tsx orchestrate.ts [options]

Options:
  --max-parallel <n>    Maximum parallel agents (default: ${CONFIG.maxParallelAgents})
  --phase <id>          Run specific phase only (e.g., P1, P2)
  --task <id>           Run specific task only (e.g., 5.1.1, 7.2.2)
  --resume              Resume from saved state
  --dry-run             Show what would be done without executing
  --validate            Validate all context files exist before running
  --list-contexts       List all context files and their status
  --help                Show this help message

Examples:
  npx tsx orchestrate.ts --validate
  npx tsx orchestrate.ts --list-contexts
  npx tsx orchestrate.ts --task 5.1.1
  npx tsx orchestrate.ts --phase P5 --max-parallel 2
        `);
        process.exit(0);
    }
  }

  // Handle list contexts
  if (options.listContexts) {
    listContextFiles(taskGraph);
    process.exit(0);
  }

  // Handle validate
  if (options.validate) {
    log('info', 'Validating context files...');
    const result = validateContextFiles(taskGraph);

    if (result.found.length > 0) {
      log('success', `\nFound ${result.found.length} context files:`);
      result.found.forEach((f) => log('info', `  ✓ ${f}`));
    }

    if (result.missing.length > 0) {
      log('error', `\nMissing ${result.missing.length} context files:`);
      result.missing.forEach((f) => log('error', `  ✗ ${f}`));
      process.exit(1);
    } else {
      log('success', '\nAll context files validated successfully!');
      process.exit(0);
    }
  }

  // Handle single task execution
  if (options.task) {
    const found = findTaskById(taskGraph, options.task);
    if (!found) {
      log('error', `Task not found: ${options.task}`);
      log('info', 'Available tasks in format X.Y.Z (e.g., 5.1.1, 7.2.2)');
      process.exit(1);
    }

    log('info', `Running single task: ${found.task.id} - ${found.task.name}`);
    log('info', `Phase: ${found.phase.id} (${found.phase.name})`);
    log('info', `Group: ${found.group.group_id}`);
    log('info', `Context: ${found.task.context_file}`);

    // Validate context file exists
    const contextPath = resolveContextPath(found.task.context_file);
    if (!fs.existsSync(contextPath)) {
      log('error', `Context file not found: ${contextPath}`);
      process.exit(1);
    }

    const orchestrator = new Orchestrator({ maxParallel: 1, resume: options.resume });
    const success = await orchestrator.runSingleTask(found.task);
    process.exit(success ? 0 : 1);
  }

  if (options.dryRun) {
    log('info', 'DRY RUN MODE - No changes will be made');

    // Show what would be executed
    for (const phase of taskGraph.phases) {
      if (options.phase && phase.id !== options.phase) continue;

      log('info', `\nPhase ${phase.id}: ${phase.name}`);
      for (const group of phase.parallel_groups) {
        log('info', `  Group ${group.group_id} (${group.tasks.length} tasks)`);
        for (const task of group.tasks) {
          const contextExists = fs.existsSync(resolveContextPath(task.context_file));
          const status = contextExists ? '✓' : '✗';
          log('info', `    ${status} ${task.id}: ${task.name}`);
        }
      }
    }
    return;
  }

  const orchestrator = new Orchestrator(options);
  await orchestrator.run();
}

main().catch((error) => {
  log('error', `Fatal error: ${error.message}`);
  process.exit(1);
});
