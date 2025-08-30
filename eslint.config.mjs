// Minimal ESLint config for VS Code extension (ESLint v9+)
export default (async () => {
  const tsEslintPlugin = (await import('@typescript-eslint/eslint-plugin')).default;
  const tsEslintParser = (await import('@typescript-eslint/parser')).default;
  return [
    {
      ignores: [
        'out/**',
        'media/**',
        '.vscode-test/**'
      ],
      files: ['**/*.ts'],
      languageOptions: {
        parser: tsEslintParser,
        parserOptions: {
          project: './tsconfig.json',
          sourceType: 'module',
          ecmaVersion: 2022,
        },
      },
      plugins: {
        '@typescript-eslint': tsEslintPlugin,
      },
      rules: {
        // Add or override rules as needed
      },
    },
  ];
})();
