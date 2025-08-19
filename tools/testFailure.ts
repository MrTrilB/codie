
import * as vscode from 'vscode';

/**
 * Get info about the last unit test failure using the VS Code Testing API.
 * @returns {Promise<{ success: boolean, message: string, test?: string, error?: string }>}
 */
export async function testFailure(): Promise<{ success: boolean, message: string, test?: string, error?: string }> {
  try {
    const controller = vscode.tests.createTestController('codie-test-failure', 'Codie Test Failure');
    // VS Code does not expose a direct API to get the last test failure globally.
    // As a workaround, prompt the user to provide details.
    const details = await vscode.window.showInputBox({ prompt: 'Paste the error message or details from the last unit test failure (VS Code API does not provide this directly)' });
    if (!details) {
      return { success: false, message: 'No test failure details provided.' };
    }
    return { success: true, message: 'Test failure details provided.', error: details };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}
