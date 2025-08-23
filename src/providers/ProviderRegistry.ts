import { AIProvider, AIModelInfo } from './AIProvider';

export class ProviderRegistry {
  private providers: AIProvider[] = [];

  register(provider: AIProvider) {
    this.providers.push(provider);
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
