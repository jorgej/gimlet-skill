'use strict';

const Say = require("./speechGenerator");
const constants = require("./constants");
const shows = require("./shows");
const PlaybackController = require("./playbackController");
const Track = require("./track");
const _ = require("lodash");

const rss = require("rss-parser");

const appStates = constants.states;

function launchRequest(event) {
    let speech;
    const state = event.handler.state;

    if (state == appStates.PLAY_MODE) {
        speech = Say("Welcome:Playback");
        const controller = PlaybackController(event);
        controller.resume();
    }
    else {
        // ensure we're in START_MODE (should be true, but this will force us out of 
        //  state transition holes in case the logic is broken and the user is we're stuck) 
        event.handlers.state = appStates.START_MODE;
        speech = Say("Welcome");
    }

    event.response.speak(speech);
    event.emit(":responseReady");
}

function help(event) {
    const state = event.handler.state;
    let speech;

    if (state == appStates.START_MODE) {
        speech = Say("Help");
    }
    else if (state == appStates.PLAY_MODE) {
        speech = Say("Help:Playback");
    }
    else if (state == appStates.ASK_FOR_SHOW) {
        speech = Say("Help:AskForShow");
    }
    else {
        speech = Say("_Unknown");
    }
    event.response.speak(speech);
    event.emit(":responseReady");
}

function playLatest(event) {
    const show = getShowFromSlotValue(event.event.request);
    if (show) {
        playShow(event,
            show,
            Say("PlayingLatest", show.title),
            (entries) => entries[0]
        );
    }
    else {
        event.response.speak("Sorry, I don't know what show you're referring to.");
        // event.response.speak(Say("AskForShowTitle"))
        //         .listen(Say("RepromptForShowTitle"));
        // event.handler.state = appStates.ASK_FOR_SHOW;
        // // TODO: revisit handling of this
        // event.attributes["intentAskingFor"] = "PlayLatest";
        event.emit(":responseReady");
    }
}

function playExclusive(event) {
    const show = getShowFromSlotValue(event.event.request);
    if (show) {
        playShow(event,
            show,
            Say("PlayingExclusive", show.title),
            pickRandom
        );
    }
    else {
        event.response.speak("Sorry, I don't know what show you're referring to.");
        // // TODO: revisit handling of this
        // event.response.speak(Say("AskForShowTitle"))
        //         .listen(Say("RepromptForShowTitle"));
        // event.handler.state = appStates.ASK_FOR_SHOW;
        // event.attributes["intentAskingFor"] = "PlayExclusive";
        event.emit(":responseReady");
    }
}

function playFav(event) {
    const show = getShowFromSlotValue(event.event.request);    
    if (show) {
        playShow(event,
            show,
            Say("PlayingFavorite", show.title),
            pickRandom
        );
    }
    else {
        event.response.speak("Sorry, I don't know what show you're referring to.");
        // // TODO: revisit handling of this
        // event.response.speak(Say("AskForShowTitle"))
        //         .listen(Say("RepromptForShowTitle"));
        // event.handler.state = appStates.ASK_FOR_SHOW;
        // event.attributes["intentAskingFor"] = "PlayFavorite";
        event.emit(":responseReady");
    }
}

function listShows(event) {
    let speech = Say("ShowList"); 
    // TODO: revisit handling of this
    // if (event.handler.state === appStates.ASK_FOR_SHOW) {
    //     event.response.speak(Say("ShowListThenAsk"))
    //                   .listen(Say("RepromptForShowTitle"));
    // }
    // else {
        event.response.speak(Say("ShowList"));
    // }

    event.emit(":responseReady");
}

function cancel(event) {
    if (event.handler.state === appStates.PLAY_MODE) {
        PlaybackController(event).stop();
    }
    else {
        event.handler.state = appStates.START_MODE;
        event.response.speak(Say("Goodbye"));
    }
    event.emit(":responseReady");
}

function whoIsMatt(event) {
    event.response.speak(Say("MattLieberIs"));
    event.emit(":responseReady");
}

function showTitleNamed(event) {
    // TODO: revisit handling of this
    // if (event.handler.state === appStates.ASK_FOR_SHOW) {
    //     const triggeringIntent = event.attributes["intentAskingFor"];
    //     delete event.attributes["intentAskingFor"];

    //     event.handler.state = appStates.START_MODE;

    //     // TODO: ensure show is valid
    //     // TODO: revisit handling of this. don't like manually concatenating them

    //     event.emit(triggeringIntent + "_START_MODE");
    //     return;
    // }
    // else {
        // TODO: react to this state
        event.context.succeed(true);
        return;        
    // }

    // event.emit(":responseReady");
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
    // TODO: implement
    // if (event.handler.state === appStates.ASK_FOR_SHOW) {
    //     event.handler.state = appStates.START_MODE;
    //     delete event.attributes["intentAskingFor"];
    //     event.emit(":saveState");
    // }
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
    /* This function is triggered whenever an intent is understood by Alexa, 
        but we define no hanlder for it in the current application state.
    */

    // console.log("Unhandled: " + {
    //     state: event.handler.state,
    //     type: event.event.request.type,
    //     intent: event.event.request.intent,
    // });
    
    // TODO: need to reprompt and listen if in an asking state
    event.handler.state = appStates.START_MODE;
    
    var message = Say("_Unhandled");
    event.response.speak(message);
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

/**
 * Helpers
 */

function playShow(event, show, introSpeech, chooseFn) {
    rss.parseURL(show.url, function(err, parsed) {
        if (err) {
            // TODO
        }

        const entry = chooseFn(parsed.feed.entries);
        if (!entry) {
            // TODO
        }

        const controller = PlaybackController(event); 

        // Alexa only plays HTTPS urls
        const url = entry.enclosure.url.replace('http://', 'https://');
        const track = new Track(url, entry.title);

        if (introSpeech) {
            event.response.speak(introSpeech);
        }
        
        controller.start(track);
        event.emit(":responseReady");
    });
}

function getShowFromSlotValue(request) {
    const slots = request.intent.slots;
    if (slots) {
        const slot = slots["ShowTitle"];
        if (slot && slot.value) {
            const targetVal = slot.value.toLowerCase();
            return _.find(_.values(shows), s => _.includes(s.slotValues, targetVal));
        }
    }
}

function pickRandom(entries) {
    return entries[Math.floor(Math.random() * entries.length)];
}
