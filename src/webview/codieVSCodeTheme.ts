import { createLightTheme, createDarkTheme, BrandVariants, Theme } from '@fluentui/react-components';

// Codie BrandVariants from Fluent UI Theme Designer
export const codieVSCodeBrand: BrandVariants = {
  10: "#040108",
  20: "#1D1030",
  30: "#2D1659",
  40: "#391B7B",
  50: "#44229E",
  60: "#4F2CB9",
  70: "#5E3CC4",
  80: "#6C4DCC",
  90: "#7A5DD4",
  100: "#876DDA",
  110: "#957DE0",
  120: "#A38EE6",
  130: "#B09EEB",
  140: "#BEAFEF",
  150: "#CBC0F3",
  160: "#D9D1F7"
};

export const codieLightTheme: Theme = {
  ...createLightTheme(codieVSCodeBrand),
  colorBrandForeground2: codieVSCodeBrand[50],
};

export const codieDarkTheme: Theme = {
  ...createDarkTheme(codieVSCodeBrand),
  colorBrandForeground1: codieVSCodeBrand[110],
  colorBrandForeground2: codieVSCodeBrand[120],
};

// Default export: use light theme for now
export type ThemeName = 'light' | 'dark' | 'system';

export function getCodieTheme(name: ThemeName): Theme {
  if (name === 'dark') return codieDarkTheme;
  return codieLightTheme;
}

// Keep codieLightTheme as the canonical light theme export and provide an alias
export const codieVSCodeTheme = codieLightTheme;

// Return a fresh reference to the light theme. Prefer callers to use `getCodieTheme('light')` but
// provide this convenience getter for compatibility with older imports.
export function getCodieLightTheme(): Theme {
  return getCodieTheme('light');
}

// Compatibility export: some files imported the light theme directly.
export const codieLightThemeLegacy = codieLightTheme;
