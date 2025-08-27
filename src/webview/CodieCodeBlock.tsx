import React, { useState } from 'react';
import { Card, Button, Tooltip, makeStyles, tokens } from '@fluentui/react-components';
import { Clipboard24Regular, Play24Regular } from '@fluentui/react-icons';
// Map of language to icon (emoji for simplicity, can be replaced with SVGs)
const languageIcons: Record<string, string> = {
  javascript: '🟨',
  typescript: '🟦',
  python: '🐍',
  bash: '💻',
  shell: '💻',
  sh: '💻',
  json: '🔢',
  html: '🌐',
  css: '🎨',
  diff: '🔀',
  patch: '🔀',
  markdown: '📝',
  java: '☕',
  c: '🔵',
  cpp: '🔷',
  csharp: '♯',
  go: '🐹',
  ruby: '💎',
  php: '🐘',
  rust: '🦀',
  yaml: '📄',
  xml: '📄',
  sql: '🗄️',
  powershell: '⚡',
  dockerfile: '🐳',
  makefile: '🛠️',
  perl: '🦪',
  swift: '🦅',
  kotlin: '🅺',
  dart: '🎯',
  scala: '🔺',
  objectivec: '🍏',
  plaintext: '📄',
};

function getLanguageDisplay(language?: string) {
  if (!language) return { icon: '📄', label: 'Plain Text' };
  const key = language.toLowerCase();
  if (languageIcons[key]) {
    // Capitalize first letter for label
    return { icon: languageIcons[key], label: language.charAt(0).toUpperCase() + language.slice(1) };
  }
  return { icon: '📄', label: language.charAt(0).toUpperCase() + language.slice(1) };
}
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const useCodeBlockStyles = makeStyles({
  root: {
    margin: `${tokens.spacingVerticalM} 0`,
    padding: 0,
    background: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08), 0 1.5px 4px 0 rgba(0,0,0,0.04)',
    overflow: 'hidden',
    position: 'relative',
    border: `1.5px solid ${tokens.colorNeutralStroke3}`,
    transition: 'box-shadow 0.18s, border 0.18s',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: tokens.colorNeutralBackground3,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    borderTopLeftRadius: tokens.borderRadiusLarge,
    borderTopRightRadius: tokens.borderRadiusLarge,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    minHeight: '2.2em',
  },
  langLabel: {
    fontSize: '0.85em',
    color: tokens.colorNeutralForeground3,
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center',
  },
  copied: {
    color: tokens.colorPaletteGreenForeground3,
    fontWeight: 500,
    marginLeft: tokens.spacingHorizontalS,
    fontSize: '0.95em',
    opacity: 0,
    animationName: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    animationDuration: '0.2s',
    animationFillMode: 'forwards',
    transition: 'opacity 0.2s',
    '&.show': {
      opacity: 1,
      animationName: {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      animationDuration: '0.2s',
      animationFillMode: 'forwards',
    },
  },
  focusRing: {
    outline: `2px solid ${tokens.colorPaletteBlueBorderActive}`,
    outlineOffset: '2px',
  },
  code: {
    margin: 0,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    fontSize: '1em',
    background: 'none',
    borderRadius: 0,
    overflowX: 'auto',
    lineHeight: 1.7,
  },
  diffBlock: {
    fontFamily: 'Fira Mono, Consolas, Menlo, monospace',
    fontSize: '1em',
    background: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    margin: 0,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    overflowX: 'auto',
    display: 'block',
    lineHeight: 1.7,
  },
  diffLineFlex: {
    display: 'flex',
    alignItems: 'center',
  },
  diffAdded: {
    color: tokens.colorPaletteGreenForeground1,
  },
  diffRemoved: {
    color: tokens.colorPaletteRedForeground1,
  },
  diffHunk: {
    color: tokens.colorBrandForeground2,
    opacity: 0.8,
  },
  diffIconEmpty: {
    width: '1.2em',
    display: 'inline-block',
  },
  diffIcon: {
    fontWeight: 700,
    // inherit color from parent
    color: 'inherit',
    display: 'inline-block',
  },
  diffIconAdded: {
    composes: '$diffIcon',
    // color will be inherited from diffAdded
  },
  diffIconRemoved: {
    composes: '$diffIcon',
    // color will be inherited from diffRemoved
  },
  diffIconHunk: {
    composes: '$diffIcon',
    // color will be inherited from diffHunk
  },
  diffLineText: {
    marginLeft: '6px',
    whiteSpace: 'pre-wrap',
  },
  langIcon: {
    marginRight: '4px',
    display: 'inline-block',
  },
});

