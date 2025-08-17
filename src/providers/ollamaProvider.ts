import { CodieProvider } from './provider';

export class OllamaProvider implements CodieProvider {
  id = 'ollama';
  name = 'Ollama';

  async sendMessage(message: string, options?: any): Promise<string> {
    // TODO: Implement Ollama API call
    return 'Ollama response (stub)';
  }
}
