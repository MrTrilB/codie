
import * as vscode from 'vscode';

/**
 * Get a summary of the codebase: all files and their top-level symbols.
 * Optionally, accepts a query to filter symbols/files.
 * Returns: { files: [...], symbols: [...] }
 */
export async function codebase(query?: string) {
  try {
    // Get all files in the workspace (limit to 1000 for performance)
    const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx,py,java,cs,cpp,c,h}', '**/node_modules/**', 1000);

    // Get all workspace symbols (limit to 5000 for performance)
    const allSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
      'vscode.executeWorkspaceSymbolProvider', query || ''
    );

    // Map symbols to file paths and kinds
    const symbols = (allSymbols || []).map(sym => ({
      name: sym.name,
      kind: vscode.SymbolKind[sym.kind],
      location: sym.location.uri.fsPath,
      container: sym.containerName
    }));

    return {
      files: files.map(f => f.fsPath),
      symbols
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
