
import * as vscode from 'vscode';

/**
 * Search a GitHub repository for code snippets. If not authenticated, prompt for login.
 * @param repo string in the form 'owner/repo'
 * @param query string to search for in the repo
 * @returns {Promise<{ success: boolean, message?: string, results?: any[] }>} 
 */
export async function githubRepo(repo: string, query: string): Promise<{ success: boolean, message?: string, results?: any[] }> {
  if (!repo || !query) {
    return { success: false, message: 'Repository and query are required.' };
  }
  // Try to get a GitHub auth session
  let session: vscode.AuthenticationSession | undefined;
  try {
    const sessions = await vscode.authentication.getSession('github', ['repo'], { createIfNone: false });
    session = sessions;
  } catch (e) {
    // ignore, will prompt below
  }
  if (!session) {
    // Prompt user to log in
    const login = await vscode.window.showInformationMessage(
      'You must be logged in to GitHub to search repositories. Log in now?',
      'Log in', 'Cancel'
    );
    if (login === 'Log in') {
      try {
        session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
      } catch (e) {
        return { success: false, message: 'GitHub login failed.' };
      }
    } else {
      return { success: false, message: 'GitHub login required.' };
    }
  }
  if (!session) {
    return { success: false, message: 'GitHub login required.' };
  }
  // Use GitHub REST API to search code in the repo
  try {
    const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${repo}`;
    const res = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${session.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'VSCode-Codie-Extension'
      }
    });
    if (!res.ok) {
      return { success: false, message: `GitHub API error: ${res.status} ${res.statusText}` };
    }
    const data = await res.json();
    return { success: true, results: data.items };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}
