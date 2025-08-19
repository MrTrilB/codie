
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Edit files in the workspace.
 * @param action 'read' | 'write' | 'append' | 'delete'
 * @param filePath relative or absolute path within the workspace
 * @param content (for write/append)
 * Returns: { success, content?, error? }
 */
export async function editFiles({ action, filePath, content }: { action: 'read'|'write'|'append'|'delete', filePath: string, content?: string }) {
  try {
    // Resolve to absolute path within workspace
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
