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
import { FoundryLocalProvider } from './providers/FoundryLocalProvider';
import { LMStudioProvider } from './providers/LMStudioProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import * as vscode from 'vscode';

// Tree item types
type CodieTreeItemType = 'root' | 'providers' | 'provider' | 'foundry-static-port';

class CodieTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: CodieTreeItemType,
    public readonly providerKey?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = type;
    if (type === 'foundry-static-port') {
      this.command = {
        command: 'codie.treeView.itemClick',
        title: 'Create Static Port',
        arguments: [this]
      };
    }
  }
}

class CodieDataProvider implements vscode.TreeDataProvider<CodieTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CodieTreeItem | undefined | void> = new vscode.EventEmitter<CodieTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<CodieTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: CodieTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CodieTreeItem): Thenable<CodieTreeItem[]> {
    if (!element) {
      // Root: show Providers parent
      return Promise.resolve([
        new CodieTreeItem('Providers', vscode.TreeItemCollapsibleState.Expanded, 'providers')
      ]);
    }
    if (element.type === 'providers') {
      // Children: each provider
      return Promise.resolve([
        new CodieTreeItem('FoundryLocal', vscode.TreeItemCollapsibleState.Collapsed, 'provider', 'foundry'),
        new CodieTreeItem('LM Studio', vscode.TreeItemCollapsibleState.None, 'provider', 'lmstudio'),
        new CodieTreeItem('Ollama', vscode.TreeItemCollapsibleState.None, 'provider', 'ollama'),
      ]);
    }
    if (element.type === 'provider' && element.providerKey === 'foundry') {
      // Foundry children: static port option
      return Promise.resolve([
        new CodieTreeItem('Create Static Port', vscode.TreeItemCollapsibleState.None, 'foundry-static-port', 'foundry')
      ]);
    }
    // No children for other providers
    return Promise.resolve([]);
  }
}



class CodieChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codie-chat-view';

  private _webviewView?: vscode.WebviewView;
  private providerRegistry: ProviderRegistry;

  // Public method to update selected model in the webview
  public updateSelectedModel() {
    if (!this._webviewView) return;
    const provider = this.context.workspaceState.get('codie.selectedProvider', '');
    const model = this.context.workspaceState.get('codie.selectedModelId', '');
    this._webviewView.webview.postMessage({ command: 'selectedModel', provider, model });
  }

  constructor(private readonly context: vscode.ExtensionContext, providerRegistry: ProviderRegistry) {
    this.providerRegistry = providerRegistry;
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Helper to send selected model/provider to webview
    const sendSelectedModel = () => {
      const provider = this.context.workspaceState.get('codie.selectedProvider', '');
      const model = this.context.workspaceState.get('codie.selectedModelId', '');
      webviewView.webview.postMessage({ command: 'selectedModel', provider, model });
    };

    // Listen for messages from the webview
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (!msg || !msg.command) return;
      switch (msg.command) {
        case 'openToolsDropdown':
          await vscode.commands.executeCommand('codie.tools.manage');
          break;
        case 'openProviderSettings':
          await vscode.commands.executeCommand('codie.listProviders');
          break;
        case 'openModelPicker':
          await vscode.commands.executeCommand('codie.listModelsGrouped');
          break;
        case 'getSelectedModel':
          sendSelectedModel();
          break;
        case 'userChatMessage': {
          // Debug: log message receipt
          console.log('[Codie] Received userChatMessage from webview:', msg);
          const userText = msg.text || '';
          // Get selected provider/model from workspaceState
          const providerName = this.context.workspaceState.get('codie.selectedProvider', '');
          const modelId = this.context.workspaceState.get('codie.selectedModelId', '');
          console.log('[Codie] Selected provider/model:', providerName, modelId);
          if (!providerName || !modelId) {
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: 'No AI provider/model selected.' });
            return;
          }
          // Find the provider instance
          let provider = undefined;
          for (const p of this.providerRegistry.getProviders()) {
            if (p.getName() === providerName) {
              provider = p;
              break;
            }
          }
          if (!provider) {
            console.error('[Codie] Provider not found:', providerName);
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: `Provider '${providerName}' not found.` });
            return;
          }
          // Persona system prompt for Codie
          const systemPrompt = 'You are Codie, a helpful AI assistant for VS Code users. Always refer to yourself as Codie.';
          // Call sendMessage and send response
          try {
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: 'Thinking...' });
            console.log('[Codie] Calling provider.sendMessage...');
            const aiResponse = await provider.sendMessage(modelId, userText, systemPrompt);
            console.log('[Codie] AI response:', aiResponse);
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: aiResponse || '(No response)' });
          } catch (err: any) {
            console.error('[Codie] Error in provider.sendMessage:', err);
            let userMsg = `Error: ${err?.message || err}`;
            const errStr = (err?.message || err || '').toString();
            if (/404|not found|connection refused|ECONNREFUSED/i.test(errStr)) {
              userMsg = 'Provider endpoint not found or not running. Please check that the selected provider is running and accessible.';
            }
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: userMsg });
          }
          break;
        }
      }
    });

    // Send selected model/provider on load
    setTimeout(sendSelectedModel, 300);

    // Listen for selection changes and update webview
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('codie.selectedProvider') || e.affectsConfiguration('codie.selectedModelId')) {
        sendSelectedModel();
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
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${codiconCssUri}" rel="stylesheet">
        <link href="${styleUri}" rel="stylesheet">
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
                      <a href="#" class="codie-attach-link" title="Add Context" aria-label="Add Context" role="button" tabindex="0" >
                        <span class="codicon codicon-folder" style="font-size: 11px;"></span>
                        <span style="margin-left:0.4em; font-size:10px;">Add Context...</span>
                      </a>
                      <div class="codie-attached-items"></div>
                    </div>
                    <textarea class="codie-input" placeholder="Type your message..." aria-label="Chat input" rows="2"></textarea>
                    <div class="codie-input-row codie-input-row-bottom">
                      <a href="#" class="codie-toolbar-link" id="codie-ai-provider-btn" title="AI Provider" aria-label="AI Provider" role="button" tabindex="0">
                        <span class="codicon codicon-server-environment"></span>
                      </a>
                      <a href="#" class="codie-toolbar-link" id="codie-model-picker-btn" title="AI Model" aria-label="AI Model" role="button" tabindex="0">
                        <span class="codicon codicon-hubot"></span>
                      </a>
                       <span id="codie-selected-model" style="margin-left:0.7em; font-size:10px; color:#fff; opacity:0.8;"></span>
                      <span style="flex:1 1 auto;"></span>
                      <a href="#" class="codie-toolbar-link" title="Voice Chat" aria-label="Voice Chat" role="button" tabindex="0">
                        <span class="codicon codicon-mic"></span>
                      </a>
                      <a href="#" id="codie-tools-btn" class="codie-toolbar-link" title="Tools" aria-label="Tools" role="button" tabindex="0">
                        <span class="codicon codicon-debug-disconnect"></span>
                      </a>
                      <a href="#" id="codie-chat-send" class="codie-send-link" aria-label="Send" role="button" tabindex="0">
                        <span class="codicon codicon-send"></span>
                      </a>
                    </div>
                  </form>
                </div>
              </footer>
            </div>
          </main>
        </div>
  <!-- Picker/model/tools button event listeners and selected model handler are now in main.js -->
        <script src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }
}

