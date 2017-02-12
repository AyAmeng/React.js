/**
 *  npm module_base
 */
const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
// END

/**
 * base node 相关变量
 */

const NODE_ENV = process.env.NODE_ENV
const DEBUG = NODE_ENV === 'development'
const CDN = process.env.CDN === 'true'
const DISTRIBUTION = process.env.DISTRIBUTION
const PLATFORM = process.env.PLATFORM
const CONFIGURATION = process.env.CONFIG
// END


/**
 *  webpack_base_config
 */
const entry = `./src/platforms/${DISTRIBUTION}/${PLATFORM}`
const target = `${DISTRIBUTION}-${PLATFORM}`
const outputPath = `dist/${target}/static/`

const config = module.exports = {
  entry,
  output: {
    path: path.join(process.cwd(), outputPath),
    filename: '[name].js'
  },
  resolve: {
    extendsions: ['', '.js', 'ts', '.vue', '.styl', 'css'],
    fallback: [path.resolve('./node_module')],
    alias: {
      // sdk es6 tslib 指向全局 module 
      'tslib': path.resolve('node_modules/tslib/tslib.js'),
      'src': path.resolve('./src'),
      'rxjs': path.resolve(process.cwd(), 'node_modules/rxjs')
    }
  },
  module: {

    // linters
    preLoaders: [{
      test: /\.ts$/,
      loader: 'tslint'
    }],

     // loaders
     loaders: [
       {
         test:/\.ts$/,
         loader: 'ts'
       },
       {
         test: /\.vue$/,
         loader: 'vue'
       },
       {
         test: /\.json$/,
         loader: 'json'
       },
       {
          test: /\.html$/,
          loader: 'vue-html'
       },
       {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      },
      {
        test: /\.styl$/,
        loader: 'style!css?sourceMap!postcss!stylus'
      },
      {
        test: /\.css$/,
        loader: 'style!css!postcss'
      },
      {
        test: /\.svg$/,
        loader: 'svg-sprite?' + JSON.stringify({
          name: 'icon-[name]'
        }),
        include: /node_modules\/tb-icons\/lib\/svgs/
      },
      {
        test: /\.(png|jpg|gif)(\?.*)?$/,
        loader: 'url',
        query: {
          limit: DEBUG ? 0 : 10000,
          name: 'images/[name].[ext]?[hash:7]'
        }
      }
     ]

  },

  // vue
  vue: {
    loaders: {
      stylus: 'style!css?sourceMap!postcss!stylus'
    }
  },

  // typescript
  ts: {
    configFileName: './tools/build/dev.json',
    silent: true
  },

  // postcss
  postcss: [
    require('autoprefixer')({
      browsers: [
        '> 1%',
        'last 3 versions',
        'Android >= 4.0'
      ]
    })
  ],

  plugins: [

    // polyfill
    // new webpack.ProvidePlugin({
    // }),

    // global
    new webpack.DefinePlugin({
      DEBUG,
      ENVIRONMENT: JSON.stringify(NODE_ENV),
      DISTRIBUTION: JSON.stringify(DISTRIBUTION),
      PLATFORM: JSON.stringify(PLATFORM),
      CONFIGURATION: JSON.stringify(CONFIGURATION)
    })
  ]
}
// END: base



/**
 *  dev_debugger 模式
 */

if (DEBUG) {
  /**
   * development
   */

  // source map
  config.devtool = 'cheap-module-source-map'

  config.plugins.push(...[

    // no error(s)
    new webpack.NoErrorsPlugin(),

    // home page
    new HtmlWebpackPlugin({
      template: `${entry}/index.html`
    })
  ])

  // no more than asset name(s)
  config.devServer = {
    stats: config.stats = {
      hash: false,
      version: false,
      timings: false,
      assets: false,
      chunkModules: false,
      children: false
    }
  }

  // host, port
  config.devServer.host = '0.0.0.0'
  config.devServer.port = 8081
} else {
  /**
   * production
   */

  // hash filename
  config.output.filename = '[name].[chunkhash].js'

  // cdn
  if (CDN) {
    const cdnPublicPath = `./static`
    switch (DISTRIBUTION) {
      case 'dingtalk':
        // 钉钉平台，使用离线包，而图像（`url-loader`）则仍是 CDN 加速
        config.output.publicPath = 'https://ding.teambition.com/static/'
        config.fileLoader = {
          publicPath: cdnPublicPath
        }
        break
      case 'teambition':
        config.output.publicPath = './static/'
        break
      default:
        // 使用 CDN 加速
        config.output.publicPath = cdnPublicPath
        break
    }
  } else {
    if (DISTRIBUTION === 'shunfeng') {
      // 顺丰
      config.output.publicPath = '/sf/static/'
    } else if (DISTRIBUTION === 'cms') {
      config.output.publicPath = '/cms/static/'
    } else if (DISTRIBUTION === 'wechat' && CONFIGURATION === 'default') {
      config.output.publicPath = '/weixin/static/'
    } else {
      config.output.publicPath = '/static/'
    }
  }

  /**
   * vendor
   */

  config.entry = {
    main: config.entry,
    vendor: [
      'core-js/shim',
      'moment',
      'vue',
      'vue-router',
      'vue-touch',
      'vue-infinite-scroll'
    ],
    'vendor-teambition': [
      'teambition-sdk',
      'teambition-gta'
    ]
  }

  config.plugins.push(
    new webpack.optimize.CommonsChunkPlugin({
      names: [
        'vendor',
        'vendor-teambition'
      ]
    })
  )
  // END: vendor

  // no moment-locale included
  config.plugins.push(
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
  )

  // css separating
  config.vue.loaders.stylus = ExtractTextPlugin.extract({
    fallbackLoader: config.vue.loaders
        .stylus
        .split('!')[0],
    loader: config.vue.loaders
        .stylus
        .split('!').slice(1).join('!')
  })
  for (let opts of config.module.loaders) {
    if (opts.test.test('.styl')) {
      opts.loader = ExtractTextPlugin.extract({
        fallbackLoader: opts.loader.split('!')[0],
        loader: opts.loader.split('!').slice(1).join('!')
      })
      break
    }
  }
  config.plugins.push(
    new ExtractTextPlugin('[name].[chunkhash].css')
  )

  // css min
  config.postcss.push(
    require('cssnano')({
      safe: true
    })
  )

  // home page
  config.plugins.push(
    new HtmlWebpackPlugin({
      filename: DISTRIBUTION === 'wechat' ?
          '../index.html' :
          `../${target}.html`,
      template: `${entry}/index.html`,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      }
    })
  )

  // clean up
  require('del').sync([`dist/${target}`])

  // optimization
  config.plugins.push(...[
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.MinChunkSizePlugin({
      minChunkSize: 1024 * 200
    }),
    new webpack.optimize.OccurrenceOrderPlugin(true),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: false,
      comments: false,
      compress: {
        warnings: false
      }
    })
  ])

  // keep useful info
  config.stats = {
    children: false,
    assetsSort: 'chunks'
  }

  // 钉钉特有
  if (DISTRIBUTION === 'dingtalk') {
    const CopyWebpackPlugin = require('copy-webpack-plugin')
    config.plugins.push(
      new CopyWebpackPlugin([{
        // Ding一下功能使用到
        from: './src/images/teambition.png',
        to: path.resolve(outputPath, 'images/teambition.png')
      }])
    )
  }
}


