'use strict';

const _ = require("lodash");

module.exports = {
    createState: createState,

    isValid: isValid,
    isFinished: isFinished,
    markFinished: markFinished
}

function createState(token, offset=0) {
    return {
        token: token,
        offset: offset
    };
}

function isValid(state) {
    return !_.isEmpty(state) &&
        (_.isNull(state.offset) || _.isNumber(state.offset));
}

function markFinished(state) {
    pbState.offset = null;
}

function isFinished(state) {
    return pbState.offset === null;
}
