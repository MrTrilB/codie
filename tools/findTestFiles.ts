
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Given a file path, find likely test or source file(s) using naming conventions.
 * @param filePath The absolute or workspace-relative file path.
 * @returns {Promise<string[]>} Array of matching test/source file paths.
 */
export async function findTestFiles(filePath: string): Promise<string[]> {
  if (!filePath) return [];
  const basename = path.basename(filePath);
  const dirname = path.dirname(filePath);
  const ext = path.extname(filePath);
  const nameNoExt = basename.replace(ext, '');

  // Common test file patterns: foo.test.ts, foo.spec.ts, __tests__/foo.ts, etc.
  const patterns = [
    `${nameNoExt}.test${ext}`,
    `${nameNoExt}.spec${ext}`,
    `__tests__/${basename}`,
    `__tests__/${nameNoExt}.test${ext}`,
    `__tests__/${nameNoExt}.spec${ext}`,
    basename.replace(/\.(test|spec)$/, '') + ext, // source file for a test
  ];

  // Search in the same directory and __tests__ sibling/parent
  const searchDirs = [dirname, path.join(dirname, '__tests__'), path.join(dirname, '..', '__tests__')];
  const found: Set<string> = new Set();
  for (const dir of searchDirs) {
    for (const pat of patterns) {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(dir, pat),
        '**/node_modules/**',
        2
      );
      for (const f of files) found.add(f.fsPath);
    }
  }
  return Array.from(found);
}
