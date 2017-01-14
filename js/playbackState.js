'use strict';

function PlaybackState(url, token, offsetInMilliseconds) {
    this.url = url;
    this.token = token;
    this.offset = offsetInMilliseconds;

    this.toString = function() {
        return JSON.stringify(this);
    }

    this.markFinished = function() {
        this.offset = Infinity;
        return this;
    }

    this.isFinished = function() {
        return this.offset === Infinity;
    }

    this.isValid = function() {
        return !!this.url && !!this.token;
    }
}

PlaybackState.fromString = function(str) {
    try {
        return JSON.parse(str);
    }
    catch (e) {
        return {};
    }
}

module.exports = PlaybackState;
