import { CodieProvider } from './provider';

export class AzureFoundryProvider implements CodieProvider {
  id = 'azurefoundry';
  name = 'Azure Foundry Local';

  async sendMessage(message: string, options?: any): Promise<string> {
    // TODO: Implement Azure Foundry Local API call
    return 'Azure Foundry Local response (stub)';
  }
}
