// schema/toolSchemas.ts
// Centralized tool schema definitions for Codie
// Add or update tool schemas here, one per tool

export interface ToolInputField {
  type: string;
  title?: string;
  description?: string;
  required?: boolean;
}

export interface ToolSchema {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  inputSchema: Record<string, ToolInputField>;
  destructive?: boolean;
}

// Example: Edit Files tool schema
export const editFilesSchema: ToolSchema = {
  id: 'editFiles',
  label: 'Edit Files',
  description: 'Edit files in your workspace',
  icon: 'edit',
  inputSchema: {
    action: { type: 'string', title: 'Action', description: 'read, write, append, or delete', required: true },
    filePath: { type: 'string', title: 'File Path', description: 'Relative or absolute path to the file', required: true },
    content: { type: 'string', title: 'Content', description: 'Content to write or append (if applicable)' },
  },
  destructive: true
};

// Add more tool schemas below as needed

export const toolSchemas: ToolSchema[] = [
  editFilesSchema,
  // Add more schemas here
];
