// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { ChatManager } from './chatManager';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Hello World command (keep for now)
	const helloDisposable = vscode.commands.registerCommand('codie.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Codie!');
	});
	context.subscriptions.push(helloDisposable);

	// Codie Chat command
	const chatDisposable = vscode.commands.registerCommand('codie.openChat', () => {
		const panel = vscode.window.createWebviewPanel(
			'codieChat',
			'Codie Chat',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.file(path.join(context.extensionPath, 'media'))
				]
			}
		);

		// Get URIs for webview resources
		const mediaPath = path.join(context.extensionPath, 'media');
		const htmlPath = path.join(mediaPath, 'index.html');
		const cssUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'chat.css')));
		const jsUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'main.js')));

		// Read and patch HTML
		import('fs').then(fs => {
			fs.readFile(htmlPath, 'utf8', (err, data) => {
				if (err) {
					panel.webview.html = `<body><h2>Failed to load Codie UI</h2><pre>${err.message}</pre></body>`;
					return;
				}
				// Patch resource URIs for VS Code webview
				let html = data
					.replace('./chat.css', cssUri.toString())
					.replace('./main.js', jsUri.toString());
				panel.webview.html = html;
			});
		});

		// ChatManager instance (per panel)
		const chatManager = new ChatManager();

		// Handle messages from webview
		panel.webview.onDidReceiveMessage(async (msg) => {
			if (msg.type === 'sendMessage') {
				const aiMsg = await chatManager.sendMessage(msg.text);
				panel.webview.postMessage({ type: 'aiMessage', message: aiMsg });
			} else if (msg.type === 'getHistory') {
				panel.webview.postMessage({ type: 'history', history: chatManager.getHistory() });
			} else if (msg.type === 'setProvider') {
				chatManager.setProvider(msg.providerId);
			} else if (msg.type === 'getProviders') {
				panel.webview.postMessage({ type: 'providers', providers: chatManager.getProviderList() });
			}
		});
	});
	context.subscriptions.push(chatDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
