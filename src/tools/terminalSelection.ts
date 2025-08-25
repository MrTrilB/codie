import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const terminalSelectionTool: Tool = {
  id: 'terminalSelection',
  label: 'Terminal Selection',
  description: 'Get the current selection in the terminal',
  icon: 'terminal',
  inputSchema: {},
  outputSchema: {
    selection: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute(_args: any, _context?: ToolContext) {
    try {
      // VS Code does not expose terminal selection; stub implementation
      return { selection: '', error: 'Not implemented: VS Code API does not expose terminal selection.' };
    } catch (err) {
      return { selection: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default terminalSelectionTool;
