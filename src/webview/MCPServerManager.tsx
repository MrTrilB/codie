import React, { useState, useEffect } from 'react';
import { FluentProvider, Button, Table, TableBody, TableCell, TableRow, TableHeader, TableHeaderCell, Input, Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions } from '@fluentui/react-components';
import { codieLightTheme } from './codieVSCodeTheme';

const defaultServer = { label: '', endpoint: '', apiKey: '' };

declare global {
  interface Window {
    initialMcpServers?: any[];
    acquireVsCodeApi?: any;
  }
}

export const MCPServerManager: React.FC = () => {
  const [servers, setServers] = useState<any[]>(window.initialMcpServers || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editServer, setEditServer] = useState<any>(defaultServer);
  const [showForm, setShowForm] = useState(false);
  const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : undefined;

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditServer(servers[index]);
    setShowForm(true);
  };
  const startAdd = () => {
    setEditingIndex(null);
    setEditServer(defaultServer);
    setShowForm(true);
  };
  const handleChange = (_: any, data: any) => {
    setEditServer({ ...editServer, [data.name]: data.value });
  };
  const handleSave = () => {
    let newServers = servers.slice();
    if (editingIndex === null) {
      newServers.push(editServer);
    } else {
      newServers[editingIndex] = editServer;
    }
    setServers(newServers);
    setShowForm(false);
    setEditingIndex(null);
    setEditServer(defaultServer);
    if (vscode) vscode.postMessage({ command: 'saveMcpServers', servers: newServers });
  };
  const handleDelete = (index: number) => {
    let newServers = servers.filter((_, i) => i !== index);
    setServers(newServers);
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
      <div className="mcp-container">
        <h2 className="mcp-title">Manage MCP Servers</h2>
        <Button appearance="primary" onClick={startAdd} style={{ marginBottom: 16 }}>Add Server</Button>
        <Table size="medium" style={{ marginBottom: 24 }}>
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
                  <Button size="small" appearance="secondary" onClick={() => handleDelete(i)} style={{ marginLeft: 8 }}>Delete</Button>
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
                <label className="mcp-label">Label</label>
                <Input
                  name="label"
                  value={editServer.label}
                  onChange={handleChange}
                  className="mcp-input"
                  required
                />
                <label className="mcp-label">Endpoint</label>
                <Input
                  name="endpoint"
                  value={editServer.endpoint}
                  onChange={handleChange}
                  className="mcp-input"
                  required
                />
                <label className="mcp-label">API Key</label>
                <Input
                  name="apiKey"
                  value={editServer.apiKey}
                  onChange={handleChange}
                  type="password"
                  autoComplete="off"
                  className="mcp-input"
                  required
                />
              </DialogBody>
              <DialogActions>
                <Button appearance="primary" onClick={handleSave} style={{ marginRight: 8 }}>Save</Button>
                <Button onClick={() => setShowForm(false)}>Cancel</Button>
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
