import { AIProvider, AIModelInfo, NormalizedMcpClient } from './AIProvider';
import { MCPProvider } from './MCPProvider';

export class ProviderRegistry {
  private providers: AIProvider[] = [];
  private mcpClients: Array<NormalizedMcpClient> = [];

  constructor(mcpClients?: Array<NormalizedMcpClient>) {
    // Register MCPProvider by default (endpoint and apiKey can be made configurable)
    this.register(new MCPProvider());
    if (mcpClients && mcpClients.length > 0) {
      this.mcpClients = mcpClients;
      // Inject MCP clients into already-registered providers
      for (const p of this.providers) {
        if (typeof p.setMcpClients === 'function') {
          try { p.setMcpClients(this.mcpClients); } catch (e) { /* ignore */ }
        }
      }
    }
  }

  register(provider: AIProvider) {
    this.providers.push(provider);
    // Inject current MCP clients if provider supports it
    if (this.mcpClients.length > 0 && typeof provider.setMcpClients === 'function') {
      try { provider.setMcpClients(this.mcpClients); } catch (e) { /* ignore errors */ }
    }
  }

  setMcpClients(clients: Array<NormalizedMcpClient>) {
    this.mcpClients = clients || [];
    for (const p of this.providers) {
      if (typeof p.setMcpClients === 'function') {
        try { p.setMcpClients(this.mcpClients); } catch (e) { /* ignore */ }
      }
    }
  }

  getProviders(): AIProvider[] {
    return this.providers;
  }

  async getAllModels(): Promise<{ provider: AIProvider; models: AIModelInfo[] }[]> {
    // Add error handling and debug logging
    const results: { provider: AIProvider; models: AIModelInfo[] }[] = [];
    for (const provider of this.providers) {
      try {
        console.log('[Codie] ProviderRegistry: calling listModels for', provider.getName());
        const models = await provider.listModels();
        console.log(`[Codie] ProviderRegistry: ${provider.getName()} returned models:`, models);
        results.push({ provider, models });
      } catch (err) {
        console.error(`[Codie] ProviderRegistry: Error listing models for ${provider.getName()}:`, err);
        results.push({ provider, models: [] });
      }
    }
    return results;
  }
}
