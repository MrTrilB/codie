import { FoundryLocalManager } from 'foundry-local-sdk';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { AIProvider, AIModelInfo } from './AIProvider';
import * as vscode from 'vscode';

export class FoundryLocalProvider implements AIProvider {
  public readonly key = 'foundry';
  private foundryManager: FoundryLocalManager;
  private openai: OpenAI | undefined;
  private endpoint: string | undefined;
  private apiKey: string | undefined;
  private modelInfo: any | null = null;

  /**
   * Construct the provider. Optionally pass endpoint for testability/configuration.
   * If not provided, will attempt to discover via CLI.
   */
  constructor(endpoint?: string) {
    this.foundryManager = new FoundryLocalManager();
    if (endpoint) {
      this.endpoint = endpoint;
      this.apiKey = 'foundry-local'; // fallback for manual endpoint
    }
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
    // Optionally preload or switch model using SDK
    if (!modelId) return;
    try {
      await this.foundryManager.loadModel(modelId);
    } catch (err) {
      console.warn('[FoundryLocalProvider] Could not load model:', modelId, err);
    }
  }

  getName(): string {
    return 'FoundryLocal';
  }

  async listModels(): Promise<AIModelInfo[]> {
    try {
      // Ensure endpoint is set
      if (!this.endpoint) {
        await this.discoverEndpoint();
      }
      if (!this.endpoint) {
        throw new Error('[FoundryLocalProvider] Service URL is not set. Please start the Foundry Local service or set the endpoint explicitly.');
      }
      // Use SDK to list catalog and cached models
      const catalog = await this.foundryManager.listCatalogModels();
      const cached = await this.foundryManager.listCachedModels();
      // Merge and dedupe by id
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
  async sendMessage(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { signal?: AbortSignal }
  ): Promise<string> {
    try {
      // Ensure endpoint/apiKey are set
      if (!this.endpoint || !this.apiKey) {
        await this.discoverEndpoint();
      }
      if (!this.endpoint || !this.apiKey) {
        throw new Error('[FoundryLocalProvider] Service URL is not set. Please start the Foundry Local service or set the endpoint explicitly.');
      }
      if (!this.openai) {
        this.openai = new OpenAI({ baseURL: this.endpoint, apiKey: this.apiKey });
      }
      // Read maxTokens from VS Code config
      const config = vscode.workspace.getConfiguration();
      const maxTokens = config.get<number>('codie.providers.foundry.maxTokens', 1024);
      // Cast messages to ChatCompletionMessageParam[] to satisfy OpenAI type requirements
      const chatMessages = messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      })) as ChatCompletionMessageParam[];
      const completion = await this.openai.chat.completions.create({
        model: modelId,
        messages: chatMessages,
        stream: false,
        max_tokens: maxTokens,
      }, {
        signal: options?.signal
      });
      return completion.choices[0]?.message?.content || '';
    } catch (err: any) {
      let msg = '[FoundryLocalProvider] Error sending message via SDK:';
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
}
