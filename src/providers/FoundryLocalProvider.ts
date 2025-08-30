
import { FoundryLocalManager } from 'foundry-local-sdk';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { AIProvider, AIModelInfo, NormalizedMcpClient } from './AIProvider';
import { enrichSystemMessage } from './mcpEnrichment';
import * as vscode from 'vscode';

export class FoundryLocalProvider implements AIProvider {
  public readonly key = 'foundry';
  private foundryManager: FoundryLocalManager;
  private openai: OpenAI | undefined;
  private endpoint: string | undefined;
  private apiKey: string | undefined;
  private modelInfo: any | null = null;
  // MCP clients injected by ProviderRegistry
  private mcpClients: Array<NormalizedMcpClient> = [];
  private mcpMetadata: any = {};

  /**
   * Construct the provider. Optionally pass endpoint for testability/configuration.
   * If not provided, will attempt to discover via CLI.
   */
  constructor(endpoint?: string) {
    if (endpoint) {
      // Per SDK docs, always use FoundryLocalManager({ serviceUrl }) for static endpoint
      this.foundryManager = new FoundryLocalManager({ serviceUrl: endpoint } as any);
    } else {
      this.foundryManager = new FoundryLocalManager();
    }
    this.endpoint = undefined;
    this.apiKey = undefined;
    this.modelInfo = null;
  }

  /**
   * Discover the Foundry Local endpoint using the SDK.
   * Returns undefined if not found.
   * Exposed as public for testability.
   */
  public async discoverEndpoint(): Promise<string | undefined> {
    try {
      // Ensure service is running
      const running = await this.foundryManager.isServiceRunning();
      if (!running) {
        console.warn('[FoundryLocalProvider] Foundry Local service is not running. Attempting to start...');
        await this.foundryManager.startService();
      }
      this.endpoint = this.foundryManager.endpoint;
      this.apiKey = this.foundryManager.apiKey;
      if (!this.endpoint) {
        throw new Error('[FoundryLocalProvider] Service URL is not set after SDK start.');
      }
      return this.endpoint;
    } catch (err: any) {
      let msg = '[FoundryLocalProvider] Error discovering Foundry Local endpoint via SDK:';
      msg += ' ' + (err?.message || err);
      msg += '\nTroubleshooting steps:';
      msg += '\n- Ensure the Foundry Local service is installed and available in your PATH.';
      msg += '\n- Try running \'foundry service start\' in a terminal.';
      msg += '\n- You can also set the endpoint explicitly in your VS Code settings:';
      msg += '\n  "codie.foundry.serviceUrl": "http://localhost:60244"';
      console.error(msg);
      throw new Error(msg);
    }
  }

  /**
   * No-op for FoundryLocal (model is specified per request).
   */
  async setActiveModel(modelId: string): Promise<void> {
    if (!modelId) return;
    try {
      // Per SDK best practice, always call init to ensure service and model are ready
      await this.foundryManager.init(modelId);
    } catch (err) {
      console.warn('[FoundryLocalProvider] Could not load model via init:', modelId, err);
    }
  }

  getName(): string {
    return 'FoundryLocal';
  }

