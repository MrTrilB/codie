
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

/**
 * Get a list of changed files and their diffs in the current git workspace.
 * Returns: { files: [{ path, status, diff }] }
 */
export async function changes() {
  try {
    // Get changed files (staged and unstaged)
    const { stdout: statusOut } = await execAsync('git status --porcelain');
    const files = statusOut
      .split('\n')
      .filter(Boolean)
      .map(line => {
        // Format: XY path (X=staged, Y=unstaged)
        const status = line.slice(0, 2).trim();
        const path = line.slice(3).trim();
        return { path, status };
      })
      .filter(f => f.path);

    // Get diffs for each file
    const results = await Promise.all(
      files.map(async file => {
        let diff = '';
        try {
          // Use -- for safety in case of special chars in path
          const { stdout: diffOut } = await execAsync(`git diff -- "${file.path}"`);
          diff = diffOut;
        } catch (e) {
          diff = '[Error getting diff]';
        }
        return { ...file, diff };
      })
    );

    return { files: results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
