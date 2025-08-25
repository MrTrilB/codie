import { Tool, ToolContext } from './ToolInterfaces';
import * as vscode from 'vscode';

export const fetchTool: Tool = {
  id: 'fetch',
  label: 'Fetch Webpage',
  description: 'Fetch the main content from a web page',
  icon: 'globe',
  inputSchema: {
    url: { type: 'string', required: true, description: 'URL to fetch' }
  },
  outputSchema: {
    content: { type: 'string' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ url }: { url: string }, _context?: ToolContext) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
      const text = await resp.text();
      return { content: text };
    } catch (err) {
      return { content: '', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default fetchTool;
