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
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        const msg = `Failed to fetch ${url}: ${resp.status} ${text}`;
        try { (global as any).codieOutput?.appendLine(`[fetchTool] ${msg}`); } catch {}
        return { content: '', error: msg };
      }
      const text = await resp.text();
      return { content: text };
    } catch (err: any) {
      const msg = `Fetch error for ${url}: ${err?.message || String(err)}`;
      try { (global as any).codieOutput?.appendLine(`[fetchTool] ${msg}`); } catch {}
      return { content: '', error: msg };
    }
  }
};

export default fetchTool;
