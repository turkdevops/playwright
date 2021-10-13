const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
module.exports = {
  mode,
  entry: {
    app: path.join(__dirname, 'index.tsx'),
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx']
  },
  devtool: mode === 'production' ? false : 'source-map',
  output: {
    globalObject: 'self',
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '../../../lib/web/traceViewer')
  },
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        loader: 'babel-loader',
        options: {
          presets: [
            "@babel/preset-typescript",
            "@babel/preset-react"
          ]
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.ttf$/,
        use: ['file-loader']
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../../../../../node_modules/@zip.js/zip.js/dist/zip-no-worker-inflate.min.js'),
          to: path.resolve(__dirname, '../../../lib/web/traceViewer/zip.min.js')
        },
      ],
    }),
    new HtmlWebPackPlugin({
      title: 'Playwright Trace Viewer',
      template: path.join(__dirname, 'index.html'),
    })
  ]
};
