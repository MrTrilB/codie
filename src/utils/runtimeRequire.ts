import { withCodieServices } from '../services/getCodieServices';

export function runtimeRequire(paths: string[] | string, options?: { logName?: string }): any | null {
  const arr = Array.isArray(paths) ? paths : [paths];
  for (const p of arr) {
    try {
      // eslint-disable-next-line no-eval
      const mod = eval("require")(p);
      if (mod) return mod;
    } catch (e) {
      try { withCodieServices((mod: any) => { try { mod.codieServices.log(`[runtimeRequire] Could not load '${p}': ${String(e)}`); } catch {} }); } catch {}
      // continue to next path
    }
  }
  if (options && options.logName) {
  try { withCodieServices((mod: any) => { try { mod.codieServices.log(`[runtimeRequire] None of the paths resolved for ${options.logName}`); } catch {} }); } catch {}
  }
  return null;
}
