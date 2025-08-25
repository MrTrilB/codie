import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const runTestsTool: Tool = {
  id: 'runTests',
  label: 'Run Tests',
  description: 'Run unit tests',
  icon: 'beaker',
  inputSchema: {
    testFile: { type: 'string', required: false, description: 'Test file path (optional)' }
  },
  outputSchema: {
    result: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ testFile }: { testFile?: string }, _context?: ToolContext) {
    try {
      await vscode.commands.executeCommand('workbench.action.tasks.runTask', 'test');
      return { result: 'Test task started.' };
    } catch (err) {
      return { result: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default runTestsTool;
