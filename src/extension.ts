
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

      // --- TOOL INTEGRATION ---
      if (msg.command === 'getToolList') {
        // Send list of tools (id, label, inputSchema, enabled, destructive)
        const tools = ToolRegistry.list().map(t => ({
          id: t.id,
          label: t.label,
          description: t.description,
          enabled: t.enabled,
          inputSchema: t.inputSchema || {},
          destructive: typeof (t as any).destructive === 'boolean' ? (t as any).destructive : false
        }));
        webviewView.webview.postMessage({ command: 'toolList', tools });
        return;
      }
      if (msg.command === 'invokeTool') {
        const { toolId, input, sessionId, requestId } = msg;
        console.log('[Codie] invokeTool received:', { toolId, input, sessionId, requestId });
        if (!toolId) {
          webviewView.webview.postMessage({ command: 'toolResult', toolId, error: 'Missing toolId', sessionId, requestId });
          return;
        }
        try {
          const result = await ToolRegistry.execute(toolId, input || {}, { sessionId, requestId });
          console.log('[Codie] invokeTool result:', { toolId, result });
          webviewView.webview.postMessage({ command: 'toolResult', toolId, result, sessionId, requestId });
        } catch (err: any) {
          console.error('[Codie] invokeTool error:', err);
          webviewView.webview.postMessage({ command: 'toolResult', toolId, error: err?.message || err, sessionId, requestId });
        }
        return;
      }
      if (msg.command === 'continueAIResponse') {
        if (!lastProviderName || !lastModelId || !lastUserMessage) {
          webviewView.webview.postMessage({ command: 'aiChatResponse', text: 'No previous context to continue.' });
          return;
        }
        webviewView.webview.postMessage({ command: 'aiChatStarted' });
        currentAbortController = new AbortController();
        try {
          // Manual provider lookup (by name or key)
          let provider = undefined;
          for (const p of this.providerRegistry.getProviders()) {
            const pKey = (p as any).key || '';
            const pName = p.getName();
            if (
              pKey === lastProviderName ||
              pName === lastProviderName ||
              (typeof pName === 'string' && typeof lastProviderName === 'string' &&
                (pName as string).toLowerCase() === (lastProviderName as string).toLowerCase())
            ) {
              provider = p;
              break;
            }
          }
          if (!provider) throw new Error(`Provider '${lastProviderName}' not found.`);
          // Always inject Codie persona system prompt
          const systemPrompt = 'You are Codie, a helpful AI assistant for VS Code users. Always refer to yourself as Codie.';
          let continuePrompt = `${systemPrompt}\n${lastUserMessage}\n${lastAIResponse || ''}\nContinue:`;
          const aiResponse = await provider.sendMessage(lastModelId, continuePrompt);
          lastAIResponse = aiResponse;
          webviewView.webview.postMessage({ command: 'aiChatResponse', text: aiResponse });
        } catch (err: any) {
          if (err.name === 'AbortError') {
            webviewView.webview.postMessage({ command: 'aiChatCancelled' });
          } else {
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: 'Error continuing: ' + (err.message || err) });
          }
        } finally {
          currentAbortController = undefined;
        }
        return;
      }
      if (msg.command === 'cancelAIResponse') {
        if (currentAbortController) {
          currentAbortController.abort();
          currentAbortController = undefined;
          webviewView.webview.postMessage({ command: 'aiChatCancelled' });
        } else {
          webviewView.webview.postMessage({ command: 'aiChatCancelled' });
        }
        return;
      }

      switch (msg.command) {
        case 'openToolSettings': {
          // Open the VS Code QuickPick for managing tools
          await vscode.commands.executeCommand('codie.tools.manage');
          break;
        }
        case 'getModelsForProvider': {
          // Get models for the requested provider
          const providerKey = msg.provider;
          let provider = undefined;
          for (const p of this.providerRegistry.getProviders()) {
            const pKey = (p as any).key || '';
            const pName = p.getName();
            if (
              pKey === providerKey ||
              pName === providerKey ||
              pName.toLowerCase() === providerKey.toLowerCase()
            ) {
              provider = p;
              break;
            }
          }
          if (!provider) {
            webviewView.webview.postMessage({ command: 'modelList', models: [] });
            return;
          }
          try {
            const models = await provider.listModels();
            // Send as array of { key, label }
            const modelList = (models || []).map((m: any) => ({ key: m.id, label: m.name }));
            webviewView.webview.postMessage({ command: 'modelList', models: modelList });
          } catch (err) {
            webviewView.webview.postMessage({ command: 'modelList', models: [] });
          }
          break;
        }
        case 'setModel': {
          // Set selected model in workspace state and notify webview
          const modelId = msg.model;
          if (!modelId) return;
          // Use current provider from workspace state
          const providerKey = this.context.workspaceState.get('codie.selectedProvider', '');
          let provider = undefined;
          for (const p of this.providerRegistry.getProviders()) {
            const pKey = (p as any).key || '';
            const pName = p.getName();
            if (
              pKey === providerKey ||
              pName === providerKey ||
              pName.toLowerCase() === providerKey.toLowerCase()
            ) {
              provider = p;
              break;
            }
          }
          if (provider && typeof provider.setActiveModel === 'function') {
            try {
              await provider.setActiveModel(modelId);
            } catch (err) {
              // Ignore errors for now
            }
          }
          await this.context.workspaceState.update('codie.selectedModelId', modelId);
          // Notify webview of new selection
          const providerName = provider ? provider.getName() : providerKey;
          webviewView.webview.postMessage({ command: 'selectedModel', provider: providerName, model: modelId });
          break;
        }
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
        case 'setProvider': {
          // Save selected provider in workspace state and notify webview
          const provider = msg.provider;
          if (provider) {
            await this.context.workspaceState.update('codie.selectedProvider', provider);
            sendSelectedModel();
          }
          break;
        }
        case 'openAddContextPicker': {
          // Show QuickPick for context sources only (single-select, Copilot-style)
          try {
            const contextSources: vscode.QuickPickItem[] = [
              { label: 'Open Editors', description: 'Currently open editors' },
              { label: 'Files & Folders...', description: 'Browse files and folders' },
              { label: 'Instructions...', description: 'Add instructions as context' },
              { label: 'Screenshot Window', description: 'Take a screenshot and attach' },
              { label: 'Source Control...', description: 'Attach source control info' },
              { label: 'Problems...', description: 'Attach problems/diagnostics' },
              { label: 'Symbols...', description: 'Attach workspace symbols' },
              { label: 'Tools...', description: 'Attach tool output or config' },
            ];
            const picked = await vscode.window.showQuickPick(contextSources, {
              canPickMany: false,
              placeHolder: 'Add context: choose a source',
              matchOnDescription: true,
              matchOnDetail: true
            });
            if (picked) {
              if (picked.label === 'Files & Folders...') {
                // Show multi-select QuickPick for files/folders
                const uris = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 200);
                const fileItems: vscode.QuickPickItem[] = uris.map(uri => ({
                  label: vscode.workspace.asRelativePath(uri),
                  description: uri.fsPath,
                  detail: '',
                  alwaysShow: false,
                  picked: false,
                  // @ts-ignore
                  uri: uri.toString()
                }));
                const pickedFiles = await vscode.window.showQuickPick(fileItems, {
                  canPickMany: true,
                  placeHolder: 'Select files and folders to attach as context',
                  matchOnDescription: true,
                  matchOnDetail: true
                });
                if (pickedFiles && pickedFiles.length > 0) {
                  webviewView.webview.postMessage({
                    command: 'addContext',
                    items: pickedFiles.map(item => ({
                      label: item.label,
                      description: item.description,
                      uri: (item as any).uri
                    }))
                  });
                }
              } else {
                // For all other sources, just send the picked source label as a chip (stub for now)
                webviewView.webview.postMessage({
                  command: 'addContextSource',
                  sources: [picked.label]
                });
              }
            }
          } catch (err) {
            vscode.window.showErrorMessage('Error selecting context: ' + ((err && (err as any).message) ? (err as any).message : err));
          }
          break;
        }
        case 'userChatMessage': {
          // Debug: log message receipt
          const userText = msg.text || '';
          // Get selected provider/model from workspaceState
          const providerName = this.context.workspaceState.get('codie.selectedProvider', '');
          const modelId = this.context.workspaceState.get('codie.selectedModelId', '');
          if (!providerName || !modelId) {
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: 'No AI provider/model selected.' });
            return;
          }
          // Find the provider instance (by key or name)
          let provider = undefined;
          for (const p of this.providerRegistry.getProviders()) {
            const pKey = (p as any).key || '';
            const pName = p.getName();
            if (
              pKey === providerName ||
              pName === providerName ||
              (typeof pName === 'string' && typeof providerName === 'string' &&
                (pName as string).toLowerCase() === (providerName as string).toLowerCase())
            ) {
              provider = p;
              break;
            }
          }
          if (!provider) {
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: `Provider '${providerName}' not found.` });
            return;
          }
          // Persona system prompt for Codie, with general instructions and tool schema prepended
          const enabledTools = ToolRegistry.list().filter(t => t.enabled);
          const toolSchemaDesc = enabledTools.map(tool => {
            let schema = '';
            if (tool.inputSchema && typeof tool.inputSchema === 'object' && Object.keys(tool.inputSchema).length > 0) {
              schema = Object.keys(tool.inputSchema).map(k => {
                const field = tool.inputSchema ? tool.inputSchema[k] : {};
                let type = 'string';
                if (field && typeof field === 'object' && typeof field.type === 'string') {
                  type = field.type;
                }
                return `  - ${k}: ${type}`;
              }).join('\n');
            }
            return `Tool: ${tool.label || tool.id}\nDescription: ${tool.description || ''}\nInputs:\n${schema}`;
          }).join('\n\n');
          // Load general instructions from schema file
          const general = (generalInstructions && Array.isArray(generalInstructions)) ? generalInstructions.join('\n') : '';
          const systemPrompt = `${general}\n\nAvailable tools you can use (invoke by name and provide required inputs):\n${toolSchemaDesc}\n\nIMPORTANT: If the user requests to create, edit, append, read, or delete a file, ALWAYS use the Edit Files tool instead of giving manual instructions. Respond ONLY with the tool call and required parameters. Do NOT give step-by-step instructions for file operations.`;
          // Call sendMessage and send response
          try {
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: 'Thinking...' });
            // Set CONTINUE/CANCEL state for this chat
            lastProviderName = providerName;
            lastModelId = modelId;
            lastUserMessage = userText;
            lastAIResponse = undefined;
            currentAbortController = undefined;
            // Always inject Codie persona system prompt with tool schema
            const promptWithPersona = `${systemPrompt}\n${userText}`;
            const aiResponse = await provider.sendMessage(modelId, promptWithPersona);
            lastAIResponse = aiResponse;
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: aiResponse || '(No response)' });
          } catch (err: any) {
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
    const mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
    const reactBundleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'chat.css'));
    const codiconCssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'codicon.css'));
    const codieLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'Codie.png'));
    return `
      <!DOCTYPE html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${codiconCssUri}" rel="stylesheet">
        <link href="${styleUri}" rel="stylesheet">
        <script>window.codieLogoUri = "${codieLogoUri}";</script>
        <title>Codie Chat</title>
      </head>
      <body>
        <div id="root"></div>
        <!-- main.js initializes window.vscode, then React bundle renders UI -->
        <script src="${mainScriptUri}"></script>
        <script src="${reactBundleUri}"></script>
      </body>
      </html>
    `;
  }
}

