import { AIProvider, AIModelInfo, NormalizedMcpClient } from './AIProvider';
import { enrichSystemMessage } from './mcpEnrichment';
import ollama, { Ollama } from 'ollama';

import * as vscode from 'vscode';


export class OllamaProvider implements AIProvider {
  public readonly key = 'ollama';
  private client: Ollama;
  private host: string;
  private activeModelId: string | null = null;
  private keepAlive: number = 300; // default 5 min
  // MCP clients injected by ProviderRegistry
  private mcpClients: Array<NormalizedMcpClient> = [];
  private mcpMetadata: any = {};

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


  /**
   * Send a message with full chat history for persistent, multi-turn chat.
   * @param modelId Model to use
   * @param messages Array of all chat messages (roles: 'system', 'user', 'assistant')
   * @param options Optional signal for abort
   */
  async sendMessage(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { signal?: AbortSignal }
  ): Promise<string> {
    let aborted = false;
    const abortHandler = () => { aborted = true; };
    try {
      if (options?.signal) {
        if (options.signal.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
        options.signal.addEventListener('abort', abortHandler);
      }
      // Read maxTokens from VS Code config
      const config = vscode.workspace.getConfiguration();
      const maxTokens = config.get<number>('codie.providers.ollama.maxTokens', 1024);

      // Enrich system message with MCP metadata (non-destructive)
      const sys = messages.find(m => m.role === 'system');
      const enriched = enrichSystemMessage(sys?.content, this.mcpMetadata);

      // Add num_predict to the options of the last user message
      const messagesWithOptions = messages.map((msg, idx) =>
        idx === messages.length - 1 && msg.role === 'user' ? { ...msg, options: { num_predict: maxTokens } } : msg
      ).map(m => m.role === 'system' && enriched ? { role: 'system', content: enriched } : m);
      const responsePromise = this.client.chat({
        model: modelId,
        messages: messagesWithOptions,
        keep_alive: this.keepAlive,
      });
      const response = await (options?.signal ? Promise.race([
        responsePromise,
        new Promise((_, reject) => options.signal?.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))))
      ]) : responsePromise);
      if (aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      return (response as any).message?.content || '';
    } catch (err: any) {
      let msg = '[OllamaProvider] Error sending message:';
      if (err?.name === 'AbortError') throw err;
      if (err?.response?.status === 404) {
        msg += ' 404 Not Found. Is Ollama running at ' + this.host + '?';
      } else if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
        msg += ' Connection refused. Is Ollama running at ' + this.host + '?';
      } else {
        msg += ' ' + (err?.message || err);
      }
      console.error(msg);
      throw new Error(msg);
    } finally {
      if (options?.signal) options.signal.removeEventListener('abort', abortHandler);
    }
  }

  setMcpClients?(clients: Array<NormalizedMcpClient>): void {
    try {
      this.mcpClients = clients || [];
      for (const c of this.mcpClients) {
        try {
          const client = c.client;
          if (!client) continue;
          if (typeof client.listTools === 'function') {
            client.listTools().then((tools: any) => { this.mcpMetadata[c.id] = { tools }; }).catch(() => {});
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
}
