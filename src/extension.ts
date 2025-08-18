
import * as vscode from 'vscode';
// Minimal TreeDataProvider for Codie
class CodieDataProvider implements vscode.TreeDataProvider<CodieTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CodieTreeItem | undefined | void> = new vscode.EventEmitter<CodieTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<CodieTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: CodieTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CodieTreeItem): Thenable<CodieTreeItem[]> {
    if (!element) {
      // Root items
      return Promise.resolve([
        new CodieTreeItem('Welcome to Codie!', vscode.TreeItemCollapsibleState.None),
        new CodieTreeItem('Try the chat below', vscode.TreeItemCollapsibleState.None)
      ]);
    }
    return Promise.resolve([]);
  }
}

class CodieTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}

class CodieChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codie-chat-view';

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
  const extensionUri = this.context.extensionUri;
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'chat.css'));
  const codiconCssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'codicon.css'));
  const codiconFontUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'codicon.ttf'));
  const codieLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'Codie.png'));
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <link href="${codiconCssUri}" rel="stylesheet">
        <style>
          @font-face {
            font-family: 'codicon';
            src: url('${codiconFontUri}') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: block;
          }
          .visually-hidden {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0,0,0,0);
            border: 0;
          }
        </style>
        <title>Codie Chat</title>
      </head>
      <body>
        <div class="codie-chat-container">
          <header class="codie-chat-header">
            <img src="${codieLogoUri}" alt="Codie Logo" class="codie-logo" />
            <span class="codie-title">Codie</span>
          </header>
          <main class="codie-chat-main">
            <div id="codie-chat-messages" class="codie-chat-messages"></div>
          </main>
          <footer class="codie-chat-footer">
            <div class="codie-chat-footer-center">
              <!-- Copied from copilotchat.html -->
              <div class="interactive-input-part">
                <div class="interactive-input-followups" style="width: 316px;"></div>
                <div class="chat-editing-session" style=""></div>
                <div class="interactive-input-and-side-toolbar">
                  <div class="chat-input-container" data-keybinding-context="11">
                    <div class="chat-attachments-container" style="">
                      <div class="chat-attachment-toolbar">
                        <div class="monaco-toolbar">
                          <div class="monaco-action-bar">
                            <ul class="actions-container" role="toolbar">
                              <li class="action-item chat-attachment-button" role="presentation" custom-hover="true">
                                <a class="action-label" role="button" aria-label="Add Context... (Ctrl+/)" tabindex="0">
                                  <span class="codicon codicon-attach"></span> Add Context...
                                </a>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div class="chat-related-files" aria-hidden="true" style="display: none;"></div>
                      <div class="chat-attached-context" style="">
                        <div class="chat-attached-context-attachment show-file-icons implicit disabled" aria-label="Attached file, codicon.css file:///c%3A/Users/Anthony/OneDrive/Modding/CodieVSCode/codie/media" tabindex="0" custom-hover="true" data-keybinding-context="11601">
                          <div class="monaco-icon-label file-icon media-name-dir-icon codicon.css-name-file-icon name-file-icon css-ext-file-icon ext-file-icon css-lang-file-icon" aria-label="Enable current file context media\\codicon.css" custom-hover="true">
                            <div class="monaco-icon-label-container">
                              <span class="monaco-icon-name-container">
                                <a class="label-name">
                                  <span class="monaco-highlighted-label">codicon.css</span>
                                </a>
                              </span>
                            </div>
                          </div>
                          <a class="monaco-button codicon codicon-plus" tabindex="0" role="button" aria-disabled="false" aria-label=""></a>
                        </div>
                      </div>
                    </div>
                    <div class="chat-editor-container">
                      <div class="interactive-input-editor hideSuggestTextIcons" data-keybinding-context="12" data-mode-id="plaintext">
                        <div class="monaco-editor no-user-select  showUnused showDeprecated vs-dark" role="code" data-uri="chatSessionInput:input-0" style="width: 302px; height: 36px;">
                          <div data-mprt="3" class="overflow-guard" style="width: 302px; height: 36px;">
                            <div class="native-edit-context" autocorrect="off" autocapitalize="off" autocomplete="off" spellcheck="false" tabindex="0" role="textbox" aria-required="false" aria-multiline="true" aria-autocomplete="both" aria-roledescription="editor" aria-label="The editor is not accessible at this time. To enable screen reader optimized mode, use Shift+Alt+F1" style="tab-size: 14.25px; text-wrap: wrap; font-family: 'Segoe WPC', 'Segoe UI', sans-serif, Consolas, 'Courier New', monospace; font-weight: normal; font-size: 13px; font-feature-settings: 'liga' 0, 'calt' 0; font-variation-settings: normal; line-height: 20px; letter-spacing: 0px; top: 8px; left: 0px; width: 280px; height: 20px;"></div>
                            <textarea class="ime-text-area" readonly="true" tabindex="-1" aria-hidden="true"></textarea>
                            <div class="margin" role="presentation" aria-hidden="true" style="position: absolute; transform: translate3d(0px, 0px, 0px); contain: strict; top: 0px; height: 36px; width: 0px;">
                              <div class="glyph-margin" style="left: 0px; width: 0px; height: 36px;"></div>
                              <div class="margin-view-zones" role="presentation" aria-hidden="true" style="position: absolute;"></div>
                              <div class="margin-view-overlays" role="presentation" aria-hidden="true" style="position: absolute; font-family: 'Segoe WPC', 'Segoe UI', sans-serif, Consolas, 'Courier New', monospace; font-weight: normal; font-size: 13px; font-feature-settings: 'liga' 0, 'calt' 0; font-variation-settings: normal; line-height: 20px; letter-spacing: 0px; width: 0px; height: 36px;">
                                <div style="top:8px;height:20px;line-height:20px;">
                                  <div class="current-line" style="width:0px"></div>
                                </div>
                              </div>
                              <div class="glyph-margin-widgets" style="position: absolute; top: 0px;"></div>
                            </div>
                            <div class="monaco-scrollable-element editor-scrollable vs-dark" role="presentation" data-mprt="6" style="position: absolute; overflow: hidden; left: 0px; width: 302px; height: 36px;">
                              <div class="lines-content monaco-editor-background" style="position: absolute; overflow: hidden; width: 1.67772e+07px; height: 1.67772e+07px; transform: translate3d(0px, 0px, 0px); contain: strict; top: 0px; left: 0px;">
                                <div class="view-overlays" role="presentation" aria-hidden="true" style="position: absolute; font-family: 'Segoe WPC', 'Segoe UI', sans-serif, Consolas, 'Courier New', monospace; font-weight: normal; font-size: 13px; font-feature-settings: 'liga' 0, 'calt' 0; font-variation-settings: normal; line-height: 20px; letter-spacing: 0px; height: 0px; width: 302px;">
                                  <div style="top:8px;height:20px;line-height:20px;"></div>
                                </div>
                                <div role="presentation" aria-hidden="true" class="view-rulers"></div>
                                <div class="view-zones" role="presentation" aria-hidden="true" style="position: absolute;"></div>
                                <div class="view-lines monaco-mouse-cursor-text" role="presentation" aria-hidden="true" data-mprt="8" style="position: absolute; font-family: 'Segoe WPC', 'Segoe UI', sans-serif, Consolas, 'Courier New', monospace; font-weight: normal; font-size: 13px; font-feature-settings: 'liga' 0, 'calt' 0; font-variation-settings: normal; line-height: 20px; letter-spacing: 0px; width: 302px; height: 36px;">
                                  <div style="top:8px;height:20px;line-height:20px;" class="view-line">
                                    <!-- removed stray debug text -->
                                  </div>
                                </div>
                                <div data-mprt="1" class="contentWidgets" style="position: absolute; top: 0px;"></div>
                                <div role="presentation" aria-hidden="true" class="cursors-layer cursor-line-style cursor-solid">
                                  <div class="cursor  monaco-mouse-cursor-text " style="height: 20px; top: 8px; left: 142px; font-family: 'Segoe WPC', 'Segoe UI', sans-serif, Consolas, 'Courier New', monospace; font-weight: normal; font-size: 13px; font-feature-settings: 'liga' 0, 'calt' 0; font-variation-settings: normal; line-height: 20px; letter-spacing: 0px; display: block; visibility: hidden; padding-left: 0px; width: 1px;"></div>
                                </div>
                              </div>
                              <div role="presentation" aria-hidden="true" class="invisible scrollbar horizontal" style="position: absolute; width: 302px; height: 0px; left: 0px; bottom: 0px;">
                                <div class="slider" style="position: absolute; top: 0px; left: 0px; height: 12px; transform: translate3d(0px, 0px, 0px); contain: strict; width: 302px;"></div>
                              </div>
                              <canvas class="decorationsOverviewRuler" aria-hidden="true" width="0" height="0" style="position: absolute; transform: translate3d(0px, 0px, 0px); contain: strict; top: 0px; right: 0px; width: 14px; height: 36px; display: none;"></canvas>
                              <div role="presentation" aria-hidden="true" class="invisible scrollbar vertical" style="position: absolute; width: 0px; height: 36px; right: 0px; top: 0px;">
                                <div class="slider" style="position: absolute; top: 0px; left: 0px; width: 14px; transform: translate3d(0px, 0px, 0px); contain: strict; height: 36px;"></div>
                              </div>
                            </div>
                            <div role="presentation" aria-hidden="true" style="width: 302px;" class=""></div>
                            <div data-mprt="4" class="overlayWidgets" style="width: 302px;">
                              <div class="monaco-hover fade-in hidden" tabindex="0" role="tooltip" widgetid="editor.contrib.modesGlyphHoverWidget" style="position: absolute;">
                                <div class="monaco-scrollable-element " role="presentation" style="position: relative; overflow: hidden;">
                                  <div class="monaco-hover-content" style="overflow: hidden;"></div>
                                  <div role="presentation" aria-hidden="true" class="invisible scrollbar horizontal" style="position: absolute;">
                                    <div class="slider" style="position: absolute; top: 0px; left: 0px; height: 10px; transform: translate3d(0px, 0px, 0px); contain: strict;"></div>
                                  </div>
                                  <div role="presentation" aria-hidden="true" class="invisible scrollbar vertical" style="position: absolute;">
                                    <div class="slider" style="position: absolute; top: 0px; left: 0px; width: 10px; transform: translate3d(0px, 0px, 0px); contain: strict;"></div>
                                  </div>
                                  <div class="shadow"></div>
                                  <div class="shadow"></div>
                                  <div class="shadow"></div>
                                </div>
                              </div>
                            </div>
                            <div data-mprt="9" class="minimap slider-mouseover" role="presentation" aria-hidden="true" style="position: absolute; left: 0px; width: 0px; height: 36px;">
                              <div class="minimap-shadow-hidden" style="height: 36px;"></div>
                              <canvas width="0" height="72" style="position: absolute; left: 0px; width: 0px; height: 36px;"></canvas>
                              <canvas class="minimap-decorations-layer" width="0" height="72" style="position: absolute; left: 0px; width: 0px; height: 36px;"></canvas>
                              <div class="minimap-slider" style="position: absolute; transform: translate3d(0px, 0px, 0px); contain: strict; width: 0px;">
                                <div class="minimap-slider-horizontal" style="position: absolute; width: 0px; height: 0px;"></div>
                              </div>
                            </div>
                            <div role="presentation" aria-hidden="true" class="blockDecorations-container"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="chat-input-toolbars">
                      <div class="monaco-toolbar chat-input-toolbar">
                        <div class="monaco-action-bar">
                          <ul class="actions-container" role="toolbar">
                            <li class="action-item chat-modelPicker-item" role="presentation">
                              <div class="monaco-dropdown">
                                <div class="dropdown-label">
                                  <a class="action-label" role="button" aria-haspopup="true" aria-expanded="false" aria-label="Set Mode - Agent" custom-hover="true" tabindex="0">
                                    <span class="chat-model-label">Agent</span>
                                    <span class="codicon codicon-chevron-down"></span>
                                  </a>
                                </div>
                              </div>
                            </li>
                            <li class="action-item chat-modelPicker-item" role="presentation">
                              <div class="monaco-dropdown">
                                <div class="dropdown-label">
                                  <a class="action-label" role="button" aria-haspopup="true" aria-expanded="false" aria-label="Pick Model (Ctrl+Alt+.) - GPT-4.1" custom-hover="true" tabindex="-1">
                                    <span class="chat-model-label">GPT-4.1</span>
                                    <span class="codicon codicon-chevron-down"></span>
                                  </a>
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div class="monaco-toolbar chat-execute-toolbar">
                        <div class="monaco-action-bar">
                          <ul class="actions-container" role="toolbar">
                            <li class="action-item menu-entry" role="presentation" custom-hover="true" style="position: relative;">
                              <a class="action-label codicon codicon-tools" role="button" aria-label="More than 128 tools are enabled, you may experience degraded tool calling." tabindex="0"></a>
                              <div class="tool-warning-indicator codicon codicon-warning" style="display: block;"></div>
                            </li>
                            <li class="action-item menu-entry" role="presentation" custom-hover="true">
                              <a class="action-label codicon codicon-mic" role="button" aria-label="Start Voice Chat (Ctrl+I)" tabindex="-1"></a>
                            </li>
                            <li class="action-item menu-entry" role="presentation" custom-hover="true">
                              <a class="action-label codicon codicon-send-to-remote-agent" role="checkbox" aria-label="Delegate to Coding Agent" aria-checked="false" tabindex="-1"></a>
                            </li>
                            <li class="action-item monaco-dropdown-with-primary" role="presentation">
                              <div class="action-container menu-entry" role="button" aria-disabled="false" custom-hover="true" tabindex="-1">
                                <a class="action-label codicon codicon-send" role="button" aria-label="Send"></a>
                              </div>
                              <div class="dropdown-action-container">
                                <div class="monaco-dropdown">
                                  <div class="dropdown-label">
                                    <a class="action-label codicon codicon-chevron-down" custom-hover="true" aria-label="More..." tabindex="-1"></a>
                                  </div>
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
        <script src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const codieChatViewProvider = new CodieChatViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CodieChatViewProvider.viewType, codieChatViewProvider)
  );

  // Register CodieDataProvider for the data view
  const codieDataProvider = new CodieDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codie-data-view', codieDataProvider)
  );

  console.log('Codie extension: activate() called (MINIMAL)');
}

export function deactivate() {}

