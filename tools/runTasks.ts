
import * as vscode from 'vscode';

/**
 * Run a named VS Code task and return its output or error.
 * @param taskName The label of the task to run.
 * @returns {Promise<{ success: boolean, message: string }>} 
 */
export async function runTasks(taskName: string): Promise<{ success: boolean, message: string }> {
  if (!taskName) {
    return { success: false, message: 'No task name provided.' };
  }
  try {
    const tasks = await vscode.tasks.fetchTasks();
    const task = tasks.find(t => t.name === taskName || t.definition.label === taskName);
    if (!task) {
      return { success: false, message: `Task '${taskName}' not found.` };
    }
    const exec = await vscode.tasks.executeTask(task);
    return { success: true, message: `Task '${taskName}' started.` };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}