import { ToolRegistry, Tool } from '../tools/ToolRegistry';
import { toolSchemas } from '../schema/toolSchemas';
import { generalInstructions } from '../schema/generalSchema';

import { ProviderRegistry } from './providers/ProviderRegistry';
import { FoundryLocalProvider } from './providers/FoundryLocalProvider';
import { LMStudioProvider } from './providers/LMStudioProvider';

import { OllamaProvider } from './providers/OllamaProvider';
import * as vscode from 'vscode';

// CONTINUE/CANCEL STATE (module scope for CodieChatViewProvider)
let lastProviderName: string | undefined = undefined;
let lastModelId: string | undefined = undefined;
let lastUserMessage: string | undefined = undefined;
let lastAIResponse: string | undefined = undefined;
let currentAbortController: AbortController | undefined = undefined;

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
  // Register tools from toolSchemas
  for (const schema of toolSchemas) {
    // Default: enabled unless config disables
    const enabled = config.get<boolean>(`codie.tools.${schema.id}.enabled`, true);
    // Try to import the tool implementation if it exists (by convention: tools/{id}.ts)
    let execute: Tool['execute'] = async () => { throw new Error('Not implemented'); };
    try {
      // Dynamic import (sync require for Node.js/webpack)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const toolImpl = require(`../tools/${schema.id}`);
      if (toolImpl && typeof toolImpl.default?.execute === 'function') {
        execute = toolImpl.default.execute.bind(toolImpl.default);
      }
    } catch (err) {
      // Ignore if not found
    }
    ToolRegistry.register({
      id: schema.id,
      label: schema.label,
      description: schema.description,
      icon: schema.icon,
      inputSchema: schema.inputSchema,
      enabled,
      destructive: schema.destructive,
      execute
    });
  }

  // Command to list and toggle tools
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.tools.manage', async () => {
      const allTools = ToolRegistry.list();
      // Group all native tools under a collapsible group
      const quickPickItems: (vscode.QuickPickItem & { id?: string })[] = [];
      quickPickItems.push({
        label: 'Native-Tools',
        kind: vscode.QuickPickItemKind.Separator
      });
      for (const t of allTools) {
        quickPickItems.push({
          label: `${t.icon ? `$(${t.icon}) ` : ''}${t.label}`,
          description: t.description,
          picked: t.enabled,
          id: t.id
        });
      }
      const picks = await vscode.window.showQuickPick(quickPickItems, {
        canPickMany: true,
        placeHolder: 'Enable or disable tools'
      });
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

