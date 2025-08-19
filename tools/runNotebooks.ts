
import * as vscode from 'vscode';

/**
 * Run all cells in a notebook file using the VS Code Notebooks API.
 * @param notebookUri The URI or path to the notebook file.
 * @returns {Promise<{ success: boolean, message: string }>} 
 */
export async function runNotebooks(notebookUri: string): Promise<{ success: boolean, message: string }> {
  try {
    const uri = vscode.Uri.file(notebookUri);
    const doc = await vscode.workspace.openNotebookDocument(uri);
    const editor = await vscode.window.showNotebookDocument(doc, { preview: false });
    await vscode.commands.executeCommand('notebook.execute');
    return { success: true, message: `Executed all cells in ${notebookUri}` };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}
