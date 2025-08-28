import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Checkbox, Label, Input, Divider, makeStyles } from '@fluentui/react-components';
const useStyles = makeStyles({
  scrollArea: {
    maxHeight: '350px',
    overflowY: 'auto',
    minWidth: '320px',
  },
  toolRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  },
  toolDesc: {
    marginLeft: '8px',
    color: '#888',
    fontSize: '12px',
  },
  divider: {
    margin: '16px 0',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    columnGap: '8px',
    marginTop: '16px',
  },
});

export interface ToolManagementModalProps {
  open: boolean;
  tools: Array<{ id: string; label: string; description?: string; enabled: boolean; provider?: string }>;
  onClose: () => void;
  onToggleTool: (id: string, enabled: boolean) => void;
}

export const ToolManagementModal: React.FC<ToolManagementModalProps> = ({ open, tools, onClose, onToggleTool }) => {
  const styles = useStyles();
  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onClose(); }}>
      <DialogTitle>Manage Tools</DialogTitle>
      <DialogContent>
  <div className={styles.scrollArea}>
          {tools.length === 0 && <div>No tools available.</div>}
          {tools.map(tool => (
            <div key={tool.id} className={styles.toolRow}>
              <Checkbox
                checked={tool.enabled}
                onChange={(_, data) => onToggleTool(tool.id, !!data.checked)}
                label={tool.label + (tool.provider === 'mcp' ? ' (MCP)' : '')}
              />
              <span className={styles.toolDesc}>{tool.description}</span>
            </div>
          ))}
        </div>
  {/* MCP/Context7 Settings button removed */}
        <div className={styles.actions}>
          <Button appearance="primary" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
