/**
 * Helpers to summarize MCP metadata and enrich system prompts.
 */
export interface MCPEnrichmentOptions {
  /** Maximum number of tools/resources to list per MCP provider. */
  limit?: number;
  /** Prefix label added before the MCP summaries block. */
  prefix?: string;
  /** Separator used between summaries. */
  separator?: string;
}

const defaultOptions: Required<MCPEnrichmentOptions> = { limit: 5, prefix: '[MCP Metadata]', separator: '\n' };

export function buildMcpSummaries(mcpMetadata: any, options?: MCPEnrichmentOptions): string[] {
  const opts = { ...defaultOptions, ...(options || {}) };
  const summaries: string[] = [];
  if (!mcpMetadata) return summaries;
  for (const [id, meta] of Object.entries(mcpMetadata)) {
    if (!meta) continue;
    try {
      if ((meta as any).tools) {
        const tools = (meta as any).tools as any[];
        summaries.push(`${id} provides tools: ${tools.slice(0,opts.limit).map(t => t.name || t.id || t).join(', ')}${tools.length>opts.limit?', ...':''}`);
      } else if ((meta as any).resources) {
        const res = (meta as any).resources as any[];
        summaries.push(`${id} resources: ${res.slice(0,opts.limit).map(r => r.name || r.id || r).join(', ')}${res.length>opts.limit?', ...':''}`);
      }
    } catch (e) {
      // ignore per-MCP errors
    }
  }
  return summaries;
}

export function enrichSystemMessage(originalSystem: string | undefined, mcpMetadata: any, options?: MCPEnrichmentOptions): string | undefined {
  if (!originalSystem) return originalSystem;
  try {
    const opts = { ...defaultOptions, ...(options || {}) };
    const summaries = buildMcpSummaries(mcpMetadata, options);
    if (!summaries || summaries.length === 0) return originalSystem;
    return `${opts.prefix}${opts.separator}${summaries.join(opts.separator)}${opts.separator}---${opts.separator}${originalSystem}`;
  } catch (e) {
    return originalSystem;
  }
}
