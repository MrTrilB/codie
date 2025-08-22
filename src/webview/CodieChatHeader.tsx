// CodieChatHeader.tsx
import React from 'react';

export const CodieChatHeader: React.FC<{ logoSrc: string }> = ({ logoSrc }) => (
  <header className="codie-chat-header">
  <img src={logoSrc} alt="Codie Logo" className="codie-logo codie-logo-centered" />
  </header>
);
