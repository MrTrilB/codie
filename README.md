
# Codie: Recommended Extensions & MCP Integration

This extension works best with the following recommended VS Code extensions (not required, but highly encouraged for full functionality):

## Recommended Extensions

- [Jupyter](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter)
- [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
- [Azure API Management](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azureapi)
- [Azure API Center](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azureapicenter)
- [Azure Resources](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azureresources)
- [Dart](https://marketplace.visualstudio.com/items?itemName=Dart-Code.dart-code)
- [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=github.copilot)
- [GitHub Pull Requests](https://marketplace.visualstudio.com/items?itemName=github.vscode-pull-request-github)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [TSL Problem Matcher](https://marketplace.visualstudio.com/items?itemName=amodio.tsl-problem-matcher)
- [VS Code Extension Test Runner](https://marketplace.visualstudio.com/items?itemName=ms-vscode.extension-test-runner)

These will be recommended in VS Code, but are not required for the extension to function.

---

## MCP Tool Server Integration

If you want to enable tool use via the Model Context Protocol (MCP), you can run or connect to an MCP tool server and configure your model provider to use it.

### Configuring the MCP Endpoint

Set the MCP tool server endpoint in your VS Code settings (or settings.json):

```json
"codie.tools.mcp.endpoint": "http://localhost:3333"
```

Replace the URI if your MCP tool server is running elsewhere.

### How It Works

- The MCP tool server exposes tools/functions that AI models can call during a chat session.
- Your model provider (e.g., Foundry, LM Studio) must be configured to use this endpoint for tool calls.
- The extension can help you manage or launch a local MCP tool server, or you can connect to a remote one.

For more information on MCP, see: [https://github.com/modelcontext/model-context-protocol](https://github.com/modelcontext/model-context-protocol)

---

## Using MCP Commands in Codie

Codie provides a small set of commands to interact with configured MCP servers. Add MCP servers under the `codie.tools.mcp.servers` setting in your `settings.json` or use the Settings UI.

- `codie.mcp.discover` — Run a discovery query against a configured MCP server.
- `codie.mcp.sample` — Generate a sample from a prompt or prompt id via the MCP sampling endpoint.
- `codie.mcp.listRoots` — List discovered roots (data sources) from the MCP server.
- `codie.mcp.elicit` — Run elicitation flows against the MCP server.

Example `settings.json` entry:

```json
"codie.tools.mcp.servers": [
  {
    "endpoint": "http://localhost:3333",
    "apiKey": "",
    "label": "Local MCP"
  }
]
```

When using MCP tool servers, Codie registers available tools automatically via the `MCPToolProvider` and they become available in the Tool Registry for model-driven invocations.


## Adding Foundry CLI to PATH

To use the Foundry CLI from any terminal or within VS Code, you may need to add its installation directory to your PATH environment variable. This ensures commands like `foundry service status` work everywhere.

### Universal PowerShell Script

Replace `<FoundryInstallDir>` with the actual directory containing `foundry.exe` (for example, `$env:USERPROFILE\AppData\Local\Microsoft\WindowsApps\Microsoft.FoundryLocal_8wekyb3d8bbwe`).

**For the current session only:**

```powershell
$env:PATH += ";<FoundryInstallDir>"
```

**To permanently add to your user PATH:**

```powershell
[Environment]::SetEnvironmentVariable(
  "PATH",
  $env:PATH + ";<FoundryInstallDir>",
  [EnvironmentVariableTarget]::User
)
```

After running the permanent command, restart VS Code and any open terminals for the change to take effect.

**Note:**

- If you installed Foundry for all users, the path may be under `C:\Program Files` or `C:\Program Files (x86)`.
- If you installed it just for your user, it may be under your user profile as shown above.

If you are unsure of the install location, search for `foundry.exe` as described in the troubleshooting section.

---

## Provider Authors: MCP Integration

If you are implementing an AI provider for Codie and want it to be aware of configured MCP servers, use the `setMcpClients` hook exposed on the `AIProvider` interface.

- Normalized MCP client shape:

```ts
export interface NormalizedMcpClient {
  id: string; // unique id for this MCP instance
  label?: string; // optional human-friendly label
  client: any; // underlying SDK or HTTP client for the MCP server
}
```

- Provider contract:

  - Implement `setMcpClients?(clients: NormalizedMcpClient[]): void` to receive available MCP clients.
  - The extension will call this hook whenever MCP servers are added/removed or on activation.
  - Providers should treat the injected `client` objects as opaque — check for available methods such as `listTools()` or `listResources()` before calling them.

- Enrichment helper:

  - Codie provides a small helper to summarize MCP metadata and enrich the system prompt for model calls: `src/providers/mcpEnrichment.ts`.
  - Use `enrichSystemMessage(originalSystem, mcpMetadata, options?)` to get a safe, concise system message that includes MCP summaries.
  - Options allow configuring the per-MCP item `limit`, the `prefix` label, and the `separator` used between entries.

Example usage inside a provider before sending messages:

```ts
import { enrichSystemMessage } from './mcpEnrichment';

const system = messages.find(m => m.role === 'system')?.content;
const enriched = enrichSystemMessage(system, this.mcpMetadata);
// build messages using enriched system content if available
```

This approach keeps providers defensive and non-blocking while giving models useful context about available tools.

