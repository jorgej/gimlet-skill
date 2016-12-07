'use strict';

const Say = require("./speechGenerator");
const constants = require("./constants");
const shows = require("./shows");
const PlaybackController = require("./playbackController");
const Track = require("./track");
const _ = require("lodash");

const rss = require("rss-parser");

const appStates = constants.states;
const intents = constants.intents;

function launchRequest(event) {
    // we can assume we're in DEFAULT state
    const controller = PlaybackController(event);
    let speech;
    if (controller.isTrackActive()) {
        speech = Say("Welcome:Playback");
        controller.resume();
    }
    else {
        // ensure we're in DEFAULT (should be true, but this will force us out of 
        //  state transition holes in case the logic is broken and the user is we're stuck) 
        event.handler.state = appStates.DEFAULT;
        speech = Say("Welcome");
        // TODO: keep session alive
    }

    event.response.speak(speech);
    event.emit(":responseReady");
}

function help(event) {
    const controller = PlaybackController(event);

    const state = event.handler.state;
    let speech;

    if (state === appStates.DEFAULT) {
        if (controller.isTrackActive()) {
            speech = Say("Help:Playback");
        }
        else {
            speech = Say("Help");
        }
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
        event.response.speak(Say("AskForShowTitle"))
                .listen(Say("RepromptForShowTitle"));
        event.attributes["intentAskingFor"] = intents.PlayLatest;
        event.handler.state = appStates.ASK_FOR_SHOW;
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
        event.response.speak(Say("AskForShowTitle"))
                .listen(Say("RepromptForShowTitle"));
        event.attributes["intentAskingFor"] = intents.PlayExclusive;
        event.handler.state = appStates.ASK_FOR_SHOW;
        
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
        event.response.speak(Say("AskForShowTitle"))
                .listen(Say("RepromptForShowTitle"));
        event.attributes["intentAskingFor"] = intents.PlayFavorite;
        event.handler.state = appStates.ASK_FOR_SHOW;
        event.emit(":responseReady");
    }
}

function listShows(event) {
    let speech = Say("ShowList");
    
    if (event.handler.state === appStates.ASK_FOR_SHOW) {
        event.response.speak(Say("ShowListThenAsk"))
                      .listen(Say("RepromptForShowTitle"));
    }
    else {
        event.response.speak(Say("ShowList"));
    }

    event.emit(":responseReady");
}

function whoIsMatt(event) {
    event.response.speak(Say("MattLieberIs"));
    event.emit(":responseReady");
}

function cancel(event) {
    const controller = PlaybackController(event);
    if (event.handler.state === appStates.DEFAULT && controller.isTrackActive()) {
        PlaybackController(event).stop();
    }
    else {
        event.handler.state = appStates.DEFAULT;
        event.response.speak(Say("Goodbye"));
    }
    event.emit(":responseReady");
}

function showTitleNamed(event) {
    if (event.handler.state === appStates.ASK_FOR_SHOW) {
        const triggeringIntent = event.attributes["intentAskingFor"];
        delete event.attributes["intentAskingFor"];

        if(!getShowFromSlotValue(event.event.request)) {
            event.response.speak(Say("UnknownShowTitle"))
                            .listen(Say("RepromptForShowTitle"));
        }
        else {
            event.handler.state = appStates.DEFAULT;
            if (triggeringIntent === intents.PlayFavorite) {
                PlayFavorite(event);
            }
            else if (triggeringIntent === intents.PlayExclusive) {
                PlayExclusive(event);
            }
            else {  // should be PlayLatest
                PlayLatest(event);
            }
            return;
        }
    }
    else {
        // if the user just names a show on its own, take it to mean "play the latest ..."
        PlayLatest(event);
        return;        
    }

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
    const controller = PlaybackController(event);
    const didResume = controller.resume();    
    if (!didResume) {
        event.speak(Say("EmptyQueueHelp"));
    }
    event.emit(":responseReady");
}

function startOver(event) {
    const controller = PlaybackController(event);
    const didRestart = controller.restart();    
    if (!didRestart) {
        event.speak(Say("EmptyQueueHelp"));
    }
    event.emit(":responseReady");
}

function playbackOperationUnsupported(event, operationName) {
    const speech = Say("UnsupportedOperation", operationName);
    event.response.speak(speech);
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
    event.handler.state = appStates.DEFAULT;
    event.emit(":saveState", true);
    // TODO: implement
    // if (event.handler.state === appStates.ASK_FOR_SHOW) {
    //     event.handler.state = appStates.DEFAULT;
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
    PlaybackController(event).onPlaybackFinished();
    event.emit(':saveState', true);
}

function playbackFailed(event) {
    event.context.succeed(true);
}

/**
 * Misc. handlers
 */

// For error details: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-audioplayer-interface-reference#systemexceptionencountered-request
function systemException(event, err) {

}

function unhandledAction(event) {
    /* This function is triggered whenever an intent is understood by Alexa, 
        but we define no handler for it in the current application state.
    */

    if (event.handler.state === appStates.ASK_FOR_SHOW) {
        event.response.speak(Say("UnknownShowTitle"))
                        .listen(Say("RepromptForShowTitle"));
    }
    else {
        event.response.speak(Say("_Unhandled"));
    }

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
