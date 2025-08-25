import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';
import * as path from 'path';

export const editFilesTool: Tool = {
  id: 'editFiles',
  label: 'Edit Files',
  description: 'Edit files in your workspace',
  icon: 'edit',
  inputSchema: {
    action: { type: 'string', enum: ['read', 'write', 'append', 'delete'], required: true },
    filePath: { type: 'string', required: true },
    content: { type: 'string' },
  },
  outputSchema: {
    success: { type: 'boolean' },
    content: { type: 'string' },
    error: { type: 'string' },
  },
  provider: 'builtin',
  enabled: true,
  async execute({ action, filePath, content }: { action: 'read'|'write'|'append'|'delete', filePath: string, content?: string }, context?: ToolContext) {
    try {
      const wsFolders = vscode.workspace.workspaceFolders;
      if (!wsFolders || wsFolders.length === 0) throw new Error('No workspace folder open.');
      const wsRoot = wsFolders[0].uri.fsPath;
      const absPath = path.isAbsolute(filePath) ? filePath : path.join(wsRoot, filePath);
      const fileUri = vscode.Uri.file(absPath);
      if (action === 'read') {
        const data = await vscode.workspace.fs.readFile(fileUri);
        return { success: true, content: Buffer.from(data).toString('utf8') };
      }
      if (action === 'write') {
        if (typeof content !== 'string') throw new Error('No content provided for write.');
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
        return { success: true };
      }
      if (action === 'append') {
        if (typeof content !== 'string') throw new Error('No content provided for append.');
        let oldData = '';
        try {
          const data = await vscode.workspace.fs.readFile(fileUri);
          oldData = Buffer.from(data).toString('utf8');
        } catch {}
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(oldData + content, 'utf8'));
        return { success: true };
      }
      if (action === 'delete') {
        await vscode.workspace.fs.delete(fileUri);
        return { success: true };
      }
      throw new Error('Unknown action: ' + action);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default editFilesTool;
