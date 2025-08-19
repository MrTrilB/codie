
import * as vscode from 'vscode';

/**
 * Get the current selection in the active terminal, if available.
 * @returns {Promise<{ success: boolean, selection?: string, message?: string }>}
 */
export async function terminalSelection(): Promise<{ success: boolean, selection?: string, message?: string }> {
  try {
    // VS Code does not expose terminal selection directly via API.
    // As a workaround, prompt the user to paste the selection.
    const selection = await vscode.window.showInputBox({ prompt: 'Paste the current selection from the terminal (VS Code API does not provide this directly)' });
    if (!selection) {
      return { success: false, message: 'No selection provided.' };
    }
    return { success: true, selection };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}
