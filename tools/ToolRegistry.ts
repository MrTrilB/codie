// Tool interface for all tools
export interface Tool {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
  execute(...args: any[]): Promise<any>;
}

// Tool registry for dynamic registration and lookup
export class ToolRegistry {
  private static tools: Map<string, Tool> = new Map();

  static register(tool: Tool) {
    this.tools.set(tool.id, tool);
  }

  static get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  static list(): Tool[] {
    return Array.from(this.tools.values());
  }

  static async execute(id: string, ...args: any[]): Promise<any> {
    const tool = this.tools.get(id);
    if (!tool || !tool.enabled) throw new Error(`Tool '${id}' is not enabled or not found.`);
    return tool.execute(...args);
  }
}
