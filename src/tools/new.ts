import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const newTool: Tool = {
  id: 'new',
  label: 'Scaffold Workspace',
  description: 'Scaffold a new workspace with VS Code configs',
  icon: 'repo-create',
  inputSchema: {
    name: { type: 'string', required: true, description: 'Workspace name' }
  },
  outputSchema: {
    success: { type: 'boolean' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ name }: { name: string }, _context?: ToolContext) {
    try {
      // Create a new folder and add a basic README.md
      const wsFolders = vscode.workspace.workspaceFolders;
      if (!wsFolders || wsFolders.length === 0) throw new Error('No workspace folder open.');
      const wsRoot = wsFolders[0].uri.fsPath;
      const fs = vscode.workspace.fs;
      const newFolder = vscode.Uri.file(`${wsRoot}/${name}`);
      await fs.createDirectory(newFolder);
  const path = require('path');
  const readmeUri = vscode.Uri.file(path.join(newFolder.fsPath, 'README.md'));
  await fs.writeFile(readmeUri, Buffer.from(`# ${name}\n`));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default newTool;
