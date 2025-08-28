import * as path from 'path';
import type { Tool } from './tools/ToolInterfaces';
import { MCPToolProvider } from './tools/MCPToolProvider';
import { ToolRegistry } from './tools/ToolRegistry';
// Public API for extension tool registration
import type { ToolProvider as CodieToolProvider, Tool as CodieTool } from './tools/ToolInterfaces';
// API interface for dynamic tool registration
export interface CodieExtensionAPI {
  registerToolProvider(provider: CodieToolProvider): void;
  registerTool(tool: CodieTool): void;
}

import * as codieMemory from './codie-memory';
class CodieChatViewProvider implements vscode.WebviewViewProvider {
  // Use file-based persistent memory for workspace-wide context
  private async getLastFileOpIntent(): Promise<boolean> {
    return await codieMemory.getLastFileOpIntent();
  }
  private async setLastFileOpIntent(val: boolean) {
    await codieMemory.setLastFileOpIntent(val);
  }
  // Optionally, store last file op details for richer context
  private getLastFileOpDetails(): any {
    return codieMemory.getLastFileOpDetails();
  }
  private setLastFileOpDetails(details: any) {
    codieMemory.setLastFileOpDetails(details);
  }
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
      // Handle generic command execution from webview (e.g., open tools dropdown)
      if (msg.command === 'executeCommand' && typeof msg.commandName === 'string') {
        try {
          await vscode.commands.executeCommand(msg.commandName);
        } catch (err) {
          console.error('[Codie] Failed to execute command from webview:', msg.commandName, err);
        }
        return;
      }
      if (!msg || !msg.command) return;

