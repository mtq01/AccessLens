const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  // Only bundle content script and panel — background is plain JS, copied directly
  entry: {
    content: "./src/content/index.js",
    panel: "./src/panel/index.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: { loader: "babel-loader" },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: { extensions: [".js", ".jsx"] },
  // Use cheap-source-map instead of eval — required by Chrome extension CSP
  devtool: "cheap-source-map",
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "public", to: "." },
        // Copy background script directly — no bundling
        { from: "src/background/index.js", to: "background.js" },
      ],
    }),
  ],
};
