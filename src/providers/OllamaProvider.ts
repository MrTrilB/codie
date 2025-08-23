import { AIProvider, AIModelInfo } from './AIProvider';
import ollama, { Ollama } from 'ollama';


export class OllamaProvider implements AIProvider {
  public readonly key = 'ollama';
  private client: Ollama;
  private host: string;
  private activeModelId: string | null = null;
  private keepAlive: number = 300; // default 5 min

  async setActiveModel(modelId: string, opts?: { keepAlive?: number }): Promise<void> {
    // Store modelId and keepAlive for use in sendMessage
    this.activeModelId = modelId;
    if (opts?.keepAlive) {
      this.keepAlive = opts.keepAlive;
    }
  }


  constructor(endpoint?: string) {
    // Remove trailing /v1 if present
    let host = endpoint || 'http://localhost:11434';
    if (host.endsWith('/v1')) host = host.slice(0, -3);
    this.host = host;
    this.client = new Ollama({ host: this.host });
  }


  getName(): string {
    return 'Ollama';
  }

  async listLoadedModels(): Promise<any[]> {
    try {
      const result = await this.client.ps();
      return result.models || [];
    } catch (err) {
      console.error('[OllamaProvider] Error listing loaded models:', err);
      return [];
    }
  }


  async listModels(): Promise<AIModelInfo[]> {
    try {
      const result = await this.client.list();
      return (result.models || []).map((m: any) => ({
        id: m.name,
        name: m.name,
        description: m.details?.description || m.digest || '',
      }));
    } catch (err: any) {
      let msg = '[OllamaProvider] Error listing models:';
      if (err?.response?.status === 404) {
        msg += ' 404 Not Found. Is Ollama running at ' + this.host + '?';
      } else if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
        msg += ' Connection refused. Is Ollama running at ' + this.host + '?';
      } else {
        msg += ' ' + (err?.message || err);
      }
      console.error(msg);
      throw new Error(msg);
    }
  }


  async sendMessage(modelId: string, message: string, systemPrompt?: string): Promise<string> {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: message });
      const response = await this.client.chat({
        model: modelId,
        messages,
        keep_alive: this.keepAlive,
      });
      return response.message?.content || '';
    } catch (err: any) {
      let msg = '[OllamaProvider] Error sending message:';
      if (err?.response?.status === 404) {
        msg += ' 404 Not Found. Is Ollama running at ' + this.host + '?';
      } else if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
        msg += ' Connection refused. Is Ollama running at ' + this.host + '?';
      } else {
        msg += ' ' + (err?.message || err);
      }
      console.error(msg);
      throw new Error(msg);
    }
  }
}