      // --- TOOL INTEGRATION ---
      // --- Unified Tool System: All tool schema surfacing and invocation is routed through ToolRegistry ---
      if (msg.command === 'getToolList') {
        // Always use ToolRegistry for tool listing (built-in, extension, MCP, etc.)
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
        // Always use ToolRegistry for tool invocation (built-in, extension, MCP, etc.)
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
          // Build a minimal chat history for continue: system, user, assistant, then 'Continue:'
          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: lastUserMessage },
          ];
          if (lastAIResponse) {
            messages.push({ role: 'assistant', content: lastAIResponse });
          }
          messages.push({ role: 'user', content: 'Continue:' });
          const aiResponse = await provider.sendMessage(lastModelId, messages);
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
          await vscode.commands.executeCommand('codie.tools.manage');
          break;
        }
        case 'getToolList': {
          // Return all tools (with enabled state)
          const tools = ToolRegistry.list().map(t => ({
            id: t.id,
            label: t.label,
            description: t.description,
            enabled: t.enabled,
            provider: t.provider
          }));
          webviewView.webview.postMessage({ command: 'toolList', tools });
          break;
        }
        case 'setToolEnabled': {
          // Update enabled state and persist to config
          const { toolId, enabled } = msg;
          const toolConfig = vscode.workspace.getConfiguration();
          await toolConfig.update(`codie.tools.${toolId}.enabled`, enabled, vscode.ConfigurationTarget.Global);
          const tool = ToolRegistry.get(toolId);
          if (tool) tool.enabled = enabled;
          // Optionally, send updated list
          const tools = ToolRegistry.list().map(t => ({
            id: t.id,
            label: t.label,
            description: t.description,
            enabled: t.enabled,
            provider: t.provider
          }));
          webviewView.webview.postMessage({ command: 'toolList', tools });
          break;
        }
        case 'getMCPSettings': {
          // Return MCP API key and endpoint from config
          const mcpConfig = vscode.workspace.getConfiguration();
          const apiKey = mcpConfig.get('codie.mcp.apiKey', '');
          const endpoint = mcpConfig.get('codie.mcp.endpoint', 'http://localhost:8080/tools');
          webviewView.webview.postMessage({ command: 'mcpSettings', apiKey, endpoint });
          break;
        }
        case 'setMCPSettings': {
          // Save MCP API key and endpoint to config, update MCPToolProvider
          const { apiKey, endpoint } = msg;
          const mcpConfig = vscode.workspace.getConfiguration();
          await mcpConfig.update('codie.mcp.apiKey', apiKey, vscode.ConfigurationTarget.Global);
          await mcpConfig.update('codie.mcp.endpoint', endpoint, vscode.ConfigurationTarget.Global);
          // Update MCPToolProvider instance if available
          const globalMcpProvider = (global as any).codieMcpProvider;
          if (globalMcpProvider) {
            globalMcpProvider.setConfig({ apiKey, endpoint });
            await globalMcpProvider.refresh();
          }
          webviewView.webview.postMessage({ command: 'mcpSettings', apiKey, endpoint });
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
          // Always use ToolRegistry for tool schema surfacing (built-in, extension, MCP, etc.)
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
          // --- Persistent memory: load conversation history and inject into prompt ---
          const codieMemory = await import('./codie-memory');
          const mem = await codieMemory.readMemory();
          const conversationHistory = Array.isArray(mem.conversationHistory) ? mem.conversationHistory : [];
          // Only use the last 10 turns for context (configurable)
          const maxTurns = 10;
          const turns = conversationHistory.slice(-maxTurns);
          // Build chat history as array of messages (role/content)
          const messages = [];
          // System prompt (persona, tool schema, instructions)
          messages.push({
            role: 'system',
            content: `${general}\n\nAvailable tools you can use (invoke by name and provide required inputs):\n${toolSchemaDesc}\n\nIMPORTANT: Only use tools if the user clearly and explicitly asks for a file or code operation (such as create, edit, append, read, or delete a file). For greetings, general questions, or conversation, respond as Codie would in a friendly, conversational way. Do NOT use tools for greetings, small talk, or general chat.`
          });
          // Add previous turns (user/assistant)
          for (const turn of turns) {
            if (turn && turn.role && turn.content) {
              messages.push({ role: turn.role, content: turn.content });
            }
          }
          // Add the new user message
          messages.push({ role: 'user', content: userText });
          try {
            webviewView.webview.postMessage({ command: 'aiChatResponse', text: 'Thinking...' });
            // Set CONTINUE/CANCEL state for this chat
            lastProviderName = providerName;
            lastModelId = modelId;
            lastUserMessage = userText;
            lastAIResponse = undefined;
            currentAbortController = undefined;
            // --- Track file operation intent for multi-turn tool calls (persistently) ---
            const validActions = ['read', 'write', 'append', 'delete'];
            const userTextLower = userText.toLowerCase();
            // If this message contains a file op keyword, set lastFileOpIntent true and store details
            const isFileOp = validActions.some(a => userTextLower.includes(a)) || userTextLower.includes('file');
            if (isFileOp) {
              await this.setLastFileOpIntent(true);
              // Optionally, store details for richer context
              this.setLastFileOpDetails({
                action: validActions.find(a => userTextLower.includes(a)) || 'file',
                text: userText,
                timestamp: Date.now()
              });
            }
            // If this message is a greeting or general chat, clear lastFileOpIntent and details
            const isGreeting = /\b(hello|hi|hey|how are you|greetings|what's up|good morning|good afternoon|good evening)\b/i.test(userText);
            if (isGreeting) {
              await this.setLastFileOpIntent(false);
              this.setLastFileOpDetails(null);
            }
            // Send chat history array to provider
            const aiResponse = await provider.sendMessage(modelId, messages);
            lastAIResponse = aiResponse;

            // --- Tool call detection logic (multi-turn, persistent) ---
            // Only treat as a tool call if the response contains a JSON code block with a valid action (read, write, append, delete) and a filePath,
            // and either the user message contains a file operation keyword OR the last message had file op intent (for follow-ups, persistent).
            let toolCall = null;
            try {
              // Look for a JSON code block
              const toolCallMatch = aiResponse.match(/```json([\s\S]*?)```/);
              if (toolCallMatch) {
                let jsonStr = toolCallMatch[1].trim();
                const parsed = JSON.parse(jsonStr);
                if (parsed && validActions.includes(parsed.action) && parsed.filePath && (isFileOp || await this.getLastFileOpIntent())) {
                  toolCall = { toolId: 'editFiles', input: parsed };
                  // After a successful tool call, clear lastFileOpIntent and details
                  await this.setLastFileOpIntent(false);
                  this.setLastFileOpDetails(null);
                }
              }
            } catch (err) {
              // Ignore JSON parse errors
            }

            if (toolCall) {
              // Invoke the tool and show only the result or a friendly error
              try {
                const result = await ToolRegistry.execute(toolCall.toolId, toolCall.input, {});
                if (result.success) {
                  let msg = '✅ Tool succeeded.';
                  if (result.filePath) msg += ` File: ${result.filePath}`;
                  if (result.content) msg += `\n${result.content}`;
                  webviewView.webview.postMessage({ command: 'aiChatResponse', text: msg });
                  // Append user and AI turns to persistent memory
                  await codieMemory.appendConversation({ role: 'user', content: userText });
                  await codieMemory.appendConversation({ role: 'assistant', content: msg });
                } else {
                  webviewView.webview.postMessage({ command: 'aiChatResponse', text: `❌ Tool error: ${result.error || 'Unknown error.'}` });
                  // Still append user and AI turns to persistent memory
                  await codieMemory.appendConversation({ role: 'user', content: userText });
                  await codieMemory.appendConversation({ role: 'assistant', content: `❌ Tool error: ${result.error || 'Unknown error.'}` });
                }
              } catch (err: any) {
                webviewView.webview.postMessage({ command: 'aiChatResponse', text: `❌ Tool error: ${err?.message || err}` });
                // Still append user and AI turns to persistent memory
                await codieMemory.appendConversation({ role: 'user', content: userText });
                await codieMemory.appendConversation({ role: 'assistant', content: `❌ Tool error: ${err?.message || err}` });
              }
            } else {
              // Show plain chat as usual
              webviewView.webview.postMessage({ command: 'aiChatResponse', text: aiResponse || '(No response)' });
              // Append user and AI turns to persistent memory
              await codieMemory.appendConversation({ role: 'user', content: userText });
              await codieMemory.appendConversation({ role: 'assistant', content: aiResponse || '(No response)' });
            }
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
  const path = require('path');
  const mainScriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(extensionUri.fsPath, 'media', 'main.js')));
  const reactBundleUri = webview.asWebviewUri(vscode.Uri.file(path.join(extensionUri.fsPath, 'media', 'webview.js')));
  const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(extensionUri.fsPath, 'media', 'chat.css')));
  const codiconCssUri = webview.asWebviewUri(vscode.Uri.file(path.join(extensionUri.fsPath, 'media', 'codicon.css')));
  const codieLogoUri = webview.asWebviewUri(vscode.Uri.file(path.join(extensionUri.fsPath, 'media', 'Codie.png')));
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

