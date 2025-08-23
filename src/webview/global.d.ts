// TypeScript declaration for VS Code webview API injected into window
interface VSCodeAPI {
  postMessage: (msg: any) => void;
}

interface Window {
  vscode?: VSCodeAPI;
}