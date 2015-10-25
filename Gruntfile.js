/*global module: false, require: false */

module.exports = function( grunt ) {
    'use strict';

    require( 'jit-grunt' )( grunt, {} );

    grunt.initConfig( {
        uglify: {
            dist: {
                options: {
                    sourceMap: false
                },
                files: {
                    'dist/applyPromisedFilter.min.js': 'dist/applyPromisedFilter.js',
                    'dist/filters/colorMatrixFilterWorker.min.js': 'dist/filters/colorMatrixFilterWorker.js',
                    'dist/filters/woodFilterWorker.min.js': 'dist/filters/woodFilterWorker.js'
                }
            }
        },
        watch: {
            // These options slow down the Grunt watcher so that it does not eat so much CPU
            options: {
                spawn: false,
                interrupt: false,
                debounceDelay: 50
            },
            js: {
                files: [
                    'dist/*.js',
                    'dist/**/*.js'
                ],
                tasks: [
                    'js'
                ]
            }
        }
    } );

    grunt.registerTask( 'default', [
        'js'
    ] );
    grunt.registerTask( 'js', [
        'uglify:dist'
    ] );
};
