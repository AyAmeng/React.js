'use strict'
/*
 * https://github.com/teambition/gulp-mejs
 *
 * Licensed under the MIT license.
 */
var gutil = require('gulp-util')
var through = require('through2')
var mejsCompile = require('mejs')
var packageName = require('./package.json').name

module.exports = function (options) {
  return through.obj(gatherFiles, function (callback) {
    if (!this.gatheredFiles) return callback(new gutil.PluginError(packageName, 'no file exist'))
    var mejsFile = mejsCompile.precompile(this.gatheredFiles, options)
    this.push(new gutil.File(mejsFile))
    callback()
  })
}

module.exports.render = function (tplNames, dataFn, options) {
  return through.obj(gatherFiles, function (callback) {
    if (!this.gatheredFiles) return callback(new gutil.PluginError(packageName, 'no file exist'))
    var stream = this
    var mejs = mejsCompile.initMejs(mejsCompile.precompile(this.gatheredFiles, options), options)
    if (!Array.isArray(tplNames)) tplNames = [tplNames]
    if (typeof dataFn !== 'function') {
      var data = dataFn
      dataFn = function () { return data }
    }
    tplNames.forEach(function (tplName) {
      stream.push(new gutil.File({
        path: tplName + '.html',
        contents: new Buffer(mejs.renderEx(tplName, dataFn(tplName)))
      }))
    })
    callback()
  })
}

function gatherFiles (file, encoding, next) {
  if (file.isNull()) return next()
  if (file.isStream()) return next(new gutil.PluginError(packageName, 'Streaming not supported'))
  if (!this.gatheredFiles) this.gatheredFiles = [file]
  else this.gatheredFiles.push(file)
  next()
}
