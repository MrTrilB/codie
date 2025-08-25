import { Tool, ToolProvider, ToolContext } from './ToolInterfaces';

// Singleton static ToolRegistry implementation
export class ToolRegistry {
	private static tools: Map<string, Tool> = new Map();
	private static providers: Map<string, ToolProvider> = new Map();

	static registerTool(tool: Tool): void {
		this.tools.set(tool.id, tool);
	}

	static unregisterTool(id: string): void {
		this.tools.delete(id);
	}

	static list(): Tool[] {
		return Array.from(this.tools.values());
	}

	static get(id: string): Tool | undefined {
		return this.tools.get(id);
	}

	static async execute(id: string, args: any, context?: ToolContext): Promise<any> {
		const tool = this.get(id);
		if (!tool) throw new Error(`Tool '${id}' not found.`);
		return tool.execute(args, context);
	}

	static registerProvider(provider: ToolProvider): void {
		this.providers.set(provider.id, provider);
		for (const tool of provider.getTools()) {
			this.registerTool(tool);
		}
	}

	static unregisterProvider(id: string): void {
		this.providers.delete(id);
		// Optionally: remove all tools from this provider
		// (requires tracking which tool belongs to which provider)
	}
}
