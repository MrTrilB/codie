import { makeStyles } from '@griffel/react';

// Shared theme classes for modal components used across webviews
export const useModalThemeClasses = makeStyles({
  backdrop: {
    position: 'fixed',
    inset: 0,
    // Backdrop color is driven by runtime CSS variable set by `Modal` to follow theme
    backgroundColor: 'var(--codie-modal-backdrop, rgba(0,0,0,0.45))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'var(--vscode-panel-background)',
    color: 'var(--vscode-foreground)',
    minWidth: '320px',
    maxWidth: '90%',
    width: '640px',
    borderRadius: '8px',
    // Shadow color is theme-driven via CSS variable
    boxShadow: '0 10px 30px var(--codie-modal-shadow, rgba(0,0,0,0.4))',
    transformOrigin: 'center top',
    overflow: 'hidden',
    outline: 'none',
    padding: 0,
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--codie-modal-border, rgba(128,128,128,0.12))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--vscode-foreground)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '4px',
  },
  content: {
    padding: '16px',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  actions: {
    padding: '10px 16px',
    borderTop: '1px solid rgba(128,128,128,0.06)',
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  enter: {
    transform: 'translateY(-6px) scale(0.985)',
    opacity: 0,
    transition: 'transform 220ms ease, opacity 220ms ease',
  },
  enterActive: {
    transform: 'translateY(0) scale(1)',
    opacity: 1,
  },
  exit: {
    transform: 'translateY(-6px) scale(0.985)',
    opacity: 0,
    transition: 'transform 180ms ease, opacity 180ms ease',
  },
});

export default useModalThemeClasses;
