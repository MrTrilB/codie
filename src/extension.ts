import { ToolRegistry, Tool } from '../tools/ToolRegistry';
import * as toolChanges from '../tools/changes';
import * as toolCodebase from '../tools/codebase';
import * as toolEditFiles from '../tools/editFiles';
import * as toolExtensi from '../tools/extensi';
import * as toolFetch from '../tools/fetch';
import * as toolFindTestFiles from '../tools/findTestFiles';
import * as toolGithubRepo from '../tools/githubRepo';
import * as toolNew from '../tools/new';
import * as toolOpenSimpleBrowser from '../tools/openSimpleBrowser';
import * as toolProblems from '../tools/problems';
import * as toolRunCommands from '../tools/runCommands';
import * as toolRunNotebooks from '../tools/runNotebooks';
import * as toolRunTasks from '../tools/runTasks';
import * as toolRunTests from '../tools/runTests';
import * as toolSearch from '../tools/search';
import * as toolSearchResults from '../tools/searchResults';
import * as toolTerminalLastCommand from '../tools/terminalLastCommand';
import * as toolTerminalSelection from '../tools/terminalSelection';
import * as toolTestFailure from '../tools/testFailure';
import * as toolThink from '../tools/think';
import * as toolTodos from '../tools/todos';
import * as toolUsages from '../tools/usages';
import * as toolVscodeAPI from '../tools/vscodeAPI';

import { ProviderRegistry } from './providers/ProviderRegistry';
import { DummyProvider } from './providers/DummyProvider';
import { FoundryLocalProvider } from './providers/FoundryLocalProvider';
import { LMStudioProvider } from './providers/LMStudioProvider';
import { OllamaProvider } from './providers/OllamaProvider';
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

  private _webviewView?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Listen for messages from the webview
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg && msg.command === 'openToolsDropdown') {
        await vscode.commands.executeCommand('codie.tools.manage');
      }
    });
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
            <img src="${codieLogoUri}" alt="Codie Logo" class="codie-logo" style="width:20%;display:block;margin:0 auto;" />
          </header>
          <main class="codie-chat-main">
            <div class="codie-chat-area-shell">
              <div id="codie-chat-messages" class="codie-chat-messages"></div>
              <footer class="codie-chat-footer">
                <div class="codie-footer-content">
                  <form class="codie-input-form" autocomplete="off">
                    <div class="codie-input-row codie-input-row-top">
                      <button class="codie-attach-btn" title="Add Context" aria-label="Add Context" type="button" style="display: flex; align-items: center; min-width: 110px; padding: 0.2em 0.7em;">
                        <span class="codicon codicon-folder" style="font-size: 16px;"></span>
                        <span style="margin-left:0.4em; font-size:7px;">Add Context...</span>
                      </button>
                      <div class="codie-attached-items"></div>
                    </div>
                    <textarea class="codie-input" placeholder="Type your message..." aria-label="Chat input" rows="2"></textarea>
                    <div class="codie-input-row codie-input-row-bottom">
                      <button class="codie-toolbar-btn" title="Model Picker" aria-label="Model Picker" type="button">
                        <span class="codicon codicon-symbol-parameter"></span>
                      </button>
                      <button class="codie-toolbar-btn" title="Agent Mode" aria-label="Agent Mode" type="button">
                        <span class="codicon codicon-person"></span>
                      </button>
                      <span style="flex:1 1 auto;"></span>
                      <button class="codie-toolbar-btn" title="Voice Chat" aria-label="Voice Chat" type="button">
                        <span class="codicon codicon-mic"></span>
                      </button>
                      <button id="codie-tools-btn" class="codie-toolbar-btn" title="Tools" aria-label="Tools" type="button">
                        <span class="codicon codicon-tools"></span>
                      </button>
                      <button class="codie-send-btn" type="submit" aria-label="Send">
                        <span class="codicon codicon-send"></span>
                      </button>
                    </div>
                  </form>
                </div>
              </footer>
            </div>
          </main>
        </div>
        <script>
          // Add event listener for the Tools button
          const vscode = acquireVsCodeApi();
          document.getElementById('codie-tools-btn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'openToolsDropdown' });
          });
        </script>
        <script src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }
}


