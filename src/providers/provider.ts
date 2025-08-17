// Provider abstraction interface for Codie
export interface CodieProvider {
  id: string;
  name: string;
  sendMessage(message: string, options?: any): Promise<string>;
  getModels?(): Promise<string[]>;
  configure?(config: any): void;
}
