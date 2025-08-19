import { AIProvider, AIModelInfo } from './AIProvider';

export class DummyProvider implements AIProvider {
  getName(): string {
    return 'DummyProvider';
  }

  async listModels(): Promise<AIModelInfo[]> {
    return [
      { id: 'dummy-1', name: 'Dummy Model 1', description: 'A mock model for testing.' },
      { id: 'dummy-2', name: 'Dummy Model 2', description: 'Another mock model.' },
    ];
  }

  async sendMessage(modelId: string, message: string): Promise<string> {
    return `Echo from ${modelId}: ${message}`;
  }
}
