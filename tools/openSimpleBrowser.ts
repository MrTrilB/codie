
import * as vscode from 'vscode';

/**
 * Preview a locally hosted website in the VS Code Simple Browser.
 * @param url The URL to open (e.g., http://localhost:3000)
 * @returns {Promise<{ success: boolean, message: string }>} 
 */
export async function openSimpleBrowser(url: string): Promise<{ success: boolean, message: string }> {
  if (!url) {
    return { success: false, message: 'No URL provided.' };
  }
  try {
    await vscode.commands.executeCommand('simpleBrowser.show', url);
    return { success: true, message: `Opened ${url} in Simple Browser.` };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}
