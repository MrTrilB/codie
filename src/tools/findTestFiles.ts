import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const findTestFilesTool: Tool = {
  id: 'findTestFiles',
  label: 'Find Test Files',
  description: 'Find test files for a given source or test file',
  icon: 'beaker',
  inputSchema: {
    filePath: { type: 'string', required: true, description: 'Source or test file path' }
  },
  outputSchema: {
    testFiles: { type: 'array', description: 'Matching test files' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ filePath }: { filePath: string }, _context?: ToolContext) {
    try {
      // Simple heuristic: look for files with .test. or .spec. in the same directory
      const dir = vscode.Uri.file(filePath).with({ path: vscode.Uri.file(filePath).path.replace(/\/[^/]+$/, '') });
      const files = await vscode.workspace.findFiles('**/*.{test,spec}.{js,ts,jsx,tsx}', '**/node_modules/**', 100);
      const testFiles = files.map(f => f.fsPath);
      return { testFiles };
    } catch (err) {
      return { testFiles: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default findTestFilesTool;
