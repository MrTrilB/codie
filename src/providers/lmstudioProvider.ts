import { CodieProvider } from './provider';

export class LMStudioProvider implements CodieProvider {
  id = 'lmstudio';
  name = 'LM Studio';

  async sendMessage(message: string, options?: any): Promise<string> {
    // TODO: Implement LM Studio API call
    return 'LM Studio response (stub)';
  }
}
