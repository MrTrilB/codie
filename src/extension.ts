
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
            <div class="codie-chat-area-shell">
              <div id="codie-chat-messages" class="codie-chat-messages"></div>
              <footer class="codie-chat-footer">
                <div class="codie-footer-content">
                  <div class="codie-attachments">
                    <button class="codie-attach-btn" title="Attach file or context" aria-label="Attach file or context">
                      <span class="codicon codicon-attach"></span>
                    </button>
                    <!-- Future: show attached files here -->
                  </div>
                  <form class="codie-input-form" autocomplete="off">
                    <button class="codie-attach-btn" title="Attach file or context" aria-label="Attach file or context" type="button">
                      <span class="codicon codicon-attach"></span>
                    </button>
                    <textarea class="codie-input" placeholder="Type your message..." aria-label="Chat input" rows="2"></textarea>
                    <button class="codie-send-btn" type="submit" aria-label="Send">
                      <span class="codicon codicon-send"></span>
                    </button>
                    <button class="codie-toolbar-btn" title="Agent Mode" aria-label="Agent Mode" type="button">
                      <span class="codicon codicon-person"></span>
                    </button>
                    <button class="codie-toolbar-btn" title="Model Picker" aria-label="Model Picker" type="button">
                      <span class="codicon codicon-symbol-parameter"></span>
                    </button>
                    <button class="codie-toolbar-btn" title="Voice Chat" aria-label="Voice Chat" type="button">
                      <span class="codicon codicon-mic"></span>
                    </button>
                  </form>
                </div>
              </footer>
            </div>
          </main>
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

