import { Tool, ToolProvider, ToolContext } from './ToolInterfaces';
import { withCodieServices } from '../services/getCodieServices';
import { ToolRegistry } from './ToolRegistry';
import { MCPServerConfig } from '../mcp/types';
import MCPClient from '../mcp/Client';

// NOTE: we avoid a static top-level import of the MCP SDK here because
// TypeScript/ts-node test runs may not resolve the SDK client path the same
// way as webpack. Instead we perform a guarded runtime require inside
// `ensureSdkClient()` and treat the SDK types as `any` for robustness.

const DEFAULT_MCP_ENDPOINT = 'http://localhost:9090';

function shortHash(input: string): string {
  // djb2 hash, then base36 truncate for a short human-safe id
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) + input.charCodeAt(i);
    h = h & 0xffffffff;
  }
  // ensure positive
  if (h < 0) h = 0xffffffff + h + 1;
  return Math.abs(h).toString(36).slice(-8);
}

export class MCPToolProvider implements ToolProvider {
  id: string;
  label: string;
  private endpoint: string;
  private apiKey: string;
  private tools: Tool[] = [];
  private client: any;
  private sdkClient?: any;
  private sdkTransport?: any;
  private sdkConnected: boolean = false;
  private registeredToolIds: Set<string> = new Set();

  constructor(endpoint?: string, apiKey?: string, label?: string) {
    this.endpoint = endpoint || DEFAULT_MCP_ENDPOINT;
    this.apiKey = apiKey || '';
    this.label = label || endpoint || 'MCP Tools';
    // Unique provider id per server: include a short sanitized label for readability
    const rawLabel = (label || endpoint || 'mcp').toString();
    const slug = rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || shortHash(this.endpoint).slice(0, 6);
    this.id = `mcp:${slug}:${shortHash(this.endpoint).slice(-6)}`;
    // Prepare a lightweight HTTP-style client as a fallback. The preferred
    // execution path uses the official MCP SDK (`ModelContextClient`) via the
    // static import above. We lazily connect that client to an HTTP transport
    // when needed; if that fails we fall back to direct fetch calls.
    this.client = new MCPClient({ endpoint: this.endpoint, apiKey: this.apiKey } as any);
  }

  setConfig({ apiKey, endpoint, label }: { apiKey?: string; endpoint?: string; label?: string }) {
    if (typeof apiKey === 'string') this.apiKey = apiKey;
    if (typeof endpoint === 'string') this.endpoint = endpoint;
    if (typeof label === 'string') this.label = label;
    // If we had an active SDK transport, reset it so it will be recreated
    // with the new settings on next use.
    this.sdkConnected = false;
    this.sdkTransport = undefined;
    this.sdkClient = undefined;
    this.client = new MCPClient({ endpoint: this.endpoint, apiKey: this.apiKey } as any);
  }

  private async ensureSdkClient(): Promise<void> {
    if (!this.sdkClient) {
      try {
        // Attempt to load the SDK using the runtimeRequire helper which
        // centralizes indirect requires and logging. Try several common
        // resolution paths used by different package layouts.
        const { runtimeRequire } = await import('../utils/runtimeRequire');
        const sdkClientModule: any = runtimeRequire([
          '@modelcontextprotocol/sdk/client',
          '@modelcontextprotocol/sdk/dist/cjs/client',
          '@modelcontextprotocol/sdk'
        ], { logName: 'modelcontextprotocol-sdk' });
        if (!sdkClientModule) {
          try { withCodieServices((m: any) => { try { m.codieServices.log('[MCPToolProvider] MCP SDK not installed or not resolvable; falling back to HTTP client.'); } catch {} }); } catch {}
          this.sdkClient = undefined;
          return;
        }
        const ModelContextClientCtor = sdkClientModule.Client || sdkClientModule.default || sdkClientModule;
        const StreamableHTTPClientTransportCtor = sdkClientModule.StreamableHTTPClientTransport || sdkClientModule.StreamableHTTPClientTransport || sdkClientModule.StreamableHttpClientTransport;
        this.sdkClient = new ModelContextClientCtor({ name: 'Codie VSCode', version: '0.0.0' } as any, {} as any);
        this.sdkConnected = false;
        this.sdkTransport = undefined;
        try {
          const headers: Record<string, string> = {};
          if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
          const transport = new StreamableHTTPClientTransportCtor(this.endpoint.replace(/\/$/, ''), { fetch: fetch as any, requestInit: { headers } });
          this.sdkTransport = transport;
          await this.sdkClient.connect(transport as any);
          this.sdkConnected = true;
          } catch (connErr) {
          this.sdkConnected = false;
          this.sdkTransport = undefined;
          try { withCodieServices((m: any) => { try { m.codieServices.log(`[MCPToolProvider] SDK connect failed: ${String(connErr)}`); } catch {} }); } catch {}
        }
      } catch (instErr) {
        this.sdkClient = undefined;
        try { withCodieServices((m: any) => { try { m.codieServices.log(`[MCPToolProvider] SDK init failed: ${String(instErr)}`); } catch {} }); } catch {}
      }
    }
  }

