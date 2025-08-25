import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const openSimpleBrowserTool: Tool = {
  id: 'openSimpleBrowser',
  label: 'Open Simple Browser',
  description: 'Preview a locally hosted website',
  icon: 'browser',
  inputSchema: {
    url: { type: 'string', required: true, description: 'URL to preview' }
  },
  outputSchema: {
    success: { type: 'boolean' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ url }: { url: string }, _context?: ToolContext) {
    try {
      await vscode.commands.executeCommand('simpleBrowser.show', url);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default openSimpleBrowserTool;
