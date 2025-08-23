// CodieChatArea.tsx
import React, { useState, useEffect, useRef } from 'react';
import { CodieChatFooter } from './CodieChatFooter';

// Message type: sender ('user' | 'ai'), text, timestamp
type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
  timestamp?: number;
};

export const CodieChatArea: React.FC = () => {
  // Message state: array of ChatMessage
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Ref for chat messages div
  const messagesEndRef = useRef<HTMLDivElement>(null);


  // Listen for AI responses from extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && msg.command === 'aiChatResponse' && typeof msg.text === 'string') {
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: msg.text, timestamp: Date.now() }
        ]);
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  // Handler to add a user message from the footer
  const handleUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text, timestamp: Date.now() }
    ]);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="codie-chat-area-shell">
      <div id="codie-chat-messages" className="codie-chat-messages">
        {messages.length === 0 && (
          <div className="codie-chat-empty">Start a conversation with Codie!</div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={
              'codie-chat-message ' +
              (msg.sender === 'user' ? 'codie-chat-message-user' : 'codie-chat-message-ai')
            }
          >
            <div className="codie-chat-message-bubble">
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <CodieChatFooter onSendUserMessage={handleUserMessage} />
    </div>
  );
};
