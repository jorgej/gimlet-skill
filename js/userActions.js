const Say = require("./speechGenerator");
const playbackControllerFactory = require("./playbackController");
const constants = require("./constants");

const appStates = constants.states;

const userActions = {
    "LaunchRequest": function(state, eventHandler) {
        let speech;

        if (state == appStates.START_MODE) {
            speech = Say("Launch:START");
        }
        else if (state == appStates.PLAY_MODE) {
            speech = Say("Launch:PLAY_MODE");
        }
        else {
            speech = Say("Unknown");
        }
        eventHandler.response.speak(speech);
        eventHandler.emit(":responseReady");
    },

    "Help": function(state, eventHandler) {
        let speech;

        if (state == appStates.START_MODE) {
            speech = Say("Help:START");
        }
        else if (state == appStates.PLAY_MODE) {
            speech = Say("Help:PLAY_MODE");
        }
        else {
            speech = Say("Unknown");
        }
        eventHandler.response.speak(speech);
        eventHandler.emit(":responseReady");
    },

    "PlayLatest": function(state, eventHandler) {

    },

    "ListShows": function(state, eventHandler) {
        let speech = Say("ShowList"); 
        eventHandler.response.speak(speech);
        eventHandler.emit(":responseReady");
    },

    // "WhoIsMatt": function(state, eventHandler) {
                
    // },

    // "Stop": function(state, eventHandler) {
        
    // },

    // "Cancel": function(state, eventHandler) {
        
    // },

    // "Pause": function(state, eventHandler) {
        
    // },

    // "Resume": function(state, eventHandler) {
        
    // },

    // "StartOver": function(state, eventHandler) {
        
    // },

    "LoopOn": function(state, eventHandler) {
        let speech = Say("UnsupportedOperation"); 
        eventHandler.response.speak(speech);
        eventHandler.emit(":responseReady");
    },

    "LoopOff": function(state, eventHandler) {
        let speech = Say("UnsupportedOperation"); 
        eventHandler.response.speak(speech);
        eventHandler.emit(":responseReady");        
    },

    "ShuffleOn": function(state, eventHandler) {
        let speech = Say("UnsupportedOperation"); 
        eventHandler.response.speak(speech);
        eventHandler.emit(":responseReady");        
    },

    "ShuffleOff": function(state, eventHandler) {
        let speech = Say("UnsupportedOperation"); 
        eventHandler.response.speak(speech);
        eventHandler.emit(":responseReady");        
    },

    // "ControllerPlay": function(state, eventHandler) {
        
    // },

    // "ControllerPause": function(state, eventHandler) {
        
    // },

    // "ControllerNext": function(state, eventHandler) {
        
    // },

    // "ControllerPrevious": function(state, eventHandler) {
        
    // }
};

module.exports = userActions;