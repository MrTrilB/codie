import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Label, Input, Divider, makeStyles, Dialog, DialogTrigger, DialogSurface, DialogActions } from '@fluentui/react-components';
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
  modalBackdrop: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 1000 },
  modal: { background: '#fff', color: '#000', borderRadius: '6px', padding: '16px', width: 'min(720px, 92%)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
  modalTitle: { margin: 0, marginBottom: '12px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }
});

export interface ToolManagementModalProps {
  open: boolean;
  tools: Array<{ id: string; label: string; description?: string; enabled: boolean; provider?: string }>;
  onClose: () => void;
  onToggleTool: (id: string, enabled: boolean) => void;
}

export const ToolManagementModal: React.FC<ToolManagementModalProps> = ({ open, tools, onClose, onToggleTool }) => {
  const styles = useStyles();
  // Use controlled Dialog so focus and button events behave correctly
  return (
    <Dialog open={open} onOpenChange={(e, data) => { if (!data.open) onClose(); }}>
      <DialogSurface className={styles.modal}>
        <h3 className={styles.modalTitle}>Manage Tools</h3>
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
        <DialogActions>
          <Button appearance="primary" onClick={onClose}>Close</Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};
