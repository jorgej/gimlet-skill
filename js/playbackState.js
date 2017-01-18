'use strict';

function PlaybackState(url, token, offsetInMilliseconds) {
    this.url = url;
    this.token = token;
    this.offset = offsetInMilliseconds;

    this.toString = function() {
        return JSON.stringify(this);
    }

    this.markFinished = function() {
        this.offset = null;
        return this;
    }

    this.isFinished = function() {
        return this.offset === null;
    }

    this.isValid = function() {
        return !!this.url && !!this.token;
    }
}

PlaybackState.fromString = function(str) {
    try {
        const data = JSON.parse(str);
        return new PlaybackState(data.url, data.token, data.offset);
    }
    catch (e) {
        return new PlaybackState();
    }
}

module.exports = PlaybackState;
