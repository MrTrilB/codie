import React, { useState, useRef, useEffect } from 'react';
import { Textarea, Button, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, tokens, makeStyles } from '@fluentui/react-components';
import {
  Folder16Regular,
  Send16Regular,
  ChevronDown16Regular,
  ChevronUp16Regular,
  Server16Regular,
  Settings16Regular,
  Bot16Regular,
  Mic16Regular,
  PlugDisconnected16Regular
} from '@fluentui/react-icons';


// --- Fluent UI v9 makeStyles for CodieChatFooter (migrated from chat.css) ---
const useFooterStyles = makeStyles({
  footer: {
    display: 'flex',
    flex: '0 0 auto',
    padding: `${tokens.spacingVerticalM} 0`,
    background: tokens.colorNeutralBackground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    boxShadow: tokens.shadow4,
    minHeight: '3.5em',
    width: '100%',
    boxSizing: 'border-box',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    marginTop: 'auto',
  },
  footerContent: {
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    alignItems: 'center',
    overflow: 'visible',
    gap: tokens.spacingVerticalXS,
  },
  inputForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    background: 'transparent',
    border: 'none',
    margin: 0,
    padding: 0,
    width: '100%',
    flex: '1 1 auto',
  },
  inputRowTop: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: tokens.spacingHorizontalXS,
  },
  inputRowBottom: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXS,
    position: 'relative',
  },
  chatFooterInputRow: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'stretch',
  },
  textarea: {
    width: '100%',
    minHeight: '2.5em',
    maxHeight: '12em',
    background: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: 'none',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM} ${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    fontSize: tokens.fontSizeBase300,
    margin: 0,
    boxSizing: 'border-box',
    transition: 'background 0.15s, box-shadow 0.15s',
    lineHeight: '1.8em',
    resize: 'none',
    '::placeholder': {
      color: tokens.colorNeutralForeground3,
      opacity: 1,
    },
    ':focus': {
      background: tokens.colorNeutralBackground1,
    },
  },
  sendButton: {
    position: 'absolute',
    right: tokens.spacingHorizontalM,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    height: '2.2em',
    minWidth: '2.2em',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'none',
  },
  attachLink: {
    display: 'flex',
    alignItems: 'center',
    maxWidth: '80px',
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXXS}`,
    textDecoration: 'none',
    color: tokens.colorNeutralForeground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    cursor: 'pointer',
    background: 'none',
    transition: 'color 0.15s, opacity 0.15s',
    ':hover, :focus': {
      color: tokens.colorBrandForeground1,
      opacity: 0.85,
    },
  },
  addContextLabel: {
    marginLeft: tokens.spacingHorizontalXXS,
    fontSize: tokens.fontSizeBase100,
  },
  sendError: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
    marginBottom: tokens.spacingVerticalXXS,
    fontWeight: 500,
  },
  flexSpacer: {
    flex: '1 1 auto',
    minWidth: 0,
  },
  folderIcon: {
    fontSize: tokens.fontSizeBase200,
  },
  toolbarLink: {
    color: tokens.colorNeutralForeground1,
    background: 'none',
    border: 'none',
    fontSize: tokens.fontSizeBase300,
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXXS}`,
    margin: 0,
    transition: 'color 0.15s, opacity 0.15s',
    ':hover, :focus': {
      color: tokens.colorBrandForeground1,
      opacity: 0.85,
    },
  },
});

