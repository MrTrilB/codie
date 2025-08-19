
import * as vscode from 'vscode';

/**
 * Run a command in the VS Code integrated terminal.
 * @param command The shell command to run.
 * @param terminalName Optional terminal name.
 * Returns: { success, terminalName, message }
 */
export async function runCommands(command: string, terminalName = 'Codie Terminal') {
  try {
    if (!command || typeof command !== 'string') throw new Error('No command provided.');
    // Find or create a terminal
    let terminal = vscode.window.terminals.find(t => t.name === terminalName);
    if (!terminal) {
      terminal = vscode.window.createTerminal({ name: terminalName });
    }
    terminal.show(true);
    terminal.sendText(command, true);
    return { success: true, terminalName, message: `Command sent to terminal: ${command}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
