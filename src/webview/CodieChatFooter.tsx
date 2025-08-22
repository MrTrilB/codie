// CodieChatFooter.tsx
import React from 'react';

export const CodieChatFooter: React.FC = () => (
  <footer className="codie-chat-footer">
    <div className="codie-footer-content">
      <form className="codie-input-form" autoComplete="off">
        <div className="codie-input-row codie-input-row-top">
          <a href="#" className="codie-attach-link" id="codie-add-context-btn" title="Add Context" aria-label="Add Context" role="button" tabIndex={0}>
            <span className="codicon codicon-folder codie-font-11"></span>
            <span className="codie-add-context-label">Add Context...</span>
          </a>
          <div className="codie-attached-items"></div>
        </div>
        <textarea className="codie-input" placeholder="Type your message..." aria-label="Chat input" rows={2}></textarea>
        <div className="codie-input-row codie-input-row-bottom">
          <a href="#" className="codie-toolbar-link" id="codie-ai-provider-btn" title="AI Provider" aria-label="AI Provider" role="button" tabIndex={0}>
            <span className="codicon codicon-server-environment"></span>
          </a>
          <a href="#" className="codie-toolbar-link" id="codie-model-picker-btn" title="AI Model" aria-label="AI Model" role="button" tabIndex={0}>
            <span className="codicon codicon-hubot"></span>
          </a>
          <span id="codie-selected-model" className="codie-selected-model"></span>
          <span className="codie-flex-spacer"></span>
          <a href="#" className="codie-toolbar-link" title="Voice Chat" aria-label="Voice Chat" role="button" tabIndex={0}>
            <span className="codicon codicon-mic"></span>
          </a>
          <a href="#" id="codie-tools-btn" className="codie-toolbar-link" title="Tools" aria-label="Tools" role="button" tabIndex={0}>
            <span className="codicon codicon-debug-disconnect"></span>
          </a>
          <a href="#" id="codie-chat-send" className="codie-send-link" aria-label="Send" role="button" tabIndex={0}>
            <span className="codicon codicon-send"></span>
          </a>
        </div>
      </form>
    </div>
  </footer>
);
