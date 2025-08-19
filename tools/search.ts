
import * as vscode from 'vscode';

/**
 * Search for files and read matching snippets in the workspace.
 * @param query Text to search for in files.
 * @param maxResults Max number of results (default 20).
 * Returns: { results: [{ file, line, preview }] }
 */
export async function search(query: string, maxResults = 20) {
  try {
    if (!query || typeof query !== 'string') throw new Error('No search query provided.');
    // Use VS Code's text search API
    const results: { file: string, line: number, preview: string }[] = [];
    const uris = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 1000);
    for (const uri of uris) {
      const doc = await vscode.workspace.openTextDocument(uri);
      const lines = doc.getText().split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(query.toLowerCase())) {
          results.push({ file: uri.fsPath, line: i + 1, preview: lines[i].trim() });
          if (results.length >= maxResults) return { results };
        }
      }
    }
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
