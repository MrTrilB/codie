// CodieChat.tsx
import React from 'react';
import { CodieChatHeader } from './CodieChatHeader';
import { CodieChatMain } from './CodieChatMain';

export const CodieChat: React.FC = () => (
  <div className="codie-chat-container">
    <CodieChatHeader />
    <CodieChatMain />
  </div>
);
