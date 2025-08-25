import { Tool, ToolProvider, ToolContext } from './ToolInterfaces';
import { ToolRegistry } from './ToolRegistry';

// Placeholder: Replace with actual MCP endpoint or make configurable
const DEFAULT_MCP_ENDPOINT = 'http://localhost:8080/tools';

export class MCPToolProvider implements ToolProvider {
  id = 'mcp';
  label = 'MCP Tools';
  private endpoint: string;
  private tools: Tool[] = [];

  constructor(endpoint?: string) {
    this.endpoint = endpoint || DEFAULT_MCP_ENDPOINT;
  }

  async fetchTools(): Promise<Tool[]> {
    try {
      const resp = await fetch(this.endpoint);
      if (!resp.ok) throw new Error(`Failed to fetch MCP tools: ${resp.status}`);
      const data = await resp.json();
      // Expecting array of { id, label, description, inputSchema, outputSchema }
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
    return {
      id: toolDef.id,
      label: toolDef.label || toolDef.id,
      description: toolDef.description || '',
      icon: toolDef.icon || 'plug',
      inputSchema: toolDef.inputSchema || {},
      outputSchema: toolDef.outputSchema || {},
  provider: 'mcp',
  enabled: true,
      async execute(input: any, context?: ToolContext) {
        try {
          const resp = await fetch(`${DEFAULT_MCP_ENDPOINT}/${toolDef.id}/invoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
