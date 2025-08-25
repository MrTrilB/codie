import { Tool, ToolContext } from './ToolInterfaces';

export const todosTool: Tool = {
  id: 'todos',
  label: 'Todos',
  description: 'Manage and track todo items',
  icon: 'checklist',
  inputSchema: {
    action: { type: 'string', required: true, description: 'Action: add, list, complete, remove' },
    item: { type: 'string', required: false, description: 'Todo item (for add/complete/remove)' }
  },
  outputSchema: {
    todos: { type: 'array' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ action, item }: { action: string, item?: string }, _context?: ToolContext) {
    try {
      // In-memory stub; real implementation would persist
      interface CodieGlobal extends NodeJS.Global {
        _codieTodos?: string[];
      }
      const g = globalThis as CodieGlobal;
      if (!g._codieTodos) g._codieTodos = [];
      const todos = g._codieTodos;
      if (action === 'add' && item) todos.push(item);
      if (action === 'complete' && item) {
        const idx = todos.indexOf(item);
        if (idx !== -1) todos.splice(idx, 1);
      }
      if (action === 'remove' && item) {
        const idx = todos.indexOf(item);
        if (idx !== -1) todos.splice(idx, 1);
      }
      if (action === 'list') {
        return { todos };
      }
      return { todos };
    } catch (err) {
      return { todos: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default todosTool;
