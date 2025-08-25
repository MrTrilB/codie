import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const extensiTool: Tool = {
  id: 'extensi',
  label: 'VS Code Extensions',
  description: 'Search and install VS Code extensions from the Marketplace',
  icon: 'extensions',
  inputSchema: {
    query: { type: 'string', required: true, description: 'Search query for extensions' }
  },
  outputSchema: {
    results: { type: 'array', description: 'List of matching extensions' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ query }: { query: string }, _context?: ToolContext) {
    try {
      const results = await vscode.commands.executeCommand<any[]>('workbench.extensions.search', query);
      return { results };
    } catch (err) {
      return { results: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default extensiTool;