export interface CodieCodeBlockProps {
  code: string;
  language?: string;
  onApply?: (code: string, language?: string) => void;
}

// Helper to detect if a code block is a diff
function isDiff(language?: string, code?: string) {
  if (!language && code) {
    // Heuristic: starts with diff hunk or +/-, or contains @@
    return /^diff|^@@|^\+|^-|^Index: |^--- |^\+\+\+ /.test(code.trim());
  }
  return language === 'diff' || language === 'patch';
}

// Render a diff block with Copilot-style coloring
function DiffBlock({ code, styles }: { code: string; styles: ReturnType<typeof useCodeBlockStyles> }) {
  const lines = code.split(/\r?\n/);
  return (
    <pre className={styles.diffBlock}>
      {lines.map((line, i) => {
        let className = '';
        let icon = <span className={styles.diffIconEmpty} />;
        if (line.startsWith('+')) {
          className = styles.diffAdded;
          icon = <span aria-label="Added" className={styles.diffIconAdded}>+</span>;
        } else if (line.startsWith('-')) {
          className = styles.diffRemoved;
          icon = <span aria-label="Removed" className={styles.diffIconRemoved}>–</span>;
        } else if (line.startsWith('@@')) {
          className = styles.diffHunk;
          icon = <span aria-label="Hunk" className={styles.diffIconHunk}>@</span>;
        }
        return (
          <div key={i} className={styles.diffLineFlex + (className ? ' ' + className : '')}>
            {icon}
            <span className={styles.diffLineText}>{line}</span>
          </div>
        );
      })}
    </pre>
  );
}

export const CodieCodeBlock: React.FC<CodieCodeBlockProps> = ({ code, language, onApply }) => {
  const styles = useCodeBlockStyles();
  const [copied, setCopied] = useState(false);
  const [copyFocused, setCopyFocused] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  // Accessibility: focus ring for copy button
  const handleCopyFocus = () => setCopyFocused(true);
  const handleCopyBlur = () => setCopyFocused(false);

  const showDiff = isDiff(language, code);

  const langDisplay = getLanguageDisplay(language || (showDiff ? 'diff' : 'text'));

  return (
    <Card className={styles.root} appearance="filled">
      <div className={styles.header}>
        <Tooltip content={langDisplay.label} relationship="label">
          <span className={styles.langLabel} aria-label={langDisplay.label}>
            <span className={styles.langIcon}>{langDisplay.icon}</span>
            {langDisplay.label}
          </span>
        </Tooltip>
        <div className={styles.actions}>
          <Tooltip content="Copy code" relationship="label">
            <Button
              aria-label="Copy code block to clipboard"
              icon={<Clipboard24Regular />}
              onClick={handleCopy}
              size="small"
              tabIndex={0}
              className={copyFocused ? styles.focusRing : undefined}
              onFocus={handleCopyFocus}
              onBlur={handleCopyBlur}
            />
          </Tooltip>
          {onApply && (
            <Tooltip content="Apply in Editor" relationship="label">
              <Button aria-label="Apply code block in editor" icon={<Play24Regular />} onClick={() => onApply(code, language)} size="small" />
            </Tooltip>
          )}
          <span
            className={styles.copied + (copied ? ' show' : '')}
            aria-live="polite"
            role="status"
          >
            Copied!
          </span>
        </div>
      </div>
      {showDiff ? (
        <DiffBlock code={code} styles={styles} />
      ) : (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          className={styles.code}
          PreTag="div"
        >
          {code}
        </SyntaxHighlighter>
      )}
    </Card>
  );
};
