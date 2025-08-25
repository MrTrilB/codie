import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const searchResultsTool: Tool = {
  id: 'searchResults',
  label: 'Search Results',
  description: 'Get results from the search view',
  icon: 'search',
  inputSchema: {},
  outputSchema: {
    results: { type: 'array', description: 'Search results' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute(_args: any, _context?: ToolContext) {
    try {
      // VS Code does not expose search view results directly; stub implementation
      return { results: [], error: 'Not implemented: VS Code API does not expose search view results.' };
    } catch (err) {
      return { results: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default searchResultsTool;
