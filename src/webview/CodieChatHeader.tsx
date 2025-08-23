// CodieChatHeader.tsx
import React from 'react';

export const CodieChatHeader: React.FC<{ logoSrc: string }> = ({ logoSrc }) => (
  <header className="codie-chat-header codie-chat-header-center">
    <img src={logoSrc} alt="Codie Logo" className="codie-header-logo" />
  </header>
);
