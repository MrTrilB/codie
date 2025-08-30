Modal Theme Tokens and `codie.theme.override`
=============================================

Overview
--------
This document explains the theme tokens used by the shared modal component and the new extension setting `codie.theme.override`.

Setting
-------
- **Name:** `codie.theme.override`
- **Type:** string enum
- **Allowed values:** `system`, `light`, `dark`
- **Default:** `system`
- **Behavior:**
  - `system`: the webview attempts to match the user's environment/theme by using `prefers-color-scheme` plus sampling VS Code CSS variables (for example `--vscode-panel-background`) as a fallback.
  - `light`: forces the modal to use the light appearance values.
  - `dark`: forces the modal to use the dark appearance values.

Where this is wired
--------------------
- The extension host injects the configured value into webviews as `window.codieThemeOverride`.
- Webview React components (for example `MCPServerManager`) pick up `window.codieThemeOverride` and pass it to the reusable `Modal` component as the `themeOverride` prop.

Modal CSS variables
-------------------
The modal uses a small set of CSS variables (set at runtime by the Modal) to make it easy to theme and to match the editor theme:

- `--codie-modal-backdrop`  — rgba color used for the backdrop overlay.
- `--codie-modal-shadow`    — shadow color for the modal surface.
- `--codie-modal-border`    — subtle border color around the modal surface.

Fallbacks and logic
-------------------
- If `themeOverride` is `light` or `dark` the Modal applies the corresponding values immediately.
- If `themeOverride` is `system`, the Modal uses:
  1. `prefers-color-scheme` media query to sense OS-level preference;
  2. samples `--vscode-panel-background` CSS variable (if present in the webview host) to heuristically determine light vs dark when available.

Developer notes (how to test locally)
------------------------------------
1. Build the extension and webviews:

```powershell
npm run compile
```

2. Run the extension in the Extension Development Host (VS Code Debug > Run Extension) and open the MCP Server Manager command (`codie.tools.manageMCPServers`).

3. Change the setting in VS Code Settings (File > Preferences > Settings) to `codie.theme.override` = `light`, `dark`, or `system` and re-open the MCP Server Manager to observe changes.

4. In the webview devtools (open Developer Tools for the Extension Development Host) inspect the modal backdrop element and verify the computed CSS variables. Example:

```js
document.querySelector('[data-codie-modal-backdrop]')?.style.getPropertyValue('--codie-modal-backdrop')
```

Implementation pointers
-----------------------
- The extension injects the setting into webviews in `src/extension.ts` using `window.codieThemeOverride`.
- The shared `Modal` component accepts `themeOverride?: 'light'|'dark'|'system'` and sets CSS variables accordingly.
- Fluent UI Provider theme selection for webviews (where applicable) is selected when `themeOverride` is explicitly `light` or `dark`.

If you want exact color parity with a specific VS Code color theme name (rather than light/dark heuristics), consider using `vscode.window.activeColorTheme` on the extension side and mapping specific theme names to explicit token sets.
Modal Theme Tokens
==================

This document describes the shared Griffel modal theme exported by `useModalThemeClasses` in `modalTheme.ts`.

Class names exposed
- `backdrop`: the full-screen backdrop element behind the modal.
- `modal`: the dialog container element (panel).
- `header`: the header bar containing the title and close button.
- `title`: the title element inside the header.
- `closeButton`: the close button element (in header).
- `content`: the scrollable content area of the modal.
- `actions`: the footer action bar (buttons like Save / Cancel).
- `enter`, `enterActive`, `exit`: helper classes used to provide the enter/exit transform + opacity animation states.

Design tokens and values
- Background (panel): `var(--vscode-panel-background)` — uses VS Code theme panel background token.
- Foreground (text): `var(--vscode-foreground)` — uses VS Code theme foreground token.
- Modal width: `min-width: 320px`, `width: 640px`, `max-width: 90%` — responsive sizing.
- Border radius: `8px`.
- Box shadow: `0 10px 30px rgba(0,0,0,0.4)`.
- Header padding: `12px 16px` and header border: `1px solid rgba(128,128,128,0.12)`.
- Content padding: `16px`, scrollable with `max-height: 60vh`.
- Actions padding: `10px 16px`, top border `1px solid rgba(128,128,128,0.06)`.
- Close button: `padding: 6px`, transparent background.

Animation
- Open animation: translateY from `-6px` to `0`, scale from `0.985` to `1`, opacity from `0` to `1`.
- Open duration: `220ms` (ease), Close duration: `180ms` (ease).

How to use
- Import `useModalThemeClasses` and call it: `const modalStyles = useModalThemeClasses();`.
- Pass the relevant class names to the `Modal` component props: `className`, `backdropClassName`, `headerClassName`, `titleClassName`, `contentClassName`, `actionsClassName`, `closeButtonClassName`.

Notes
- Token values leverage VS Code CSS variables where possible to match the editor theme.
- If you need to tweak animation timing, update `enter` / `exit` transition values in `modalTheme.ts`.
