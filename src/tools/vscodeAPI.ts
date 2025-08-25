import { Tool, ToolContext } from './ToolInterfaces';

export const vscodeAPITool: Tool = {
  id: 'vscodeAPI',
  label: 'VS Code API',
  description: 'VS Code API reference and documentation',
  icon: 'book',
  inputSchema: {
    query: { type: 'string', required: true, description: 'API query' }
  },
  outputSchema: {
    docs: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ query }: { query: string }, _context?: ToolContext) {
    try {
      // Not implemented: would require API docs integration
      return { docs: '', error: 'Not implemented: API docs integration required.' };
    } catch (err) {
      return { docs: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default vscodeAPITool;
