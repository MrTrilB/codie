
import * as vscode from 'vscode';

/**
 * Get the last command run in the active terminal, if available.
 * @returns {Promise<{ success: boolean, command?: string, message?: string }>}
 */
export async function terminalLastCommand(): Promise<{ success: boolean, command?: string, message?: string }> {
  try {
    // VS Code does not expose terminal command history directly via API.
    // As a workaround, try to get the selection or prompt user to paste last command.
    const selection = await vscode.window.showInputBox({ prompt: 'Paste the last command run in the terminal (VS Code API does not provide this directly)' });
    if (!selection) {
      return { success: false, message: 'No command provided.' };
    }
    return { success: true, command: selection };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}
