/*
 * fabric.js apply Filters with Promises
 * https://github.com/pixolith/fabricjs-async-web-worker-filters
 *
 * Simon Kunz 23.10.2015 for pixolith
 * Licensed under the MIT license.
 */

( function( global ) {

    'use strict';

    var fabric = global.fabric || ( global.fabric = {} );

    fabric.util.object.extend( fabric.Image.prototype, {
        /**
         * Applies filters assigned to this image (from "filters" array)
         * @method applyFilters
         * @param {Function} callback Callback is invoked when all filters have been applied and new image is generated
         * @return {fabric.Image} thisArg
         * @chainable
         */
        applyFilters: function( callback, filters, imgElement, forResizing ) {

            filters = filters || this.filters;
            imgElement = imgElement || this._originalElement;

            if ( !imgElement ) {
                return;
            }

            var imgEl = imgElement,
                canvasEl = fabric.util.createCanvasElement(),
                replacement = fabric.util.createImage(),
                _this = this;

            canvasEl.width = imgEl.width;
            canvasEl.height = imgEl.height;
            canvasEl.getContext( '2d' ).drawImage( imgEl, 0, 0, imgEl.width, imgEl.height );

            if ( filters.length === 0 ) {
                this._element = imgElement;
                callback && callback();
                return canvasEl;
            }
            filters.forEach( function( filter ) {
                if ( typeof( Promise ) !== 'undefined' ) {
                    filter && filter.applyTo(
                        canvasEl, filter.scaleX || _this.scaleX,
                        filter.scaleY || _this.scaleY
                    ).then( function( resultCanvasEl ) {
                            replacement.src = resultCanvasEl.toDataURL( 'image/png' );
                        } );
                } else {
                    // add fallback
                    fabric.warn( 'Promises are not support in your browser' );
                }
                if ( !forResizing && filter && filter.type === 'Resize' ) {
                    _this.width *= filter.scaleX;
                    _this.height *= filter.scaleY;
                }
            } );

            /** @ignore */
            replacement.width = canvasEl.width;
            replacement.height = canvasEl.height;

            if ( fabric.isLikelyNode ) {
                replacement.src = canvasEl.toBuffer( undefined, fabric.Image.pngCompression );
                // onload doesn't fire in some node versions, so we invoke callback manually
                _this._element = replacement;
                !forResizing && ( _this._filteredEl = replacement );
                callback && callback();
            } else {
                replacement.onload = function() {
                    _this._element = replacement;
                    !forResizing && ( _this._filteredEl = replacement );
                    callback && callback();
                    replacement.onload = canvasEl = imgEl = null;
                };
            }
            return canvasEl;
        }
    } );

} )( typeof exports !== 'undefined' ? exports : this );
