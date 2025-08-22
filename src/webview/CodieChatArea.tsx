// CodieChatArea.tsx
import React from 'react';

export const CodieChatArea: React.FC = () => (
  <div className="codie-chat-area-shell">
    <div id="codie-chat-messages" className="codie-chat-messages"></div>
    <CodieChatFooter />
  </div>
);

import { CodieChatFooter } from './CodieChatFooter';
