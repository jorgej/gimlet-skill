const Say = require("./speechGenerator");
const constants = require("./constants");
const gimlet = require("./gimletConfig");
const PlaybackController = require("./playbackController");
const Track = require("./track");

const rss = require("rss-parser");

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
        speech = Say("_Fail");
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
        speech = Say("_Unknown");
    }
    event.response.speak(speech);
    event.emit(":responseReady");
}

function playLatest(event) {
    const controller = PlaybackController(event);
    const showTitle = gimlet.ShowId.ReplyAll;
    // TODO: insert logic if feed not found
    const url = gimlet.feedUrl[showTitle];

    rss.parseURL(url, function(err, parsed) {
        if (err) {
            // TODO
        }

        const show = parsed.feed.entries[0];
        const url = show.enclosure.url.replace('http://', 'https://');
        const track = new Track(url, show.title);

        event.response.speak(Say("PlayingLatest", parsed.feed.title));
        controller.start(track);
        event.emit(":responseReady");
    });
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
    if (event.handler.state === appStates.START_MODE) {
        event.response.speak(Say("Goodbye"));
    }
    else {
        PlaybackController(event).stop();
    }
    event.emit(":responseReady");
}

function whoIsMatt(event) {
    event.response.speak("MattLieberIs");
    event.emit(":responseReady");
}

function showTitleResolution(event) {
    event.response.speak(`ShowTitleResolution: <${getTitleSlot(event)}>` );
    event.emit(":responseReady");
}

function pause(event) {
    PlaybackController(event).stop();
    event.emit(":responseReady");
}

function stop(event) {
    PlaybackController(event).stop();
    event.emit(":responseReady");
}

function resume(event) {
    PlaybackController(event).resume();
    event.emit(":responseReady");
}

function playbackOperationUnsupported(event, operationName) {
    speech = Say("UnsupportedOperation", operationName);
    event.response.speak(speech);
    event.emit(":responseReady");
}

function startOver(event) {
    PlaybackController(event).restart();
    event.emit(":responseReady");
}

function playbackPlay(event) {
    PlaybackController(event).resume();
    event.emit(":responseReady");
}

function playbackPause(event) {
    PlaybackController(event).stop();
    event.emit(":responseReady");
}


/**
 * Lifecycle events
 */

function sessionEnded(event) {
    
}

// TODO: move logic in here into controller -- it can deal with the playback state all in its module

function playbackStarted(event) {
    event.context.succeed(true);
}

function playbackStopped(event) {
    const offset = event.event.request.offsetInMilliseconds;
    // TODO: handle offset not being available
    PlaybackController(event).onPlaybackStopped(offset);
    event.emit(':saveState', true);
}

function playbackNearlyFinished(event) {
    event.context.succeed(true);
}

function playbackFinished(event) {
    // TODO: consider getting rid of this state? really it's inherent in the playbackMode attributes
    event.handler.state = appStates.START_MODE;
    PlaybackController(event).onPlaybackFinished();
    event.emit(':saveState', true);
}

function playbackFailed(event) {
    event.handler.state = appStates.START_MODE;
    event.emit(':saveState', true);
}

/**
 * Misc. handlers
 */

// For error details: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-audioplayer-interface-reference#systemexceptionencountered-request
function systemException(event, err) {

}

function unhandledAction(event) {
    var message = Say("_Unhandled");
    console.log("Unhandled: " + {
        state: event.handler.state,
        type: event.event.request.type,
        intent: event._event.request.intent.name,
    });
    // console.log(event);
    event.response.speak(message).listen(message);
    event.emit(':responseReady');
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