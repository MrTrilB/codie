
import React, { useState, useRef, useEffect } from 'react';
interface CodieChatFooterProps {
  onSendUserMessage?: (text: string) => void;
}

export const CodieChatFooter: React.FC<CodieChatFooterProps> = ({ onSendUserMessage }) => {

  // No local tools dropdown state; handled by VS Code QuickPick


  // No local tools dropdown logic


  // Handler for Tools button: open VS Code QuickPick
  const handleToolsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (window.vscode) {
      window.vscode.postMessage({ command: 'openToolSettings' });
    }
  };
    // State for selected model group in side menu
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [modelPickerPage, setModelPickerPage] = useState<'categories' | 'models'>('categories');
  // State for chat input
  const [chatInput, setChatInput] = useState('');
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // State for error message
  const [sendError, setSendError] = useState<string | null>(null);
  // Handler for sending a message
  const handleSend = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    if (!selectedProvider.key || !selectedModel.key) {
      setSendError('Please select an AI provider and model before sending.');
      return;
    }
    setSendError(null);
    if (window.vscode) {
      window.vscode.postMessage({ command: 'userChatMessage', text });
    }
    if (onSendUserMessage) {
      onSendUserMessage(text);
    }
    setChatInput('');
    // Optionally reset textarea height
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
    }
  };

  // Handler for textarea input (auto-resize)
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    const computed = window.getComputedStyle(ta);
    let lineHeight = parseFloat(computed.lineHeight);
    if (isNaN(lineHeight)) lineHeight = 18;
    const maxHeight = 12 * lineHeight;
    if (ta.scrollHeight > maxHeight) {
      ta.style.height = maxHeight + 'px';
      ta.style.overflowY = 'auto';
    } else {
      ta.style.height = ta.scrollHeight + 'px';
      ta.style.overflowY = 'hidden';
    }
  };

  // Handler for Enter key (send on Enter, not Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
    // Providers dropdown state
  const [showProviders, setShowProviders] = useState(false);
    // Track both alias (key) and label
    const [selectedProvider, setSelectedProvider] = useState<{ key: string; label: string }>({ key: '', label: '' });
    // Model picker state
  const [showModels, setShowModels] = useState(false);
    const [models, setModels] = useState<Array<{ key: string; label: string }>>([]);
    const [selectedModel, setSelectedModel] = useState<{ key: string; label: string }>({ key: '', label: '' });
  const modelDropdownRef = useRef<HTMLDivElement>(null);
    const providers = [
      { key: 'foundry', label: 'FoundryLocal' },
      { key: 'lmstudio', label: 'LM Studio' },
      { key: 'ollama', label: 'Ollama' },
    ];
  const dropdownRef = useRef<HTMLDivElement>(null);

    // Listen for model list and model selection from extension
    useEffect(() => {
      const handler = (event: MessageEvent) => {
        const msg = event.data;
        if (msg && msg.command === 'modelList') {
          if (Array.isArray(msg.models)) {
            setModels(msg.models);
          }
        }
        if (msg && msg.command === 'selectedModel') {
          console.log('[CodieChatFooter] received selectedModel:', msg);
          if (msg.model && msg.model.key && msg.model.label) {
            setSelectedModel(msg.model);
          } else {
            // Ignore empty/invalid model updates
            console.warn('[CodieChatFooter] Ignored empty/invalid model:', msg.model);
          }
          if (msg.provider) {
            let found = providers.find(
              (p) => p.label === msg.provider || p.key === msg.provider
            );
            if (found) {
              setSelectedProvider({ key: found.key, label: found.label });
            } else {
              setSelectedProvider({ key: msg.provider, label: msg.provider });
            }
          }
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, []);

    // Close model dropdown on outside click
    useEffect(() => {
      if (!showModels) return;
      const handleClick = (e: MouseEvent) => {
        if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
          setShowModels(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [showModels]);

    // Listen for provider updates from extension
    useEffect(() => {
      const handler = (event: MessageEvent) => {
        const msg = event.data;
        if (msg && msg.command === 'selectedModel') {
          if (msg.provider) {
            let found = providers.find(
              (p) => p.label === msg.provider || p.key === msg.provider
            );
            if (found) {
              setSelectedProvider({ key: found.key, label: found.label });
            } else {
              setSelectedProvider({ key: msg.provider, label: msg.provider });
            }
          }
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, []);

    // Close providers dropdown on outside click
    useEffect(() => {
      if (!showProviders) return;
      const handleClick = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setShowProviders(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [showProviders]);

    // Handler for Model Picker button
    const handleModelPickerClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (window.vscode && selectedProvider.key) {
        window.vscode.postMessage({ command: 'getModelsForProvider', provider: selectedProvider.key });
        setShowModels(true);
        setModelPickerPage('categories');
        setSelectedGroup(null);
      }
    };

    // Handler for selecting a model
    const handleModelSelect = (model: { key: string; label: string }) => {
      setShowModels(false);
      setSelectedModel(model);
      if (window.vscode) {
        window.vscode.postMessage({ command: 'setModel', model: model.key });
      }
    };

    // Group models by top-level and sub-level (menu > submenu)
    function groupModelsHierarchical(models: Array<{ key: string; label: string }>) {
      const groups: Record<string, Record<string, Array<{ key: string; label: string }>>> = {};
      models.forEach((model) => {
        const parts = model.label.split('-');
        let group = parts[0];
        let subgroup = parts.length > 1 ? parts[1] : '';
        if (parts.length > 2 && /^\d/.test(parts[1])) {
          group = parts[0] + '-' + parts[1];
          subgroup = parts[2] || '';
        }
        if (!groups[group]) groups[group] = {};
        if (!groups[group][subgroup]) groups[group][subgroup] = [];
        groups[group][subgroup].push(model);
      });
      return groups;
    }

    // Handler for Add Context button
    const handleAddContext = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (window.vscode) {
        window.vscode.postMessage({ command: 'openAddContextPicker' });
      }
    };

    // Handler for Providers button
    const handleProvidersClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setShowProviders((v) => !v);
    };

    // Handler for selecting a provider
    const handleProviderSelect = (providerLabel: string) => {
      setShowProviders(false);
      const found = providers.find((p) => p.label === providerLabel);
      if (window.vscode && found) {
        window.vscode.postMessage({ command: 'setProvider', provider: found.key });
        setSelectedProvider({ key: found.key, label: found.label });
      }
    };

    // Handler for gear click
    const handleProviderGear = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setShowProviders(false);
      if (window.vscode) {
        window.vscode.postMessage({ command: 'openProviderSettings' });
      }
    };

    return (
      <>
        <footer className="codie-chat-footer">
          <div className="codie-footer-content">
            <form className="codie-input-form" autoComplete="off">
              <div className="codie-input-row codie-input-row-top">
                <a
                  href="#"
                  className="codie-attach-link"
                  id="codie-add-context-btn"
                  title="Add Context"
                  aria-label="Add Context"
                  role="button"
                  tabIndex={0}
                  onClick={handleAddContext}
                >
                  <span className="codicon codicon-folder codie-font-11"></span>
                  <span className="codie-add-context-label">Add Context...</span>
                </a>
                <div className="codie-attached-items"></div>
              </div>
              {/* Removed duplicate textarea. Only controlled React textarea below. */}
        <textarea
          className="codie-input"
          placeholder="Type your message..."
          aria-label="Chat input"
          rows={2}
          value={chatInput}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          ref={chatInputRef}
        ></textarea>
        {sendError && (
          <div style={{ color: '#ff6161', fontSize: '0.95em', marginTop: '0.2em', marginLeft: '0.2em' }}>{sendError}</div>
        )}
              <div className="codie-input-row codie-input-row-bottom codie-footer-row-relative">
                <a
                  href="#"
                  className="codie-toolbar-link"
                  id="codie-ai-provider-btn"
                  title="AI Provider"
                  aria-label="AI Provider"
                  role="button"
                  tabIndex={0}
                  onClick={handleProvidersClick}
                >
                  <span className="codicon codicon-server-environment"></span>
                </a>
                {showProviders && (
                  <div
                    ref={dropdownRef}
                    className="codie-provider-dropdown"
                  >
                    {providers.map((p) => (
                      <div
                        key={p.key}
                        className={`codie-provider-option${selectedProvider.key === p.key ? ' codie-provider-option-selected' : ''}`}
                        onClick={() => handleProviderSelect(p.label)}
                      >
                        <span className="codicon codicon-server-environment codie-provider-option-icon"></span>
                        {p.label}
                      </div>
                    ))}
                    <div className="codie-provider-dropdown-divider"></div>
                    <button
                      onClick={handleProviderGear}
                      className="codie-provider-gear-btn"
                      title="Manage Providers"
                    >
                      <span className="codicon codicon-gear codie-provider-gear-icon"></span>
                      <span className="codie-provider-gear-label">Manage Providers</span>
                    </button>
                  </div>
                )}
                <a
                  href="#"
                  className="codie-toolbar-link"
                  id="codie-model-picker-btn"
                  title="AI Model"
                  aria-label="AI Model"
                  role="button"
                  tabIndex={0}
                  onClick={handleModelPickerClick}
                >
                  <span className="codicon codicon-hubot"></span>
                </a>
                {showModels && (
                  <div
                    ref={modelDropdownRef}
                    className="codie-model-picker-dropdown"
                  >
                    {models.length === 0 && <div className="codie-models-empty">No models found</div>}
                    {models.length > 0 && (() => {
                      const groups = groupModelsHierarchical(models);
                      const groupNames = Object.keys(groups);
                      // Page 1: Categories
                      if (modelPickerPage === 'categories') {
                        return (
                          <div className="codie-model-picker-groups">
                            {groupNames.map((group) => (
                              <div
                                key={group}
                                onClick={() => {
                                  setSelectedGroup(group);
                                  setModelPickerPage('models');
                                }}
                                className="codie-model-picker-group"
                              >
                                {group}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      // Page 2: Models in selected group
                      if (modelPickerPage === 'models' && selectedGroup && groups[selectedGroup]) {
                        const subgroups = groups[selectedGroup] || {};
                        const subgroupNames = Object.keys(subgroups).filter((sg) => sg !== '');
                        return (
                          <div className="codie-model-picker-models-page">
                            <div className="codie-model-picker-back" onClick={() => setModelPickerPage('categories')}>
                              <span className="codicon codicon-arrow-left"></span> Back to categories
                            </div>
                            <div className="codie-model-picker-submenu">
                              {/* Show models with no subgroup first */}
                              {subgroups[''] && subgroups[''].map((m) => (
                                <div
                                  key={m.key}
                                  className={`codie-provider-option${selectedModel.key === m.key ? ' codie-provider-option-selected' : ''} codie-model-picker-option-root`}
                                  onClick={() => handleModelSelect(m)}
                                >
                                  <span className="codicon codicon-hubot codie-provider-option-icon"></span>
                                  {m.label}
                                </div>
                              ))}
                              {/* Then show subgroups as headers with their models */}
                              {subgroupNames.map((sg) => (
                                <React.Fragment key={sg}>
                                  <div className="codie-model-picker-subgroup-header">{sg}</div>
                                  {subgroups[sg].map((m) => (
                                    <div
                                      key={m.key}
                                      className={`codie-provider-option${selectedModel.key === m.key ? ' codie-provider-option-selected' : ''} codie-model-picker-option-sub`}
                                      onClick={() => handleModelSelect(m)}
                                    >
                                      <span className="codicon codicon-hubot codie-provider-option-icon"></span>
                                      {m.label}
                                    </div>
                                  ))}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                <span
                  id="codie-selected-model"
                  className="codie-selected-model"
                  title={selectedModel.label}
                >
                  {(() => {
                    if (!selectedModel.label) return '';
                    // Match version (e.g., 'Phi-4', 'GPT-4.1') or version + '-Mini'
                    const match = selectedModel.label.match(/^(\w+-\d+(?:\.\d+)?)(-Mini)?/i);
                    if (match) {
                      return match[1] + (match[2] || '');
                    }
                    return selectedModel.label;
                  })()}
                </span>
                <span className="codie-flex-spacer"></span>
                <a href="#" className="codie-toolbar-link" title="Voice Chat" aria-label="Voice Chat" role="button" tabIndex={0}>
                  <span className="codicon codicon-mic"></span>
                </a>
                <a
                  href="#"
                  id="codie-tools-btn"
                  className="codie-toolbar-link"
                  title="Tools"
                  aria-label="Tools"
                  role="button"
                  tabIndex={0}
                  onClick={handleToolsClick}
                >
                  <span className="codicon codicon-debug-disconnect"></span>
                </a>
                {/* Tools dropdown removed; handled by VS Code QuickPick */}
                <a
                  href="#"
                  id="codie-send-btn"
                  className="codie-send-link"
                  title="Send Message"
                  aria-label="Send Message"
                  role="button"
                  tabIndex={0}
                  onClick={handleSend}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                >
                  <span className="codicon codicon-send"></span>
                </a>
              </div>
            </form>
          </div>
        </footer>
      </>
    );
}

