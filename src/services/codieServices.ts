import * as vscode from 'vscode';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import type { NormalizedMcpClient } from '../providers/AIProvider';

class CodieServices {
  private _output?: vscode.OutputChannel;
  private _providerRegistry?: ProviderRegistry;
  private _mcpProviders: any[] = [];
  private _mcpClientsNormalized: NormalizedMcpClient[] = [];
  private _mcpChangedEmitter = new vscode.EventEmitter<NormalizedMcpClient[]>();

  public get output() { return this._output; }
  public setOutput(out: vscode.OutputChannel) { this._output = out; }
  public log(text: string) { try { this._output?.appendLine(text); } catch {} }

  public setProviderRegistry(reg: ProviderRegistry) { this._providerRegistry = reg; }
  public getProviderRegistry() { return this._providerRegistry; }

  public get mcpProviders() { return this._mcpProviders; }
  public setMcpProviders(providers: any[]) {
    this._mcpProviders = providers || [];
    // Build normalized clients and notify registry
    try {
      const normalized = (this._mcpProviders || []).map((p: any) => ({ id: p.id || p.endpoint || p.label || JSON.stringify(p), label: p.label || p.endpoint || 'mcp', client: p.client || p }));
      this._mcpClientsNormalized = normalized;
      // Notify provider registry if present
      try { this._providerRegistry?.setMcpClients(normalized); } catch (e) {}
      // Fire event
      this._mcpChangedEmitter.fire(normalized);
    } catch (e) {}
  }

  public onMcpClientsChanged(cb: (clients: NormalizedMcpClient[]) => void) {
    return this._mcpChangedEmitter.event(cb);
  }

  public getMcpClientsNormalized() { return this._mcpClientsNormalized; }
}

export const codieServices = new CodieServices();
