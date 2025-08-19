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
    return Promise.all(
      this.providers.map(async (provider) => ({
        provider,
        models: await provider.listModels(),
      }))
    );
  }
}
