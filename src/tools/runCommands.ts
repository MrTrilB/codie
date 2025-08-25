import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const runCommandsTool: Tool = {
  id: 'runCommands',
  label: 'Run Commands',
  description: 'Run commands in the terminal',
  icon: 'terminal',
  inputSchema: {
    command: { type: 'string', required: true, description: 'Shell command to run' }
  },
  outputSchema: {
    output: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ command }: { command: string }, _context?: ToolContext) {
    try {
      const terminal = vscode.window.createTerminal('Codie Tool Terminal');
      terminal.show();
      terminal.sendText(command);
      return { output: 'Command sent to terminal.' };
    } catch (err) {
      return { output: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default runCommandsTool;
