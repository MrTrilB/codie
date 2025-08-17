// ChatManager handles chat history, provider routing, and message streaming for Codie
import { CodieProvider } from './providers/provider';
import { OllamaProvider } from './providers/ollamaProvider';
import { LMStudioProvider } from './providers/lmstudioProvider';
import { AzureFoundryProvider } from './providers/azureFoundryProvider';
import { OpenAIProvider } from './providers/openaiProvider';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export class ChatManager {
  private providers: Record<string, CodieProvider> = {};
  private currentProvider: CodieProvider;
  private history: ChatMessage[] = [];

  constructor() {
    this.providers['ollama'] = new OllamaProvider();
    this.providers['lmstudio'] = new LMStudioProvider();
    this.providers['azurefoundry'] = new AzureFoundryProvider();
    this.providers['openai'] = new OpenAIProvider();
    this.currentProvider = this.providers['ollama']; // default
  }

  setProvider(id: string) {
    if (this.providers[id]) {
      this.currentProvider = this.providers[id];
    }
  }

  getProviderList() {
    return Object.values(this.providers).map(p => ({ id: p.id, name: p.name }));
  }

  getHistory() {
    return this.history;
  }

  async sendMessage(message: string): Promise<ChatMessage> {
    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() };
    this.history.push(userMsg);
    const response = await this.currentProvider.sendMessage(message);
    const aiMsg: ChatMessage = { role: 'assistant', content: response, timestamp: Date.now() };
    this.history.push(aiMsg);
    return aiMsg;
  }
}
