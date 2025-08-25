import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const searchTool: Tool = {
  id: 'search',
  label: 'Search Files',
  description: 'Search and read files in your workspace',
  icon: 'search',
  inputSchema: {
    pattern: { type: 'string', required: true, description: 'Glob or regex pattern' }
  },
  outputSchema: {
    files: { type: 'array', description: 'Matching files' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ pattern }: { pattern: string }, _context?: ToolContext) {
    try {
      const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 100);
      const files = uris.map(u => u.fsPath);
      return { files };
    } catch (err) {
      return { files: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default searchTool;