  async listModels(): Promise<AIModelInfo[]> {
    try {
      if (!this.endpoint) {
        await this.discoverEndpoint();
      }
      if (!this.endpoint || !this.foundryManager) {
        throw new Error('[FoundryLocalProvider] Service URL is not set. Please start the Foundry Local service or set the endpoint explicitly.');
      }
      const catalog = await this.foundryManager.listCatalogModels();
      const cached = await this.foundryManager.listCachedModels();
      const allModels = [...(catalog || []), ...(cached || [])];
      const seen = new Set();
      const models: AIModelInfo[] = allModels
        .filter((m: any) => {
          if (!m.id || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        })
        .map((m: any) => ({
          id: m.id || m.name,
          name: m.displayName || m.name || m.id || 'Unknown Model',
          description: m.task || m.description || '',
          _raw: m,
        }));
      return models;
    } catch (err: any) {
      let msg = '[FoundryLocalProvider] Error listing models via SDK:';
      msg += ' ' + (err?.message || err);
      msg += '\nTroubleshooting steps:';
      msg += '\n- Ensure the Foundry Local service is running and available in your PATH.';
      msg += '\n- Try running \'foundry service start\' in a terminal.';
      msg += '\n- You can also set the endpoint explicitly in your VS Code settings:';
      msg += '\n  "codie.foundry.serviceUrl": "http://localhost:60244"';
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
  private formatSendMessageError(err: any, modelId?: string): string {
    let msg = '[FoundryLocalProvider] Error sending message via SDK:';
    msg += ' ' + (err?.message || err);
    if (modelId && this.endpoint) {
      msg += `\n[FoundryLocalProvider] ModelId: ${modelId}\nEndpoint: ${this.endpoint}`;
    }
    if (err?.response && typeof err.response.text === 'function') {
      // Note: This is async, so only use in async context
      // This helper is for sync formatting; see below for async body fetch
    }
    msg += '\nTroubleshooting steps:';
    msg += '\n- Ensure the Foundry Local service is running and available in your PATH.';
    msg += '\n- Try running \'foundry service start\' in a terminal.';
    msg += '\n- You can also set the endpoint explicitly in your VS Code settings:';
    msg += '\n  "codie.foundry.serviceUrl": "http://localhost:60244"';
    return msg;
  }

  async sendMessage(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { signal?: AbortSignal }
  ): Promise<string> {
    try {
      // Per SDK best practice, always call init to ensure service and model are ready
      const modelInfo = await this.foundryManager.init(modelId);
      // After init, get endpoint and apiKey
      this.endpoint = this.foundryManager.endpoint;
      this.apiKey = this.foundryManager.apiKey;
      if (!this.endpoint || !this.apiKey) {
        throw new Error('[FoundryLocalProvider] Service URL is not set. Please start the Foundry Local service or set the endpoint explicitly.');
      }
      // Always construct OpenAI after init to ensure correct endpoint
      this.openai = new OpenAI({ baseURL: this.endpoint, apiKey: this.apiKey });
      // Read maxTokens from VS Code config
      const config = vscode.workspace.getConfiguration();
      const maxTokens = config.get<number>('codie.providers.foundry.maxTokens', 1024);
      // Enrich system message with MCP metadata (non-destructive)
      const sys = messages.find(m => m.role === 'system');
      const enriched = enrichSystemMessage(sys?.content, this.mcpMetadata);
      const chatMessages = messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.role === 'system' && enriched ? enriched : m.content
      })) as ChatCompletionMessageParam[];
      try {
        const completion = await this.openai.chat.completions.create({
          model: modelInfo?.id || modelId,
          messages: chatMessages,
          stream: false,
          max_tokens: maxTokens,
        }, {
          signal: options?.signal
        });
        return completion.choices[0]?.message?.content || '';
      } catch (sdkErr: any) {
        // Extra diagnostics for 500 errors
        let msg = this.formatSendMessageError(sdkErr, modelId);
        if (sdkErr?.response && typeof sdkErr.response.text === 'function') {
          try {
            const body = await sdkErr.response.text();
            msg += `\nResponse body: ${body}`;
          } catch {}
        }
        console.error(msg);
        throw new Error(msg);
      }
    } catch (err: any) {
      // Prevent double-formatting if already formatted
      const prefix = '[FoundryLocalProvider] Error sending message via SDK:';
      const errMsg = err?.message || err;
      if (typeof errMsg === 'string' && errMsg.startsWith(prefix)) {
        // Already formatted, just rethrow
        throw err;
      } else {
        const msg = this.formatSendMessageError(err);
        console.error(msg);
        throw new Error(msg);
      }
    }
  }

  setMcpClients?(clients: Array<NormalizedMcpClient>): void {
    try {
      this.mcpClients = clients || [];
      // Try to prefetch light metadata from each client if available (non-blocking)
      for (const c of this.mcpClients) {
        try {
          const client = c.client;
          if (!client) continue;
          // Attempt common method names safely
          if (typeof client.listTools === 'function') {
            client.listTools().then((tools: any) => { this.mcpMetadata[c.id] = { tools }; }).catch(() => {});
          } else if (typeof client.listResources === 'function') {
            client.listResources().then((res: any) => { this.mcpMetadata[c.id] = { resources: res }; }).catch(() => {});
          }
        } catch (e) {
          // ignore per-client errors
        }
      }
    } catch (e) {
      // ignore
    }
  }
}
