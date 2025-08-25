import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const changesTool: Tool = {
  id: 'changes',
  label: 'Get Changed Files',
  description: 'Get diffs of changed files in the workspace',
  icon: 'diff',
  inputSchema: {},
  outputSchema: {
    files: { type: 'array', description: 'List of changed files' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute(_args: any, _context?: ToolContext) {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      const api = gitExtension?.getAPI(1);
      if (!api) throw new Error('Git extension not available');
      const repo = api.repositories[0];
      if (!repo) throw new Error('No git repository found');
      const status = repo.state.workingTreeChanges;
  const files = status.map((f: { uri: { fsPath: string }, status: string }) => ({ path: f.uri.fsPath, status: f.status }));
      return { files };
    } catch (err) {
      return { files: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default changesTool;
