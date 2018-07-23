const path = require('path');
const mode = process.env.NODE_ENV || 'development';
const minimize = mode === 'production';
const plugins = [];

module.exports = {
  mode,
  target: 'node',
  devtool: 'source-map',
  entry: [
    path.resolve(__dirname, 'index.js'),
  ],
  output: {
    library: 'osjsCommon',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    sourceMapFilename: '[file].map',
    filename: '[name].js'
  },
  optimization: {
    minimize,
  },
  plugins: [
    ...plugins
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
};
