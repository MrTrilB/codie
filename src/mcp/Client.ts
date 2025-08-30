import { MCPServerConfig, Resource, Prompt, Tool, DiscoveryResult, SampleResult, Root, ElicitationResult } from './types';

export default class MCPClient {
  private endpoint: string;
  private apiKey?: string;

  constructor(config: MCPServerConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  private headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.endpoint}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`MCP GET ${path} failed: ${res.status} ${res.statusText}`);
    return await res.json() as T;
  }

  private async post<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${this.endpoint}${path}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`MCP POST ${path} failed: ${res.status} ${res.statusText}`);
    return await res.json() as T;
  }

  async listResources(): Promise<Resource[]> {
    return await this.get<Resource[]>('/resources');
  }

  async getResource(id: string): Promise<Resource> {
    return await this.get<Resource>(`/resources/${encodeURIComponent(id)}`);
  }

  async listPrompts(): Promise<Prompt[]> {
    return await this.get<Prompt[]>('/prompts');
  }

  async getPrompt(id: string): Promise<Prompt> {
    return await this.get<Prompt>(`/prompts/${encodeURIComponent(id)}`);
  }

  async listTools(): Promise<Tool[]> {
    return await this.get<Tool[]>('/tools');
  }

  async invokeTool(id: string, input: any): Promise<any> {
    return await this.post<any>(`/tools/${encodeURIComponent(id)}/invoke`, { input });
  }

  async discover(query: string, opts?: any): Promise<DiscoveryResult> {
    return await this.post<DiscoveryResult>('/discovery', { query, options: opts || {} });
  }

  async sample(promptIdOrText: string, opts?: any): Promise<SampleResult> {
    return await this.post<SampleResult>('/sampling', { prompt: promptIdOrText, options: opts || {} });
  }

  async listRoots(): Promise<Root[]> {
    return await this.get<Root[]>('/roots');
  }

  async elicit(spec: any): Promise<ElicitationResult> {
    return await this.post<ElicitationResult>('/elicitation', { spec });
  }
}
