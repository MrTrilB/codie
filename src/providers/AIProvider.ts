export interface AIModelInfo {
  id: string;
  name: string;
  description?: string;
  [key: string]: any;
}

export interface AIProvider {
  getName(): string;
  listModels(): Promise<AIModelInfo[]>;
  /**
   * Send a message to the model with full chat history for persistent, multi-turn chat.
   * @param modelId Model to use
   * @param messages Array of all chat messages (roles: 'system', 'user', 'assistant')
   * @param options Optional signal for abort
   */
  sendMessage(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { signal?: AbortSignal }
  ): Promise<string>;
  /**
   * Optionally load or set the active model for the provider. No-op for providers that specify model per request.
   */
  setActiveModel(modelId: string): Promise<void>;
}
