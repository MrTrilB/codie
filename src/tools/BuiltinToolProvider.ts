import { Tool, ToolProvider } from './ToolInterfaces';
import { changesTool } from './changes';
import { codebaseTool } from './codebase';
import { editFilesTool } from './editFiles';
import { extensiTool } from './extensi';
import { fetchTool } from './fetch';
import { findTestFilesTool } from './findTestFiles';
import { githubRepoTool } from './githubRepo';
import { newTool } from './new';
import { openSimpleBrowserTool } from './openSimpleBrowser';
import { problemsTool } from './problems';
import { runCommandsTool } from './runCommands';
import { runNotebooksTool } from './runNotebooks';
import { runTasksTool } from './runTasks';
import { runTestsTool } from './runTests';
import { searchTool } from './search';
import { searchResultsTool } from './searchResults';
import { terminalLastCommandTool } from './terminalLastCommand';
import { terminalSelectionTool } from './terminalSelection';
import { testFailureTool } from './testFailure';
import { thinkTool } from './think';
import { todosTool } from './todos';
import { usagesTool } from './usages';
import { vscodeAPITool } from './vscodeAPI';

export class BuiltinToolProvider implements ToolProvider {
  id = 'builtin';
  label = 'Built-in Tools';
  getTools(): Tool[] {
    return [
      changesTool,
      codebaseTool,
      editFilesTool,
      extensiTool,
      fetchTool,
      findTestFilesTool,
      githubRepoTool,
      newTool,
      openSimpleBrowserTool,
      problemsTool,
      runCommandsTool,
      runNotebooksTool,
      runTasksTool,
      runTestsTool,
      searchTool,
      searchResultsTool,
      terminalLastCommandTool,
      terminalSelectionTool,
      testFailureTool,
      thinkTool,
      todosTool,
      usagesTool,
      vscodeAPITool
    ];
  }
}
