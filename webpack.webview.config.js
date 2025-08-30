const path = require('path');
console.log('Loaded webpack.webview.config.js');
/** @type {import('webpack').Configuration} */
module.exports = {
  target: 'web',
  mode: 'production',
  entry: {
    webview: './src/webview/index.tsx',
    mcpServerManager: './src/webview/MCPServerManager.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'media'),
    filename: '[name].js',
    // No libraryTarget: plain script for browser
  },
  // Prevent bundling host-only or native SDKs into webview bundles. Keep SDK usage in
  // the extension host to avoid inflating webview size.
  externals: {
    '@modelcontextprotocol/sdk': 'commonjs2 @modelcontextprotocol/sdk',
    'better-sqlite3': 'commonjs2 better-sqlite3'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
};
