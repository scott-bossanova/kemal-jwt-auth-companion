var path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: 'dev-build/',
    filename: 'kemal-jwt-auth.js',
    library: 'KemalAuth'
  },
  module: {
    rules: [{
      test: /\.js$/, // all files that end in .js or .jsx
      exclude: /^node_modules$/, // unless they're in node_modules
      use: 'babel-loader' // using the babel-loader plugin.
    }]
  },
  devServer: {
    host: '0.0.0.0',
    https: true,
    // filename: "kemal-jwt-auth.dev.js",
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        pathRewrite: {'^/api' : ''}
      }
    }
  }
}
