// ...existing code...
import { AIProvider, AIModelInfo } from './AIProvider';

import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { execSync } from 'child_process';


export class FoundryLocalProvider implements AIProvider {
  async setActiveModel(modelId: string): Promise<void> {
    // FoundryLocal specifies model per request, so this is a no-op.
    return;
  }
  private openai: OpenAI | undefined;
  private endpoint: string | undefined;
  private apiKey: string = 'foundry-local'; // Placeholder, not used
  private modelInfo: any | null = null;

  constructor() {
  // Inform user about static port setup
  console.info('[FoundryLocalProvider] To set a static port for Foundry Local, use: foundry service set --port <port#>');
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
    try {
      const resp = await fetch(`${this.endpoint}/openai/models`);
      if (!resp.ok) {
        let msg = `[FoundryLocalProvider] /openai/models returned status ${resp.status}`;
        if (resp.status === 404) {
          msg += '. Is Foundry Local running at ' + this.endpoint + '?';
        }
        throw new Error(msg);
      }
      const models = await resp.json();
      console.debug('[FoundryLocalProvider] /openai/models response:', models);
      let modelList: any[] = [];
      if (Array.isArray(models)) {
        modelList = models;
        if (modelList.length === 0) {
          console.warn('[FoundryLocalProvider] No models found in API response (array):', models);
          return [];
        }
        return modelList.map((id: string) => ({
          id,
          name: id,
          description: '',
          _raw: id,
        }));
      } else {
        modelList = models.data || models.models || [];
        if (!Array.isArray(modelList) || modelList.length === 0) {
          console.warn('[FoundryLocalProvider] No models found in API response (object):', models);
          return [];
        }
        return modelList.map((m: any) => ({
          id: m.id || m.name,
          name: m.displayName || m.name || m.id || 'Unknown Model',
          description: m.task || m.description || '',
          _raw: m,
        }));
      }
    } catch (err: any) {
      let msg = '[FoundryLocalProvider] Error listing models:';
      if (err?.message?.includes('404')) {
        msg += ' 404 Not Found. Is Foundry Local running at ' + this.endpoint + '?';
      } else if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
        msg += ' Connection refused. Is Foundry Local running at ' + this.endpoint + '?';
      } else {
        msg += ' ' + (err?.message || err);
      }
      console.error(msg);
      throw new Error(msg);
    }
  }


  async sendMessage(modelId: string, message: string, systemPrompt?: string): Promise<string> {
    if (!this.endpoint) throw new Error('Foundry Local endpoint not discovered.');
    try {
      if (!this.openai) {
        this.openai = new OpenAI({ baseURL: `${this.endpoint}/openai`, apiKey: this.apiKey });
      }
      const messages: ChatCompletionMessageParam[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: message });
      const completion = await this.openai.chat.completions.create({
        model: modelId,
        messages,
        stream: false,
      });
      return completion.choices[0]?.message?.content || '';
    } catch (err: any) {
      let msg = '[FoundryLocalProvider] Error sending message:';
      if (err?.message?.includes('404')) {
        msg += ' 404 Not Found. Is Foundry Local running at ' + this.endpoint + '?';
      } else if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
        msg += ' Connection refused. Is Foundry Local running at ' + this.endpoint + '?';
      } else {
        msg += ' ' + (err?.message || err);
      }
      console.error(msg);
      throw new Error(msg);
    }
  }
}
