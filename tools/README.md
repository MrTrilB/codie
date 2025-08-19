# Codie Tools

This folder contains local implementations of core developer tools inspired by GitHub Copilot Chat. Each tool is a TypeScript module and can be extended to provide workspace automation, code intelligence, and developer productivity features.

## Tools Overview

- `changes.ts` — Get diffs of changed files
- `codebase.ts` — Find relevant file chunks, symbols, and codebase info
- `editFiles.ts` — Edit files in your workspace
- `extensi.ts` — Visual Studio Code Extensions Marketplace integration
- `fetch.ts` — Fetch main content from a web page
- `findTestFiles.ts` — Find test files for a given source or test file
- `githubRepo.ts` — Search a GitHub repository for code snippets
- `new.ts` — Scaffold a new workspace with VS Code configs
- `openSimpleBrowser.ts` — Preview a locally hosted website
- `problems.ts` — Check errors for a particular file
- `runCommands.ts` — Run commands in the terminal
- `runNotebooks.ts` — Run notebook cells
- `runTasks.ts` — Run tasks and get their output
- `runTests.ts` — Run unit tests
- `search.ts` — Search and read files in your workspace
- `searchResults.ts` — Get results from the search view
- `terminalLastCommand.ts` — Get the last command run in the terminal
- `terminalSelection.ts` — Get the current selection in the terminal
- `testFailure.ts` — Get info about the last unit test failure
- `think.ts` — Deep thinking and task organization
- `todos.ts` — Manage and track todo items
- `usages.ts` — Find symbol usages (references, definitions, etc.)
- `vscodeAPI.ts` — VS Code API reference and documentation

Each tool exports a function or class and can be extended for your workflow.
