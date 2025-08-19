export interface AIModelInfo {
  id: string;
  name: string;
  description?: string;
  [key: string]: any;
}

export interface AIProvider {
  getName(): string;
  listModels(): Promise<AIModelInfo[]>;
  sendMessage(modelId: string, message: string): Promise<string>;
  // Optionally: add init(), dispose(), getCapabilities(), etc.
}
