

import * as vscode from 'vscode';

/**
 * Get search results for a query by searching all files in the workspace.
 * @returns {Promise<{ success: boolean, results?: Array<{ file: string, line: number, match: string }>, message?: string }>}
 */
export async function searchResults(): Promise<{ success: boolean, results?: Array<{ file: string, line: number, match: string }>, message?: string }> {
  try {
    const query: string | undefined = await vscode.window.showInputBox({ prompt: 'Enter search query to get results' });
    if (!query) {
      return { success: false, message: 'No search query provided.' };
    }
    const files: vscode.Uri[] = await vscode.workspace.findFiles('**/*.{ts,js,md,py,java,txt}', '**/node_modules/**', 100);
    const results: Array<{ file: string, line: number, match: string }> = [];
    for (const file of files) {
      const doc: vscode.TextDocument = await vscode.workspace.openTextDocument(file);
      const lines: string[] = doc.getText().split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(query)) {
          results.push({ file: file.fsPath, line: i + 1, match: lines[i] });
        }
      }
    }
    return { success: true, results };
  } catch (err: unknown) {
    return { success: false, message: (err instanceof Error) ? err.message : String(err) };
  }
}
