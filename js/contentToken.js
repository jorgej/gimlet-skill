/**
 * contentToken.js
 * Author: Greg Nicholas
 * 
 * Functions for managing "content tokens": a standard structure used to encapsulate 
 * details about an episode of Gimlet content currently playing.
 * 
 * These tokens are glue that connects our long-form audio player operations with
 * the "callback" notifications our skill will receive during as the audio plays 
 * out. Oftentimes, we need the context from these tokens in order to perform 
 * operations upon getting those notifications (e.g. marking an episode as played
 * for a user).
 */

"use strict";

const _ = require("lodash");

/**
 * All valid token "types"
 */
const TYPES = {
    SERIAL: 'SERIAL',
    FAVORITE: 'FAVORITE',
    LATEST: 'LATEST',
    EXCLUSIVE: 'EXCLUSIVE'
};

module.exports = {
    TYPES: TYPES,
    
    create: create,
    createFromString: createFromString,
    isValid: isValid
};

/** 
 * Creates a token 
 */
function create(type, url, info={}) {
    return {
        type: type,
        url: url,
        info: info
    };
}

/**
 * Explicitly builds a token from a JSON string. By calling the
 * `create` function, we're assured that all properties will be
 * created with acceptable defaults.
 */
function createFromString(str) {
    try {
        const data = JSON.parse(str);
        return create(data.type, data.url, data.info);
    }
    catch (e) {
        return {};
    }
}

/**
 * Returns true if "this" object follows the rules of a token, namely
 * that it has a valid type and a url.
 */
function isValid(token) {
    return !_.isEmpty(token) && 
        _.includes(_.keys(TYPES), token.type) &&
        !!token.url;
}
