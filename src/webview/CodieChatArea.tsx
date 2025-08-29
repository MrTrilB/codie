// Message type: sender ('user' | 'ai'), text, timestamp, and optional truncated flag
type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
  timestamp?: number;
  truncated?: boolean; // true if the AI response was cut off
};
// CodieChatArea.tsx

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { CodieCodeBlock } from './CodieCodeBlock';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { CodieChatFooter } from './CodieChatFooter';

// Font size for chat messages (user and AI)
const chatFontSize = '0.95em'; // Change this value to adjust font size globally

// Fluent UI v9 makeStyles for chat area, message bubbles, markdown, and action buttons
const useChatAreaStyles = makeStyles({
  areaShell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    flex: '1 1 0',
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 0,
    width: '100%',
    boxSizing: 'border-box',
  },
  messages: {
    flex: '1 1 0',
    flexGrow: 1,
    flexShrink: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
  padding: `${tokens.spacingVerticalS} 0`,
  paddingBottom: '6.5em',
    background: 'transparent',
    width: '100%',
    boxSizing: 'border-box',
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    margin: `${tokens.spacingVerticalXXL} 0`,
    fontSize: tokens.fontSizeBase400,
    opacity: 0.7,
  },
  userMsg: {
    background: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderRadius: `${tokens.borderRadiusLarge} ${tokens.borderRadiusSmall} ${tokens.borderRadiusLarge} ${tokens.borderRadiusLarge}`,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    margin: `${tokens.spacingVerticalXS} 0 ${tokens.spacingVerticalXS} 0`,
    maxWidth: '100%',
    alignSelf: 'flex-end',
    boxShadow: tokens.shadow2,
    textAlign: 'right',
    display: 'block',
    fontSize: chatFontSize,
    width: '100%',
    boxSizing: 'border-box',
  },
  botMsg: {
    background: 'none',
    color: tokens.colorNeutralForeground1,
    borderRadius: 0,
    padding: 0,
    margin: `${tokens.spacingVerticalXS} 0`,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    boxShadow: 'none',
    textAlign: 'left',
    display: 'block',
    borderLeft: 'none',
    position: 'static',
    fontSize: chatFontSize,
    width: '100%',
    boxSizing: 'border-box',
  },
  chatLabel: {
    fontSize: tokens.fontSizeBase200,
    opacity: 0.7,
    marginRight: tokens.spacingHorizontalS,
  },
  chatTimestamp: {
    fontSize: tokens.fontSizeBase100,
    opacity: 0.5,
    marginLeft: tokens.spacingHorizontalS,
  },
  // Markdown/code/diff/action styles (already present from previous patch)
  // Markdown code block (non-inline)
  codeBlock: {
    background: tokens.colorNeutralBackground1,
    color: tokens.colorBrandForeground2,
    fontFamily: 'Fira Mono, Consolas, Menlo, monospace',
    fontSize: '0.88em',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    margin: `${tokens.spacingVerticalXS} 0`,
    overflowX: 'auto',
    display: 'block',
  },
  // Markdown inline code
  codeInline: {
    background: tokens.colorNeutralBackground2,
    color: tokens.colorBrandForeground2,
    fontFamily: 'Fira Mono, Consolas, Menlo, monospace',
    fontSize: '0.88em',
    padding: '0.15em 0.4em',
    borderRadius: tokens.borderRadiusSmall,
  },
  // Diff block
  diffBlock: {
    background: tokens.colorNeutralBackground1,
    color: tokens.colorBrandForeground2,
    fontFamily: 'Fira Mono, Consolas, Menlo, monospace',
    fontSize: '0.88em',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    margin: `${tokens.spacingVerticalXS} 0`,
    overflowX: 'auto',
    display: 'block',
  },
  diffLineFlex: {
    display: 'flex',
    alignItems: 'center',
  },
  diffAdded: {
    color: tokens.colorPaletteGreenForeground1,
  },
  diffRemoved: {
    color: tokens.colorPaletteRedForeground1,
  },
  diffHunk: {
    color: tokens.colorBrandForeground2,
    opacity: 0.8,
  },
  diffIconEmpty: {
    width: '1.2em',
    display: 'inline-block',
  },
  // Continue/Cancel action row
  actionRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    margin: `${tokens.spacingVerticalM} 0`,
    justifyContent: 'center',
  },
  actionButton: {
    background: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    border: 'none',
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '1em',
    transition: 'background 0.15s',
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
  actionButtonCancel: {
    background: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
  },
});

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

  const styles = useChatAreaStyles();
  return (
    <div className={styles.areaShell}>
      <div id="codie-chat-messages" className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>Start a conversation with Codie!</div>
        )}
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          if (isUser) {
            return (
              <div key={idx} className={styles.userMsg}>
                <div>{msg.text}</div>
              </div>
            );
          } else {
            return (
              <div key={idx} className={styles.botMsg}>
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      if (!inline) {
                        return (
                          <CodieCodeBlock
                            code={String(children).replace(/\n$/, '')}
                            language={match ? match[1] : undefined}
                          />
                        );
                      }
                      return (
                        <code className={styles.codeInline + (className ? ' ' + className : '')} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>
      {/* Continue/Cancel box, Copilot-style */}
      {(aiRunning || canContinue) && (
        <div className={styles.actionRow}>
          {canContinue && (
            <button
              className={styles.actionButton}
              onClick={handleContinue}
              disabled={aiRunning}
            >
              Continue
            </button>
          )}
          {aiRunning && (
            <button
              className={styles.actionButton + ' ' + styles.actionButtonCancel}
              onClick={handleCancel}
              disabled={!aiRunning}
            >
              Cancel
            </button>
          )}
        </div>
      )}
      <CodieChatFooter onSendUserMessage={handleUserMessage} />
    </div>
  );
};
