/*
 * fabric.js Color Matrix Filter Worker
 * https://github.com/pixolith/fabricjs-async-web-worker-filters
 *
 * Simon Kunz 23.10.2015 for pixolith
 * Licensed under the MIT license.
 */

( function( global ) {

    'use strict';

    var fabric = global.fabric || ( global.fabric = {} );

    fabric.Image.filters.ColorMatrix = fabric.util.createClass( fabric.Image.filters.BaseFilter, {

        type: 'ColorMatrixFilter',

        initialize: function( options ) {
            options = options || {};
            this.matrix = options.matrix || [
                    1, 1, 1, 0, 1,
                    1, 1, 1, 0, 1,
                    1, 1, 1, 0, 1,
                    0, 0, 0, 1, 0
                ];

            this.worker = options.worker || 2;
        },

        applyTo: function( canvasEl ) {
            var cacheCanvas = document.createElement( 'canvas' ),
                cacheCtx = cacheCanvas.getContext( '2d' ),
                imageData,
                workerCount = this.worker,
                blockSize = canvasEl.height / workerCount,
                length = canvasEl.width * canvasEl.height * 4,
                segmentLength = length / workerCount,
                workerReturnCount = 0,
                imageDataArray = [],
                m = this.matrix;

            // cache changing canvas
            cacheCanvas.width = canvasEl.width;
            cacheCanvas.height = canvasEl.height;

            cacheCtx.drawImage( canvasEl, 0, 0 );

            // return a finished canvas promise
            return new Promise( function( resolve, reject ) {
                for ( var index = 0; index < workerCount; index++ ) {

                    // create an blob URL of the worker function
                    Worker.create = function( workerJob ) {
                        var str = workerJob.toString();
                        var blob = new Blob(
                            [ '\'use strict\';\nself.onmessage =' + str ],
                            { type: 'text/javascript' }
                        );
                        return window.URL.createObjectURL( blob );
                    };

                    // worker job
                    var workerBlob = Worker.create( function( e ) {
                        // image modification data goes here
                        var imageData = e.data.data,
                            data = imageData.data,
                            m = e.data.matrix,
                            i,
                            r,
                            g,
                            b,
                            a,
                            l = e.data.length,
                            index = e.data.index;

                        for ( i = 0; i < l; i += 4 ) {
                            r = data[ i ];
                            g = data[ i + 1 ];
                            b = data[ i + 2 ];
                            a = data[ i + 3 ];

                            data[ i ] = r * m[ 0 ] + g * m[ 1 ] + b * m[ 2 ] + a * m[ 3 ] + m[ 4 ];
                            data[ i + 1 ] = r * m[ 5 ] + g * m[ 6 ] + b * m[ 7 ] + a * m[ 8 ] + m[ 9 ];
                            data[ i + 2 ] = r * m[ 10 ] + g * m[ 11 ] + b * m[ 12 ] + a * m[ 13 ] + m[ 14 ];
                            data[ i + 3 ] = r * m[ 15 ] + g * m[ 16 ] + b * m[ 17 ] + a * m[ 18 ] + m[ 19 ];
                        }

                        // send results back to the main thread
                        self.postMessage( { result: imageData, index: index } );

                        // die
                        self.close();
                    } );

                    // create worker instance
                    var worker = new Worker( workerBlob );

                    worker.onmessage = function( e ) {
                        // worker result is retrieved using a memory clone operation
                        var imageDataProcessed = e.data.result,
                            index = e.data.index;

                        console.info( 'web worker ' + index + ' had a save journey' );

                        // sort return data based on the index of the worker and save it
                        // this is important as putImageData might mess up the image otherwise
                        imageDataArray.splice( index, 0, {
                            index: index,
                            data: imageDataProcessed,
                            blocks: blockSize * index
                        } );

                        // count returned workers
                        workerReturnCount++;

                        // construct image data once all workers have returned
                        if ( workerReturnCount === workerCount ) {
                            imageDataArray.forEach( function( data ) {
                                cacheCtx.putImageData( data.data, 0, data.blocks );
                            } );
                            resolve( cacheCanvas );
                        }
                    };

                    // return a failure message if the worker didn't complete
                    worker.onerror = function( e ) {
                        reject( Error(
                            'one of the workers had an horrible accident\n' +
                            e.message +
                            ' in line ' +
                            e.lineno )
                        );
                        this.terminate();
                    };

                    // pull image data from the specific areas
                    imageData = cacheCtx.getImageData( 0, blockSize * index, canvasEl.width, blockSize );

                    // sending canvas data to the worker using a copy memory operation
                    worker.postMessage( {
                        data: imageData,
                        index: index,
                        length: segmentLength,
                        matrix: m
                    } );
                }
            } );
        }
    } );

    fabric.Image.filters.ColorMatrix.fromObject = function( object ) {
        return new fabric.Image.filters.ColorMatrix( object );
    };

} )( typeof exports !== 'undefined' ? exports : this );
