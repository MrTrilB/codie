// Unified tool interfaces for Codie (inspired by Copilot Chat)

export interface ToolInputSchema {
  [key: string]: any; // JSON schema for input fields
}

export interface ToolOutputSchema {
  [key: string]: any; // JSON schema for output fields
}

export interface ToolContext {
  workspaceFolder?: string;
  sessionId?: string;
  requestId?: string;
  user?: string;
  // ...other context as needed
}

export interface Tool {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  inputSchema: ToolInputSchema;
  outputSchema?: ToolOutputSchema;
  provider?: string; // e.g., 'builtin', 'extension', 'mcp', etc.
  enabled: boolean;
  execute(args: any, context?: ToolContext): Promise<any>;
}

export interface ToolProvider {
  id: string;
  label: string;
  getTools(): Tool[];
}

