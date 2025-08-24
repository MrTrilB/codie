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
   * Send a message to the model. Optionally accepts a system prompt for persona.
   * If not supported, implementers should prepend the systemPrompt to the message.
   * Accepts options, e.g. { signal } for abort support.
   */
  sendMessage(
    modelId: string,
    message: string,
    systemPrompt?: string,
    options?: { signal?: AbortSignal }
  ): Promise<string>;
  /**
   * Optionally load or set the active model for the provider. No-op for providers that specify model per request.
   */
  setActiveModel(modelId: string): Promise<void>;
}
