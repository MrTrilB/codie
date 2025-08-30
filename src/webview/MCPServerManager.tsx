// NOTE: All styling in this file must be managed via Fluent UI / Griffel `makeStyles`.
// NOTE: All icons across webviews should come from Fluent UI Icons only.
import React, { useState, useEffect, useRef } from 'react';
import { 
  FluentProvider, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableRow, 
  TableHeader, 
  TableHeaderCell, 
  Input, 
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent } from '@fluentui/react-components';
import { ClipboardTextEdit24Filled, DeleteDismiss24Filled } from "@fluentui/react-icons";
import { makeStyles } from '@griffel/react';
import Modal from './components/Modal';
import useModalThemeClasses from './styles/modalTheme';
import { getCodieTheme, ThemeName } from './codieVSCodeTheme';
import { tokens } from '@fluentui/react-components';

interface McpServer {
  label: string;
  endpoint: string;
  apiKey?: string;
}
const defaultServer: McpServer = { label: '', endpoint: '', apiKey: '' };

declare global {
  interface Window {
    initialMcpServers?: any[];
    acquireVsCodeApi?: any;
  }
}

// Acquire the VS Code API once and stash it on `window.__codieVscodeApi` to avoid
// multiple calls to `acquireVsCodeApi()` which throws if called more than once.
const __globalWindow = (typeof window !== 'undefined') ? (window as any) : ({} as any);
let globalVscode: any = undefined;
if (__globalWindow) {
  if (__globalWindow.__codieVscodeApi) {
    globalVscode = __globalWindow.__codieVscodeApi;
  } else if (typeof __globalWindow.acquireVsCodeApi === 'function') {
    try {
      __globalWindow.__codieVscodeApi = __globalWindow.acquireVsCodeApi();
      globalVscode = __globalWindow.__codieVscodeApi;
    } catch (e) {
      // If it was already acquired by another bundle, reuse stored ref if present.
      console.warn('[MCPServerManager] acquireVsCodeApi failed (already acquired?)', e);
      globalVscode = __globalWindow.__codieVscodeApi || undefined;
    }
  }
}

