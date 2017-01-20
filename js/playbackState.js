/**
 * playbackState.js
 * Author: Greg Nicholas
 * 
 * Functions for managing playback state objects, which are responsible for storing details 
 * about an audio stream. Primarily used to resume an audio stream that was suspended.
 */

"use strict";

const _ = require("lodash");

module.exports = {
    createState: createState,

    isValid: isValid,
    isFinished: isFinished,
    markFinished: markFinished
}

/**
 * Creates a PlaybackState object
 */
function createState(token, offset=0) {
    return {
        token: token,
        offset: offset
    };
}

/**
 * Returns true if state contains minimum amount of information to be valid.
 */
function isValid(state) {
    return !_.isEmpty(state) && !_.isEmpty(state.token) &&
        (_.isNull(state.offset) || _.isNumber(state.offset));
}

/**
 * Marks the given state as "finished", i.e. it's offset is beyond the length
 * of its content.
 */
function markFinished(state) {
    pbState.offset = null;
}

/**
 * Returns true if the state was previously marked finished.
 */
function isFinished(state) {
    return pbState.offset === null;
}
