
import * as vscode from 'vscode';

/**
 * Run unit tests by invoking the npm test script in a VS Code terminal.
 * Returns: { success, terminalName, message }
 */
export async function runTests(terminalName = 'Codie Test Terminal') {
  try {
    // Find or create a terminal
    let terminal = vscode.window.terminals.find(t => t.name === terminalName);
    if (!terminal) {
      terminal = vscode.window.createTerminal({ name: terminalName });
    }
    terminal.show(true);
    terminal.sendText('npm test', true);
    return { success: true, terminalName, message: 'Test command sent to terminal. Check output for results.' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