export const MCPServerManager: React.FC = () => {
  // Live theme state: host may inject initial values; keep these in React state to update on changes.
  const winAny = (typeof window !== 'undefined') ? (window as any) : ({} as any);
  const [themeOverrideFromHost, setThemeOverrideFromHost] = useState<ThemeName>((winAny.codieThemeOverride as ThemeName) || 'system');
  const [hostActiveKind, setHostActiveKind] = useState<number>((winAny.codieActiveColorTheme && typeof winAny.codieActiveColorTheme.kind === 'number') ? winAny.codieActiveColorTheme.kind : 1);

  // Listen for postMessage events from the host webview wrapper to update theme info at runtime.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e || !e.data) return;
      const data = e.data;
      if (data.type === 'codieThemeUpdate') {
        if (typeof data.override === 'string') setThemeOverrideFromHost(data.override as ThemeName);
        if (typeof data.kind === 'number') setHostActiveKind(data.kind);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Also listen to OS-level preference changes for 'prefers-color-scheme' when override is 'system'
  useEffect(() => {
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (!mq || typeof mq.addEventListener !== 'function') return;
    const handler = (ev: MediaQueryListEvent) => {
      // Only update when host override is 'system'
      if (themeOverrideFromHost === 'system') {
        setHostActiveKind(ev.matches ? 2 : 1);
      }
    };
    try {
      mq.addEventListener('change', handler);
    } catch (err) {
      // Fallback for older browsers
      // @ts-ignore
      mq.addListener && mq.addListener(handler);
    }
    return () => {
      try { mq.removeEventListener('change', handler); } catch (e) { /* ignore */ }
      try { mq.removeListener && mq.removeListener(handler); } catch (e) { /* ignore */ }
    };
  }, [themeOverrideFromHost]);

  // Compute the effective theme whenever override/host kind changes
  const effectiveTheme = React.useMemo(() => {
    if (themeOverrideFromHost && themeOverrideFromHost !== 'system') return getCodieTheme(themeOverrideFromHost);
    return hostActiveKind === 2 ? getCodieTheme('dark') : getCodieTheme('light');
  }, [themeOverrideFromHost, hostActiveKind]);

  // Compute brand color from the effective theme (runtime lookup ensures pixel parity with host)
  const brandColor50 = (effectiveTheme as any).colorBrandForeground2 || '#44229E';

  const _stylesObj = {
    container: {
      padding: tokens.spacingVerticalL,
      maxWidth: '600px',
      boxSizing: 'border-box'
    },
    title: { marginTop: 0, marginBottom: tokens.spacingVerticalS, color: brandColor50 },
    addButton: { marginBottom: tokens.spacingVerticalS },
    table: { marginBottom: '24px' },
    label: { display: 'block', marginTop: tokens.spacingVerticalXS, marginBottom: tokens.spacingVerticalXXS, fontWeight: 600 },
    input: { width: '100%', marginBottom: '12px' },
    deleteButton: { marginLeft: '8px', color: '#a4262c', borderColor: '#a4262c' },
    saveButton: { marginRight: '8px' },
    deleteDialogButton: { marginRight: '8px', backgroundColor: '#a4262c', color: '#fff' },
    serverLabel: { marginTop: tokens.spacingVerticalS, fontWeight: 600 }
  } as const;
  const useStyles = makeStyles(_stylesObj as any);
  const styles = useStyles();
  const modalStyles = useModalThemeClasses();
  const initialServers: McpServer[] = (window.initialMcpServers && Array.isArray(window.initialMcpServers)) ? window.initialMcpServers as McpServer[] : [];
  const [servers, setServers] = useState<McpServer[]>(initialServers);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editServer, setEditServer] = useState<McpServer>(defaultServer);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const vscode = globalVscode;


  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditServer({ ...(servers[index] || {}) });
    console.log('[MCPServerManager] startEdit', { index, server: servers[index] });
    if (vscode) vscode.postMessage({ command: 'mcpManagerEvent', event: 'startEdit', index });
    setShowForm(true);
  };
  const startAdd = () => {
    setEditingIndex(null);
    setEditServer({ ...defaultServer });
    console.log('[MCPServerManager] startAdd');
    if (vscode) vscode.postMessage({ command: 'mcpManagerEvent', event: 'startAdd' });
    setShowForm(true);
  };
  // Fluent Input may not accept a `name` prop in types; use field-specific handler
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = (e.target && (e.target as HTMLInputElement).value) || '';
    setEditServer({ ...editServer, [field]: value });
  };
  const handleSave = () => {
    let newServers = servers.slice();
    if (editingIndex === null) {
      newServers.push({ ...editServer });
    } else {
      newServers[editingIndex] = { ...editServer };
    }
    setServers(newServers);
    setShowForm(false);
    setEditingIndex(null);
    setEditServer({ ...defaultServer });
    console.log('[MCPServerManager] handleSave', { servers: newServers });
    if (vscode) vscode.postMessage({ command: 'saveMcpServers', servers: newServers });
    if (vscode) vscode.postMessage({ command: 'mcpManagerEvent', event: 'save', servers: newServers });
  };
  const handleDelete = (index: number) => {
    // open confirm dialog
    setConfirmDeleteIndex(index);
    console.log('[MCPServerManager] handleDelete - confirm', { index, server: servers[index] });
    if (vscode) vscode.postMessage({ command: 'mcpManagerEvent', event: 'confirmDelete', index });
    setShowDeleteConfirm(true);
  };

  const performDelete = (index: number | null) => {
    // Always close confirm dialog to avoid leaving it open in edge cases
    setShowDeleteConfirm(false);
    setConfirmDeleteIndex(null);
    if (index === null) return;
    const newServers = servers.filter((_, i) => i !== index);
    setServers(newServers);
    console.log('[MCPServerManager] performDelete', { index, servers: newServers });
    if (vscode) vscode.postMessage({ command: 'saveMcpServers', servers: newServers });
    if (vscode) vscode.postMessage({ command: 'mcpManagerEvent', event: 'delete', index, servers: newServers });
  };

  // Focus the first input when the form dialog opens
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (showForm && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [showForm]);
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.command === 'updateMcpServers') {
        setServers(event.data.servers || []);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
  <FluentProvider theme={effectiveTheme}>
      <div className={styles.container}>
        <h2 className={styles.title}>Manage MCP Servers</h2>
  <Button appearance="primary" onClick={startAdd} className={styles.addButton}>Add Server</Button>
  <Table size="medium" className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Label</TableHeaderCell>
              <TableHeaderCell>Endpoint</TableHeaderCell>
              <TableHeaderCell>API Key</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servers.map((server, i) => (
              <TableRow key={i}>
                <TableCell>{server.label}</TableCell>
                <TableCell>{server.endpoint}</TableCell>
                <TableCell>{server.apiKey ? '••••••' : ''}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    icon={<ClipboardTextEdit24Filled />}
                    onClick={() => startEdit(i)}
                  />
                  <Button
                    size="small"
                    icon={<DeleteDismiss24Filled />}
                    appearance="secondary"
                    onClick={() => handleDelete(i)}
                    className={styles.deleteButton}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Modal
          open={showForm}
          onClose={() => { setShowForm(false); setEditingIndex(null); }}
          title={editingIndex === null ? 'Add MCP Server' : 'Edit MCP Server'}
          themeOverride={themeOverrideFromHost}
          className={modalStyles.modal}
          backdropClassName={modalStyles.backdrop}
          headerClassName={modalStyles.header}
          titleClassName={modalStyles.title}
          contentClassName={modalStyles.content}
          actionsClassName={modalStyles.actions}
          closeButtonClassName={modalStyles.closeButton}
        >
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <label className={styles.label}>Label</label>
            <Input
              value={editServer.label}
              onChange={handleChange('label')}
              className={styles.input}
              required
              input={{ ref: (el: HTMLInputElement) => { labelInputRef.current = el; } }}
            />
            <label className={styles.label}>Endpoint</label>
            <Input
              value={editServer.endpoint}
              onChange={handleChange('endpoint')}
              className={styles.input}
              required
            />
            <label className={styles.label}>API Key</label>
            <Input
              value={editServer.apiKey}
              onChange={handleChange('apiKey')}
              type="password"
              autoComplete="off"
              className={styles.input}
            />
            <div className={modalStyles.actions}>
              <Button appearance="primary" onClick={handleSave} className={styles.saveButton} disabled={!editServer.label.trim() || !editServer.endpoint.trim()}>Save</Button>
              <Button onClick={() => { setShowForm(false); setEditingIndex(null); }}>Cancel</Button>
            </div>
          </form>
        </Modal>
        <Modal
          open={showDeleteConfirm}
          onClose={() => { setShowDeleteConfirm(false); setConfirmDeleteIndex(null); }}
          title={'Confirm Delete'}
          themeOverride={themeOverrideFromHost}
          className={modalStyles.modal}
          backdropClassName={modalStyles.backdrop}
          headerClassName={modalStyles.header}
          titleClassName={modalStyles.title}
          contentClassName={modalStyles.content}
          actionsClassName={modalStyles.actions}
          closeButtonClassName={modalStyles.closeButton}
        >
          <div>
            Are you sure you want to delete this MCP server?
            {confirmDeleteIndex !== null && servers[confirmDeleteIndex] && servers[confirmDeleteIndex].label ? (
              <div className={styles.serverLabel}>{`Server: ${servers[confirmDeleteIndex].label}`}</div>
            ) : null}
          </div>
          <div className={modalStyles.actions}>
            <Button appearance="secondary" onClick={() => performDelete(confirmDeleteIndex)} className={styles.deleteDialogButton}>Delete</Button>
            <Button onClick={() => { setShowDeleteConfirm(false); setConfirmDeleteIndex(null); }}>Cancel</Button>
          </div>
        </Modal>
      </div>
    </FluentProvider>
  );
};

// Entrypoint for the webview
if (typeof document !== 'undefined' && document.getElementById('root')) {
  import('react-dom/client').then(({ createRoot }) => {
    createRoot(document.getElementById('root')!).render(<MCPServerManager />);
  });
}
