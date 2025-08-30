import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Theme } from '@fluentui/react-components';
import { getCodieTheme, ThemeName } from './codieVSCodeTheme';

type ThemeContextValue = {
  themeOverride: ThemeName;
  setThemeOverride: (v: ThemeName) => void;
  effectiveTheme: Theme;
  effectiveKind: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  // Read injected override from host (set by extension.ts)
  const initial = ((window as any).codieThemeOverride as ThemeName) || 'system';
  const [themeOverride, setThemeOverride] = useState<ThemeName>(initial);

  const effectiveKind: 'light' | 'dark' = useMemo(() => {
    if (themeOverride === 'light') return 'light';
    if (themeOverride === 'dark') return 'dark';
    // system fallback: use prefers-color-scheme
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {}
    return 'light';
  }, [themeOverride]);

  const effectiveTheme = useMemo<Theme>(() => {
    // If explicit override, return that theme, otherwise use computed kind via getCodieTheme
    if (themeOverride === 'light') return getCodieTheme('light');
    if (themeOverride === 'dark') return getCodieTheme('dark');
    return getCodieTheme(effectiveKind === 'dark' ? 'dark' : 'light');
  }, [themeOverride, effectiveKind]);

  return (
    <ThemeContext.Provider value={{ themeOverride, setThemeOverride, effectiveTheme, effectiveKind }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useCodieTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useCodieTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
