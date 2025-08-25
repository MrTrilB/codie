import { Tool, ToolContext } from './ToolInterfaces';

export const testFailureTool: Tool = {
  id: 'testFailure',
  label: 'Test Failure Info',
  description: 'Get info about the last unit test failure',
  icon: 'beaker',
  inputSchema: {},
  outputSchema: {
    failure: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute(_args: any, _context?: ToolContext) {
    try {
      // Not implemented: would require test runner integration
      return { failure: '', error: 'Not implemented: test runner integration required.' };
    } catch (err) {
      return { failure: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default testFailureTool;
