
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
