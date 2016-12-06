'use strict';

module.exports = function(track, offsetInMilliseconds) {
    this.track = track;
    this.offset = offsetInMilliseconds || 0;
}
