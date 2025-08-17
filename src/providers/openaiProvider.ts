import { CodieProvider } from './provider';

export class OpenAIProvider implements CodieProvider {
  id = 'openai';
  name = 'OpenAI';

  async sendMessage(message: string, options?: any): Promise<string> {
    // TODO: Implement OpenAI API call
    return 'OpenAI response (stub)';
  }
}
