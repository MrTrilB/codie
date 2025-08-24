// Tool interface for all tools

// Tool input schema type (for validation)
export type ToolInputSchema = Record<string, any>;

// Tool execution context (for prompt context, session/request IDs, etc.)
export interface ToolExecutionContext {
  promptContext?: any;
  sessionId?: string;
  requestId?: string;
}

export interface Tool {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
  icon?: string;
  inputSchema?: ToolInputSchema; // Optional input schema for validation
  destructive?: boolean;
  execute(args: any, context?: ToolExecutionContext): Promise<any>;
}

// Tool registry for dynamic registration and lookup
export class ToolRegistry {
  private static tools: Map<string, Tool> = new Map();

  static register(tool: Tool) {
    this.tools.set(tool.id, tool);
  }

  static unregister(id: string) {
    this.tools.delete(id);
  }

  static get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  static list(): Tool[] {
    return Array.from(this.tools.values());
  }

  // args: tool input, context: prompt/session/request info
  static async execute(id: string, args: any, context?: ToolExecutionContext): Promise<any> {
    const tool = this.tools.get(id);
    if (!tool || !tool.enabled) throw new Error(`Tool '${id}' is not enabled or not found.`);
    // If inputSchema is present, validate args
    if (tool.inputSchema) {
      // Simple validation: check required keys exist
      for (const key of Object.keys(tool.inputSchema)) {
        if (!(key in args)) {
          throw new Error(`Missing required input: ${key}`);
        }
      }
    }
    return tool.execute(args, context);
  }
}
