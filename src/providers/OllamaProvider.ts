import { AIProvider, AIModelInfo } from './AIProvider';
import { OpenAI } from 'openai';

export class OllamaProvider implements AIProvider {
  private openai: OpenAI;
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || 'http://localhost:11434/v1';
    this.openai = new OpenAI({ baseURL: this.endpoint, apiKey: 'ollama' }); // apiKey is ignored by Ollama
  }

  getName(): string {
    return 'Ollama';
  }

  async listModels(): Promise<AIModelInfo[]> {
    // Ollama exposes /api/tags for listing models
    const resp = await fetch(`${this.endpoint}/models`);
    if (!resp.ok) {
      // fallback to /api/tags for older versions
      const tagsResp = await fetch(`${this.endpoint}/api/tags`);
      const tags = await tagsResp.json();
      return (tags.models || []).map((m: any) => ({
        id: m.name,
        name: m.name,
        description: m.digest || '',
      }));
    }
    const models = await resp.json();
    return (models.models || []).map((m: any) => ({
      id: m.name,
      name: m.name,
      description: m.digest || '',
    }));
  }

  async sendMessage(modelId: string, message: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: message }],
      stream: false,
    });
    return completion.choices[0]?.message?.content || '';
  }
}
