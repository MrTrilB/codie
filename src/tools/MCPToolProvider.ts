import { Tool, ToolProvider, ToolContext } from './ToolInterfaces';
import { ToolRegistry } from './ToolRegistry';


const DEFAULT_MCP_ENDPOINT = 'http://localhost:9090/tools';


export class MCPToolProvider implements ToolProvider {
  id = 'mcp';
  label: string;
  private endpoint: string;
  private apiKey: string;
  private tools: Tool[] = [];

  constructor(endpoint?: string, apiKey?: string, label?: string) {
    this.endpoint = endpoint || DEFAULT_MCP_ENDPOINT;
    this.apiKey = apiKey || '';
    this.label = label || endpoint || 'MCP Tools';
  }

  setConfig({ apiKey, endpoint, label }: { apiKey?: string; endpoint?: string; label?: string }) {
    if (typeof apiKey === 'string') this.apiKey = apiKey;
    if (typeof endpoint === 'string') this.endpoint = endpoint;
    if (typeof label === 'string') this.label = label;
  }

  async fetchTools(): Promise<Tool[]> {
    try {
      const resp = await fetch(this.endpoint, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : undefined
      });
      if (!resp.ok) throw new Error(`Failed to fetch MCP tools: ${resp.status}`);
      const data = await resp.json();
      this.tools = (data || []).map((tool: any) => this.makeTool(tool));
      return this.tools;
    } catch (err) {
      console.error('[MCPToolProvider] Error fetching tools:', err);
      return [];
    }
  }

  getTools(): Tool[] {
    return this.tools;
  }

  async refresh(): Promise<void> {
    const tools = await this.fetchTools();
    for (const tool of tools) {
      ToolRegistry.registerTool(tool);
    }
  }

  private makeTool(toolDef: any): Tool {
    const endpoint = this.endpoint;
    const apiKey = this.apiKey;
    const providerLabel = this.label;
    return {
      id: toolDef.id,
      label: toolDef.label || toolDef.id,
      description: toolDef.description || '',
      icon: toolDef.icon || 'plug',
      inputSchema: toolDef.inputSchema || {},
      outputSchema: toolDef.outputSchema || {},
      provider: providerLabel,
      enabled: true,
      async execute(input: any, context?: ToolContext) {
        try {
          const resp = await fetch(`${endpoint}/${toolDef.id}/invoke`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
            },
            body: JSON.stringify({ input, context })
          });
          if (!resp.ok) throw new Error(`MCP tool invoke failed: ${resp.status}`);
          return await resp.json();
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      }
    };
  }
}
