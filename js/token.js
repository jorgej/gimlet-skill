'use strict';

const _ = require("lodash");

module.exports = {
    TYPES: TYPES,
    
    createToken: createToken,
    createTokenFromString: createTokenFromString,
    isValid: isValid
};

function createToken(type, url, info={}) {
    return {
        type: type,
        url: url,
        info: info
    };
}

function createTokenFromString(str) {
    try {
        const data = JSON.parse(str);
        return createToken(data.type, data.url, data.info);
    }
    catch (e) {
        return {};
    }
}

function isValid(token) {
    return !_.isEmpty(token) && 
        _.includes(_.keys(TYPES), token.type) &&
        !!token.url;
}

const TYPES = {
    SERIAL: 'SERIAL',
    FAVORITE: 'FAVORITE',
    LATEST: 'LATEST',
    EXCLUSIVE: 'EXCLUSIVE'
};
