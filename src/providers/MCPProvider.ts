import { AIProvider, AIModelInfo, NormalizedMcpClient } from './AIProvider';
import { withCodieServices } from '../services/getCodieServices';

/**
 * MCPProvider integrates Context7 MCP server as a Codie provider.
 * Connects to MCP HTTP endpoint (default http://localhost:3000) and exposes resolve-library-id and get-library-docs tools.
 */
export class MCPProvider implements AIProvider {
  public readonly key = 'mcp';
  private endpoint: string;
  private apiKey?: string;
  private activeLibraryId: string | null = null;
  private mcpClients: Array<NormalizedMcpClient> = [];

  setMcpClients?(clients: Array<{ id: string; label: string; client: any }>): void {
    try {
      this.mcpClients = clients || [];
      // Could use clients for dynamic discovery in future
    } catch (e) {}
  }

  constructor(endpoint: string = 'http://localhost:3000', apiKey?: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'Context7 MCP';
  }

  /**
   * List available libraries (models) by resolving a static set or using resolve-library-id.
   * For demo, returns a static list. In production, could query a registry or accept user input.
   */
  async listModels(): Promise<AIModelInfo[]> {
    // TODO: Optionally call /resolve-library-id for dynamic discovery
    return [
      { id: '/mongodb/docs', name: 'MongoDB', description: 'MongoDB official docs' },
      { id: '/vercel/next.js', name: 'Next.js', description: 'Next.js official docs' },
      { id: '/supabase/supabase', name: 'Supabase', description: 'Supabase official docs' },
    ];
  }

  async setActiveModel(modelId: string): Promise<void> {
    this.activeLibraryId = modelId;
  }

  /**
   * Send a message to the MCP server using get-library-docs.
   * @param modelId Context7-compatible library ID (e.g., /mongodb/docs)
   * @param messages Array of all chat messages (roles: 'system', 'user', 'assistant')
   * @param options Optional signal for abort
   */
  async sendMessage(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { signal?: AbortSignal }
  ): Promise<string> {
    // Use the last user message as the topic
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const topic = lastUserMsg ? lastUserMsg.content : '';
    const url = `${this.endpoint}/get-library-docs`;
    const body = {
      context7CompatibleLibraryID: modelId,
      topic,
      tokens: 10000,
    };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: options?.signal,
      });
        if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        const errMsg = `[MCPProvider] Error from MCP server: ${resp.status} ${resp.statusText} ${text}`;
          // Log to extension output channel if present
          try { withCodieServices((m: any) => { try { m.codieServices.log(errMsg); } catch {} }); } catch {}
        throw new Error(errMsg);
      }
      const data = await resp.json();
      // Assume docs are in data.docs or data.result
      return data.docs || data.result || JSON.stringify(data);
    } catch (err: any) {
  const errStr = err?.message || String(err);
  const logMsg = `[MCPProvider] Request failed to ${url}: ${errStr}`;
  try { withCodieServices((m: any) => { try { m.codieServices.log(logMsg); } catch {} }); } catch {}
      throw new Error(logMsg);
    }
  }
}
