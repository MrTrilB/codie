declare module '@modelcontextprotocol/sdk/dist/cjs/client' {
  export class Client {
    constructor(clientInfo?: any, options?: any);
    connect(transport: any, options?: any): Promise<void>;
    listTools(params?: any, options?: any): Promise<any>;
    callTool(params?: any, options?: any): Promise<any>;
    // generic request helper
    request(...args: any[]): Promise<any>;
  }

  export class StreamableHTTPClientTransport {
    constructor(url: string, opts?: any);
  }
}

declare module '@modelcontextprotocol/sdk/client' {
  import * as c from '@modelcontextprotocol/sdk/dist/cjs/client';
  export = c;
}