export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration();
  // Register tools with ToolRegistry based on enable/disable settings
  const toolConfigs: { id: string, label: string, description: string, module: any, setting: string }[] = [
    { id: 'changes', label: 'Changes', description: 'Get diffs of changed files', module: toolChanges, setting: 'codie.tools.changes.enabled' },
    { id: 'codebase', label: 'Codebase', description: 'Find relevant file chunks, symbols, and codebase info', module: toolCodebase, setting: 'codie.tools.codebase.enabled' },
    { id: 'editFiles', label: 'Edit Files', description: 'Edit files in your workspace', module: toolEditFiles, setting: 'codie.tools.editFiles.enabled' },
    { id: 'extensi', label: 'Extensi', description: 'VS Code Extensions Marketplace integration', module: toolExtensi, setting: 'codie.tools.extensi.enabled' },
    { id: 'fetch', label: 'Fetch', description: 'Fetch the main content from a web page', module: toolFetch, setting: 'codie.tools.fetch.enabled' },
    { id: 'findTestFiles', label: 'Find Test Files', description: 'Find test files for a given source or test file', module: toolFindTestFiles, setting: 'codie.tools.findTestFiles.enabled' },
    { id: 'githubRepo', label: 'GitHub Repo', description: 'Search a GitHub repository for code snippets', module: toolGithubRepo, setting: 'codie.tools.githubRepo.enabled' },
    { id: 'new', label: 'New', description: 'Scaffold a new workspace with VS Code configs', module: toolNew, setting: 'codie.tools.new.enabled' },
    { id: 'openSimpleBrowser', label: 'Open Simple Browser', description: 'Preview a locally hosted website', module: toolOpenSimpleBrowser, setting: 'codie.tools.openSimpleBrowser.enabled' },
    { id: 'problems', label: 'Problems', description: 'Check errors for a particular file', module: toolProblems, setting: 'codie.tools.problems.enabled' },
    { id: 'runCommands', label: 'Run Commands', description: 'Run commands in the terminal', module: toolRunCommands, setting: 'codie.tools.runCommands.enabled' },
    { id: 'runNotebooks', label: 'Run Notebooks', description: 'Run notebook cells', module: toolRunNotebooks, setting: 'codie.tools.runNotebooks.enabled' },
    { id: 'runTasks', label: 'Run Tasks', description: 'Run tasks and get their output', module: toolRunTasks, setting: 'codie.tools.runTasks.enabled' },
    { id: 'runTests', label: 'Run Tests', description: 'Run unit tests', module: toolRunTests, setting: 'codie.tools.runTests.enabled' },
    { id: 'search', label: 'Search', description: 'Search and read files in your workspace', module: toolSearch, setting: 'codie.tools.search.enabled' },
    { id: 'searchResults', label: 'Search Results', description: 'Get results from the search view', module: toolSearchResults, setting: 'codie.tools.searchResults.enabled' },
    { id: 'terminalLastCommand', label: 'Terminal Last Command', description: 'Get the last command run in the terminal', module: toolTerminalLastCommand, setting: 'codie.tools.terminalLastCommand.enabled' },
    { id: 'terminalSelection', label: 'Terminal Selection', description: 'Get the current selection in the terminal', module: toolTerminalSelection, setting: 'codie.tools.terminalSelection.enabled' },
    { id: 'testFailure', label: 'Test Failure', description: 'Get info about the last unit test failure', module: toolTestFailure, setting: 'codie.tools.testFailure.enabled' },
    { id: 'think', label: 'Think', description: 'Deep thinking and task organization', module: toolThink, setting: 'codie.tools.think.enabled' },
    { id: 'todos', label: 'Todos', description: 'Manage and track todo items', module: toolTodos, setting: 'codie.tools.todos.enabled' },
    { id: 'usages', label: 'Usages', description: 'Find symbol usages', module: toolUsages, setting: 'codie.tools.usages.enabled' },
    { id: 'vscodeAPI', label: 'VS Code API', description: 'VS Code API reference and documentation', module: toolVscodeAPI, setting: 'codie.tools.vscodeAPI.enabled' },
  ];

  for (const tool of toolConfigs) {
    const enabled = config.get<boolean>(tool.setting, true);
    ToolRegistry.register({
      id: tool.id,
      label: tool.label,
      description: tool.description,
      enabled,
      execute: tool.module[tool.id] || (async () => { throw new Error('Not implemented'); })
    });
  }

  // Command to list and toggle tools
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.tools.manage', async () => {
      const allTools = ToolRegistry.list();
      const picks = await vscode.window.showQuickPick(
        allTools.map(t => ({
          label: t.label,
          description: t.description,
          picked: t.enabled,
          id: t.id
        })),
        {
          canPickMany: true,
          placeHolder: 'Enable or disable tools'
        }
      );
      if (picks) {
        for (const tool of allTools) {
          const shouldEnable = picks.some(p => p.id === tool.id);
          if (tool.enabled !== shouldEnable) {
            await config.update(`codie.tools.${tool.id}.enabled`, shouldEnable, vscode.ConfigurationTarget.Global);
            tool.enabled = shouldEnable;
          }
        }
        vscode.window.showInformationMessage('Tool settings updated.');
      }
    })
  );
  // Backend: Provider registry and dynamic provider loading
  const providerRegistry = new ProviderRegistry();

  // Always register DummyProvider for fallback/testing
  providerRegistry.register(new DummyProvider());

  // Register providers based on settings
  if (config.get('codie.providers.foundry.enabled', true)) {
    providerRegistry.register(new FoundryLocalProvider());
  }
  if (config.get('codie.providers.lmstudio.enabled', true)) {
    const lmstudioEndpoint = config.get('codie.providers.lmstudio.endpoint', 'http://localhost:1234/v1');
    providerRegistry.register(new LMStudioProvider(lmstudioEndpoint));
  }
  if (config.get('codie.providers.ollama.enabled', true)) {
    const ollamaEndpoint = config.get('codie.providers.ollama.endpoint', 'http://localhost:11434/v1');
    providerRegistry.register(new OllamaProvider(ollamaEndpoint));
  }

  // Example: Log all providers and their models at activation
  providerRegistry.getAllModels().then((all) => {
    for (const { provider, models } of all) {
      console.log(`[Codie] Provider: ${provider.getName()}`);
      for (const model of models) {
        console.log(`  Model: ${model.id} - ${model.name}`);
      }
    }
  });

  // Register command to list providers/models and select one
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.listModels', async () => {
      const all = await providerRegistry.getAllModels();
      const items: { label: string; description: string; provider: string; modelId: string }[] = [];
      for (const { provider, models } of all) {
        for (const model of models) {
          items.push({
            label: `${provider.getName()} — ${model.name}`,
            description: model.description || '',
            provider: provider.getName(),
            modelId: model.id,
          });
        }
      }
      if (items.length === 0) {
        vscode.window.showInformationMessage('No AI models available.');
        return;
      }
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an AI provider and model',
      });
      if (picked) {
        context.workspaceState.update('codie.selectedProvider', picked.provider);
        context.workspaceState.update('codie.selectedModelId', picked.modelId);
        vscode.window.showInformationMessage(`Selected: ${picked.label}`);
      }
    })
  );

  // Register UI and data providers as before
  const codieChatViewProvider = new CodieChatViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CodieChatViewProvider.viewType, codieChatViewProvider)
  );
  const codieDataProvider = new CodieDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codie-data-view', codieDataProvider)
  );

  console.log('Codie extension: activate() called (MINIMAL)');
}

export function deactivate() {}

