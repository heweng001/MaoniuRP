let webpack = require("webpack"),
    path = require("path"),
    fileSystem = require("fs"),
    env = require("./utils/env"),
    CleanWebpackPlugin = require("clean-webpack-plugin"),
    CopyWebpackPlugin = require("copy-webpack-plugin"),
    HtmlWebpackPlugin = require("html-webpack-plugin"),
    ZipPlugin = require('zip-webpack-plugin'),
    WriteFilePlugin = require("write-file-webpack-plugin");
const {VueLoaderPlugin} = require('vue-loader');
const Components = require('unplugin-vue-components/webpack')
const {ElementPlusResolver} = require('unplugin-vue-components/resolvers')
const manifestData = require("./src/manifest.json");

const resolve = dir => {
  return path.resolve(__dirname, dir);
};


// load the secrets
let alias = {
  '@': resolve("src"),
  common: resolve("src/js/common"),
  const: resolve("src/js/const"),
  service: resolve("src/js/service"),
  aliService: resolve("src/js/ali_service"),
  util: resolve("src/js/util")
};

let secretsPath = path.join(__dirname, ("secrets." + env.NODE_ENV + ".js"));

let fileExtensions = ["jpg", "jpeg", "png", "gif", "eot", "otf", "svg", "ttf", "woff", "woff2"];

if (fileSystem.existsSync(secretsPath)) {
  alias["secrets"] = secretsPath;
}
const mode = process.env.NODE_ENV === "production" ? "production" : "development";
const isProduction = mode === 'production';

let plugins = [
  new VueLoaderPlugin(),
  Components({
    resolvers: [ElementPlusResolver()],
  }),

  // clean the build folder
  new CleanWebpackPlugin(["build"]),
  // expose and write the allowed env vars on the compiled bundle
  new webpack.EnvironmentPlugin(["NODE_ENV"]),
  new CopyWebpackPlugin([{
    from: "src/manifest.json",
    transform: function (content, path) {
      // generates the manifest file using the package.json informations
      return Buffer.from(JSON.stringify({
        description: process.env.npm_package_description,
        version: process.env.npm_package_version,
        ...JSON.parse(content.toString())
      }))
    }
  }]),

  new HtmlWebpackPlugin({
    template: path.join(__dirname, "src","popup","popup.html"),
    filename: "popup.html",
    chunks: ["popup"]
  }),
  new HtmlWebpackPlugin({
    template: path.join(__dirname, "src", "options.html"),
    filename: "options.html",
    chunks: ["options"]
  }),
  new HtmlWebpackPlugin({
    template: path.join(__dirname, "src", "background.html"),
    filename: "background.html",
    chunks: ["background"]
  }),
  new HtmlWebpackPlugin({
    template: path.join(__dirname, "src","tab", "tab.html"),
    filename: "tab.html",
    chunks: ["tab"]
  }),
  new WriteFilePlugin()
]
if (isProduction) {
  plugins.push(new ZipPlugin({
    // 输出的ZIP文件名称
    filename: `ai-plugin-${manifestData.version}.zip`,
  }))
}
let options = {
  mode,
  entry: {
    popup: path.join(__dirname, "src", "popup", "popup.js"),
    options: path.join(__dirname, "src", "js", "options.js"),
    background: path.join(__dirname, "src", "js", "background.js"),
    content: path.join(__dirname, "src", "js", "content.js"),
    tab: path.join(__dirname,"src","tab","tab.js"),
    productHelper: path.join(__dirname,"src","content","productHelper.js"),
  },
  output: {
    path: path.join(__dirname, "build"),
    filename: "[name].bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.styl(us)?$/,
        use: [
          'vue-style-loader',
          'css-loader',
          'stylus-loader'
        ]
      },
      {
        test: /\.vue$/,
        loaders: 'vue-loader',
      },
      {
        include: /node_modules/,
        test: /\.mjs$/,
        type: 'javascript/auto'
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: new RegExp('\.(' + fileExtensions.join('|') + ')$'),
        loader: "file-loader?name=[name].[ext]",
        exclude: /node_modules/
      },
      {
        test: /\.html$/,
        loader: "html-loader",
        exclude: /node_modules/
      },
      { 
        test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"
      }   
    ]
  },
  resolve: {
    alias: alias
  },
  plugins
};

if (env.NODE_ENV === "development" || env.NODE_ENV === "local") {
  options.devtool = "cheap-module-eval-source-map";
}

module.exports = options;
