
import React from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider } from '@fluentui/react-components';
import { codieLightTheme, codieDarkTheme } from './codieVSCodeTheme';
import { CodieChat } from './CodieChat';

// The logoSrc will be set by the webview host via a global variable or replaced at build time
console.log('[Codie] React index.tsx loaded, window.vscode:', window.vscode);


function getSystemTheme(): 'light' | 'dark' {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

const root = document.getElementById('root');
if (root) {
  function renderWithTheme(theme: 'light' | 'dark') {
    createRoot(root as HTMLElement).render(
      <FluentProvider theme={theme === 'dark' ? codieDarkTheme : codieLightTheme}>
        <CodieChat />
      </FluentProvider>
    );
  }

  let currentTheme: 'light' | 'dark' = getSystemTheme();
  renderWithTheme(currentTheme);

  // Listen for system theme changes
  if (window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', (e) => {
      const newTheme: 'light' | 'dark' = e.matches ? 'dark' : 'light';
      if (newTheme !== currentTheme) {
        currentTheme = newTheme;
        renderWithTheme(currentTheme);
      }
    });
  }
}
