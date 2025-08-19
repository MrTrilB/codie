
import * as vscode from 'vscode';

/**
 * Provide VS Code API reference and documentation by opening the official docs in the browser.
 * @returns {Promise<{ success: boolean, message: string }>} 
 */
export async function vscodeAPI(): Promise<{ success: boolean, message: string }> {
  try {
    const input = await vscode.window.showInputBox({ prompt: 'Enter a VS Code API symbol or topic (e.g., workspace, window, commands, TreeView, etc.)' });
    let url = 'https://code.visualstudio.com/api/references/vscode-api';
    if (input && input.trim()) {
      url = `https://code.visualstudio.com/api/references/vscode-api#${encodeURIComponent(input.trim())}`;
    }
    await vscode.env.openExternal(vscode.Uri.parse(url));
    return { success: true, message: `Opened VS Code API docs for '${input || 'main page'}'.` };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}
