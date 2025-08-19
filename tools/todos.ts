
import * as vscode from 'vscode';

const TODOS_KEY = 'codie.todos';

/**
 * Get, add, or remove todo items using workspaceState.
 * @param context VS Code extension context (for state)
 * @param action 'get' | 'add' | 'remove'
 * @param item Optional todo item (for add/remove)
 * Returns: { todos: string[] }
 */
export async function todos(context: vscode.ExtensionContext, action: 'get'|'add'|'remove', item?: string) {
  let todos: string[] = context.workspaceState.get(TODOS_KEY, []);
  if (action === 'add' && item && !todos.includes(item)) {
    todos = [...todos, item];
    await context.workspaceState.update(TODOS_KEY, todos);
  } else if (action === 'remove' && item) {
    todos = todos.filter(t => t !== item);
    await context.workspaceState.update(TODOS_KEY, todos);
  }
  return { todos };
}
