import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const terminalLastCommandTool: Tool = {
  id: 'terminalLastCommand',
  label: 'Terminal Last Command',
  description: 'Get the last command run in the terminal',
  icon: 'terminal',
  inputSchema: {},
  outputSchema: {
    command: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute(_args: any, _context?: ToolContext) {
    try {
      // VS Code does not expose terminal history; stub implementation
      return { command: '', error: 'Not implemented: VS Code API does not expose terminal history.' };
    } catch (err) {
      return { command: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default terminalLastCommandTool;
