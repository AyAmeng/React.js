'use strict'

var gulp = require('gulp')
var gulpSequence = require('gulp-sequence')
var test = require('./test/index')

test()

gulp.task('default', gulpSequence('test'))
