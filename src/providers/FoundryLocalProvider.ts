import { AIProvider, AIModelInfo } from './AIProvider';

import { OpenAI } from 'openai';
import { execSync } from 'child_process';


export class FoundryLocalProvider implements AIProvider {
  private openai: OpenAI | undefined;
  private endpoint: string | undefined;
  private apiKey: string = 'foundry-local'; // Placeholder, not used
  private modelInfo: any | null = null;

  constructor() {
    // Discover endpoint on construction
    this.endpoint = this.discoverEndpoint();
  }

  private discoverEndpoint(): string | undefined {
    try {
      const output = execSync('foundry service status', { encoding: 'utf-8' });
      // Example output: 🟢 Model management service is running on http://127.0.0.1:60244/openai/status
      const match = output.match(/on (http:\/\/[^\s/]+:\d+)/);
      if (match && match[1]) {
        return match[1];
      }
      // Try to match full URL if /openai/status is present
      const matchFull = output.match(/on (http:\/\/[^\s]+)\/openai\/status/);
      if (matchFull && matchFull[1]) {
        return matchFull[1];
      }
      throw new Error('Could not parse Foundry Local endpoint from CLI output.');
    } catch (err) {
      console.error('Error discovering Foundry Local endpoint:', err);
      return undefined;
    }
  }


  getName(): string {
    return 'FoundryLocal';
  }


  async listModels(): Promise<AIModelInfo[]> {
    if (!this.endpoint) throw new Error('Foundry Local endpoint not discovered.');
    // Foundry Local exposes /openai/models endpoint
    const resp = await fetch(`${this.endpoint}/openai/models`);
    const models = await resp.json();
    return (models.data || models.models || []).map((m: any) => ({
      id: m.id || m.name,
      name: m.displayName || m.name || m.id,
      description: m.task || m.description || '',
    }));
  }


  async sendMessage(modelId: string, message: string): Promise<string> {
    if (!this.endpoint) throw new Error('Foundry Local endpoint not discovered.');
    if (!this.openai) {
      this.openai = new OpenAI({ baseURL: `${this.endpoint}/openai`, apiKey: this.apiKey });
    }
    const completion = await this.openai.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: message }],
      stream: false,
    });
    return completion.choices[0]?.message?.content || '';
  }
}
