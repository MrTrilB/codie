export async function registerMcpServerHelper(currentServers: any[], updateFn: (s: any[]) => Promise<void>, server: { endpoint: string; apiKey?: string; label?: string }, createProvider: (s: any) => any, addToGlobal?: (p: any) => void) {
  if (!server || !server.endpoint) return;
  const exists = (currentServers || []).some(s => s && s.endpoint === server.endpoint);
  if (exists) return;
  const updated = [...(currentServers || []), { endpoint: server.endpoint, apiKey: server.apiKey || '', label: server.label || server.endpoint }];
  await updateFn(updated);
  const provider = createProvider({ endpoint: server.endpoint, apiKey: server.apiKey, label: server.label });
  if (addToGlobal) addToGlobal(provider);
  return provider;
}

export async function unregisterMcpServerHelper(currentServers: any[], updateFn: (s: any[]) => Promise<void>, endpoint: string, providers: any[], disposeProvider: (p: any) => void, unregisterProvider: (id: string) => void) {
  if (!endpoint) return;
  const updated = (currentServers || []).filter(s => s && s.endpoint !== endpoint);
  await updateFn(updated);
  const remaining: any[] = [];
  for (const p of (providers || [])) {
    try {
      if ((p as any).endpoint === endpoint || (p as any).label === endpoint) {
        try { disposeProvider(p); } catch (e) {}
        try { unregisterProvider?.(p); } catch (e) {}
      } else {
        remaining.push(p);
      }
    } catch (err) {
      remaining.push(p);
    }
  }
  return remaining;
}
