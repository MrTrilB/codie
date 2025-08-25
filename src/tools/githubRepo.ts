import { Tool, ToolContext } from './ToolInterfaces';

export const githubRepoTool: Tool = {
  id: 'githubRepo',
  label: 'GitHub Repo Search',
  description: 'Search a GitHub repository for code snippets',
  icon: 'github',
  inputSchema: {
    repo: { type: 'string', required: true, description: 'GitHub repo (owner/name)' },
    query: { type: 'string', required: true, description: 'Search query' }
  },
  outputSchema: {
    results: { type: 'array', description: 'Matching code snippets' },
    error: { type: 'string' }
  },
  provider: 'builtin',
  enabled: true,
  async execute({ repo, query }: { repo: string, query: string }, _context?: ToolContext) {
    try {
      const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${encodeURIComponent(repo)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
      const data = await resp.json();
      return { results: data.items || [] };
    } catch (err) {
      return { results: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
};

export default githubRepoTool;
