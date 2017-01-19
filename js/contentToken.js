'use strict';

const _ = require("lodash");

module.exports = {
    TYPES: TYPES,
    
    create: create,
    createFromString: createFromString,
    isValid: isValid
};

function create(type, url, info={}) {
    return {
        type: type,
        url: url,
        info: info
    };
}

function createFromString(str) {
    try {
        const data = JSON.parse(str);
        return create(data.type, data.url, data.info);
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
