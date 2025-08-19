import { AIProvider, AIModelInfo } from './AIProvider';
import { OpenAI } from 'openai';

export class LMStudioProvider implements AIProvider {
  private openai: OpenAI;
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || 'http://localhost:1234/v1';
    this.openai = new OpenAI({ baseURL: this.endpoint, apiKey: 'lm-studio' }); // apiKey is ignored by LM Studio
  }

  getName(): string {
    return 'LM Studio';
  }

  async listModels(): Promise<AIModelInfo[]> {
    // LM Studio exposes /models endpoint for listing models
    try {
      const resp = await fetch(`${this.endpoint}/models`);
      if (!resp.ok) {
        console.error(`LMStudioProvider: Failed to fetch models, status: ${resp.status}`);
        return [];
      }
      const models = await resp.json();
      return (models || []).map((m: any) => ({
        id: m.id || m.name,
        name: m.name || m.id,
        description: m.description || '',
      }));
    } catch (err) {
      console.error('LMStudioProvider: Error fetching models:', err);
      return [];
    }
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
