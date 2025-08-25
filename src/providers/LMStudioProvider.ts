
import { AIProvider, AIModelInfo } from './AIProvider';
import { LMStudioClient } from '@lmstudio/sdk';

import * as vscode from 'vscode';



export class LMStudioProvider implements AIProvider {
  public readonly key = 'lmstudio';
  private activeModel: any = null;
  private activeModelId: string | null = null;
  private client: LMStudioClient;
  private endpoint: string;

  constructor(endpoint?: string) {
    // LMStudioClient requires ws:// or wss:// protocol
    let url = endpoint || 'ws://localhost:1234';
    // If user provides http://, convert to ws://
    if (url.startsWith('http://')) {
      url = 'ws://' + url.substring('http://'.length).replace(/\/v1$/, '');
    } else if (url.startsWith('https://')) {
      url = 'wss://' + url.substring('https://'.length).replace(/\/v1$/, '');
    }
    this.endpoint = url;
    this.client = new LMStudioClient({ baseUrl: this.endpoint });
  }

  async setActiveModel(modelId: string, opts?: { identifier?: string; ttl?: number }): Promise<void> {
    // Unload previous model if different
    if (this.activeModel && this.activeModelId && this.activeModelId !== modelId) {
      try {
        await this.activeModel.unload();
      } catch (err) {
        console.warn('[LMStudioProvider] Error unloading previous model:', err);
      }
      this.activeModel = null;
      this.activeModelId = null;
    }
    try {
      // Use .load() if identifier or ttl is provided, else .model()
      if (opts?.identifier || opts?.ttl) {
        this.activeModel = await this.client.llm.load(modelId, opts);
      } else {
        this.activeModel = await this.client.llm.model(modelId);
      }
      this.activeModelId = modelId;
    } catch (err) {
      this.activeModel = null;
      this.activeModelId = null;
      throw err;
    }
  }

  async unloadModel(): Promise<void> {
    if (this.activeModel) {
      try {
        await this.activeModel.unload();
      } catch (err) {
        console.warn('[LMStudioProvider] Error unloading model:', err);
      }
      this.activeModel = null;
      this.activeModelId = null;
    }
  }

  async listLoadedModels(): Promise<any[]> {
    try {
      return await this.client.llm.listLoaded();
    } catch (err) {
      console.error('[LMStudioProvider] Error listing loaded models:', err);
      return [];
    }
  }




  getName(): string {
    return 'LM Studio';
  }


  async listModels(): Promise<AIModelInfo[]> {
    try {
      const models = await this.client.system.listDownloadedModels();
      console.debug('[LMStudioProvider] listDownloadedModels() returned:', models);
      return (models || []).map((m: any) => ({
        id: m.id || m.modelId || m.name || m.displayName,
        name: m.displayName || m.name || m.id || m.modelId || 'Unknown Model',
        description: m.description || m.task || '',
        _raw: m,
      }));
    } catch (err: any) {
      let msg = 'LMStudioProvider: Error fetching models:';
      if (err?.response?.status === 404) {
        msg += ' 404 Not Found. Is LM Studio running at ' + this.endpoint + '?';
      } else if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
        msg += ' Connection refused. Is LM Studio running at ' + this.endpoint + '?';
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
      let model = this.activeModel;
      if (!model || this.activeModelId !== modelId) {
        model = await this.client.llm.model(modelId);
        this.activeModel = model;
        this.activeModelId = modelId;
      }
      // Use LM Studio's Chat object for multi-turn chat
      const { Chat } = await import('@lmstudio/sdk');
      // Ensure roles are typed as 'system' | 'user' | 'assistant'
      const chatMessages = messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      }));
      const chat = Chat.from(chatMessages);
      // Read maxTokens from VS Code config
      const config = vscode.workspace.getConfiguration();
      const maxTokens = config.get<number>('codie.providers.lmstudio.maxTokens', 1024);
      const resultPromise = model.respond(chat, { maxTokens });
      const result = await (options?.signal ? Promise.race([
        resultPromise,
        new Promise((_, reject) => options.signal?.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))))
      ]) : resultPromise);
      if (aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      return (result as any).content || '';
    } catch (err: any) {
      let msg = 'LMStudioProvider: Error sending message:';
      if (err?.name === 'AbortError') throw err;
      if (err?.response?.status === 404) {
        msg += ' 404 Not Found. Is LM Studio running at ' + this.endpoint + '?';
      } else if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
        msg += ' Connection refused. Is LM Studio running at ' + this.endpoint + '?';
      } else {
        msg += ' ' + (err?.message || err);
      }
      console.error(msg);
      throw new Error(msg);
    } finally {
      if (options?.signal) options.signal.removeEventListener('abort', abortHandler);
    }
  }
}
