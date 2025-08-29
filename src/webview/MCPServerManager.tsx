// NOTE: All styling in this file must be managed via Fluent UI / Griffel `makeStyles`.
// NOTE: All icons across webviews should come from Fluent UI Icons only.
import React, { useState, useEffect } from 'react';
import { FluentProvider, Button, Table, TableBody, TableCell, TableRow, TableHeader, TableHeaderCell, Input, Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions } from '@fluentui/react-components';
import { makeStyles } from '@griffel/react';
import { codieLightTheme } from './codieVSCodeTheme';

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

export const MCPServerManager: React.FC = () => {
  const _stylesObj = {
    container: { padding: '16px' },
    title: { marginTop: 0, marginBottom: '12px' },
    addButton: { marginBottom: '16px' },
    table: { marginBottom: '24px' },
    label: { display: 'block', marginTop: '8px', marginBottom: '4px', fontWeight: 600 },
    input: { width: '100%', marginBottom: '8px' },
    deleteButton: { marginLeft: '8px', color: '#a4262c', borderColor: '#a4262c' },
    saveButton: { marginRight: '8px' },
    deleteDialogButton: { marginRight: '8px', backgroundColor: '#a4262c', color: '#fff' },
    serverLabel: { marginTop: '8px', fontWeight: 600 }
  } as const;
  const useStyles = makeStyles(_stylesObj as any);
  const styles = useStyles();
  const initialServers: McpServer[] = (window.initialMcpServers && Array.isArray(window.initialMcpServers)) ? window.initialMcpServers as McpServer[] : [];
  const [servers, setServers] = useState<McpServer[]>(initialServers);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editServer, setEditServer] = useState<McpServer>(defaultServer);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : undefined;

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditServer({ ...(servers[index] || {}) });
    setShowForm(true);
  };
  const startAdd = () => {
    setEditingIndex(null);
    setEditServer({ ...defaultServer });
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
    if (vscode) vscode.postMessage({ command: 'saveMcpServers', servers: newServers });
  };
  const handleDelete = (index: number) => {
    // open confirm dialog
    setConfirmDeleteIndex(index);
    setShowDeleteConfirm(true);
  };

  const performDelete = (index: number | null) => {
    if (index === null) return;
    const newServers = servers.filter((_, i) => i !== index);
    setServers(newServers);
    setShowDeleteConfirm(false);
    setConfirmDeleteIndex(null);
    if (vscode) vscode.postMessage({ command: 'saveMcpServers', servers: newServers });
  };
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
    <FluentProvider theme={codieLightTheme}>
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
                  <Button size="small" onClick={() => startEdit(i)}>Edit</Button>
                  <Button size="small" appearance="secondary" onClick={() => handleDelete(i)} className={styles.deleteButton}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {showForm && (
          <Dialog open={showForm}>
            <DialogSurface>
              <DialogBody>
                <DialogTitle>{editingIndex === null ? 'Add MCP Server' : 'Edit MCP Server'}</DialogTitle>
                <label className={styles.label}>Label</label>
                <Input
                  value={editServer.label}
                  onChange={handleChange('label')}
                  className={styles.input}
                  required
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
                  required
                />
              </DialogBody>
              <DialogActions>
                <Button appearance="primary" onClick={handleSave} className={styles.saveButton}>Save</Button>
                <Button onClick={() => setShowForm(false)}>Cancel</Button>
              </DialogActions>
            </DialogSurface>
          </Dialog>
        )}
        {showDeleteConfirm && (
          <Dialog open={showDeleteConfirm}>
            <DialogSurface>
              <DialogBody>
                <DialogTitle>Confirm Delete</DialogTitle>
                <div>
                  Are you sure you want to delete this MCP server?
                  {confirmDeleteIndex !== null && servers[confirmDeleteIndex] && servers[confirmDeleteIndex].label ? (
                    <div className={styles.serverLabel}>{`Server: ${servers[confirmDeleteIndex].label}`}</div>
                  ) : null}
                </div>
              </DialogBody>
              <DialogActions>
                <Button appearance="secondary" onClick={() => performDelete(confirmDeleteIndex)} className={styles.deleteDialogButton}>Delete</Button>
                <Button onClick={() => { setShowDeleteConfirm(false); setConfirmDeleteIndex(null); }}>Cancel</Button>
              </DialogActions>
            </DialogSurface>
          </Dialog>
        )}
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
