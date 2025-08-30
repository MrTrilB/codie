import * as vscode from 'vscode';
import MCPClient from '../mcp/Client';
import { MCPServerConfig } from '../mcp/types';

function getServerConfigs(): MCPServerConfig[] {
  const config = vscode.workspace.getConfiguration();
  return config.get<any[]>('codie.tools.mcp.servers', []) || [];
}

function chooseServer(): MCPServerConfig | undefined {
  const servers = getServerConfigs();
  if (!servers || servers.length === 0) return undefined;
  return servers[0];
}

export async function discoverCommand() {
  const server = chooseServer();
  if (!server) { vscode.window.showErrorMessage('No MCP server configured.'); return; }
  const client = new MCPClient(server);
  const query = await vscode.window.showInputBox({ prompt: 'Discovery query' });
  if (!query) return;
  try {
    const res = await client.discover(query);
    vscode.window.showInformationMessage(`Discovery returned ${res.total ?? res.hits.length} hits.`);
  } catch (err: any) {
    vscode.window.showErrorMessage('Discovery failed: ' + (err?.message || err));
  }
}

export async function sampleCommand() {
  const server = chooseServer();
  if (!server) { vscode.window.showErrorMessage('No MCP server configured.'); return; }
  const client = new MCPClient(server);
  const prompt = await vscode.window.showInputBox({ prompt: 'Prompt id or text to sample' });
  if (!prompt) return;
  try {
    const res = await client.sample(prompt);
    vscode.window.showInformationMessage(`Sample result: ${res.text ?? JSON.stringify(res.output ?? res)}`);
  } catch (err: any) {
    vscode.window.showErrorMessage('Sample failed: ' + (err?.message || err));
  }
}

export async function listRootsCommand() {
  const server = chooseServer();
  if (!server) { vscode.window.showErrorMessage('No MCP server configured.'); return; }
  const client = new MCPClient(server);
  try {
    const roots = await client.listRoots();
    const pick = await vscode.window.showQuickPick(roots.map(r => ({ label: r.label || r.id, id: r.id })), { canPickMany: false, placeHolder: 'Select a root' });
    if (pick) vscode.window.showInformationMessage(`Selected root: ${pick.label}`);
  } catch (err: any) {
    vscode.window.showErrorMessage('listRoots failed: ' + (err?.message || err));
  }
}

export async function elicitCommand() {
  const server = chooseServer();
  if (!server) { vscode.window.showErrorMessage('No MCP server configured.'); return; }
  const client = new MCPClient(server);
  const spec = await vscode.window.showInputBox({ prompt: 'Elicitation spec (JSON)' });
  if (!spec) return;
  try {
    const parsed = JSON.parse(spec);
    const res = await client.elicit(parsed);
    vscode.window.showInformationMessage(`Elicitation result: ${res.summary ?? JSON.stringify(res.details ?? res)}`);
  } catch (err: any) {
    vscode.window.showErrorMessage('Elicitation failed: ' + (err?.message || err));
  }
}
