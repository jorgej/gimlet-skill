const Say = require("./speechGenerator");
const constants = require("./constants");

const appStates = constants.states;

function launchRequest(event) {
    let speech;
    const state = event.handler.state;

    if (event.handler.state == appStates.START_MODE) {
        speech = Say("Launch:START");
    }
    else if (state == appStates.PLAY_MODE) {
        speech = Say("Launch:PLAY_MODE");
    }
    else {
        speech = Say("Unknown");
    }
    event.response.speak(speech);
    event.emit(":responseReady");
}

function help(event) {
    const state = event.handler.state;
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
    event.response.speak(speech);
    event.emit(":responseReady");
}

function playLatest(event) {
    event.response.speak(`PlayLatest: <${getTitleSlot(event)}>`);
    event.emit(":responseReady");
}

function playExclusive(event) {
    event.response.speak(`PlayExclusive: <${getTitleSlot(event)}>`);
    event.emit(":responseReady");
}

function listShows(event) {
    let speech = Say("ShowList"); 
    event.response.speak(speech);
    event.emit(":responseReady");
}

function playFav(event) {
    event.response.speak(`PlayFavorite: <${getTitleSlot(event)}>`);
    event.emit(":responseReady");
}

function cancel(event) {

}

function whoIsMatt(event) {
    event.response.speak("WhoIsMatt");
    event.emit(":responseReady");
}

function showTitleResolution(event) {
    event.response.speak(`ShowTitleResolution: <${getTitleSlot(event)}>` );
    event.emit(":responseReady");
}


function pause(event) {

}

function stop(event) {

}

function resume(event) {

}

function playbackOperationUnsupported(event, operationName) {
    speech = Say("UnsupportedOperation", operationName);
    event.response.speak(speech);
    event.emit(":responseReady");
}

function startOver(event) {

}

function playbackPlay(event) {
    
}

function playbackPause(event) {
    
}


/**
 * Lifecycle events
 */

function sessionEnded(event) {

}

function playbackStarted(event) {

}

function playbackStopped(event) {
    
}

function playbackNearlyFinished(event) {
    
}

function playbackFinished(event) {
    
}

function playbackFailed(event) {
    
}

/**
 * Misc. handlers
 */

// For error details: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-audioplayer-interface-reference#systemexceptionencountered-request
function systemException(event, err) {

}

function unhandledAction(event) {
    var message = Say("Unhandled");
    this.response.speak(message).listen(message);
    this.emit(':responseReady');
}


module.exports = {
    launchRequest: launchRequest,

    playLatest: playLatest,
    playExclusive: playExclusive,
    playFav: playFav,
    listShows: listShows,
    whoIsMatt: whoIsMatt,
    
    help: help,
    cancel: cancel,
    
    pause: pause,
    stop: stop,
    resume: resume,
    playbackOperationUnsupported: playbackOperationUnsupported,
    startOver: startOver,
    playbackPlay: playbackPlay,
    playbackPause: playbackPause,

    sessionEnded: sessionEnded,
    playbackStarted: playbackStarted,
    playbackStopped: playbackStopped,
    playbackNearlyFinished: playbackNearlyFinished,
    playbackFinished: playbackFinished,
    playbackFailed: playbackFailed,

    systemException: systemException,
    unhandledAction: unhandledAction,
};


function getTitleSlot(event) {
    const slot = event.event.request.intent.slots["ShowTitle"];
    if (slot && slot.value) {
        return slot.value;
    }
    return undefined;
}