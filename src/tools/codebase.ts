import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const codebaseTool: Tool = {
  id: 'codebase',
  label: 'Codebase Info',
  description: 'Find relevant file chunks, symbols, and codebase info',
  icon: 'symbol-structure',
  inputSchema: {
    query: { type: 'string', required: true, description: 'Query for codebase search' }
  },
  outputSchema: {
    results: { type: 'array', description: 'Relevant codebase results' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ query }: { query: string }, _context?: ToolContext) {
    try {
      const symbols = await vscode.commands.executeCommand<any[]>('vscode.executeWorkspaceSymbolProvider', query);
      return { results: symbols || [] };
    } catch (err) {
      return { results: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default codebaseTool;
