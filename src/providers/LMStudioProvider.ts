
import { AIProvider, AIModelInfo } from './AIProvider';
import { LMStudioClient } from '@lmstudio/sdk';



export class LMStudioProvider implements AIProvider {
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


  async sendMessage(modelId: string, message: string, systemPrompt?: string): Promise<string> {
    try {
      let model = this.activeModel;
      if (!model || this.activeModelId !== modelId) {
        model = await this.client.llm.model(modelId);
        this.activeModel = model;
        this.activeModelId = modelId;
      }
      let prompt = message;
      if (systemPrompt) {
        prompt = `${systemPrompt}\n\n${message}`;
      }
      const result = await model.respond(prompt);
      return result.content || '';
    } catch (err: any) {
      let msg = 'LMStudioProvider: Error sending message:';
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
}
