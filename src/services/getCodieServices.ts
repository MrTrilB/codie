export function getCodieServices(): Promise<any> {
  return import('./codieServices').then(mod => mod).catch(() => ({ codieServices: { log: () => {}, setOutput: () => {}, setProviderRegistry: () => {}, setMcpProviders: () => {} } }));
}

export function withCodieServices<T = any>(cb: (svc: any) => T | Promise<T>) {
  try {
    return getCodieServices().then(svc => {
      try { return cb(svc); } catch (e) { /* ignore callback errors */ }
    }).catch(() => {});
  } catch (e) {
    // ignore
  }
}

export default getCodieServices;
