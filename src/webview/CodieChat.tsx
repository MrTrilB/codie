// CodieChat.tsx
import React from 'react';
import { CodieChatHeader } from './CodieChatHeader';
import { CodieChatMain } from './CodieChatMain';

export const CodieChat: React.FC<{ logoSrc: string }> = ({ logoSrc }) => (
  <div className="codie-chat-container">
    <CodieChatHeader logoSrc={logoSrc} />
    <CodieChatMain />
  </div>
);