import { BuiltinToolProvider } from './tools/BuiltinToolProvider';
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
  private _onDidChangeTreeData: vscode.EventEmitter<CodieTreeItem | null | undefined> = new vscode.EventEmitter<CodieTreeItem | null | undefined>();
  readonly onDidChangeTreeData: vscode.Event<CodieTreeItem | null | undefined> = this._onDidChangeTreeData.event;

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
export function activate(context: vscode.ExtensionContext): CodieExtensionAPI {
  // Register command to open MCP server management webview
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.tools.manageMCPServers', async () => {
      const panel = vscode.window.createWebviewPanel(
        'codie-mcp-server-manager',
        'Manage MCP Servers',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
        }
      );
      // Send current MCP server list to webview
      const config = vscode.workspace.getConfiguration();
      const mcpServers = config.get<any[]>('codie.tools.mcp.servers', []);
      // Use only the local, bundled JS for MCP Manager
      const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'mcpServerManager.js')));
      const styleUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'chat.css')));
      const mcpStyleUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'mcpServerManager.css')));
      panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${styleUri}" rel="stylesheet">
          <link href="${mcpStyleUri}" rel="stylesheet">
          <title>Manage MCP Servers</title>
        </head>
        <body>
          <div id="root"></div>
          <script>
            window.initialMcpServers = ${JSON.stringify(mcpServers)};
            window.acquireVsCodeApi = acquireVsCodeApi;
          </script>
          <script src="${scriptUri}"></script>
        </body>
        </html>
      `;
      // Handle messages from the webview (save/update MCP servers)
      panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg && msg.command === 'saveMcpServers' && Array.isArray(msg.servers)) {
          await config.update('codie.tools.mcp.servers', msg.servers, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage('MCP server list updated.');
          // Reload MCPToolProviders
          // Remove all previous MCPToolProviders from ToolRegistry
          if ((global as any).codieMcpProviders) {
            for (const provider of (global as any).codieMcpProviders) {
              ToolRegistry.unregisterProvider?.(provider); // If unregisterProvider exists
            }
          }
          // Register new providers
          const newProviders = [];
          for (const server of msg.servers) {
            if (!server || !server.endpoint) continue;
            const provider = new MCPToolProvider(server.endpoint, server.apiKey, server.label);
            ToolRegistry.registerProvider(provider);
            provider.refresh();
            newProviders.push(provider);
          }
          (global as any).codieMcpProviders = newProviders;
          // Send updated list back to webview
          panel.webview.postMessage({ command: 'updateMcpServers', servers: msg.servers });
        }
      });
    })
  );
  // On activation, check if codie.foundry.serviceUrl is set; if not, try to detect Foundry local port
  // Declare toolConfig for use throughout activation
  const toolConfig = vscode.workspace.getConfiguration();
  (async () => {
    const config = vscode.workspace.getConfiguration();
    let foundryUrl = config.get<string>('codie.foundry.serviceUrl', '');
    if (!foundryUrl) {
      // Try to detect Foundry local port by running 'foundry service status'
      try {
        const { execSync } = await import('child_process');
        const output = execSync('foundry service status', { encoding: 'utf-8' });
        // Example output: 🟢 Model management service is running on http://127.0.0.1:60244/openai/status
        let match = output.match(/on (http:\/\/[\w\d\.\-:]+)/);
        if (match && match[1]) {
          foundryUrl = match[1];
        } else {
          // Try to match full URL if /openai/status is present
          const matchFull = output.match(/on (http:\/\/[\w\d\.\-:]+)\/openai\/status/);
          if (matchFull && matchFull[1]) {
            foundryUrl = matchFull[1];
          }
        }
        if (foundryUrl) {
          await config.update('codie.foundry.serviceUrl', foundryUrl, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(`Foundry Local port detected: ${foundryUrl} (saved to settings)`);
        } else {
          vscode.window.showWarningMessage('Could not auto-detect Foundry Local port. Please set codie.foundry.serviceUrl in settings.');
        }
      } catch (err) {
        vscode.window.showWarningMessage('Could not auto-detect Foundry Local port (is Foundry installed and in PATH?). Please set codie.foundry.serviceUrl in settings.');
      }
    }
  })();

  // Register MCP tools providers for all configured servers
  const config = vscode.workspace.getConfiguration();
  const mcpServers = config.get<any[]>('codie.tools.mcp.servers', []);
  const mcpProviders: MCPToolProvider[] = [];
  for (const server of mcpServers) {
    if (!server || !server.endpoint) continue;
    const provider = new MCPToolProvider(server.endpoint, server.apiKey, server.label);
    ToolRegistry.registerProvider(provider);
    provider.refresh();
    mcpProviders.push(provider);
  }
  // Make all MCP providers globally accessible for message handlers (array)
  (global as any).codieMcpProviders = mcpProviders;

  // Command to refresh all MCP tools
  context.subscriptions.push(
    vscode.commands.registerCommand('codie.tools.refreshMCP', async () => {
      for (const provider of mcpProviders) {
        await provider.refresh();
      }
      vscode.window.showInformationMessage('All MCP tools refreshed.');
    })
  );
  // Public API for other extensions
  const api: CodieExtensionAPI = {
    registerToolProvider(provider: CodieToolProvider) {
      ToolRegistry.registerProvider(provider);
    },
    registerTool(tool: CodieTool) {
      ToolRegistry.registerTool(tool);
    }
  };
  // Register built-in tools (editFiles, etc.)
  ToolRegistry.registerProvider(new BuiltinToolProvider());

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
  // toolConfig already declared above
  // Register tools from toolSchemas
  for (const schema of toolSchemas) {
    // Default: enabled unless config disables
  const enabled = toolConfig.get<boolean>(`codie.tools.${schema.id}.enabled`, true);
    // Try to import the tool implementation if it exists (by convention: tools/{id}.ts)
    let execute: Tool['execute'] = async () => { throw new Error('Not implemented'); };
    try {
      // Dynamic import (sync require for Node.js/webpack)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
  const toolImpl = require(`./tools/${schema.id}`);
      if (toolImpl && typeof toolImpl.default?.execute === 'function') {
        execute = toolImpl.default.execute.bind(toolImpl.default);
      }
    } catch (err) {
      // Ignore if not found
    }
  ToolRegistry.registerTool({
      id: schema.id,
      label: schema.label,
      description: schema.description,
      icon: schema.icon,
      inputSchema: schema.inputSchema,
      enabled,
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
        // Show provider label for each tool (e.g., 'Tool Name (Provider)')
        let providerLabel = t.provider ? String(t.provider) : '';
        let label = `${t.icon ? `$(${t.icon}) ` : ''}${t.label}`;
        if (providerLabel && providerLabel !== 'builtin') {
          label += ` (${providerLabel})`;
        }
        quickPickItems.push({
          label,
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
            await toolConfig.update(`codie.tools.${tool.id}.enabled`, shouldEnable, vscode.ConfigurationTarget.Global);
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
  const foundryEnabled = toolConfig.get('codie.providers.foundry.enabled', true);
  const lmstudioEnabled = toolConfig.get('codie.providers.lmstudio.enabled', true);
  const ollamaEnabled = toolConfig.get('codie.providers.ollama.enabled', true);
  console.log('[Codie] Provider config:', {
    foundryEnabled,
    lmstudioEnabled,
    ollamaEnabled
  });

  // Register providers based on settings
  if (foundryEnabled) {
  const foundryUrl = toolConfig.get<string>('codie.foundry.serviceUrl', '');
    if (foundryUrl) {
      console.log('[Codie] Registering FoundryLocalProvider with endpoint', foundryUrl);
      providerRegistry.register(new FoundryLocalProvider(foundryUrl));
    } else {
      console.log('[Codie] Registering FoundryLocalProvider (auto-discover endpoint)');
      providerRegistry.register(new FoundryLocalProvider());
    }
  } else {
    console.log('[Codie] FoundryLocalProvider not enabled');
  }
  if (lmstudioEnabled) {
  const lmstudioEndpoint = toolConfig.get('codie.providers.lmstudio.endpoint', 'http://localhost:1234/v1');
    console.log('[Codie] Registering LMStudioProvider at', lmstudioEndpoint);
    providerRegistry.register(new LMStudioProvider(lmstudioEndpoint));
  } else {
    console.log('[Codie] LMStudioProvider not enabled');
  }
  if (ollamaEnabled) {
  const ollamaEndpoint = toolConfig.get('codie.providers.ollama.endpoint', 'http://localhost:11434/v1');
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
  const providerConfig = vscode.workspace.getConfiguration();
      const picks = providerInfos.map(info => {
  const enabled = providerConfig.get(`codie.providers.${info.key}.enabled`, true);
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
          await providerConfig.update(`codie.providers.${info.key}.enabled`, shouldEnable, vscode.ConfigurationTarget.Global);
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
  return api;
}

export function deactivate() {}

