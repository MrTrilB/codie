import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@fluentui/react-components';
import { makeStyles } from '@griffel/react';
import useModalThemeClasses from '../styles/modalTheme';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  backdropClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  actionsClassName?: string;
  closeButtonClassName?: string;
  themeOverride?: 'light' | 'dark' | 'system';
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, className, backdropClassName, headerClassName, titleClassName, contentClassName, actionsClassName, closeButtonClassName, themeOverride }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useRef<string>('codie-modal-' + Math.random().toString(36).slice(2, 8));
  const styles = useModalThemeClasses();
  const [mounted, setMounted] = useState<boolean>(open);
  const [entered, setEntered] = useState<boolean>(false);
  const enterTimer = useRef<number | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // schedule adding the 'enterActive' class on the next frame
      if (enterTimer.current) window.clearTimeout(enterTimer.current);
      enterTimer.current = window.setTimeout(() => setEntered(true), 16);
    } else {
      // start exit: remove entered so CSS can transition to exit state
      setEntered(false);
    }
    return () => {
      if (enterTimer.current) {
        window.clearTimeout(enterTimer.current);
        enterTimer.current = null;
      }
    };
  }, [open]);

  // Apply theme-aware CSS variables to mirror user's theme (light/dark)
  useEffect(() => {
    const backdropEl = backdropRef.current;
    if (!backdropEl) return;

    function applyTheme() {
      const el = backdropRef.current;
      if (!el) return;
      // Decide theme using explicit override if provided, otherwise use system prefs and VS Code variables
      let useDark = false;
      if (themeOverride && themeOverride !== 'system') {
        useDark = themeOverride === 'dark';
      } else {
        // If the host provided an explicit active theme label, try to lookup precise tokens
        const activeLabel = (window as any).codieActiveColorTheme?.label as string | undefined;
        try {
          const { lookupModalTokensForThemeLabel } = require('../themeTokenMap');
          const tokens = lookupModalTokensForThemeLabel(activeLabel);
          if (tokens) {
            el.style.setProperty('--codie-modal-backdrop', tokens.backdrop);
            el.style.setProperty('--codie-modal-shadow', tokens.shadow);
            el.style.setProperty('--codie-modal-border', tokens.border);
            return;
          }
        } catch (e) {
          // ignore if lookup module not available in this bundle context
        }

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const panelBg = getComputedStyle(document.documentElement).getPropertyValue('--vscode-panel-background') || '';
        const isPanelDark = panelBg.trim() ? panelBg.includes('#') && (panelBg.trim().toLowerCase().indexOf('#') === 0 ? isHexDark(panelBg.trim()) : prefersDark) : prefersDark;
        useDark = isPanelDark;
      }

      if (useDark) {
        el.style.setProperty('--codie-modal-backdrop', 'rgba(0,0,0,0.55)');
        el.style.setProperty('--codie-modal-shadow', 'rgba(0,0,0,0.6)');
        el.style.setProperty('--codie-modal-border', 'rgba(255,255,255,0.06)');
      } else {
        el.style.setProperty('--codie-modal-backdrop', 'rgba(0,0,0,0.35)');
        el.style.setProperty('--codie-modal-shadow', 'rgba(0,0,0,0.15)');
        el.style.setProperty('--codie-modal-border', 'rgba(0,0,0,0.08)');
      }
    }

    function isHexDark(hex: string) {
      // crude hex brightness test
      try {
        const cleaned = hex.replace('#', '');
        const r = parseInt(cleaned.substring(0, 2), 16);
        const g = parseInt(cleaned.substring(2, 4), 16);
        const b = parseInt(cleaned.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
      } catch { return false; }
    }

    applyTheme();
    let mq: MediaQueryList | null = null;
    if (window.matchMedia) {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
    }
    return () => {
      if (mq) mq.removeEventListener('change', applyTheme);
    };
  }, [mounted, themeOverride]);

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus the first focusable element within modal
    const focusable = el?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Basic focus trap: keep focus inside modal on Tab
      if (e.key === 'Tab' && el) {
        const focusableEls = Array.from(el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(Boolean);
        if (focusableEls.length === 0) return;
        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      try { previouslyFocused?.focus(); } catch {}
    };
  }, [open, onClose]);

  if (!mounted) return null;
  const backdropCls = `${styles.backdrop} ${backdropClassName || ''}`.trim();
  const modalCls = `${styles.modal} ${open ? (entered ? styles.enterActive : styles.enter) : styles.exit} ${className || ''}`.trim();
  return (
    <div ref={backdropRef} className={backdropCls} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={modalCls} role="dialog" aria-modal="true" aria-labelledby={title ? titleId.current : undefined} onTransitionEnd={() => { if (!open) setMounted(false); }}>
        <div className={`${styles.header} ${headerClassName || ''}`.trim()}>
          {title ? <h3 id={titleId.current} className={`${styles.title} ${titleClassName || ''}`.trim()}>{title}</h3> : <div />}
          <Button className={`${styles.closeButton} ${closeButtonClassName || ''}`.trim()} appearance="subtle" onClick={onClose} aria-label="Close">✕</Button>
        </div>
        <div className={`${styles.content} ${contentClassName || ''}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