// --- Fluent UI v9 Menu Styles (converted from chat.css) ---
const useMenuStyles = makeStyles({
  menuPopover: {
    background: '#23272e',
    color: '#fff',
    border: '1px solid #444',
    boxShadow: '0 2px 12px #0006',
    borderRadius: '6px',
    minWidth: '100px',
    maxWidth: '250px',
    padding: '0.2em 0',
    zIndex: 1000,
  },
  menuList: {
    background: 'transparent',
    color: '#fff',
    padding: 0,
  },
  menuItem: {
    padding: '0.35em 0.9em',
    cursor: 'pointer',
    background: 'transparent',
    borderRadius: '4px',
    fontWeight: 400,
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.12s',
    margin: '0 0.15em',
    selectors: {
      '&:hover, &:focus': {
        background: '#2a2d32',
        color: '#fff',
      },
    },
  },
  menuButton: {
    minWidth: '70px',
    fontSize: tokens.fontSizeBase100,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: '8px',
    height: '2em',
    lineHeight: 1.1,
    border: `0 solid ${tokens.colorNeutralStroke1}`,
  },
  providerButton: {
    minWidth: '60px',
    fontSize: tokens.fontSizeBase100,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    height: '2em',
    lineHeight: 1.1,
    border: `0 solid ${tokens.colorNeutralStroke1}`,
  },
  menuButtonOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderBottom: 'none',
  },
  menuButtonClosed: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  menuLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  iconMargin: {
    marginRight: '6px',
  },
  chevronIcon: {
    marginLeft: '4px',
    fontSize: '1em',
    display: 'inline-flex',
    alignItems: 'center',
  },
  gearIcon: {
    marginRight: '6px',
    fontSize: '13px',
  },
  gearLabelBold: {
    fontWeight: 500,
  },
  selectedModel: {
    marginLeft: '0.7em',
    fontSize: '10px',
    color: '#fff',
    opacity: 0.8,
  },
});
interface CodieChatFooterProps {
  onSendUserMessage?: (text: string) => void;
}

