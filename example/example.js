( function() {

    'use strict';

    var image1 = document.createElement( 'img' ),
        image2 = document.createElement( 'img' ),
        input1 = document.querySelector( '#range-cat' ),
        input2 = document.querySelector( '#range-bear' ),
        detectPromise = document.querySelector( '.detect-promise' ),
        detectWorker = document.querySelector( '.detect-worker' ),
        detectBlob = document.querySelector( '.detect-blob' ),
        statusCat = document.querySelector( '.status-cat' ),
        statusBear = document.querySelector( '.status-bear' ),
        canvas,
        width = 1000,
        height = 1000,
        timeout,
        blurFactor = 10,
        removeWhiteDistance = 125,
        tintColor = '#000000',
        bearImage,
        catImage,
        filter1 = function( obj, value ) {
            obj.filters = [];
            obj.filters.push( new fabric.Image.filters.WoodFilter( {
                worker: 2,
                invert: true,
                threshold: value,
                distance: removeWhiteDistance,
                color: tintColor,
                matrix: [ 1 / blurFactor, 1 / blurFactor, 1 / blurFactor,
                    1 / blurFactor, 1 / blurFactor, 1 / blurFactor,
                    1 / blurFactor, 1 / blurFactor, 1 / blurFactor ]
            } ) );

            obj.applyFilters( function() {
                statusCat.innerHTML = 'done';
                statusCat.style.backgroundColor = 'green';
                canvas.renderAll();
            } );
        },
        filter2 = function( obj, value ) {
            obj.filters = [];
            obj.filters.push( new fabric.Image.filters.ColorMatrix( {
                worker: 2,
                matrix: [
                    value / 100, 0.3202183420819367, -0.03965408211312453, 0, value / 100,
                    0.02578397704808868, 0.6441188644374771, 0.03259127616149294, 0, 7.462829176470591,
                    0.0466055556782719, -value / 100, 0.5241648018700465, 0, value / 100,
                    0, 0, 0, 1, 0
                ]
            } ) );

            obj.applyFilters( function() {
                statusBear.innerHTML = 'done';
                statusBear.style.backgroundColor = 'green';
                canvas.renderAll();
            } );
        };

    canvas = new fabric.Canvas( 'example', { width: width, height: height } );

    image1.src = 'cat.jpg';
    fabric.Image.fromURL( image1.src, function( cat ) {
        catImage = cat;
        cat.set( {
            left: cat.width / 4,
            top: cat.height / 4,
            scaleX: 0.5,
            scaleY: 0.5,
            originX: 'center',
            originY: 'center'
        } );

        canvas.add( cat );
        filter1( cat );
        statusCat.innerHTML = 'processing';
        statusCat.style.backgroundColor = 'red';

    } );

    image2.src = 'bear.jpg';
    fabric.Image.fromURL( image2.src, function( bear ) {
        bearImage = bear;
        bear.set( {
            left: bear.width,
            top: bear.height,
            scaleX: 0.5,
            scaleY: 0.5,
            originX: 'center',
            originY: 'center'
        } );

        canvas.add( bear );
        filter2( bear );
        statusBear.innerHTML = 'processing';
        statusBear.style.backgroundColor = 'red';
    } );

    // for IE 11 the range slider needs to fire change to trigger
    [ 'input', 'change' ].forEach( function( ev ) {
        input1.addEventListener( ev, function( e ) {
            clearTimeout( timeout );
            statusCat.innerHTML = 'processing';
            statusCat.style.backgroundColor = 'red';
            timeout = setTimeout( function() {
                filter1( catImage, e.target.value );
            }, 25 );
        } );
    } );

    [ 'input', 'change' ].forEach( function( ev ) {
        input2.addEventListener( ev, function( e ) {
            clearTimeout( timeout );
            statusBear.innerHTML = 'processing';
            statusBear.style.backgroundColor = 'red';
            timeout = setTimeout( function() {
                filter2( bearImage, e.target.value );
            }, 25 );
        } );
    } );

    // tests

    typeof( Worker ) !== 'undefined' ?
        detectWorker.style.backgroundColor = 'green' :
        detectWorker.style.backgroundColor = 'red';
    typeof( Promise ) !== 'undefined' ?
        detectPromise.style.backgroundColor = 'green' :
        detectPromise.style.backgroundColor = 'red';
    typeof( Blob ) !== 'undefined' ?
        detectBlob.style.backgroundColor = 'green' :
        detectBlob.style.backgroundColor = 'red';

} )();
