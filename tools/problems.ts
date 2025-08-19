
import * as vscode from 'vscode';

/**
 * Get errors and warnings for a given file using VS Code diagnostics API.
 * @param filePath Absolute or workspace-relative file path.
 * Returns: { diagnostics: [{ message, severity, range, source, code }] }
 */
export async function problems(filePath: string) {
  try {
    // Resolve to absolute URI
    const wsFolders = vscode.workspace.workspaceFolders;
    if (!wsFolders || wsFolders.length === 0) throw new Error('No workspace folder open.');
    const wsRoot = wsFolders[0].uri.fsPath;
    const absPath = filePath.startsWith(wsRoot) ? filePath : require('path').join(wsRoot, filePath);
    const fileUri = vscode.Uri.file(absPath);

    // Get diagnostics for the file
    const allDiagnostics = vscode.languages.getDiagnostics(fileUri);
    const diagnostics = allDiagnostics.map(d => ({
      message: d.message,
      severity: vscode.DiagnosticSeverity[d.severity],
      range: {
        start: d.range.start,
        end: d.range.end
      },
      source: d.source,
      code: d.code
    }));
    return { diagnostics };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
