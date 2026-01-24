#!/usr/bin/env npx tsx

/**
 * CamillaDSP Frontend - Parallel Agent Orchestrator
 *
 * This script orchestrates multiple AI agents working in parallel on different tasks.
 * Each agent works on an independent git worktree and changes are merged back to main.
 *
 * Usage:
 *   npx tsx orchestrate.ts [options]
 *
 * Options:
 *   --max-parallel <n>    Maximum parallel agents (default: 4)
 *   --phase <id>          Run specific phase only
 *   --resume              Resume from saved state
 *   --dry-run             Show what would be done without executing
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

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
  logDir: '.claude/orchestration/logs',
  commandTimeout: 600000, // 10 minutes
  mergeRetries: 3,
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
    const contextPath = path.resolve(contextFile);
    const context = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf-8') : '';

    // Build the prompt
    const prompt = this.buildPrompt(taskId, taskName, context, outputs);

    log('info', `Starting agent for task ${taskId}: ${taskName}`);
    log('info', `  Model: ${model}`);
    log('info', `  Worktree: ${worktreePath}`);
    log('info', `  Log: ${logFile}`);

    return new Promise((resolve) => {
      // Use codex CLI or appropriate AI CLI tool
      const agent = spawn(
        'npx',
        [
          'codex',
          '--model', model,
          '--approval-mode', 'auto-edit',
          '--quiet',
          prompt,
        ],
        {
          cwd: worktreePath,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        }
      );

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

  private buildPrompt(taskId: string, taskName: string, context: string, outputs: string[]): string {
    return `
You are an AI agent working on task ${taskId}: "${taskName}"

## Context
${context}

## Your Task
Complete the implementation for: ${taskName}

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
    const model = this.taskGraph.models[task.type];
    const contextFile = path.resolve(CONFIG.contextDir, '..', task.context_file);

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
        model,
        contextFile,
        worktreePath,
        outputs: task.outputs,
      });

      if (success) {
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
    phase: undefined as string | undefined,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--max-parallel':
        options.maxParallel = parseInt(args[++i], 10);
        break;
      case '--resume':
        options.resume = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--phase':
        options.phase = args[++i];
        break;
      case '--help':
        console.log(`
CamillaDSP Frontend - Parallel Agent Orchestrator

Usage: npx tsx orchestrate.ts [options]

Options:
  --max-parallel <n>    Maximum parallel agents (default: ${CONFIG.maxParallelAgents})
  --phase <id>          Run specific phase only (e.g., P1, P2)
  --resume              Resume from saved state
  --dry-run             Show what would be done without executing
  --help                Show this help message
        `);
        process.exit(0);
    }
  }

  if (options.dryRun) {
    log('info', 'DRY RUN MODE - No changes will be made');
    // TODO: Implement dry run visualization
    return;
  }

  const orchestrator = new Orchestrator(options);
  await orchestrator.run();
}

main().catch((error) => {
  log('error', `Fatal error: ${error.message}`);
  process.exit(1);
});
