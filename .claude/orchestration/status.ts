#!/usr/bin/env npx tsx

/**
 * Status viewer for the CamillaDSP Frontend Orchestrator
 * Shows current progress, dependencies, and task status
 */

import * as fs from 'fs';
import * as path from 'path';

interface TaskState {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  startedAt?: string;
  completedAt?: string;
  error?: string;
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

interface Task {
  id: string;
  name: string;
  type: string;
  dependencies: string[];
}

interface Phase {
  id: string;
  name: string;
  parallel_groups: { group_id: string; tasks: Task[] }[];
}

interface TaskGraph {
  phases: Phase[];
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function getStatusIcon(status: TaskState['status']): string {
  switch (status) {
    case 'completed': return colorize('✓', 'green');
    case 'in_progress': return colorize('●', 'yellow');
    case 'failed': return colorize('✗', 'red');
    case 'blocked': return colorize('○', 'gray');
    case 'pending': return colorize('○', 'dim');
    default: return '?';
  }
}

function formatDuration(startDate: string, endDate?: string): string {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function main(): void {
  const stateFile = '.claude/orchestration/state.json';
  const graphFile = '.claude/orchestration/task-graph.json';

  // Check if state exists
  if (!fs.existsSync(stateFile)) {
    console.log(colorize('\nNo orchestration state found.', 'yellow'));
    console.log('Run the orchestrator to start: ./run.ps1\n');
    return;
  }

  // Load files
  const state: OrchestratorState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  const graph: TaskGraph = JSON.parse(fs.readFileSync(graphFile, 'utf-8'));

  // Header
  console.log('\n' + '═'.repeat(70));
  console.log(colorize('  CamillaDSP Frontend - Orchestration Status', 'bold'));
  console.log('═'.repeat(70));

  // Summary
  const taskStates = Object.values(state.tasks);
  const completed = taskStates.filter(t => t.status === 'completed').length;
  const failed = taskStates.filter(t => t.status === 'failed').length;
  const inProgress = taskStates.filter(t => t.status === 'in_progress').length;
  const pending = taskStates.filter(t => t.status === 'pending').length;

  // Get total tasks from graph
  let totalTasks = 0;
  for (const phase of graph.phases) {
    for (const group of phase.parallel_groups) {
      totalTasks += group.tasks.length;
    }
  }

  console.log('\n' + colorize('Summary', 'bold'));
  console.log('─'.repeat(40));
  console.log(`Started:      ${new Date(state.startedAt).toLocaleString()}`);
  console.log(`Last Updated: ${new Date(state.lastUpdated).toLocaleString()}`);
  console.log(`Duration:     ${formatDuration(state.startedAt)}`);
  console.log('');

  // Progress bar
  const progressPercent = Math.round((completed / totalTasks) * 100);
  const progressBar = '█'.repeat(Math.floor(progressPercent / 2)) +
                      '░'.repeat(50 - Math.floor(progressPercent / 2));
  console.log(`Progress: [${colorize(progressBar, 'green')}] ${progressPercent}%`);
  console.log('');

  console.log(`${colorize('✓', 'green')} Completed:   ${completed}/${totalTasks}`);
  if (inProgress > 0) {
    console.log(`${colorize('●', 'yellow')} In Progress: ${inProgress}`);
  }
  if (failed > 0) {
    console.log(`${colorize('✗', 'red')} Failed:      ${failed}`);
  }
  console.log(`${colorize('○', 'dim')} Pending:     ${pending}`);
  console.log(`Active Agents: ${state.activeAgents}`);

  // Phase progress
  console.log('\n' + colorize('Phases', 'bold'));
  console.log('─'.repeat(40));

  for (const phase of graph.phases) {
    const phaseCompleted = state.completedPhases.includes(phase.id);
    const icon = phaseCompleted ? colorize('✓', 'green') : colorize('○', 'dim');

    // Count tasks in phase
    let phaseTasks = 0;
    let phaseCompletedTasks = 0;
    for (const group of phase.parallel_groups) {
      phaseTasks += group.tasks.length;
      for (const task of group.tasks) {
        if (state.tasks[task.id]?.status === 'completed') {
          phaseCompletedTasks++;
        }
      }
    }

    const phasePercent = phaseTasks > 0 ? Math.round((phaseCompletedTasks / phaseTasks) * 100) : 0;
    console.log(`${icon} ${phase.id}: ${phase.name} (${phaseCompletedTasks}/${phaseTasks} = ${phasePercent}%)`);
  }

  // Failed tasks detail
  if (failed > 0) {
    console.log('\n' + colorize('Failed Tasks', 'red'));
    console.log('─'.repeat(40));

    for (const [taskId, taskState] of Object.entries(state.tasks)) {
      if (taskState.status === 'failed') {
        // Find task name
        let taskName = taskId;
        for (const phase of graph.phases) {
          for (const group of phase.parallel_groups) {
            const task = group.tasks.find(t => t.id === taskId);
            if (task) {
              taskName = task.name;
              break;
            }
          }
        }

        console.log(`\n${colorize(taskId, 'bold')}: ${taskName}`);
        if (taskState.error) {
          console.log(`  Error: ${colorize(taskState.error, 'red')}`);
        }
        console.log(`  Log: .claude/orchestration/logs/task-${taskId}.log`);
      }
    }
  }

  // In-progress tasks
  if (inProgress > 0) {
    console.log('\n' + colorize('In Progress', 'yellow'));
    console.log('─'.repeat(40));

    for (const [taskId, taskState] of Object.entries(state.tasks)) {
      if (taskState.status === 'in_progress') {
        let taskName = taskId;
        for (const phase of graph.phases) {
          for (const group of phase.parallel_groups) {
            const task = group.tasks.find(t => t.id === taskId);
            if (task) {
              taskName = task.name;
              break;
            }
          }
        }

        const duration = taskState.startedAt ? formatDuration(taskState.startedAt) : '?';
        console.log(`${colorize('●', 'yellow')} ${taskId}: ${taskName} (${duration})`);
      }
    }
  }

  // Next up
  console.log('\n' + colorize('Next Tasks Ready', 'blue'));
  console.log('─'.repeat(40));

  let nextTasks: { id: string; name: string; phase: string }[] = [];

  for (const phase of graph.phases) {
    // Check phase dependencies
    if (phase.depends_on_phases) {
      const unmetPhaseDeps = phase.depends_on_phases.filter(
        dep => !state.completedPhases.includes(dep)
      );
      if (unmetPhaseDeps.length > 0) continue;
    }

    for (const group of phase.parallel_groups) {
      // Check group dependencies
      if (group.depends_on_groups) {
        const unmetGroupDeps = group.depends_on_groups.filter(
          dep => !state.completedGroups.includes(dep)
        );
        if (unmetGroupDeps.length > 0) continue;
      }

      for (const task of group.tasks) {
        const taskState = state.tasks[task.id];
        if (taskState && taskState.status !== 'pending') continue;

        // Check task dependencies
        const unmetDeps = task.dependencies.filter(
          dep => state.tasks[dep]?.status !== 'completed'
        );
        if (unmetDeps.length === 0) {
          nextTasks.push({ id: task.id, name: task.name, phase: phase.id });
        }
      }
    }
  }

  if (nextTasks.length === 0) {
    console.log('  No tasks ready (all completed or blocked)');
  } else {
    for (const task of nextTasks.slice(0, 10)) {
      console.log(`  ${colorize('→', 'blue')} ${task.id}: ${task.name} (${task.phase})`);
    }
    if (nextTasks.length > 10) {
      console.log(`  ... and ${nextTasks.length - 10} more`);
    }
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

main();
