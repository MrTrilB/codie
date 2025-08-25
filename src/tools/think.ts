import { Tool, ToolContext } from './ToolInterfaces';

export const thinkTool: Tool = {
  id: 'think',
  label: 'Think',
  description: 'Deep thinking and task organization',
  icon: 'lightbulb',
  inputSchema: {
    thoughts: { type: 'string', required: false, description: 'Thoughts or notes' }
  },
  outputSchema: {
    result: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ thoughts }: { thoughts?: string }, _context?: ToolContext) {
    try {
      // Stub: just echo the input
      return { result: thoughts || 'No thoughts provided.' };
    } catch (err) {
      return { result: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default thinkTool;
