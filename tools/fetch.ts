
/**
 * Fetch the main content from a web page.
 * @param url The URL to fetch.
 * @returns {Promise<{ success: boolean, content?: string, error?: string }>}
 */
export async function fetch(url: string): Promise<{ success: boolean, content?: string, error?: string }> {
  try {
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'No URL provided.' };
    }
    // Use global fetch (Node.js 18+)
    const response = await globalThis.fetch(url);
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const content = await response.text();
    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
