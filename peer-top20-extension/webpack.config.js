import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const maoniuRoot = path.resolve(__dirname, '../maoniu_ai_plugin-master/src');

export default {
  mode: 'production',
  entry: {
    background: path.join(__dirname, 'src/background.js'),
    popup: path.join(__dirname, 'src/popup.js'),
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', { modules: false }]],
          },
        },
      },
    ],
  },
  resolve: {
    modules: [path.join(__dirname, 'node_modules'), 'node_modules'],
    alias: {
      '@': maoniuRoot,
      '@/js/common': path.join(__dirname, 'src/shims/common.js'),
      common: path.join(__dirname, 'src/shims/common.js'),
      axios: path.join(__dirname, 'src/shims/axios.js'),
      util: path.join(maoniuRoot, 'js/util'),
    },
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/popup.html', to: 'popup.html' },
        { from: 'src/popup.css', to: 'popup.css' },
        { from: 'src/icons', to: 'icons' },
        { from: 'src/content-script.js', to: 'content-script.js' },
      ],
    }),
  ],
  optimization: {
    splitChunks: false,
  },
};
