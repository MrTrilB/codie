// CodieChatArea.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { CodieChatFooter } from './CodieChatFooter';

// Message type: sender ('user' | 'ai'), text, timestamp, and optional truncated flag
type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
  timestamp?: number;
  truncated?: boolean; // true if the AI response was cut off
};


export const CodieChatArea: React.FC = () => {
  // Message state: array of ChatMessage
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Ref for chat messages div
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track if an AI response is running
  const [aiRunning, setAiRunning] = useState(false);
  // Track if the last AI message was truncated (needs continue)
  const [canContinue, setCanContinue] = useState(false);

  // Listen for AI responses from extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && msg.command === 'aiChatResponse' && typeof msg.text === 'string') {
        // If the response is marked as truncated, set canContinue
        const truncated = !!msg.truncated;
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: msg.text, timestamp: Date.now(), truncated }
        ]);
        setAiRunning(false);
        setCanContinue(truncated);
      }
      if (msg && msg.command === 'aiChatStarted') {
        setAiRunning(true);
        setCanContinue(false);
      }
      if (msg && msg.command === 'aiChatCancelled') {
        setAiRunning(false);
        setCanContinue(false);
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: 'Request cancelled.', timestamp: Date.now() }
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
    setAiRunning(true);
    setCanContinue(false);
  };

  // Handler for Continue button
  const handleContinue = () => {
    if (window.vscode) {
      window.vscode.postMessage({ command: 'continueAIResponse' });
    }
    setAiRunning(true);
    setCanContinue(false);
  };

  // Handler for Cancel button
  const handleCancel = () => {
    if (window.vscode) {
      window.vscode.postMessage({ command: 'cancelAIResponse' });
    }
    setAiRunning(false);
    setCanContinue(false);
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
              'codie-chat-message ' + (msg.sender === 'user' ? 'user' : 'bot')
            }
          >
            <div className="codie-chat-message-bubble">
              {msg.sender === 'ai' ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* Continue/Cancel box, Copilot-style */}
      {(aiRunning || canContinue) && (
        <div className="codie-continue-cancel-box">
          {canContinue && (
            <button className="codie-continue-btn" onClick={handleContinue} disabled={aiRunning}>
              Continue
            </button>
          )}
          {aiRunning && (
            <button className="codie-cancel-btn" onClick={handleCancel} disabled={!aiRunning}>
              Cancel
            </button>
          )}
        </div>
      )}
      <CodieChatFooter onSendUserMessage={handleUserMessage} />
    </div>
  );
};
