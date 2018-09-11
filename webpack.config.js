const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const CssRewritePlugin = require('css-rewrite-webpack-plugin');
const merge = require('webpack-merge');
const paths = require('./paths');

function srcPath(subdir) {
  return path.join(__dirname, 'ClientApp', subdir);
}

module.exports = (env) => {
    const isDevBuild = !(env && env.prod);

    const sharedConfig = () => ({
      stats: { modules: false },
      resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        alias: {
          store: srcPath('store')
        }
      },
      output: {
        filename: '[name].js',
        publicPath: 'dist/'
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            include: /ClientApp/,
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: [
                    'env'
                  ],
                  plugins: [
                    ['import', { libraryName: "antd", style: true }],
                    ['transform-runtime', { 'polyfill': false, 'regenerator': true }]
                  ]
                }
              },
              {
                loader: 'ts-loader',
                options: {
                  transpileOnly: true
                }
              },
            ]
          },
          { test: /\.(png|jpg|jpeg|gif|svg)$/, use: 'url-loader?limit=25000' }
        ]
      },
      plugins: [
        new webpack.NamedModulesPlugin(),
        new CaseSensitivePathsPlugin(),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': isDevBuild ? '"development"' : '"production"'
        })
      ]
    });

    // Configuration for client-side bundle suitable for running in browsers
    const clientBundleOutputDir = './wwwroot/dist';
    const clientBundleConfig = merge(sharedConfig(), {
        entry: { 'main-client': './ClientApp/boot-client.tsx' },
        module: {
            rules: [
              {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({ use: [
                  isDevBuild ? 'css-loader' : 'css-loader?minimize'
                ] })
              },
              {
                test: /\.less$/,
                use: ExtractTextPlugin.extract({ use: [
                  isDevBuild ? 'css-loader' : 'css-loader?minimize',
                  {
                    loader: 'less-loader',
                    options: {
                      javascriptEnabled: true,
                      modifyVars: {
                        '@form-item-margin-bottom': '8px'
                      }
                    }
                  }
                ] })
              }
            ]
        },
        output: { path: path.join(__dirname, clientBundleOutputDir) },
        plugins: [
          new ExtractTextPlugin('site.css'),
          new CssRewritePlugin({
              fileReg: new RegExp('site.css'),
              processor: function (source) {
                  return source.replace(/https:\/\/at\.alicdn\.com\/t\/font_[a-z0-9_]+/g, '/fonts/anticon')
              }
          }),
          new webpack.DllReferencePlugin({
              context: __dirname,
              manifest: require('./wwwroot/dist/vendor-manifest.json')
          })
        ].concat(isDevBuild ? [
            // Plugins that apply in development builds only
            new webpack.SourceMapDevToolPlugin({
                filename: '[file].map', // Remove this line if you prefer inline source maps
                moduleFilenameTemplate: path.relative(clientBundleOutputDir, '[resourcePath]') // Point sourcemap entries to the original file locations on disk
            })
        ] : [
            // Plugins that apply in production builds only
            new webpack.optimize.UglifyJsPlugin()
        ])
    });

    // Configuration for server-side (prerendering) bundle suitable for running in Node
    const serverBundleConfig = merge(sharedConfig(), {
        resolve: { mainFields: ['main'] },
        entry: { 'main-server': './ClientApp/boot-server.tsx' },
        module: {
          rules: [
            { test: /\.(css|less)$/, loader: 'ignore-loader' }
          ]
        },
        plugins: [
            new webpack.DllReferencePlugin({
                context: __dirname,
                manifest: require('./ClientApp/dist/vendor-manifest.json'),
                sourceType: 'commonjs2',
                name: './vendor'
            })
        ],
        output: {
            libraryTarget: 'commonjs',
            path: path.join(__dirname, './ClientApp/dist')
        },
        target: 'node',
        devtool: 'inline-source-map'
    });

    return [clientBundleConfig, serverBundleConfig];
};