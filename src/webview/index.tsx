import React from 'react';
import { createRoot } from 'react-dom/client';
import { CodieChat } from './CodieChat';

// The logoSrc will be set by the webview host via a global variable or replaced at build time
const logoSrc = (window as any).codieLogoUri || '';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<CodieChat logoSrc={logoSrc} />);
}
