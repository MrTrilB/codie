import { Tool, ToolContext } from './ToolInterfaces';

export const usagesTool: Tool = {
  id: 'usages',
  label: 'Find Usages',
  description: 'Find symbol usages',
  icon: 'references',
  inputSchema: {
    symbol: { type: 'string', required: true, description: 'Symbol name' }
  },
  outputSchema: {
    locations: { type: 'array' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ symbol }: { symbol: string }, _context?: ToolContext) {
    try {
      // Not implemented: would require language server integration
      return { locations: [], error: 'Not implemented: language server integration required.' };
    } catch (err) {
      return { locations: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default usagesTool;
