
import * as vscode from 'vscode';

const THINK_KEY = 'codie.think.notes';

/**
 * Provide deep thinking and task organization. Store/retrieve notes in workspaceState.
 * @param context VS Code extension context (for state)
 * @param action 'get' | 'add' | 'clear'
 * @param note Optional note to add (for add)
 * @returns {Promise<{ success: boolean, notes?: string[], message?: string }>}
 */
export async function think(context: vscode.ExtensionContext, action: 'get'|'add'|'clear', note?: string): Promise<{ success: boolean, notes?: string[], message?: string }> {
  let notes: string[] = context.workspaceState.get(THINK_KEY, []);
  if (action === 'add' && note) {
    notes = [...notes, note];
    await context.workspaceState.update(THINK_KEY, notes);
    return { success: true, notes, message: 'Note added.' };
  } else if (action === 'clear') {
    await context.workspaceState.update(THINK_KEY, []);
    return { success: true, notes: [], message: 'All notes cleared.' };
  } else if (action === 'get') {
    return { success: true, notes };
  }
  return { success: false, notes, message: 'Invalid action or missing note.' };
}
