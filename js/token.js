function ContentToken(type, showId, info) {
    this.type = type;
    this.showId = showId;
    this.index = index;

    this.toString = function() {
        return JSON.stringify(this);
    }

    this.isValidSerialToken = function() {
        return this.type === TOKEN_TYPE.SERIAL && 
                !!this.showId && 
                isNumber(this.index);
    };

    this.isValidFavoriteToken = function() {
        return this.type === TOKEN_TYPE.FAVORITE && 
                !!this.showId && 
                isNumber(this.index);
    };

    this.isValidLatestToken = function() {
        return this.type === TOKEN_TYPE.LATEST && !!this.showId;
    }

    this.isValidExclusiveToken = function() {
        return this.type === TOKEN_TYPE.EXCLUSIVE;
    }
}

ContentToken.fromString = function(str) {
    try {
        const data = JSON.parse(str);
        return new ContentToken(data.type, data.showId, data.index);
    }
    catch (e) {
        return {};
    }
}

ContentToken.createSerial = function(showId, index) {
    return new ContentToken(TOKEN_TYPE.SERIAL, showId, index);
}

ContentToken.createFavorite = function(showId, index) {
    return new ContentToken(TOKEN_TYPE.SERIAL, showId, index);
}

ContentToken.createLatest = function(showId) {
    return new ContentToken(TOKEN_TYPE.SERIAL, showId, -1);
}

ContentToken.createExclusive = function(index) {
    return new ContentToken(TOKEN_TYPE.EXCLUSIVE, undefined, index);
}

const TOKEN_TYPE = {
    SERIAL: 'SERIAL',
    FAVORITE: 'FAVORITE',
    LATEST: 'LATEST',
    EXCLUSIVE: 'EXCLUSIVE'
}

module.exports = ContentToken;