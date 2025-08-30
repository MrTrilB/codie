export interface MCPServerConfig {
  endpoint: string;
  apiKey?: string;
  label?: string;
}

export interface Resource {
  id: string;
  type: string;
  title?: string;
  description?: string;
  meta?: Record<string, any>;
}

export interface Prompt {
  id: string;
  title?: string;
  description?: string;
  template?: string;
  variables?: Record<string, any>;
}

export interface Tool {
  id: string;
  name?: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

export interface DiscoveryResult {
  hits: Resource[];
  total?: number;
}

export interface SampleResult {
  id?: string;
  text?: string;
  output?: any;
}

export interface Root {
  id: string;
  label?: string;
}

export interface ElicitationResult {
  id?: string;
  summary?: string;
  details?: any;
}
