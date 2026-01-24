const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let watcher = null;
const terminals = new Map(); // taskId -> { terminal, commandsDir }

function activate(context) {
  console.log('Orchestrator Terminal Manager activated');

  // Get workspace root
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    console.log('No workspace folder found');
    return;
  }

  // Directory where orchestrator writes terminal commands
  const commandsDir = path.join(workspaceRoot, '.claude', 'orchestration', 'terminals');

  // Ensure directory exists
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }

  // Write activation marker so orchestrator knows extension is active
  const activationFile = path.join(commandsDir, '.extension-active');
  fs.writeFileSync(activationFile, JSON.stringify({
    timestamp: Date.now(),
    version: '1.0.0'
  }));
  console.log('Extension activation marker written:', activationFile);

  // Watch for new command files
  const pattern = new vscode.RelativePattern(commandsDir, '*.json');
  watcher = vscode.workspace.createFileSystemWatcher(pattern, false, true, true);

  watcher.onDidCreate(async (uri) => {
    try {
      // Small delay to ensure file is fully written
      await new Promise(r => setTimeout(r, 100));

      // Read command file
      const content = fs.readFileSync(uri.fsPath, 'utf-8');
      const cmd = JSON.parse(content);

      console.log(`Opening terminal for task: ${cmd.taskId}`);

      // Create terminal with shell integration to track exit
      const terminal = vscode.window.createTerminal({
        name: `Agent: ${cmd.taskId}`,
        cwd: cmd.cwd,
        env: cmd.env,
      });

      const taskId = cmd.taskId;
      terminals.set(taskId, { terminal, commandsDir, logFile: cmd.logFile });

      // Show terminal
      terminal.show(false); // false = don't take focus

      // Build command with exit code capture
      // After the command completes, write exit code to .done file
      const doneFile = path.join(commandsDir, `${taskId}.done`).replace(/\\/g, '/');
      let fullCommand;

      if (cmd.stdinFile) {
        // For Claude Code: pipe stdin from file
        const stdinPath = cmd.stdinFile.replace(/\\/g, '/');
        fullCommand = `Get-Content -Path "${stdinPath}" -Raw | ${cmd.command}; $exitCode = $LASTEXITCODE; @{exitCode=$exitCode} | ConvertTo-Json | Out-File -FilePath "${doneFile}" -Encoding utf8`;
      } else {
        fullCommand = `${cmd.command}; $exitCode = $LASTEXITCODE; @{exitCode=$exitCode} | ConvertTo-Json | Out-File -FilePath "${doneFile}" -Encoding utf8`;
      }

      terminal.sendText(fullCommand, true); // true = execute command (press Enter)

      // Write acknowledgment
      const ackFile = uri.fsPath.replace('.json', '.ack');
      fs.writeFileSync(ackFile, JSON.stringify({ started: true, timestamp: Date.now() }));

      // Delete command file
      try {
        fs.unlinkSync(uri.fsPath);
      } catch (e) {
        console.log('Could not delete command file:', e.message);
      }

    } catch (error) {
      console.error('Error processing command file:', error);
    }
  });

  // Track terminal closures
  vscode.window.onDidCloseTerminal((closedTerminal) => {
    for (const [taskId, data] of terminals.entries()) {
      if (data.terminal === closedTerminal) {
        console.log(`Terminal closed for task: ${taskId}`);

        // Write done file with unknown exit code (terminal was closed manually)
        const doneFile = path.join(data.commandsDir, `${taskId}.done`);
        if (!fs.existsSync(doneFile)) {
          fs.writeFileSync(doneFile, JSON.stringify({ exitCode: -2, closedManually: true }));
        }

        terminals.delete(taskId);
        break;
      }
    }
  });

  // Register manual command
  const disposable = vscode.commands.registerCommand('orchestrator.openTerminal', () => {
    vscode.window.showInformationMessage(`Orchestrator Terminal Manager is active. ${terminals.size} terminals running.`);
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(watcher);

  // Cleanup on deactivate
  context.subscriptions.push({
    dispose: () => {
      terminals.forEach(data => data.terminal.dispose());
      terminals.clear();
    }
  });

  vscode.window.showInformationMessage('Orchestrator Terminal Manager ready - watching for agent commands');
}

function deactivate() {
  if (watcher) {
    watcher.dispose();
  }
  terminals.forEach(data => data.terminal.dispose());
  terminals.clear();
}

module.exports = {
  activate,
  deactivate
};
