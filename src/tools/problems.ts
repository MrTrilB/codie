import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const problemsTool: Tool = {
  id: 'problems',
  label: 'Check Errors',
  description: 'Check errors for a particular file',
  icon: 'error',
  inputSchema: {
    filePath: { type: 'string', required: true, description: 'File path to check' }
  },
  outputSchema: {
    diagnostics: { type: 'array', description: 'List of diagnostics' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ filePath }: { filePath: string }, _context?: ToolContext) {
    try {
      const uri = vscode.Uri.file(filePath);
      const diagnostics = vscode.languages.getDiagnostics(uri);
      return { diagnostics };
    } catch (err) {
      return { diagnostics: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default problemsTool;