  async fetchTools(): Promise<Tool[]> {
    try {
      // Preferred: use the official SDK client when available and connected.
      await this.ensureSdkClient();
      let toolDefs: any[] = [];
      if (this.sdkClient && this.sdkConnected && typeof this.sdkClient.listTools === 'function') {
        const res = await this.sdkClient.listTools();
        toolDefs = Array.isArray(res) ? res : ((res && res.tools) || []);
      } else if (typeof this.client.listTools === 'function') {
        const res = await this.client.listTools();
        toolDefs = Array.isArray(res) ? res : ((res && res.tools) || []);
      } else {
        const resp = await fetch(`${this.endpoint.replace(/\/$/, '')}/tools`, { headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : undefined });
        if (!resp.ok) throw new Error(`MCP fetch /tools failed: ${resp.status}`);
        toolDefs = await resp.json();
      }
      this.tools = (toolDefs || []).map((t: any) => this.makeTool(t));
      return this.tools;
    } catch (err: any) {
      const errMsg = `[MCPToolProvider] Error fetching tools from ${this.endpoint}: ${err?.message || String(err)}`;
  try { withCodieServices((m: any) => { try { m.codieServices.log(errMsg); } catch {} }); } catch {}
      console.error(errMsg);
      return [];
    }
  }

  getTools(): Tool[] {
    return this.tools;
  }

  async refresh(): Promise<void> {
    const tools = await this.fetchTools();
    // Unregister previously registered MCP tools that are no longer present
    const newIds = new Set((tools || []).map(t => t.id));
    for (const id of Array.from(this.registeredToolIds)) {
      if (!newIds.has(id)) {
        try { ToolRegistry.unregisterTool(id); } catch {}
        this.registeredToolIds.delete(id);
      }
    }

    // Register/replace current MCP tools and track their ids
    for (const tool of tools) {
      // Ensure provider marks this tool as coming from MCP only
      tool.provider = 'mcp';
      ToolRegistry.registerTool(tool);
      this.registeredToolIds.add(tool.id);
    }
  }

  dispose(): void {
    // Unregister tools previously registered by this provider
    for (const id of Array.from(this.registeredToolIds)) {
      try { ToolRegistry.unregisterTool(id); } catch {}
      this.registeredToolIds.delete(id);
    }
    // Optionally, close SDK transport if present
    try {
      if (this.sdkTransport && typeof this.sdkTransport.close === 'function') {
        this.sdkTransport.close();
      }
    } catch {}
    this.sdkConnected = false;
    this.sdkClient = undefined;
  }

  private makeTool(toolDef: any): Tool {
    const provider = this;
    return {
      id: toolDef.id || toolDef.name,
      label: toolDef.label || toolDef.name || toolDef.id,
      description: toolDef.description || '',
      icon: toolDef.icon || 'plug',
      inputSchema: toolDef.inputSchema || {},
      outputSchema: toolDef.outputSchema || {},
      provider: this.label,
      enabled: true,
      async execute(input: any, context?: ToolContext) {
        try {
          // Prefer the official SDK call when connected.
          const toolName = toolDef.name || toolDef.id;
          // Use SDK if available and connected
          if (provider.sdkClient && provider.sdkConnected && typeof provider.sdkClient.callTool === 'function') {
            return await provider.sdkClient.callTool({ name: toolName, input, context });
          }
          if (provider.sdkClient && typeof provider.sdkClient.call === 'function') {
            return await provider.sdkClient.call({ name: toolName, input, context });
          }
          // Use local MCPClient fallback if available
          if (provider.client && typeof provider.client.invokeTool === 'function') {
            return await provider.client.invokeTool(toolName, input);
          }
          // As a last resort fallback to HTTP POST
          const baseUrl = (provider.client && (provider.client.baseUrl || provider.client.baseURL || provider.client.url)) || provider.endpoint;
          const base = String(baseUrl || provider.endpoint).replace(/\/$/, '');
          const resp = await fetch(`${base}/tools/${encodeURIComponent(toolName)}/invoke`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {})
            },
            body: JSON.stringify({ input, context })
          });
            if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            const msg = `MCP tool invoke failed: ${resp.status} ${text}`;
            try { withCodieServices((m: any) => { try { m.codieServices.log(`[MCPToolProvider] ${msg}`); } catch {} }); } catch {}
            return { success: false, error: msg };
          }
          return await resp.json();
        } catch (err: any) {
          const msg = `MCP tool invoke exception: ${err?.message || String(err)}`;
          try { withCodieServices((m: any) => { try { m.codieServices.log(`[MCPToolProvider] ${msg}`); } catch {} }); } catch {}
          return { success: false, error: msg };
        }
      }
    } as Tool;
  }
}