export const CodieChatFooter: React.FC<CodieChatFooterProps> = ({ onSendUserMessage }) => {
  const menuStyles = useMenuStyles();
  const footerStyles = useFooterStyles();
  // Open state for provider/model menus
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  // Tool management modal state removed
  // MCP settings modal state removed
  // Handler for Tools button: open global tools dropdown
  const handleToolsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (window.vscode) {
      window.vscode.postMessage({ command: 'executeCommand', commandName: 'codie.tools.manage' });
    }
  };

  // Tool enable/disable handler removed (tools modal no longer used)

  // Open MCP settings modal
  // MCP settings modal handlers removed
  // No longer need selectedGroup/modelPickerPage; use nested Menu for groups
  // State for chat input
  const [chatInput, setChatInput] = useState('');
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  // State for error message
  const [sendError, setSendError] = useState<string | null>(null);
  // Track both alias (key) and label
  const [selectedProvider, setSelectedProvider] = useState<{ key: string; label: string }>({ key: '', label: '' });
  // Model picker state
  const [models, setModels] = useState<Array<{ key: string; label: string }>>([]);
  const [selectedModel, setSelectedModel] = useState<{ key: string; label: string }>({ key: '', label: '' });
  const providers = [
    { key: 'foundry', label: 'Foundry' },
    { key: 'lmstudio', label: 'LM Studio' },
    { key: 'ollama', label: 'Ollama' },
  ];
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        if (msg.model && msg.model.key && msg.model.label) {
          setSelectedModel(msg.model);
        }
        if (msg.provider) {
          if (typeof msg.provider === 'string' && msg.provider.toLowerCase().startsWith('foundry')) {
            setSelectedProvider({ key: 'foundry', label: 'Foundry' });
          } else {
            let found = providers.find((p) => p.label === msg.provider || p.key === msg.provider);
            if (found) {
              setSelectedProvider({ key: found.key, label: found.label });
            } else {
              setSelectedProvider({ key: msg.provider, label: msg.provider });
            }
          }
        }
      }
      // Listen for tool list from extension (removed)
      // MCP settings message handler removed
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);



  // Listen for provider updates from extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && msg.command === 'selectedModel') {
        if (msg.provider) {
          // Map any provider string starting with 'foundry' to canonical Foundry
          if (typeof msg.provider === 'string' && msg.provider.toLowerCase().startsWith('foundry')) {
            setSelectedProvider({ key: 'foundry', label: 'Foundry' });
          } else {
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
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);





  // Handler for selecting a model
  const handleModelSelect = (event: any, data: { optionValue?: string }) => {
    if (!data.optionValue) return;
    const found = models.find((m) => m.key === data.optionValue);
    if (window.vscode && found) {
      window.vscode.postMessage({ command: 'setModel', model: found.key });
      setSelectedModel({ key: found.key, label: found.label });
    }
  };


  // Robustly group models: use 'group' property if present, else first word/hyphen, else 'Other'
  function getModelGroups(models: Array<{ key: string; label: string; group?: string }>) {
    const groups: Record<string, Array<{ key: string; label: string; group?: string }>> = {};
    models.forEach((model) => {
      let group: string;
      if (model.group && typeof model.group === 'string') {
        group = model.group;
      } else {
        // Try to extract prefix before first space or hyphen
        const match = model.label.match(/^([\w\-]+?)(?:-|\s)/);
        group = match ? match[1] : 'Other';
      }
      if (!groups[group]) groups[group] = [];
      groups[group].push(model);
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



  // Handler for selecting a provider
  const handleProviderSelect = (event: any, data: { optionValue?: string }) => {
    if (!data.optionValue) return;
    if (data.optionValue === '__manage__') {
      handleProviderGear(event);
      return;
    }
    const found = providers.find((p) => p.key === data.optionValue);
    if (window.vscode && found) {
      window.vscode.postMessage({ command: 'setProvider', provider: found.key });
      setSelectedProvider({ key: found.key, label: found.label });
      // Request models for the selected provider
      window.vscode.postMessage({ command: 'getModelsForProvider', provider: found.key });
    }
  };
  // On initial load, if a provider is already selected, request its models
  useEffect(() => {
    if (selectedProvider.key && window.vscode) {
      window.vscode.postMessage({ command: 'getModelsForProvider', provider: selectedProvider.key });
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for gear click
  const handleProviderGear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (window.vscode) {
      window.vscode.postMessage({ command: 'openProviderSettings' });
    }
  };

  return (
    <>
      <footer className={footerStyles.footer}>
        <div className={footerStyles.footerContent}>
          <form className={footerStyles.inputForm} autoComplete="off">
            <div className={footerStyles.inputRowTop}>
              <a
                href="#"
                className={footerStyles.attachLink}
                id="codie-add-context-btn"
                title="Add Context"
                aria-label="Add Context"
                role="button"
                tabIndex={0}
                onClick={handleAddContext}
              >
                <Folder16Regular className={footerStyles.folderIcon} />
                <span className={footerStyles.addContextLabel}>Add Context...</span>
              </a>
              <div></div>
            </div>
            {/* Removed duplicate textarea. Only controlled React textarea below. */}
            <div className={footerStyles.chatFooterInputRow}>
              <Textarea
                className={footerStyles.textarea}
                placeholder="Type your message..."
                aria-label="Chat input"
                rows={2}
                value={chatInput}
                onChange={(_, data) => setChatInput(data.value)}
                onKeyDown={handleKeyDown}
                ref={chatInputRef}
                style={{ width: '100%' }}
              />
              <Button
                appearance="primary"
                aria-label="Send Message"
                title="Send Message"
                onClick={handleSend}
                disabled={!chatInput.trim()}
                icon={<Send16Regular />}
                className={footerStyles.sendButton}
                tabIndex={0}
              />
            </div>
            {sendError && (
              <div className={footerStyles.sendError}>{sendError}</div>
            )}
            <div className={footerStyles.inputRowBottom}>
              {/* AI Provider Picker: Fluent UI Menu */}
              <Menu open={providerMenuOpen} onOpenChange={(_, data) => setProviderMenuOpen(data.open)} openOnHover={false}>
                <MenuTrigger disableButtonEnhancement>
                  <Button appearance="secondary" className={menuStyles.providerButton}>
                    {selectedProvider.label ? selectedProvider.label : 'Provider'}{' '}
                    <span className={menuStyles.chevronIcon}>
                      {providerMenuOpen ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
                    </span>
                  </Button>
                </MenuTrigger>
                <MenuPopover className={menuStyles.menuPopover}>
                  <MenuList className={menuStyles.menuList}>
                    {providers.map((p) => (
                      <MenuItem
                        key={p.key}
                        className={menuStyles.menuItem}
                        onClick={() => {
                          if (window.vscode) {
                            window.vscode.postMessage({ command: 'setProvider', provider: p.key });
                            window.vscode.postMessage({ command: 'getModelsForProvider', provider: p.key });
                          }
                          setSelectedProvider({ key: p.key, label: p.label });
                        }}
                      >
                        <Server16Regular className={menuStyles.iconMargin} />
                        {p.label}
                      </MenuItem>
                    ))}
                    <MenuItem
                      key="__manage__"
                      className={menuStyles.menuItem}
                      onClick={() => handleProviderGear({ preventDefault: () => {} } as any)}
                    >
                      <Settings16Regular className={menuStyles.gearIcon} />
                      <span className={menuStyles.gearLabelBold}>Manage Providers</span>
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>

              {/* AI Model Picker: Fluent UI Nested Menu for robust multi-level navigation */}
              <Menu open={modelMenuOpen} onOpenChange={(_, data) => setModelMenuOpen(data.open)} openOnHover={false}>
                <MenuTrigger disableButtonEnhancement>
                  <Button
                    appearance="secondary"
                    className={menuStyles.menuButton}
                    title={selectedModel.label || 'Select model'}
                  >
                    {selectedModel.label
                      ? (() => {
                          // Show only the first part of the model name (e.g., 'Phi-4', 'Phi-3', 'Phi-4-mini', 'Phi-3-mini')
                          // If model name contains dash, show up to second dash (e.g., 'Phi-4-mini'), else show full label
                          const parts = selectedModel.label.split('-');
                          if (parts.length >= 3) {
                            // e.g., 'Phi-4-mini' or 'Phi-3-mini'
                            return parts.slice(0, 3).join('-');
                          } else if (parts.length === 2) {
                            // e.g., 'Phi-4'
                            return parts.slice(0, 2).join('-');
                          } else {
                            // e.g., 'GPT4', 'Llama', etc.
                            return selectedModel.label;
                          }
                        })()
                      : 'Select model'}{' '}
                    <span className={menuStyles.chevronIcon}>
                      {modelMenuOpen ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
                    </span>
                  </Button>
                </MenuTrigger>
                <MenuPopover className={menuStyles.menuPopover}>
                  <MenuList className={menuStyles.menuList}>
                    {(() => {
                      const groups = getModelGroups(models);
                      const groupNames = Object.keys(groups);
                      if (models.length === 0) {
                        return <MenuItem disabled>No models found</MenuItem>;
                      }
                      return groupNames.map((group) => (
                        <Menu key={group} openOnHover={true}>
                          <MenuTrigger disableButtonEnhancement>
                            <MenuItem className={menuStyles.menuItem}>
                              <Bot16Regular className={menuStyles.iconMargin} />
                              {group}
                            </MenuItem>
                          </MenuTrigger>
                          <MenuPopover className={menuStyles.menuPopover}>
                            <MenuList className={menuStyles.menuList}>
                              {groups[group].length > 0 ? (
                                groups[group].map((m) => (
                                  <MenuItem
                                    key={m.key}
                                    className={menuStyles.menuItem}
                                    onClick={() => {
                                      if (window.vscode) {
                                        window.vscode.postMessage({ command: 'setModel', model: m.key });
                                      }
                                      setSelectedModel({ key: m.key, label: m.label });
                                    }}
                                  >
                                    <Bot16Regular className={menuStyles.iconMargin} />
                                    {m.label}
                                  </MenuItem>
                                ))
                              ) : (
                                <MenuItem disabled>No models in this group</MenuItem>
                              )}
                            </MenuList>
                          </MenuPopover>
                        </Menu>
                      ));
                    })()}
                  </MenuList>
                </MenuPopover>
              </Menu>
              
              <span className={footerStyles.flexSpacer}></span>
              <a href="#" className={footerStyles.toolbarLink} title="Voice Chat" aria-label="Voice Chat" role="button" tabIndex={0}>
                <Mic16Regular />
              </a>
              <a
                href="#"
                id="codie-mcp-btn"
                className={footerStyles.toolbarLink}
                title="Manage MCP Servers"
                aria-label="Manage MCP Servers"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (window.vscode) {
                    window.vscode.postMessage({ command: 'executeCommand', commandName: 'codie.tools.manageMCPServers' });
                  }
                }}
              >
                <Server16Regular />
              </a>
              <a
                href="#"
                id="codie-tools-btn"
                className={footerStyles.toolbarLink}
                title="Tools"
                aria-label="Tools"
                role="button"
                tabIndex={0}
                onClick={handleToolsClick}
              >
                <PlugDisconnected16Regular />
              </a>
              {/* Tool management modal removed; Tools button now opens global dropdown */}
            </div>
          </form>
        </div>
      </footer>
    </>
  );
};


