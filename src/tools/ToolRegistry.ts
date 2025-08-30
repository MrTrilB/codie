import { Tool, ToolProvider, ToolContext } from './ToolInterfaces';

// Singleton static ToolRegistry implementation
export class ToolRegistry {
	private static tools: Map<string, Tool> = new Map();
	private static providers: Map<string, ToolProvider> = new Map();
	// Map provider id -> set of tool ids registered on behalf of that provider
	private static providerTools: Map<string, Set<string>> = new Map();

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
		const set = new Set<string>();
		for (const tool of provider.getTools()) {
			this.registerTool(tool);
			set.add(tool.id);
		}
		this.providerTools.set(provider.id, set);
	}

	static unregisterProvider(providerOrId: string | ToolProvider): void {
		const id = typeof providerOrId === 'string' ? providerOrId : providerOrId.id;
		// Remove provider entry
		this.providers.delete(id);
		// Unregister any tools that were registered by this provider
		const set = this.providerTools.get(id);
		if (set) {
			for (const tid of set) {
				this.unregisterTool(tid);
			}
			this.providerTools.delete(id);
		}
	}
}
