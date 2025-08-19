
import * as vscode from 'vscode';

/**
 * Find symbol usages (references, definitions, etc.) for a given file and position.
 * @param filePath Absolute or workspace-relative file path.
 * @param position { line: number, character: number }
 * Returns: { references: [{ uri, range, preview }] }
 */
export async function usages(filePath: string, position: { line: number, character: number }) {
  try {
    // Resolve to absolute URI
    const wsFolders = vscode.workspace.workspaceFolders;
    if (!wsFolders || wsFolders.length === 0) throw new Error('No workspace folder open.');
    const wsRoot = wsFolders[0].uri.fsPath;
    const absPath = filePath.startsWith(wsRoot) ? filePath : require('path').join(wsRoot, filePath);
    const fileUri = vscode.Uri.file(absPath);

    // Get references using VS Code API
    const refs = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      fileUri,
      new vscode.Position(position.line, position.character)
    );
    if (!refs) return { references: [] };

    // Get preview text for each reference
    const references = await Promise.all(refs.map(async ref => {
      const doc = await vscode.workspace.openTextDocument(ref.uri);
      const line = doc.lineAt(ref.range.start.line).text.trim();
      return {
        uri: ref.uri.fsPath,
        range: {
          start: ref.range.start,
          end: ref.range.end
        },
        preview: line
      };
    }));
    return { references };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
