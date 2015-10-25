/*
 * fabric.js Wood Filter Worker
 * https://github.com/pixolith/fabricjs-async-web-worker-filters
 *
 * Simon Kunz 23.10.2015 for pixolith
 * Licensed under the MIT license.
 */

( function( global ) {

    'use strict';

    var fabric = global.fabric || ( global.fabric = {} );

    fabric.Image.filters.WoodFilter = fabric.util.createClass( fabric.Image.filters.BaseFilter, {

        type: 'WoodFilter',

        initialize: function( options ) {
            options = options || {};
            this.invert = options.invert || false;
            this.threshold = options.threshold || 30;
            this.distance = options.distance || 20;
            this.color = options.color || '#000000';
            this.opacity = typeof options.opacity !== 'undefined' ?
                options.opacity
                : new fabric.Color( this.color ).getAlpha();

            this.opaque = options.opaque;
            this.matrix = options.matrix || [
                    0, 0, 0,
                    0, 1, 0,
                    0, 0, 0
                ];
        },

        applyTo: function( canvasEl ) {
            var self = this,
                context = canvasEl.getContext( '2d' ),
                cacheCanvas = document.createElement( 'canvas' ),
                cacheCtx = cacheCanvas.getContext( '2d' ),
                imageData,
                weights = this.matrix,
                invert = this.invert,
                threshold = this.threshold,
                distance = this.distance,
                limit = 255 - threshold,
                source,
                tintR, tintG, tintB,
                alpha1,
                side = Math.round( Math.sqrt( weights.length ) ),
                halfSide = Math.floor( side / 2 ),
                imageDataArray = [],
                i,

            // go through the destination image pixels
                alphaFac = this.opaque ? 1 : 0,

                workerCount = 2,
                blockSize = canvasEl.height / workerCount,
                h = blockSize,
                length = canvasEl.width * canvasEl.height * 4,
                segmentLength = length / workerCount,
                w = canvasEl.width,
                count = 1;

            source = new fabric.Color( this.color ).getSource();

            tintR = source[ 0 ] * this.opacity;
            tintG = source[ 1 ] * this.opacity;
            tintB = source[ 2 ] * this.opacity;

            alpha1 = 1 - this.opacity;

            cacheCanvas.width = canvasEl.width;
            cacheCanvas.height = canvasEl.height;

            cacheCtx.drawImage( canvasEl, 0, 0 );

            if ( typeof( Promise ) !== 'undefined' ) {
                return new Promise( function( resolve, reject ) {
                    // do a thing, possibly async, then…

                    for ( var index = 0; index < workerCount; index++ ) {
                        Worker.create = function( workerJob ) {
                            var str = workerJob.toString();
                            var blob = new Blob(
                                [ '\'use strict\';\nself.onmessage =' + str ],
                                { type: 'text/javascript' }
                            );
                            return window.URL.createObjectURL( blob );
                        };

                        var workerBlob = Worker.create( function( e ) {
                            var imageData = e.data.data,
                                data = imageData.data,
                                invert = e.data.invert,
                                limit = e.data.limit,
                                distance = e.data.distance,
                                tintR = e.data.tintR,
                                tintG = e.data.tintG,
                                tintB = e.data.tintB,
                                alpha1 = e.data.alpha1,
                                halfSide = e.data.halfSide,
                                alphaFac = e.data.alphaFac,
                                side = e.data.side,
                                weights = e.data.weights,
                                w = e.data.w,
                                h = e.data.h;

                            var i,
                                average,
                                abs = Math.abs;

                            var l = e.data.length;
                            var index = e.data.index;

                            // greyscale
                            for ( i = 0; i < l; i += 4 ) {
                                average = ( data[ i ] + data[ i + 1 ] + data[ i + 2 ] ) / 3;
                                data[ i ] = average;
                                data[ i + 1 ] = average;
                                data[ i + 2 ] = average;
                            }

                            for ( i = 0; i < l; i += 4 ) {
                                if ( invert ) {
                                    data[ i ] = 255 - data[ i ];
                                    data[ i + 1 ] = 255 - data[ i + 1 ];
                                    data[ i + 2 ] = 255 - data[ i + 2 ];
                                }
                            }
                            // removeWhite
                            for ( i = 0; i < l; i += 4 ) {
                                var r = data[ i ];
                                var g = data[ i + 1 ];
                                var b = data[ i + 2 ];

                                if ( r > limit &&
                                    g > limit &&
                                    b > limit &&
                                    abs( r - g ) < distance &&
                                    abs( r - b ) < distance &&
                                    abs( g - b ) < distance
                                ) {
                                    data[ i + 3 ] = 1;
                                }
                            }

                            // tint
                            for ( i = 0; i < l; i += 4 ) {
                                var r = data[ i ];
                                var g = data[ i + 1 ];
                                var b = data[ i + 2 ];

                                // alpha compositing
                                data[ i ] = tintR + r * alpha1;
                                data[ i + 1 ] = tintG + g * alpha1;
                                data[ i + 2 ] = tintB + b * alpha1;
                            }

                            // convolute
                            for ( var y = 0; y < h ; y++ ) {
                                for ( var x = 0; x < w; x++ ) {
                                    var dstOff = ( y * w + x ) * 4,
                                        a = 0;

                                    var r = 0;
                                    var g = 0;
                                    var b = 0;
                                    // calculate the weighed sum of the source image pixels that
                                    // fall under the convolution matrix

                                    for ( var cy = 0; cy < side; cy++ ) {
                                        for ( var cx = 0; cx < side; cx++ ) {

                                            var scy = y + cy - halfSide,
                                                scx = x + cx - halfSide;

                                            /* jshint maxdepth:5 */
                                            if ( scy < 0 || scy > h || scx < 0 || scx > w ) {
                                                continue;
                                            }

                                            var srcOff = ( scy * w + scx ) * 4,
                                                wt = weights[ cy * side + cx ];

                                            r += data[ srcOff ] * wt;
                                            g += data[ srcOff + 1 ] * wt;
                                            b += data[ srcOff + 2 ] * wt;
                                            a += data[ srcOff + 3 ] * wt;
                                        }
                                    }
                                    data[ dstOff ] = r;
                                    data[ dstOff + 1 ] = g;
                                    data[ dstOff + 2 ] = b;
                                    data[ dstOff + 3 ] = a + alphaFac * ( 255 - a );
                                }
                            }

                            self.postMessage( { result: imageData, index: index } );

                            self.close();

                        } );

                        var worker = new Worker( workerBlob );

                        worker.onmessage = function( e ) {
                            // Data is retrieved using a memory clone operation
                            var imageDataProcessed = e.data.result;
                            var index = e.data.index;

                            console.info( 'web worker-' + index + ' finished' );

                            // Copying back canvas data to canvas
                            imageDataArray.splice( index, 0, {
                                index: index,
                                data: imageDataProcessed,
                                blocks: blockSize * index
                            } );

                            if ( count === workerCount ) {
                                for ( i = 0; i < imageDataArray.length; i++ ) {
                                    cacheCtx.putImageData( imageDataArray[ i ].data, 0, imageDataArray[ i ].blocks );
                                }
                                resolve( cacheCanvas );
                            }
                            count++;

                        };

                        worker.onerror = function() {
                            reject( Error( 'Worker failed' ) );
                        };

                        imageData = cacheCtx.getImageData( 0, blockSize * index, canvasEl.width, blockSize );

                        // Sending canvas data to the worker using a copy memory operation
                        worker.postMessage( {
                            data: imageData,
                            index: index,
                            length: segmentLength,
                            invert: invert,
                            limit: limit,
                            distance: distance,
                            tintR: tintR,
                            tintG: tintG,
                            tintB: tintB,
                            alpha1: alpha1,
                            halfSide: halfSide,
                            alphaFac: alphaFac,
                            side: side,
                            weights: weights,
                            w: w,
                            h: h
                        } );
                    }
                } );
            } else {
                // add fallback
                fabric.warn( 'Promises are not support in your browser' );
            }
        }
    } );

    fabric.Image.filters.WoodFilter.fromObject = function( object ) {
        return new fabric.Image.filters.WoodFilter( object );
    };

} )( typeof exports !== 'undefined' ? exports : this );
