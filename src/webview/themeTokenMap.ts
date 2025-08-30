type ModalTokens = {
  backdrop: string;
  shadow: string;
  border: string;
};

// A small mapping of well-known theme label substrings to modal token overrides.
// Extend this map with exact theme labels you want to support for pixel-perfect parity.
const themeTokenMap: { [labelSubstr: string]: ModalTokens } = {
  'Default Dark+': {
    backdrop: 'rgba(0,0,0,0.55)',
    shadow: 'rgba(0,0,0,0.6)',
    border: 'rgba(255,255,255,0.06)'
  },
  'Dark+': {
    backdrop: 'rgba(0,0,0,0.55)',
    shadow: 'rgba(0,0,0,0.6)',
    border: 'rgba(255,255,255,0.06)'
  },
  'Light+': {
    backdrop: 'rgba(0,0,0,0.35)',
    shadow: 'rgba(0,0,0,0.15)',
    border: 'rgba(0,0,0,0.08)'
  },
  'Default Light+': {
    backdrop: 'rgba(0,0,0,0.35)',
    shadow: 'rgba(0,0,0,0.15)',
    border: 'rgba(0,0,0,0.08)'
  }
};

export function lookupModalTokensForThemeLabel(label?: string): ModalTokens | undefined {
  if (!label) return undefined;
  for (const key of Object.keys(themeTokenMap)) {
    if (label.indexOf(key) !== -1) return themeTokenMap[key];
  }
  // try case-insensitive substring match
  const lower = label.toLowerCase();
  for (const key of Object.keys(themeTokenMap)) {
    if (lower.indexOf(key.toLowerCase()) !== -1) return themeTokenMap[key];
  }
  return undefined;
}

export default themeTokenMap;
