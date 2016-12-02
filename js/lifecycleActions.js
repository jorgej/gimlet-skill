const Say = require("./speechGenerator");
const constants = require("./constants");

const appStates = constants.states;

const lifecycleActions = {
    "SessionEndedRequest": function(state, eventHandler) {
        // eventHandler.context.succeed(true);
    },

    "PlaybackStarted": function(state, eventHandler) {

    },

    "PlaybackStopped": function(state, eventHandler) {

    },

    "PlaybackNearlyFinished": function(state, eventHandler) {

    },

    "PlaybackFinished": function(state, eventHandler) {

    },

    "PlaybackFailed": function(state, eventHandler) {

    },

    "System.Exception": function(state, eventHandler) {

    },
};

module.exports = lifecycleActions;