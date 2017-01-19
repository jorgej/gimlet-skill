'use strict';

const _ = require("lodash");

function ContentToken(type, url, showId, index) {
    this.type = type;
    this.url = url;
    this.showId = showId;
    this.index = index;

    this.toString = function() {
        return JSON.stringify(this);
    }

    this.isValidSerialToken = function() {
        return this.type === TOKEN_TYPE.SERIAL && 
                !!this.url &&
                !!this.showId && 
                _.isNumber(this.index);
    };

    this.isValidFavoriteToken = function() {
        return this.type === TOKEN_TYPE.FAVORITE && 
                !!this.url &&
                !!this.showId && 
                _.isNumber(this.index);
    };

    this.isValidLatestToken = function() {
        return this.type === TOKEN_TYPE.LATEST && 
                !!this.url &&
                !!this.showId;
    }

    this.isValidExclusiveToken = function() {
        return this.type === TOKEN_TYPE.EXCLUSIVE &&
                !!this.url;
    }
}

ContentToken.fromString = function(str) {
    try {
        const data = JSON.parse(str);
        return new ContentToken(data.type, data.url, data.showId, data.index);
    }
    catch (e) {
        return new ContentToken("", "", 0);
    }
}

ContentToken.createSerial = function(url, showId, index) {
    return new ContentToken(TOKEN_TYPE.SERIAL, url, showId, index);
}

ContentToken.createFavorite = function(url, showId, index) {
    return new ContentToken(TOKEN_TYPE.FAVORITE, url, showId, index);
}

ContentToken.createLatest = function(url, showId) {
    return new ContentToken(TOKEN_TYPE.LATEST, url, showId, -1);
}

ContentToken.createExclusive = function(url, index) {
    return new ContentToken(TOKEN_TYPE.EXCLUSIVE, url, undefined, index);
}

const TOKEN_TYPE = {
    SERIAL: 'SERIAL',
    FAVORITE: 'FAVORITE',
    LATEST: 'LATEST',
    EXCLUSIVE: 'EXCLUSIVE'
}

module.exports = ContentToken;
