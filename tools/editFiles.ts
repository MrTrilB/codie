import * as vscode from 'vscode';
import * as path from 'path';
import { Tool, ToolExecutionContext } from './ToolRegistry';

const editFilesTool: Tool = {
  id: 'editFiles',
  label: 'Edit Files',
  description: 'Edit files in your workspace',
  enabled: true,
  icon: 'edit',
  inputSchema: {
    action: {},
    filePath: {},
    content: {},
  },
  async execute({ action, filePath, content }: { action: 'read'|'write'|'append'|'delete', filePath: string, content?: string }, context?: ToolExecutionContext) {
    try {
      console.log('[editFilesTool] Input:', { action, filePath, content, context });
      // Optionally use context for logging, traceability, etc.
      // Resolve to absolute path within workspace
      const wsFolders = vscode.workspace.workspaceFolders;
      if (!wsFolders || wsFolders.length === 0) throw new Error('No workspace folder open.');
      const wsRoot = wsFolders[0].uri.fsPath;
      const absPath = path.isAbsolute(filePath) ? filePath : path.join(wsRoot, filePath);
      const fileUri = vscode.Uri.file(absPath);
      console.log('[editFilesTool] Resolved fileUri:', fileUri.toString());

      if (action === 'read') {
        const data = await vscode.workspace.fs.readFile(fileUri);
        console.log('[editFilesTool] Read file success');
        return { success: true, content: Buffer.from(data).toString('utf8') };
      }
      if (action === 'write') {
        if (typeof content !== 'string') throw new Error('No content provided for write.');
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
        console.log('[editFilesTool] Write file success');
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
        console.log('[editFilesTool] Append file success');
        return { success: true };
      }
      if (action === 'delete') {
        await vscode.workspace.fs.delete(fileUri);
        console.log('[editFilesTool] Delete file success');
        return { success: true };
      }
      throw new Error('Unknown action: ' + action);
    } catch (err) {
      console.error('[editFilesTool] Error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default editFilesTool;