// Top-level export, not inside any class
export function activate(context: vscode.ExtensionContext) {

  // Command to test connection to Foundry Local and check if models are running
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.testFoundryConnection', async () => {
      // Dynamically import the SDK to avoid breaking extension activation if not installed
      let FoundryLocalManager: any;
      try {
        ({ FoundryLocalManager } = await import('foundry-local-sdk'));
      } catch (err) {
        vscode.window.showErrorMessage('Could not import foundry-local-sdk. Please ensure it is installed.');
        return;
      }
      // Try to auto-detect the service URL using the CLI
      let serviceUrl: string | undefined;
      try {
        const { execSync } = await import('child_process');
        const output = execSync('foundry service status', { encoding: 'utf-8' });
        // Example output: 🟢 Model management service is running on http://127.0.0.1:60244/openai/status
        let match = output.match(/on (http:\/\/[\w\d\.:\-]+)/);
        if (match && match[1]) {
          serviceUrl = match[1];
        } else {
          // Try to match full URL if /openai/status is present
          const matchFull = output.match(/on (http:\/\/[\w\d\.:\-]+)\/openai\/status/);
          if (matchFull && matchFull[1]) {
            serviceUrl = matchFull[1];
          }
        }
      } catch (err) {
        // Ignore, will prompt user below if not found
      }
  // Try to get the service URL from settings first
  serviceUrl = serviceUrl || vscode.workspace.getConfiguration().get('codie.foundry.serviceUrl');
      if (!serviceUrl) {
        serviceUrl = await vscode.window.showInputBox({
          prompt: 'Could not auto-detect Foundry Local service URL. Please enter it (e.g. http://127.0.0.1:60244)',
          placeHolder: 'http://127.0.0.1:60244',
        });
        if (!serviceUrl) {
          vscode.window.showErrorMessage('No service URL provided.');
          return;
        }
      }
      try {
        const manager = new FoundryLocalManager({ serviceUrl });
        // List all available models in the catalog
        const catalog = await manager.listCatalogModels();
        // List all loaded models
        const loaded = await manager.listLoadedModels();
        const loadedIds = new Set((loaded || []).map((m: any) => m.id || m.alias));
        const results: string[] = [];
        for (const model of catalog) {
          const isLoaded = loadedIds.has(model.id) || loadedIds.has(model.alias);
          results.push(`${isLoaded ? '✅' : '❌'} ${model.displayName || model.name || model.id} (${isLoaded ? 'loaded' : 'not loaded'})`);
        }
        vscode.window.showInformationMessage(
          `Foundry Local connection successful.\nService URL: ${serviceUrl}\nModel status:\n${results.join('\n')}`,
          { modal: true }
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`Foundry Local connection failed: ${err?.message || err}`);
      }
    })
  );
  // Register command for creating a static port for Foundry
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.foundry.createStaticPort', async () => {
      const port = await vscode.window.showInputBox({
        prompt: 'Enter a unique port number for Foundry Local (must not conflict with other services)',
        placeHolder: 'e.g. 60244',
        validateInput: (value) => {
          if (!/^[0-9]{4,5}$/.test(value)) return 'Enter a valid port number (4-5 digits)';
          return null;
        }
      });
      if (!port) return;
      // Run CLI command
      const terminal = vscode.window.createTerminal({ name: 'Foundry Static Port' });
      terminal.show();
      terminal.sendText(`foundry service set --port ${port}`);
      // Save the service URL to settings
      const serviceUrl = `http://localhost:${port}`;
      await vscode.workspace.getConfiguration().update('codie.foundry.serviceUrl', serviceUrl, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Set Foundry Local static port to ${port} and saved service URL (${serviceUrl}) to settings. Make sure this port is unique and not in use by other services.`);
    })
  );
  // Tool configuration and registration
  const config = vscode.workspace.getConfiguration();
  const toolConfigs = [
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
  execute: (tool.module as any)[tool.id] || (async () => { throw new Error('Not implemented'); })
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


  // Debug: Log provider config values
  const foundryEnabled = config.get('codie.providers.foundry.enabled', true);
  const lmstudioEnabled = config.get('codie.providers.lmstudio.enabled', true);
  const ollamaEnabled = config.get('codie.providers.ollama.enabled', true);
  console.log('[Codie] Provider config:', {
    foundryEnabled,
    lmstudioEnabled,
    ollamaEnabled
  });

  // Register providers based on settings
  if (foundryEnabled) {
    console.log('[Codie] Registering FoundryLocalProvider');
    providerRegistry.register(new FoundryLocalProvider());
  } else {
    console.log('[Codie] FoundryLocalProvider not enabled');
  }
  if (lmstudioEnabled) {
    const lmstudioEndpoint = config.get('codie.providers.lmstudio.endpoint', 'http://localhost:1234/v1');
    console.log('[Codie] Registering LMStudioProvider at', lmstudioEndpoint);
    providerRegistry.register(new LMStudioProvider(lmstudioEndpoint));
  } else {
    console.log('[Codie] LMStudioProvider not enabled');
  }
  if (ollamaEnabled) {
    const ollamaEndpoint = config.get('codie.providers.ollama.endpoint', 'http://localhost:11434/v1');
    console.log('[Codie] Registering OllamaProvider at', ollamaEndpoint);
    providerRegistry.register(new OllamaProvider(ollamaEndpoint));
  } else {
    console.log('[Codie] OllamaProvider not enabled');
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

  // On startup, auto-load last selected provider/model if available
  (async () => {
    const lastProvider = context.workspaceState.get('codie.selectedProvider', '');
    const lastModelId = context.workspaceState.get('codie.selectedModelId', '');
    if (lastProvider && lastModelId) {
      // Find the provider instance
      let provider = undefined;
      for (const p of providerRegistry.getProviders()) {
        if (p.getName() === lastProvider) {
          provider = p;
          break;
        }
      }
      if (provider) {
        try {
          await provider.setActiveModel(lastModelId);
          console.log(`[Codie] Auto-loaded provider/model on startup: ${lastProvider} / ${lastModelId}`);
        } catch (err: any) {
          console.error(`[Codie] Failed to auto-load provider/model on startup: ${lastProvider} / ${lastModelId}:`, err);
        }
      }
    }
  })();

  // Register command to list providers (QuickPick)
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.listProviders', async () => {
      // List all known providers (not just enabled ones)
      const providerInfos = [
        { key: 'foundry', name: 'FoundryLocal', getName: () => new FoundryLocalProvider().getName() },
        { key: 'lmstudio', name: 'LM Studio', getName: () => new LMStudioProvider().getName() },
        { key: 'ollama', name: 'Ollama', getName: () => new OllamaProvider().getName() },
      ];
      const config = vscode.workspace.getConfiguration();
      const picks = providerInfos.map(info => {
        const enabled = config.get(`codie.providers.${info.key}.enabled`, true);
        return {
          label: info.getName(),
          picked: enabled,
          id: info.key
        };
      });
      const selected = await vscode.window.showQuickPick(picks, {
        canPickMany: true,
        placeHolder: 'Enable or disable AI providers',
      });
      if (selected) {
        // Update config for each provider
        const selectedIds = new Set(selected.map(s => s.id));
        for (const info of providerInfos) {
          const shouldEnable = selectedIds.has(info.key);
          await config.update(`codie.providers.${info.key}.enabled`, shouldEnable, vscode.ConfigurationTarget.Global);
        }
        // If the currently selected provider is now disabled, clear selection
        const currentProvider = context.workspaceState.get('codie.selectedProvider', '');
        const stillEnabled = providerInfos.find(info => info.getName() === currentProvider && selectedIds.has(info.key));
        if (!stillEnabled) {
          await context.workspaceState.update('codie.selectedProvider', '');
          await context.workspaceState.update('codie.selectedModelId', '');
          vscode.window.showInformationMessage('Current provider was disabled and selection cleared.');
        } else {
          vscode.window.showInformationMessage('Provider settings updated.');
        }
      }
    })
  );

  // Register command to list models grouped by provider (QuickPick with groups)
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.listModelsGrouped', async () => {
      const all = await providerRegistry.getAllModels();
      console.log('[Codie] listModelsGrouped: all providers/models:', all);
      const items: Array<{ label: string; description?: string; provider?: string; modelId?: string; kind?: vscode.QuickPickItemKind }> = [];
      for (const { provider, models } of all) {
        // Add group header
        items.push({ label: provider.getName(), kind: vscode.QuickPickItemKind.Separator });
        for (const model of models) {
          items.push({
            label: model.name,
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
        placeHolder: 'Select an AI model (grouped by provider)',
        matchOnDescription: true,
      });
      if (picked && picked.provider && picked.modelId) {
        // Find the provider instance
        let provider = undefined;
        for (const p of providerRegistry.getProviders()) {
          if (p.getName() === picked.provider) {
            provider = p;
            break;
          }
        }
        if (!provider) {
          vscode.window.showErrorMessage(`Provider '${picked.provider}' not found.`);
          return;
        }
        // Try to load/set the model with the provider
        try {
          await provider.setActiveModel(picked.modelId);
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to load model '${picked.label}' for provider '${picked.provider}': ${err?.message || err}`);
          return;
        }
        await context.workspaceState.update('codie.selectedProvider', picked.provider);
        await context.workspaceState.update('codie.selectedModelId', picked.modelId);
        vscode.window.showInformationMessage(`Selected: ${picked.provider} — ${picked.label}`);
        // Update the webview if open
        codieChatViewProvider.updateSelectedModel();
      }
    })
  );

  // Register UI and data providers as before
  const codieChatViewProvider = new CodieChatViewProvider(context, providerRegistry);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CodieChatViewProvider.viewType, codieChatViewProvider)
  );
  const codieDataProvider = new CodieDataProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codie-data-view', codieDataProvider)
  );

  // Tree view: handle item click for 'Create Static Port'
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.treeView.itemClick', async (item: any) => {
      if (item && item.type === 'foundry-static-port') {
        await vscode.commands.executeCommand('codie.foundry.createStaticPort');
      }
    })
  );

  console.log('Codie extension: activate() called (MINIMAL)');
}

export function deactivate() {}

