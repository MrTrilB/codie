import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const runNotebooksTool: Tool = {
  id: 'runNotebooks',
  label: 'Run Notebooks',
  description: 'Run notebook cells',
  icon: 'notebook',
  inputSchema: {
    filePath: { type: 'string', required: true, description: 'Notebook file path' },
    cell: { type: 'number', required: false, description: 'Cell index (optional)' }
  },
  outputSchema: {
    result: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ filePath, cell }: { filePath: string, cell?: number }, _context?: ToolContext) {
    try {
      // This is a stub; actual notebook execution would require more logic
      await vscode.commands.executeCommand('notebook.cell.execute', vscode.Uri.file(filePath), cell);
      return { result: 'Notebook cell executed.' };
    } catch (err) {
      return { result: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default runNotebooksTool;
