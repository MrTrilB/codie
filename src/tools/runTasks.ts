import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const runTasksTool: Tool = {
  id: 'runTasks',
  label: 'Run Tasks',
  description: 'Run tasks and get their output',
  icon: 'tasklist',
  inputSchema: {
    task: { type: 'string', required: true, description: 'Task name or label' }
  },
  outputSchema: {
    output: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ task }: { task: string }, _context?: ToolContext) {
    try {
      await vscode.commands.executeCommand('workbench.action.tasks.runTask', task);
      return { output: `Task '${task}' started.` };
    } catch (err) {
      return { output: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default runTasksTool;
